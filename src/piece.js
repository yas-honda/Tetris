import { SHAPES, KICK_DATA } from './constants.js';

export class Piece {
    constructor(type, board) {
        this.type = type;
        this.board = board;
        this.matrix = SHAPES[type].map(row => [...row]);
        this.resetPosition();
        this.rotation = 0; // 0, 1, 2, 3
    }

    resetPosition() {
        this.x = this.type === 'I' ? 3 : 3;
        this.y = this.type === 'I' ? -1 : 0;
        this.rotation = 0;
    }

    rotate(clockwise = true) {
        const prevRotation = this.rotation;
        const nextRotation = (prevRotation + (clockwise ? 1 : 3)) % 4;
        
        // Rotate matrix
        const nextMatrix = this.getRotatedMatrix(clockwise);
        
        // SRS Wall Kicks
        const kicks = this.getKicks(prevRotation, nextRotation);
        
        for (const [dx, dy] of kicks) {
            if (this.board.isValidMove(this, dx, -dy, nextMatrix)) { // dy is inverted in standard grid (y increases downwards)
                this.x += dx;
                this.y -= dy;
                this.matrix = nextMatrix;
                this.rotation = nextRotation;
                return true;
            }
        }
        return false;
    }

    getRotatedMatrix(clockwise) {
        const matrix = this.matrix;
        const size = matrix.length;
        const result = Array.from({ length: size }, () => Array(size).fill(0));
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (clockwise) {
                    result[x][size - 1 - y] = matrix[y][x];
                } else {
                    result[size - 1 - x][y] = matrix[y][x];
                }
            }
        }
        return result;
    }

    getKicks(from, to) {
        const key = `${from}-${to}`;
        if (this.type === 'O') return [[0, 0]];
        if (this.type === 'I') return KICK_DATA.I[key];
        return KICK_DATA.common[key];
    }

    calculateGhostY() {
        let dy = 0;
        while (this.board.isValidMove(this, 0, dy + 1)) {
            dy++;
        }
        return this.y + dy;
    }
}
