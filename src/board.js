import { COLS, ROWS } from './constants.js';

export class Board {
    constructor() {
        this.grid = this.getEmptyGrid();
    }

    getEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    reset() {
        this.grid = this.getEmptyGrid();
    }

    isValidMove(piece, dx = 0, dy = 0, matrix = piece.matrix) {
        return matrix.every((row, y) => {
            return row.every((value, x) => {
                let nextX = piece.x + x + dx;
                let nextY = piece.y + y + dy;
                return (
                    value === 0 ||
                    (nextX >= 0 &&
                        nextX < COLS &&
                        nextY < ROWS &&
                        (nextY < 0 || this.grid[nextY][nextX] === 0))
                );
            });
        });
    }

    lockPiece(piece) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    let nextX = piece.x + x;
                    let nextY = piece.y + y;
                    if (nextY >= 0) {
                        this.grid[nextY][nextX] = piece.type;
                    }
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;
        this.grid = this.grid.reduce((acc, row) => {
            if (row.every((cell) => cell !== 0)) {
                linesCleared++;
                acc.unshift(Array(COLS).fill(0));
            } else {
                acc.push(row);
            }
            return acc;
        }, []);
        return linesCleared;
    }
}
