import { BLOCK_SIZE, COLORS, GHOST_COLORS, COLS, ROWS } from './constants.js';

export class Renderer {
    constructor(canvas, nextCanvas) {
        this.ctx = canvas.getContext('2d');
        this.nextCtx = nextCanvas.getContext('2d');
        
        // Scale for the main board
        this.ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
        
        // Scale for next piece preview
        this.nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);
    }

    draw(board, activePiece, nextPiece) {
        this.clear();
        this.drawBoard(board);
        this.drawGhostPiece(activePiece);
        this.drawPiece(activePiece);
        this.drawNextPiece(nextPiece);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.nextCtx.clearRect(0, 0, this.nextCtx.canvas.width, this.nextCtx.canvas.height);
    }

    drawBoard(board) {
        board.grid.forEach((row, y) => {
            row.forEach((type, x) => {
                if (type !== 0) {
                    this.drawBlock(this.ctx, x, y, COLORS[type]);
                }
            });
        });
    }

    drawPiece(piece) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(this.ctx, piece.x + x, piece.y + y, COLORS[piece.type]);
                }
            });
        });
    }

    drawGhostPiece(piece) {
        const ghostY = piece.calculateGhostY();
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(this.ctx, piece.x + x, ghostY + y, GHOST_COLORS[piece.type]);
                }
            });
        });
    }

    drawNextPiece(piece) {
        const size = piece.matrix.length;
        // Center the piece in the 4x4 next canvas
        const offsetX = (4 - size) / 2;
        const offsetY = (4 - size) / 2;
        
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(this.nextCtx, x + offsetX, y + offsetY, COLORS[piece.type]);
                }
            });
        });
    }

    drawBlock(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
        
        // Add a small border for clarity
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.05;
        ctx.strokeRect(x, y, 1, 1);
    }
}
