document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('game-board');
    const difficultySelector = document.getElementById('difficulty');
    const newGameButton = document.getElementById('new-game');
    const statusElement = document.getElementById('status');
    const modal = document.getElementById('modal');
    const modalText = document.getElementById('modal-text');
    const modalOk = document.getElementById('modal-ok');
    const modalCancel = document.getElementById('modal-cancel');

    let board = [];
    let selectedPiece = null;
    let onConfirm = null;
    let isPlayerTurn = true;

    function showModal(text, showCancel = false) {
        modalText.textContent = text;
        modalCancel.style.display = showCancel ? 'inline-block' : 'none';
        modal.classList.add('show');
    }

    function hideModal() {
        modal.classList.remove('show');
    }

    modalOk.addEventListener('click', () => {
        hideModal();
        if (onConfirm) {
            onConfirm();
            onConfirm = null;
        }
    });

    modalCancel.addEventListener('click', () => {
        hideModal();
        onConfirm = null;
    });


    function initializeBoard() {
        board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ];
        renderBoard();
        statusElement.textContent = "Your turn";
    }

    function renderBoard() {
        boardElement.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const square = document.createElement('div');
                square.classList.add('square', (i + j) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = i;
                square.dataset.col = j;

                const piece = board[i][j];
                if (piece) {
                    const pieceElement = document.createElement('span');
                    pieceElement.classList.add('piece');
                    pieceElement.textContent = getPieceUnicode(piece);
                    pieceElement.onclick = () => onPieceClick(i, j);
                    square.appendChild(pieceElement);
                } else {
                    square.onclick = () => onSquareClick(i, j);
                }
                boardElement.appendChild(square);
            }
        }
    }

    function getPieceUnicode(piece) {
        const pieces = {
            'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
            'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
        };
        return pieces[piece];
    }

    function onPieceClick(row, col) {
        console.log(`Piece clicked at (${row}, ${col})`);
        if (!isPlayerTurn) return;
        if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            selectedPiece = null;
            clearHighlights();
            return;
        }

        if (selectedPiece) {
            movePiece(selectedPiece.row, selectedPiece.col, row, col);
        } else {
            if (board[row][col] && board[row][col] === board[row][col].toUpperCase()) {
                selectedPiece = { row, col };
                highlightValidMoves(row, col);
            }
        }
    }

    function onSquareClick(row, col) {
        if (!isPlayerTurn) return;
        if (selectedPiece) {
            movePiece(selectedPiece.row, selectedPiece.col, row, col);
        }
    }

    function movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        if (!isValidMove(piece, fromRow, fromCol, toRow, toCol)) {
            if (board[toRow][toCol] && board[toRow][toCol] === board[toRow][toCol].toUpperCase()) {
                selectedPiece = { row: toRow, col: toCol };
                clearHighlights();
                highlightValidMoves(toRow, toCol);
            } else {
                selectedPiece = null;
                clearHighlights();
            }
            return;
        }

        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = '';
        selectedPiece = null;
        clearHighlights();
        renderBoard();

        if (checkGameOver()) return;

        // AI's turn
        isPlayerTurn = false;
        statusElement.textContent = "AI's turn";
        setTimeout(makeAIMove, 500);
    }

    function makeAIMove() {
        const difficulty = difficultySelector.value;
        let move = null;

        if (difficulty === 'easy') {
            move = findRandomMove();
        } else if (difficulty === 'medium') {
            move = findBestMove(1);
        } else if (difficulty === 'hard') {
            move = findBestMove(2);
        }

        if (move) {
            const piece = board[move.fromRow][move.fromCol];
            board[move.toRow][move.toCol] = piece;
            board[move.fromRow][move.fromCol] = '';
            renderBoard();
            if (checkGameOver()) return;
            isPlayerTurn = true;
            statusElement.textContent = "Your turn";
        } else {
            showModal("AI can't find a move. You win!");
        }
    }

    function isValidMove(piece, fromRow, fromCol, toRow, toCol) {
        const targetPiece = board[toRow][toCol];

        // Cannot move to the same square
        if (fromRow === toRow && fromCol === toCol) return false;

        // Cannot capture your own piece
        if (targetPiece && (piece.toLowerCase() === piece) === (targetPiece.toLowerCase() === targetPiece)) {
            return false;
        }

        const pieceType = piece.toLowerCase();
        const rowDiff = Math.abs(fromRow - toRow);
        const colDiff = Math.abs(fromCol - toCol);

        switch (pieceType) {
            case 'p': // Pawn
                const direction = piece === 'P' ? -1 : 1;
                const startRow = piece === 'P' ? 6 : 1;
                // Move forward
                if (colDiff === 0 && !targetPiece) {
                    if (fromRow + direction === toRow) return true;
                    if (fromRow === startRow && fromRow + 2 * direction === toRow && !board[fromRow + direction][fromCol]) return true;
                }
                // Capture
                if (colDiff === 1 && rowDiff === 1 && targetPiece) {
                    if (fromRow + direction === toRow) return true;
                }
                return false;
            case 'r': // Rook
                if (fromRow !== toRow && fromCol !== toCol) return false;
                // Check for pieces in the way
                if (fromRow === toRow) {
                    const step = fromCol < toCol ? 1 : -1;
                    for (let c = fromCol + step; c !== toCol; c += step) {
                        if (board[fromRow][c]) return false;
                    }
                } else {
                    const step = fromRow < toRow ? 1 : -1;
                    for (let r = fromRow + step; r !== toRow; r += step) {
                        if (board[r][fromCol]) return false;
                    }
                }
                return true;
            case 'n': // Knight
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
            case 'b': // Bishop
                if (rowDiff !== colDiff) return false;
                // Check for pieces in the way
                const rStepB = fromRow < toRow ? 1 : -1;
                const cStepB = fromCol < toCol ? 1 : -1;
                let rB = fromRow + rStepB;
                let cB = fromCol + cStepB;
                while (rB !== toRow) {
                    if (board[rB][cB]) return false;
                    rB += rStepB;
                    cB += cStepB;
                }
                return true;
            case 'q': // Queen
                if (rowDiff !== colDiff && fromRow !== toRow && fromCol !== toCol) return false;
                 // Check for pieces in the way
                 if (fromRow === toRow) {
                    const step = fromCol < toCol ? 1 : -1;
                    for (let c = fromCol + step; c !== toCol; c += step) {
                        if (board[fromRow][c]) return false;
                    }
                } else if (fromCol === toCol) {
                    const step = fromRow < toRow ? 1 : -1;
                    for (let r = fromRow + step; r !== toRow; r += step) {
                        if (board[r][fromCol]) return false;
                    }
                } else {
                    const rStep = fromRow < toRow ? 1 : -1;
                    const cStep = fromCol < toCol ? 1 : -1;
                    let r = fromRow + rStep;
                    let c = fromCol + cStep;
                    while (r !== toRow) {
                        if (board[r][c]) return false;
                        r += rStep;
                        c += cStep;
                    }
                }
                return true;
            case 'k': // King
                return rowDiff <= 1 && colDiff <= 1;
        }
        return false;
    }

    function checkGameOver() {
        const king = isPlayerTurn ? 'K' : 'k';
        let kingRow, kingCol;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === king) {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
        }

        if (kingRow === undefined) {
            showModal(isPlayerTurn ? "You Win!" : "AI Wins!");
            return true;
        }
        return false;
    }

    function findBestMove(depth) {
        let bestMove = null;
        let bestScore = -Infinity;

        const possibleMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece === piece.toLowerCase()) { // AI pieces are lowercase
                    for (let tr = 0; tr < 8; tr++) {
                        for (let tc = 0; tc < 8; tc++) {
                            if (isValidMove(piece, r, c, tr, tc)) {
                                possibleMoves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
                            }
                        }
                    }
                }
            }
        }

        for (const move of possibleMoves) {
            const tempBoard = JSON.parse(JSON.stringify(board));
            const piece = tempBoard[move.fromRow][move.fromCol];
            tempBoard[move.toRow][move.toCol] = piece;
            tempBoard[move.fromRow][move.fromCol] = '';
            const score = evaluateBoard(tempBoard);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove || findRandomMove();
    }

    function evaluateBoard(board) {
        let score = 0;
        const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100 };
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece) {
                    const value = pieceValues[piece.toLowerCase()];
                    if (piece === piece.toLowerCase()) {
                        score += value;
                    } else {
                        score -= value;
                    }
                }
            }
        }
        return score;
    }

    function findRandomMove() {
        const possibleMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece === piece.toLowerCase()) { // AI pieces are lowercase
                    for (let tr = 0; tr < 8; tr++) {
                        for (let tc = 0; tc < 8; tc++) {
                            if (isValidMove(piece, r, c, tr, tc)) {
                                possibleMoves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
                            }
                        }
                    }
                }
            }
        }
        if (possibleMoves.length === 0) return null;
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    function highlightValidMoves(row, col) {
        const piece = board[row][col];
        if (!piece) return;

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (isValidMove(piece, row, col, i, j)) {
                    const square = document.querySelector(`[data-row='${i}'][data-col='${j}']`);
                    const dot = document.createElement('div');
                    dot.classList.add('valid-move-dot');
                    square.appendChild(dot);
                }
            }
        }
    }

    function clearHighlights() {
        const dots = document.querySelectorAll('.valid-move-dot');
        dots.forEach(dot => dot.remove());
    }

    newGameButton.addEventListener('click', initializeBoard);

    initializeBoard();
});
