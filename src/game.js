import { Board } from './board.js';
import { Piece } from './piece.js';
import { Renderer } from './renderer.js';
import { POINTS, LEVEL_SPEED, KEY } from './constants.js';

export class Game {
    constructor(canvas, nextCanvas) {
        this.board = new Board();
        this.renderer = new Renderer(canvas, nextCanvas);
        this.reset();
    }

    reset() {
        this.board.reset();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.bag = [];
        this.activePiece = this.spawnPiece();
        this.nextPiece = this.spawnPiece();
        this.isGameOver = false;
        this.isPaused = false;
        this.dropCounter = 0;
        this.lastTime = 0;
    }

    spawnPiece() {
        if (this.bag.length === 0) {
            this.bag = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].sort(() => Math.random() - 0.5);
        }
        const type = this.bag.pop();
        return new Piece(type, this.board);
    }

    update(time = 0) {
        if (this.isPaused || this.isGameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        const speed = LEVEL_SPEED[Math.min(this.level, 10)];
        if (this.dropCounter > speed) {
            this.drop();
        }

        this.renderer.draw(this.board, this.activePiece, this.nextPiece);
        this.requestId = requestAnimationFrame(this.update.bind(this));
    }

    drop() {
        if (this.board.isValidMove(this.activePiece, 0, 1)) {
            this.activePiece.y++;
        } else {
            this.lock();
        }
        this.dropCounter = 0;
    }

    hardDrop() {
        while (this.board.isValidMove(this.activePiece, 0, 1)) {
            this.activePiece.y++;
            this.score += POINTS.HARD_DROP;
        }
        this.lock();
    }

    lock() {
        this.board.lockPiece(this.activePiece);
        const lines = this.board.clearLines();
        if (lines > 0) {
            this.addScore(lines);
            this.lines += lines;
            this.level = Math.floor(this.lines / 10) + 1;
        }
        
        this.activePiece = this.nextPiece;
        this.nextPiece = this.spawnPiece();
        
        if (!this.board.isValidMove(this.activePiece)) {
            this.isGameOver = true;
            cancelAnimationFrame(this.requestId);
            alert('Game Over! Score: ' + this.score);
        }
    }

    addScore(lines) {
        const linePoints = [0, POINTS.SINGLE, POINTS.DOUBLE, POINTS.TRIPLE, POINTS.TETRIS];
        this.score += linePoints[lines] * this.level;
    }

    handleInput(key) {
        if (this.isGameOver) return;
        
        if (key === KEY.P || key === KEY.ESCAPE) {
            this.isPaused = !this.isPaused;
            if (!this.isPaused) this.update();
            return;
        }

        if (this.isPaused) return;

        switch (key) {
            case KEY.LEFT:
                if (this.board.isValidMove(this.activePiece, -1, 0)) {
                    this.activePiece.x--;
                }
                break;
            case KEY.RIGHT:
                if (this.board.isValidMove(this.activePiece, 1, 0)) {
                    this.activePiece.x++;
                }
                break;
            case KEY.DOWN:
                this.drop();
                this.score += POINTS.SOFT_DROP;
                break;
            case KEY.UP:
                this.activePiece.rotate(true);
                break;
            case KEY.SPACE:
                this.hardDrop();
                break;
        }
    }
}
