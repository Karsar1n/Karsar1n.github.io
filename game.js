const row_sizes = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const num_rows = row_sizes.length;

const SHAPES = {
    I: { color: 'cyan', matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    J: { color: 'blue', matrix: [[1,0,0],[1,1,1],[0,0,0]] },
    L: { color: 'orange', matrix: [[0,0,1],[1,1,1],[0,0,0]] },
    O: { color: 'yellow', matrix: [[1,1],[1,1]] },
    S: { color: 'green', matrix: [[0,1,1],[1,1,0],[0,0,0]] },
    T: { color: 'purple', matrix: [[0,1,0],[1,1,1],[0,0,0]] },
    Z: { color: 'red', matrix: [[1,1,0],[0,1,1],[0,0,0]] }
};

let boardState = []; 
let boardDOM = [];   

let currentPiece = null;
let nextPiece = null;
let gameLoopInterval = null;
let isPaused = false;
let isGameOver = false;

let score = 0;
let dropSpeed = 800;

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

function createRightTriangleBoard() {
    const boardContainer = document.getElementById('tetris-board');
    boardContainer.innerHTML = '';
    boardState = [];
    boardDOM = [];

    row_sizes.forEach((size, rIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('grid-row');
        rowDiv.dataset.row = rIndex;

        const rowDOM = [];
        const rowState = [];

        for (let cIndex = 0; cIndex < size; cIndex++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = rIndex;
            cell.dataset.col = cIndex;

            rowDiv.appendChild(cell);
            rowDOM.push(cell);
            rowState.push(null);
        }

        boardContainer.appendChild(rowDiv);
        boardDOM.push(rowDOM);
        boardState.push(rowState);
    });

    const nextGrid = document.getElementById('next-piece-grid');
    nextGrid.innerHTML = '';
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        nextGrid.appendChild(cell);
    }
}

function getRandomPiece() {
    const keys = Object.keys(SHAPES);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const shape = SHAPES[key];
    return {
        color: shape.color,
        matrix: shape.matrix.map(row => [...row]),
        r: 0,
        c: 0
    };
}

function renderBoard() {
    for (let r = 0; r < num_rows; r++) {
        for (let c = 0; c < row_sizes[r]; c++) {
            const cell = boardDOM[r][c];
            const color = boardState[r][c];
            cell.className = 'cell' + (color ? ' ' + color : '');
        }
    }

    if (currentPiece && !isGameOver) {
        const { matrix, r: pr, c: pc, color } = currentPiece;
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                if (matrix[row][col]) {
                    const boardR = pr + row;
                    const boardC = pc + col;
                    if (boardR >= 0 && boardR < num_rows && boardC >= 0 && boardC < row_sizes[boardR]) {
                        boardDOM[boardR][boardC].className = 'cell ' + color;
                    }
                }
            }
        }
    }
}

function renderNextPiece() {
    const nextGridCells = document.querySelectorAll('#next-piece-grid .cell');
    nextGridCells.forEach(cell => cell.className = 'cell');

    if (!nextPiece) return;
    const { matrix, color } = nextPiece;
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
                const idx = r * 4 + c;
                if (nextGridCells[idx]) nextGridCells[idx].className = 'cell ' + color;
            }
        }
    }
}

function randMesh(){
    boardDOM[0][0].remove();
}

function isValidMove(piece, offsetR, offsetC, newMatrix = null) {
    const matrix = newMatrix || piece.matrix;
    const targetR = piece.r + offsetR;
    const targetC = piece.c + offsetC;

    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
                const cellR = targetR + r;
                const cellC = targetC + c;

                if (cellR < 0 || cellR >= num_rows) return false;
                if (cellC < 0 || cellC >= row_sizes[cellR]) return false;
                if (boardState[cellR][cellC] !== null) return false;
            }
        }
    }
    return true;
}

function rotateMatrix(matrix) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            result[c][N - 1 - r] = matrix[r][c];
        }
    }
    return result;
}

function lockPiece() {
    const { matrix, r: pr, c: pc, color } = currentPiece;
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
                const boardR = pr + r;
                const boardC = pc + c;
                if (boardR >= 0 && boardR < num_rows && boardC >= 0 && boardC < row_sizes[boardR]) {
                    boardState[boardR][boardC] = color;
                }
            }
        }
    }

    checkLines();

    currentPiece = nextPiece;
    nextPiece = getRandomPiece();
    renderNextPiece();

    if (!isValidMove(currentPiece, 0, 0)) {
        triggerGameOver();
    }
}

