type Connect4GameData = {
    Board: number[][];
    'Current Turn': number;
    Winner: number;
};

class Connect4Game {
    /** 0 = empty, 1 = player 1, 2 = player 2 */
    private board: number[][];
    /** 1 = player 1, 2 = player 2 */
    private turn: number;
    /** 0 = not decided, 1 = player 1, 2 = player 2, -1 = tie */
    private winner: number;
    constructor() {
        this.board = [];
        for (let i = 0; i < 6; i++) {
            this.board[i] = [0, 0, 0, 0, 0, 0, 0];
        }
        this.turn = 0;
        this.winner = 0;
    }

    public isGameOver(): boolean {
        return this.winner !== 0;
    }

    public getWinner(): number {
        return this.winner;
    }

    public getTurn(): number {
        return this.turn;
    }
    /**
     *
     * @param column the column where the new peice is being placed
     * @param player the player who is placing the peice
     * @returns true if the move was valid, false otherwise
     */
    public move(column: number, player: number): boolean {
        if (this.isGameOver()) {
            return false;
        }
        if (this.turn !== player) {
            return false;
        }
        if (column < 0 || column > 6) {
            return false;
        }
        // quick check to see if the column is full
        if (this.board[0]![column] !== 0) {
            return false;
        }
        for (let i = 5; i >= 0; i--) {
            if (this.board[i]![column] === 0) {
                this.board[i]![column] = player;
                this.turn = (this.turn % 2) + 1;
                this.winner = this.checkWinner();
                return true;
            }
        }
        return false;
    }
    /**
     * Checks to see if there is a winner
     * @returns 0 if the game is not over, 1 if player 1 won, 2 if player 2 won, -1 if the game is a tie
     */
    private checkWinner(): number {
        // ! There should never be a situation where there are two winners
        const hor = this.checkHotizontal();
        const ver = this.checkVertical();
        const main = this.checkMainDiagonal();
        const off = this.checkOffDiagonal();
        if (hor !== 0) {
            return hor;
        } else if (ver !== 0) {
            return ver;
        } else if (main !== 0) {
            return main;
        } else if (off !== 0) {
            return off;
        } else if (this.isBoardFull()) {
            return -1;
        } else {
            return 0;
        }
    }
    /**
     * Checks to see if the board is full
     * @returns true if the board is full, false otherwise
     */
    private isBoardFull(): boolean {
        for (let j = 0; j < 7; j++) {
            if (this.board[0]![j] === 0) {
                return false;
            }
        }
        return true;
    }
    /**
     * Checks the horizontals for a winner
     * @returns 0 if there is no winner, 1 if player 1 won, 2 if player 2 won
     */
    private checkHotizontal(): number {
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 4; j++) {
                if (
                    this.board[i]![j] !== 0 &&
                    this.board[i]![j] === this.board[i]![j + 1] &&
                    this.board[i]![j] === this.board[i]![j + 2] &&
                    this.board[i]![j] === this.board[i]![j + 3]
                ) {
                    return this.board[i]![j]!;
                }
            }
        }
        return 0;
    }
    /**
     * Checks the verticals for a winner
     * @returns 0 if there is no winner, 1 if player 1 won, 2 if player 2 won
     */
    private checkVertical(): number {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 6; j++) {
                if (
                    this.board[i]![j] !== 0 &&
                    this.board[i]![j] === this.board[i + 1]![j] &&
                    this.board[i]![j] === this.board[i + 2]![j] &&
                    this.board[i]![j] === this.board[i + 3]![j]
                ) {
                    return this.board[i]![j]!;
                }
            }
        }
        return 0;
    }

    /**
     * Checks the main diagonals (top left to bottom right) for a winner
     * @returns 0 if there is no winner, 1 if player 1 won, 2 if player 2 won
     */
    private checkMainDiagonal(): number {
        for (let i = 0; i < 3; i++) {
            for (let j = 3; j < 6; j++) {
                if (
                    this.board[i]![j] !== 0 &&
                    this.board[i]![j] === this.board[i + 1]![j - 1] &&
                    this.board[i]![j] === this.board[i + 2]![j - 2] &&
                    this.board[i]![j] === this.board[i + 3]![j - 3]
                ) {
                    return this.board[i]![j]!;
                }
            }
        }
        return 0;
    }
    /**
     * Checks the off diagonals (top right to bottom left) for a winner
     * @returns 0 if there is no winner, 1 if player 1 won, 2 if player 2 won
     */
    private checkOffDiagonal(): number {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (
                    this.board[i]![j] !== 0 &&
                    this.board[i]![j] === this.board[i + 1]![j + 1] &&
                    this.board[i]![j] === this.board[i + 2]![j + 2] &&
                    this.board[i]![j] === this.board[i + 3]![j + 3]
                ) {
                    return this.board[i]![j]!;
                }
            }
        }
        return 0;
    }
    /**
     * Converts the relevant game data into a JSON format to be used by the AWS IoT Shadow
     * @returns the game data in a JSON format
     */
    public toJSON(): Connect4GameData {
        return {
            Board: this.board,
            'Current Turn': this.turn,
            Winner: this.winner
        };
    }
}

export { Connect4Game };
