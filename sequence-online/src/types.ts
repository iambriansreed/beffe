// ---------------------------------------------------------------------------
// Shared types — mirrors the backend types
// ---------------------------------------------------------------------------

export type ChipColor = 'blue' | 'red' | 'green';

export type CellState = {
    card: string;
    chip: ChipColor | null;
    inSequence: boolean;
};

export type Player = {
    id: string;
    name: string;
    color: ChipColor;
    /** '??' entries mean the card is hidden (opponent's hand). */
    hand: string[];
    connected: boolean;
    sequences: number;
};

export type GamePhase = 'waiting' | 'playing' | 'finished';

export type GameState = {
    id: string;
    board: CellState[];
    players: Player[];
    currentPlayerIndex: number;
    phase: GamePhase;
    winner: string | null;
    lastAction: string | null;
    maxPlayers: number;
    sequencesNeeded: number;
};

// ---------------------------------------------------------------------------
// UI state
// ---------------------------------------------------------------------------

export type Screen = 'home' | 'waiting' | 'game';

export type AppState = {
    screen: Screen;
    gameId: string | null;
    playerId: string | null;
    playerName: string | null;
    gameState: GameState | null;
    /** Index of the card currently selected in the player's hand (null = none). */
    selectedCardIndex: number | null;
    /** Board indices that are valid targets for the selected card. */
    validMoves: number[];
    error: string | null;
};