function moveDown() {
    if (isGameOver || isPaused) return;
    if (isValidMove(currentPiece, 1, 0)) {
        currentPiece.r++;
    } else {
        lockPiece();
    }
    renderBoard();
}

function moveLeft() {
    if (isGameOver || isPaused) return;
    if (isValidMove(currentPiece, 0, -1)) {
        currentPiece.c--;
        renderBoard();
    }
}

function moveRight() {
    if (isGameOver || isPaused) return;
    if (isValidMove(currentPiece, 0, 1)) {
        currentPiece.c++;
        renderBoard();
    }
}

function rotatePiece() {
    if (isGameOver || isPaused) return;
    const rotated = rotateMatrix(currentPiece.matrix);
    if (isValidMove(currentPiece, 0, 0, rotated)) {
        currentPiece.matrix = rotated;
        renderBoard();
    }
}

function checkLines() {
    let linesCleared = 0;
    for (let r = 0; r < num_rows; r++) {
        const isFull = boardState[r].every(cell => cell !== null);
        if (isFull) {
            linesCleared++;
            boardState[r] = Array(row_sizes[r]).fill(null);
        }
    }

    if (linesCleared > 0) {
        score += linesCleared * 100;
        document.getElementById('score-display').textContent = score;

        const lineClearedEvent = new CustomEvent('lineCleared', {
            detail: { lines: linesCleared, timestamp: Date.now() },
            bubbles: true
        });
        document.dispatchEvent(lineClearedEvent);
    }
}

function startGameAsync() {
    return new Promise((resolve) => {
        createRightTriangleBoard();
        score = 0;
        isGameOver = false;
        isPaused = false;
        document.getElementById('score-display').textContent = '0';
        currentPiece = getRandomPiece();
        nextPiece = getRandomPiece();
        renderNextPiece();
        renderBoard();

        if (gameLoopInterval) clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(moveDown, dropSpeed);

        resolve('Game Started');
    });
}

function triggerGameOver() {
    isGameOver = true;
    clearInterval(gameLoopInterval);
    document.getElementById('final-score').textContent = score;
    
    const gameOverEvent = new CustomEvent('gameOver', { detail: { score } });
    document.dispatchEvent(gameOverEvent);

    showScreen('screen-gameover');
}

document.addEventListener('keydown', (event) => {
    if (!document.getElementById('screen-game').classList.contains('active')) return;

    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            moveLeft();
            event.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            moveRight();
            event.preventDefault();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            moveDown();
            event.preventDefault();
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
            rotatePiece();
            event.preventDefault();
            break;
        case 'g':
            randMesh();
            event.preventDefault();
            break;

    }
});

document.getElementById('btn-start-game').addEventListener('click', (e) => {
    showScreen('screen-game');
    startGameAsync();
});

document.getElementById('btn-open-settings').onclick = () => showScreen('screen-settings');
document.getElementById('btn-settings-back').onclick = () => showScreen('screen-start');
document.getElementById('btn-exit-game').onclick = () => {
    clearInterval(gameLoopInterval);
    showScreen('screen-start');
};
document.getElementById('btn-restart').onclick = () => {
    showScreen('screen-game');
    startGameAsync();
};
document.getElementById('btn-gameover-menu').onclick = () => showScreen('screen-start');

const btnTouchLeft = document.getElementById('btn-left');
const btnTouchRight = document.getElementById('btn-right');
const btnTouchRotate = document.getElementById('btn-rotate');
const btnTouchDown = document.getElementById('btn-down');

btnTouchLeft.addEventListener('touchstart', (e) => { e.preventDefault(); moveLeft(); });
btnTouchRight.addEventListener('touchstart', (e) => { e.preventDefault(); moveRight(); });
btnTouchRotate.addEventListener('touchstart', (e) => { e.preventDefault(); rotatePiece(); });
btnTouchDown.addEventListener('touchstart', (e) => { e.preventDefault(); moveDown(); });

btnTouchLeft.addEventListener('click', moveLeft);
btnTouchRight.addEventListener('click', moveRight);
btnTouchRotate.addEventListener('click', rotatePiece);
btnTouchDown.addEventListener('click', moveDown);

window.addEventListener('blur', () => { isPaused = true; });
window.addEventListener('focus', () => { isPaused = false; });

document.addEventListener('lineCleared', (e) => {
    const wrapper = document.querySelector('.triangle-wrapper');
    wrapper.classList.add('flash');
    setTimeout(() => wrapper.classList.remove('flash'), 300);
});

document.addEventListener('DOMContentLoaded', () => {
    createRightTriangleBoard();
});