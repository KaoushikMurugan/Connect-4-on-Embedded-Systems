/**
 * enum to represent the different game states
 */
enum GameState {
    Reserved,
    GameOver,
    Playing
}

/**
 * Data regarding the game that is sent to AWS IoT Device Shadow(s)
 */
type Connect4GameData = {
    Board: string;
    CurrentTurn: number;
    Winner: number;
    /** 0 = awaiting input */
    PlayerInput: number;
    GameState: GameState;
};

/**
 * Class to represent a game of Connect 4
 */
class Connect4Game {
    /** 0 = empty, 1 = player 1, 2 = player 2 */
    private board: number[][];
    /** 1 = player 1, 2 = player 2 */
    private turn: number;
    /** 0 = not decided, 1 = player 1, 2 = player 2, -1 = tie */
    private winner: number;
    /** current game state */
    private gameState: GameState;

    /**
     * Initalizes the game
     */
    constructor() {
        this.board = [];
        for (let i = 0; i < 6; i++) {
            this.board[i] = [0, 0, 0, 0, 0, 0, 0];
        }
        this.turn = 1;
        this.winner = 0;
        this.gameState = GameState.GameOver;
    }

    /**
     * Sets the game state
     * @param state the new game state
     */
    public setGameState(state: GameState) {
        this.gameState = state;
    }

    public resetGame(): void {
        this.board = [];
        for (let i = 0; i < 6; i++) {
            this.board[i] = [0, 0, 0, 0, 0, 0, 0];
        }
        this.turn = 1;
        this.winner = 0;
        this.gameState = GameState.GameOver;
    }

    /**
     *
     * @returns true if the game is over, false otherwise
     */
    public isGameOver(): boolean {
        return this.winner !== 0;
    }

    /**
     * -1 - tie
     *
     * 0 - game is not over
     *
     * 1 - player 1 won
     *
     * 2 - player 2 won
     * @returns the winner of the game
     */
    public getWinner(): number {
        return this.winner;
    }

    /**
     * 1 - player 1
     *
     * 2 - player 2
     * @returns whose turn it is
     */
    public getCurrentPlayer(): number {
        return this.turn;
    }

    /**
     *
     * @param column the column where the new peice is being placed (0-indexed)
     * @returns true if the move was valid, false otherwise
     */
    public playMove(column: number): boolean {
        if (this.isGameOver()) {
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
                // Place piece on the board
                this.board[i]![column] = this.turn;
                // Change turn to the next player
                this.turn = (this.turn % 2) + 1;
                // Check to see if there is a winner
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
        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < 6; i++) {
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
            for (let j = 0; j < 7; j++) {
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
        for (let i = 3; i < 6; i++) {
            for (let j = 0; j < 4; j++) {
                if (
                    this.board[i]![j] !== 0 &&
                    this.board[i]![j] === this.board[i - 1]![j + 1] &&
                    this.board[i]![j] === this.board[i - 2]![j + 2] &&
                    this.board[i]![j] === this.board[i - 3]![j + 3]
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
        for (let i = 3; i < 6; i++) {
            for (let j = 3; j < 7; j++) {
                if (
                    this.board[i]![j] !== 0 &&
                    this.board[i]![j] === this.board[i - 1]![j - 1] &&
                    this.board[i]![j] === this.board[i - 2]![j - 2] &&
                    this.board[i]![j] === this.board[i - 3]![j - 3]
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
    public gameStateToJSON(playerInput: number): Connect4GameData {
        // Convert this.board into a string of numbers
        // For easy parsing in C

        var boardString = '';
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 7; j++) {
                boardString += this.board[i]![j]!.toString();
            }
        }

        return {
            Board: boardString,
            CurrentTurn: this.turn,
            Winner: this.winner,
            PlayerInput: playerInput,
            GameState: this.gameState
        };
    }
}

export { GameState, Connect4GameData, Connect4Game };
