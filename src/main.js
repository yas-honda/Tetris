import { Game } from './game.js';
import { COLS, ROWS, BLOCK_SIZE } from './constants.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('board');
    const nextCanvas = document.getElementById('next');
    
    // Set board size
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    
    // Set next piece size (4x4 grid)
    nextCanvas.width = 4 * BLOCK_SIZE;
    nextCanvas.height = 4 * BLOCK_SIZE;
    
    const game = new Game(canvas, nextCanvas);
    
    // Event listeners for keyboard
    document.addEventListener('keydown', (e) => {
        game.handleInput(e.key);
        updateUI(game);
    });

    // Mobile controls
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnRotate = document.getElementById('btn-rotate');
    const btnDown = document.getElementById('btn-down');
    const btnDrop = document.getElementById('btn-drop');

    if (btnLeft) btnLeft.addEventListener('click', () => { game.handleInput('ArrowLeft'); updateUI(game); });
    if (btnRight) btnRight.addEventListener('click', () => { game.handleInput('ArrowRight'); updateUI(game); });
    if (btnRotate) btnRotate.addEventListener('click', () => { game.handleInput('ArrowUp'); updateUI(game); });
    if (btnDown) btnDown.addEventListener('click', () => { game.handleInput('ArrowDown'); updateUI(game); });
    if (btnDrop) btnDrop.addEventListener('click', () => { game.handleInput(' '); updateUI(game); });

    // UI elements
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');

    function updateUI(game) {
        if (scoreElement) scoreElement.innerText = game.score;
        if (levelElement) levelElement.innerText = game.level;
        if (linesElement) linesElement.innerText = game.lines;
    }

    // Start game
    game.update();
});
