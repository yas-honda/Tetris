import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

// MIME types
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// HTTP Server for serving static frontend
const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    const filePath = path.join(__dirname, reqUrl);
    // Security check: keep within root directory
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

// WebSocket Server
// 公開ポートは誰でも接続できるため、1通のサイズと送信頻度に上限を設ける
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_MESSAGES_PER_SECOND = 100;
const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });

const rooms = new Map();

function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 4; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return rooms.has(id) ? generateRoomId() : id;
}

function send(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.roomId = null;
    ws.role = null;

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // 上限超過などの通信エラーでサーバー全体が落ちないよう、接続ごとに受け止める
    ws.on('error', () => {});

    ws.windowStart = Date.now();
    ws.windowCount = 0;

    ws.on('message', (message) => {
        const now = Date.now();
        if (now - ws.windowStart >= 1000) {
            ws.windowStart = now;
            ws.windowCount = 0;
        }
        if (++ws.windowCount > MAX_MESSAGES_PER_SECOND) return;

        let msg;
        try {
            msg = JSON.parse(message);
        } catch {
            return;
        }

        switch (msg.type) {
            case 'create_room': {
                const roomId = generateRoomId();
                ws.roomId = roomId;
                ws.role = 'host';

                rooms.set(roomId, {
                    id: roomId,
                    host: ws,
                    guest: null,
                    state: 'waiting',
                });

                send(ws, {
                    type: 'room_created',
                    roomId,
                    role: 'host',
                });
                break;
            }

            case 'join_room': {
                const targetRoomId = (msg.roomId || '').trim().toUpperCase();
                const room = rooms.get(targetRoomId);

                if (!room) {
                    send(ws, { type: 'error', message: 'ルームが見つかりません。' });
                    return;
                }

                if (room.guest && room.guest !== ws && room.guest.readyState === WebSocket.OPEN) {
                    send(ws, { type: 'error', message: 'このルームは満員です。' });
                    return;
                }

                ws.roomId = targetRoomId;
                ws.role = 'guest';
                room.guest = ws;
                room.state = 'ready';

                send(ws, {
                    type: 'room_joined',
                    roomId: targetRoomId,
                    role: 'guest',
                });

                send(room.host, {
                    type: 'opponent_joined',
                    role: 'guest',
                });
                break;
            }

            case 'start_battle': {
                const room = rooms.get(ws.roomId);
                if (!room || ws !== room.host || !room.guest) return;

                room.state = 'countdown';
                const seed = Math.floor(Math.random() * 1000000);

                // Broadcast countdown & seed
                send(room.host, { type: 'battle_countdown', seed, count: 3 });
                send(room.guest, { type: 'battle_countdown', seed, count: 3 });
                break;
            }

            case 'game_state': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = ws === room.host ? room.guest : room.host;
                if (opponent) {
                    send(opponent, {
                        type: 'opponent_state',
                        grid: msg.grid,
                        activePiece: msg.activePiece,
                        score: msg.score,
                        lines: msg.lines,
                        holdPiece: msg.holdPiece,
                        combo: msg.combo,
                    });
                }
                break;
            }

            case 'garbage_attack': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = ws === room.host ? room.guest : room.host;
                if (opponent) {
                    send(opponent, {
                        type: 'incoming_garbage',
                        lines: msg.lines,
                        holeCol: msg.holeCol,
                    });
                }
                break;
            }

            case 'game_over': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const winnerRole = ws === room.host ? 'guest' : 'host';
                const opponent = ws === room.host ? room.guest : room.host;

                send(ws, {
                    type: 'battle_result',
                    result: 'lose',
                    winner: winnerRole,
                });

                if (opponent) {
                    send(opponent, {
                        type: 'battle_result',
                        result: 'win',
                        winner: winnerRole,
                    });
                }
                room.state = 'ended';
                break;
            }

            case 'rematch_request': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = ws === room.host ? room.guest : room.host;
                if (opponent) {
                    send(opponent, { type: 'rematch_offered' });
                }
                break;
            }

            case 'rematch_accept': {
                const room = rooms.get(ws.roomId);
                if (!room || !room.host || !room.guest) return;

                room.state = 'countdown';
                const seed = Math.floor(Math.random() * 1000000);
                send(room.host, { type: 'battle_countdown', seed, count: 3 });
                send(room.guest, { type: 'battle_countdown', seed, count: 3 });
                break;
            }

            case 'leave_room': {
                handleLeave(ws);
                break;
            }
        }
    });

    ws.on('close', () => {
        handleLeave(ws);
    });
});

function handleLeave(ws) {
    if (!ws.roomId) return;
    const room = rooms.get(ws.roomId);
    if (!room) return;

    const opponent = ws === room.host ? room.guest : room.host;
    if (opponent) {
        send(opponent, { type: 'opponent_left' });
        if (ws === room.host) {
            opponent.role = 'host';
            room.host = opponent;
            room.guest = null;
            room.state = 'waiting';
        } else {
            room.guest = null;
            room.state = 'waiting';
        }
    } else {
        rooms.delete(ws.roomId);
    }

    ws.roomId = null;
    ws.role = null;
}

// Ping interval to keep connections healthy
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

server.listen(PORT, () => {
    console.log(`CYBER TETRIS Server running on http://localhost:${PORT}`);
});
