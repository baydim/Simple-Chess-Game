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
    let castlingAvailability = {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true },
    };

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
        castlingAvailability = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true },
        };
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
        const currentPlayerColor = isPlayerTurn ? 'white' : 'black';

        // Create a temporary board to simulate the move
        const tempBoard = JSON.parse(JSON.stringify(board));
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = '';

        // Check if the move is valid and doesn't result in check
        if (!isValidMove(board, piece, fromRow, fromCol, toRow, toCol) || isKingInCheck(tempBoard, currentPlayerColor)) {
            if (board[toRow][toCol] && board[toRow][toCol].toUpperCase() === board[toRow][toCol]) {
                 // If clicking another of your own pieces, select it
                selectedPiece = { row: toRow, col: toCol };
                clearHighlights();
                highlightValidMoves(toRow, toCol);
            } else {
                showModal("Invalid move.");
                selectedPiece = null;
                clearHighlights();
            }
            return;
        }

        // --- If move is legal, apply it to the real board ---
        board = tempBoard;

        // Handle castling graphics
        if (piece.toLowerCase() === 'k' && Math.abs(fromCol - toCol) === 2) {
            if (toCol > fromCol) { // King-side
                board[toRow][toCol - 1] = board[toRow][toCol + 1];
                board[toRow][toCol + 1] = '';
            } else { // Queen-side
                board[toRow][toCol + 1] = board[toRow][toCol - 2];
                board[toRow][toCol - 2] = '';
            }
        }
        
        // Update castling availability
        updateCastlingAvailability(piece, fromRow, fromCol);

        selectedPiece = null;
        clearHighlights();
        renderBoard();

        if (checkGameOver()) return;

        const opponentColor = isPlayerTurn ? 'black' : 'white';
        if (isKingInCheck(board, opponentColor)) {
            statusElement.textContent = "Check!";
        } else {
            statusElement.textContent = "AI's turn";
        }

        isPlayerTurn = false;
        setTimeout(makeAIMove, 500);
    }

    function makeAIMove() {
        const difficulty = difficultySelector.value;
        let move;

        if (difficulty === 'easy') {
            move = findBestMove(0); // Simple evaluation
        } else if (difficulty === 'medium') {
            move = findBestMove(1);
        } else if (difficulty === 'hard') {
            move = findBestMove(2);
        }

        if (move) {
            const piece = board[move.fromRow][move.fromCol];
            board[move.toRow][move.toCol] = piece;
            board[move.fromRow][move.fromCol] = '';
            
            updateCastlingAvailability(piece, move.fromRow, move.fromCol);

            renderBoard();
            if (checkGameOver()) return;

            const opponentColor = 'white';
             if (isKingInCheck(board, opponentColor)) {
                statusElement.textContent = "Check!";
            } else {
                statusElement.textContent = "Your turn";
            }

            isPlayerTurn = true;
        } else {
            // This case should now correctly mean checkmate or stalemate
             if (isKingInCheck(board, 'black')) {
                showModal("Checkmate! You win!");
            } else {
                showModal("Stalemate! It's a draw.");
            }
        }
    }

    function isValidMove(currentBoard, piece, fromRow, fromCol, toRow, toCol) {
        const targetPiece = currentBoard[toRow][toCol];
        if (fromRow === toRow && fromCol === toCol) return false;
        if (targetPiece && (piece.toLowerCase() === piece) === (targetPiece.toLowerCase() === targetPiece)) {
            return false;
        }

        const pieceType = piece.toLowerCase();
        const rowDiff = Math.abs(fromRow - toRow);
        const colDiff = Math.abs(fromCol - toCol);

        switch (pieceType) {
            case 'p':
                const direction = piece === 'P' ? -1 : 1;
                const startRow = piece === 'P' ? 6 : 1;
                if (colDiff === 0 && !targetPiece) {
                    if (fromRow + direction === toRow) return true;
                    if (fromRow === startRow && fromRow + 2 * direction === toRow && !currentBoard[fromRow + direction][fromCol]) return true;
                }
                if (colDiff === 1 && rowDiff === 1 && targetPiece) {
                    if (fromRow + direction === toRow) return true;
                }
                return false;
            case 'r':
                if (fromRow !== toRow && fromCol !== toCol) return false;
                if (fromRow === toRow) {
                    const step = fromCol < toCol ? 1 : -1;
                    for (let c = fromCol + step; c !== toCol; c += step) {
                        if (currentBoard[fromRow][c]) return false;
                    }
                } else {
                    const step = fromRow < toRow ? 1 : -1;
                    for (let r = fromRow + step; r !== toRow; r += step) {
                        if (currentBoard[r][fromCol]) return false;
                    }
                }
                return true;
            case 'n':
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
            case 'b':
                if (rowDiff !== colDiff) return false;
                const rStepB = fromRow < toRow ? 1 : -1;
                const cStepB = fromCol < toCol ? 1 : -1;
                let rB = fromRow + rStepB;
                let cB = fromCol + cStepB;
                while (rB !== toRow) {
                    if (currentBoard[rB][cB]) return false;
                    rB += rStepB;
                    cB += cStepB;
                }
                return true;
            case 'q':
                 if (rowDiff !== colDiff && fromRow !== toRow && fromCol !== toCol) return false;
                 if (fromRow === toRow) {
                    const step = fromCol < toCol ? 1 : -1;
                    for (let c = fromCol + step; c !== toCol; c += step) {
                        if (currentBoard[fromRow][c]) return false;
                    }
                } else if (fromCol === toCol) {
                    const step = fromRow < toRow ? 1 : -1;
                    for (let r = fromRow + step; r !== toRow; r += step) {
                        if (currentBoard[r][fromCol]) return false;
                    }
                } else {
                    const rStep = fromRow < toRow ? 1 : -1;
                    const cStep = fromCol < toCol ? 1 : -1;
                    let r = fromRow + rStep;
                    let c = fromCol + cStep;
                    while (r !== toRow) {
                        if (currentBoard[r][c]) return false;
                        r += rStep;
                        c += cStep;
                    }
                }
                return true;
            case 'k':
                const kingColor = piece === 'K' ? 'white' : 'black';
                if (castlingAvailability[kingColor] && colDiff === 2 && rowDiff === 0) {
                    const opponentColor = kingColor === 'white' ? 'black' : 'white';
                    if (isKingInCheck(currentBoard, kingColor)) return false;
                    if (toCol > fromCol) { // King-side
                        if (castlingAvailability[kingColor].kingSide && !currentBoard[fromRow][fromCol + 1] && !currentBoard[fromRow][fromCol + 2]) {
                            if (!isSquareAttacked(currentBoard, fromRow, fromCol + 1, opponentColor) && !isSquareAttacked(currentBoard, fromRow, fromCol + 2, opponentColor)) {
                                return true;
                            }
                        }
                    } else { // Queen-side
                        if (castlingAvailability[kingColor].queenSide && !currentBoard[fromRow][fromCol - 1] && !currentBoard[fromRow][fromCol - 2] && !currentBoard[fromRow][fromCol - 3]) {
                             if (!isSquareAttacked(currentBoard, fromRow, fromCol - 1, opponentColor) && !isSquareAttacked(currentBoard, fromRow, fromCol - 2, opponentColor)) {
                                return true;
                            }
                        }
                    }
                }
                return rowDiff <= 1 && colDiff <= 1;
        }
        return false;
    }

    function isSquareAttacked(currentBoard, row, col, attackerColor) {
        const opponentColor = attackerColor === 'white' ? 'black' : 'white';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = currentBoard[r][c];
                if (piece) {
                    const pieceIsAttacker = (attackerColor === 'white' && piece === piece.toUpperCase()) || (attackerColor === 'black' && piece === piece.toLowerCase());
                    if (pieceIsAttacker && isValidMove(currentBoard, piece, r, c, row, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function isKingInCheck(currentBoard, kingColor) {
        const king = kingColor === 'white' ? 'K' : 'k';
        let kingRow, kingCol;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (currentBoard[r][c] === king) {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
            if (kingRow !== undefined) break;
        }
        if (kingRow === undefined) return false;
        const opponentColor = kingColor === 'white' ? 'black' : 'white';
        return isSquareAttacked(currentBoard, kingRow, kingCol, opponentColor);
    }

    function checkGameOver() {
        const currentPlayerColor = isPlayerTurn ? 'white' : 'black';
        const legalMoves = getAllLegalMoves(currentPlayerColor);

        if (legalMoves.length > 0) {
            return false; // Game is not over
        }

        // If no legal moves, it's either checkmate or stalemate
        if (isKingInCheck(board, currentPlayerColor)) {
            showModal(isPlayerTurn ? "Checkmate! AI Wins!" : "Checkmate! You Win!");
        } else {
            showModal("Stalemate! It's a draw.");
        }
        return true;
    }

    function getAllLegalMoves(color) {
        const legalMoves = [];
        const isMyTurn = (color === 'white' && isPlayerTurn) || (color === 'black' && !isPlayerTurn);

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && ((color === 'white' && piece === piece.toUpperCase()) || (color === 'black' && piece === piece.toLowerCase()))) {
                    for (let tr = 0; tr < 8; tr++) {
                        for (let tc = 0; tc < 8; tc++) {
                            if (isValidMove(board, piece, r, c, tr, tc)) {
                                const tempBoard = JSON.parse(JSON.stringify(board));
                                tempBoard[tr][tc] = piece;
                                tempBoard[r][c] = '';
                                if (!isKingInCheck(tempBoard, color)) {
                                    legalMoves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, piece });
                                }
                            }
                        }
                    }
                }
            }
        }
        return legalMoves;
    }

    function findBestMove(depth) {
        const legalMoves = getAllLegalMoves('black');

        if (legalMoves.length === 0) {
            return null; // No legal moves, should be checkmate or stalemate
        }

        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of legalMoves) {
            const tempBoard = JSON.parse(JSON.stringify(board));
            tempBoard[move.toRow][move.toCol] = move.piece;
            tempBoard[move.fromRow][move.fromCol] = '';
            
            const score = evaluateBoard(tempBoard);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        // Add some randomness to easy level
        if (difficultySelector.value === 'easy' && legalMoves.length > 0) {
            if (Math.random() > 0.5) { // 50% chance of a random move
                 return legalMoves[Math.floor(Math.random() * legalMoves.length)];
            }
        }

        return bestMove;
    }

    function evaluateBoard(currentBoard) {
        let totalScore = 0;
        const pieceValues = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900 };
        
        // Positional values (simple version: center control is good)
        const pawnPos = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [5,  5,  5,  5,  5,  5,  5,  5],
            [1,  1,  2,  3,  3,  2,  1,  1],
            [0.5,0.5,1,  2.5,2.5,1,0.5,0.5],
            [0,  0,  0,  2,  2,  0,  0,  0],
            [0.5,-0.5,-1,0,  0,-1,-0.5,0.5],
            [0.5,1,  1, -2, -2, 1,  1,  0.5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];
         const knightPos = [
            [-5,-4,-3,-3,-3,-3,-4,-5],
            [-4,-2, 0, 0, 0, 0,-2,-4],
            [-3, 0, 1, 1.5, 1.5, 1, 0,-3],
            [-3, 0.5, 1.5, 2, 2, 1.5, 0.5,-3],
            [-3, 0, 1.5, 2, 2, 1.5, 0,-3],
            [-3, 0.5, 1, 1.5, 1.5, 1, 0.5,-3],
            [-4,-2, 0, 0.5, 0.5, 0,-2,-4],
            [-5,-4,-3,-3,-3,-3,-4,-5]
        ];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = currentBoard[r][c];
                if (piece) {
                    const value = pieceValues[piece.toLowerCase()];
                    const isWhite = piece === piece.toUpperCase();
                    let score = value;
                    if (piece.toLowerCase() === 'p') {
                        score += isWhite ? pawnPos[r][c] : pawnPos[7-r][c];
                    } else if (piece.toLowerCase() === 'n') {
                        score += knightPos[r][c];
                    }
                    
                    totalScore += isWhite ? -score : score;
                }
            }
        }
        return totalScore;
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
        const currentPlayerColor = isPlayerTurn ? 'white' : 'black';

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (isValidMove(board, piece, row, col, i, j)) {
                    const tempBoard = JSON.parse(JSON.stringify(board));
                    tempBoard[i][j] = piece;
                    tempBoard[row][col] = '';
                    if (!isKingInCheck(tempBoard, currentPlayerColor)) {
                        const square = document.querySelector(`[data-row='${i}'][data-col='${j}']`);
                        const dot = document.createElement('div');
                        dot.classList.add('valid-move-dot');
                        square.appendChild(dot);
                    }
                }
            }
        }
    }

    function clearHighlights() {
        const dots = document.querySelectorAll('.valid-move-dot');
        dots.forEach(dot => dot.remove());
    }

    function updateCastlingAvailability(piece, fromRow, fromCol) {
        if (piece === 'K') {
            castlingAvailability.white.kingSide = false;
            castlingAvailability.white.queenSide = false;
        } else if (piece === 'k') {
            castlingAvailability.black.kingSide = false;
            castlingAvailability.black.queenSide = false;
        } else if (piece === 'R' && fromRow === 7 && fromCol === 0) {
            castlingAvailability.white.queenSide = false;
        } else if (piece === 'R' && fromRow === 7 && fromCol === 7) {
            castlingAvailability.white.kingSide = false;
        } else if (piece === 'r' && fromRow === 0 && fromCol === 0) {
            castlingAvailability.black.queenSide = false;
        } else if (piece === 'r' && fromRow === 0 && fromCol === 7) {
            castlingAvailability.black.kingSide = false;
        }
    }

    newGameButton.addEventListener('click', initializeBoard);

    initializeBoard();
});
