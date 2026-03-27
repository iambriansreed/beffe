import crypto from 'node:crypto';
import {
    BOARD_LAYOUT,
    getAllLines,
    getCardPositions,
    isJack,
    isOneEyedJack,
    isTwoEyedJack,
    isWild,
} from './board';

// ---------------------------------------------------------------------------
// Types
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
    /** How many sequences a player needs to win. */
    sequencesNeeded: number;
    deck: string[];
    discardPile: string[];
    createdAt: number;
};

export type MoveResult =
    | { success: true; state: GameState }
    | { success: false; error: string };

// ---------------------------------------------------------------------------
// Deck helpers
// ---------------------------------------------------------------------------

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

function buildDeck(): string[] {
    const deck: string[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push(`${rank}${suit}`);
        }
    }
    return deck;
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function createFullDeck(): string[] {
    // 2 standard decks (104 cards)
    return shuffle([...buildDeck(), ...buildDeck()]);
}

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

function createBoard(): CellState[] {
    return BOARD_LAYOUT.map((card) => ({ card, chip: null, inSequence: false }));
}

function cellBelongsTo(cell: CellState, color: ChipColor): boolean {
    return isWild(cell.card) || cell.chip === color;
}

/**
 * Scans the board for newly completed sequences belonging to `color`.
 * Returns arrays of board indices for each new sequence found.
 */
function findNewSequences(board: CellState[], color: ChipColor): number[][] {
    const found: number[][] = [];
    const lines = getAllLines();

    for (const line of lines) {
        let run: number[] = [];
        for (const idx of line) {
            if (cellBelongsTo(board[idx], color) && !board[idx].inSequence) {
                run.push(idx);
                if (run.length === 5) {
                    found.push([...run]);
                    break;
                }
            } else if (board[idx].inSequence) {
                // An already-in-sequence cell is shared; it can extend a run
                // but we still only mark NEW sequences
                run.push(idx);
                if (run.length === 5) {
                    // Only count if at least one new cell
                    if (run.some((i) => !board[i].inSequence && board[i].chip === color)) {
                        found.push([...run]);
                    }
                    break;
                }
            } else {
                run = [];
            }
        }
    }

    return found;
}

// ---------------------------------------------------------------------------
// Game factory
// ---------------------------------------------------------------------------

function handSize(maxPlayers: number): number {
    return maxPlayers === 2 ? 7 : 6;
}

export function createGame(maxPlayers: 2 | 3): GameState {
    const id = crypto.randomBytes(3).toString('hex').toUpperCase();
    const deck = createFullDeck();
    return {
        id,
        board: createBoard(),
        players: [],
        currentPlayerIndex: 0,
        phase: 'waiting',
        winner: null,
        lastAction: null,
        maxPlayers,
        sequencesNeeded: maxPlayers === 3 ? 1 : 2,
        deck,
        discardPile: [],
        createdAt: Date.now(),
    };
}

const COLORS: ChipColor[] = ['blue', 'red', 'green'];

export function addPlayer(state: GameState, name: string): { state: GameState; player: Player } | { error: string } {
    if (state.phase !== 'waiting') return { error: 'Game already started' };
    if (state.players.length >= state.maxPlayers) return { error: 'Game is full' };

    const player: Player = {
        id: crypto.randomBytes(8).toString('hex'),
        name,
        color: COLORS[state.players.length],
        hand: [],
        connected: true,
        sequences: 0,
    };

    const updated: GameState = { ...state, players: [...state.players, player] };

    // Auto-start when full
    if (updated.players.length === updated.maxPlayers) {
        return { state: startGame(updated), player };
    }

    return { state: updated, player };
}

function startGame(state: GameState): GameState {
    const deck = [...state.deck];
    const size = handSize(state.maxPlayers);
    const players = state.players.map((p) => ({
        ...p,
        hand: deck.splice(0, size),
    }));
    return { ...state, deck, players, phase: 'playing', currentPlayerIndex: 0 };
}

// ---------------------------------------------------------------------------
// Play card
// ---------------------------------------------------------------------------

export function playCard(
    state: GameState,
    playerId: string,
    cardIndex: number,
    boardIndex: number,
): MoveResult {
    if (state.phase !== 'playing') return { success: false, error: 'Game not in progress' };

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return { success: false, error: 'Player not found' };
    if (playerIndex !== state.currentPlayerIndex) return { success: false, error: 'Not your turn' };

    const player = state.players[playerIndex];
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
        return { success: false, error: 'Invalid card index' };
    }

    const card = player.hand[cardIndex];
    const targetCell = state.board[boardIndex];

    if (!targetCell) return { success: false, error: 'Invalid board position' };

    let board = state.board.map((c) => ({ ...c }));

    if (isOneEyedJack(card)) {
        // Remove an opponent's chip (cannot remove from a sequence cell)
        if (!targetCell.chip) return { success: false, error: 'No chip to remove' };
        if (targetCell.chip === player.color) return { success: false, error: 'Cannot remove your own chip' };
        if (targetCell.inSequence) return { success: false, error: 'Cannot remove a chip in a sequence' };
        board[boardIndex] = { ...board[boardIndex], chip: null };
    } else if (isTwoEyedJack(card)) {
        // Place on any empty non-corner cell
        if (isWild(targetCell.card)) return { success: false, error: 'Cannot place on a corner space' };
        if (targetCell.chip) return { success: false, error: 'Cell is already occupied' };
        board[boardIndex] = { ...board[boardIndex], chip: player.color };
    } else {
        // Regular card — must match the board cell
        const validPositions = getCardPositions(card);
        if (!validPositions.includes(boardIndex)) {
            return { success: false, error: 'Card does not match this board position' };
        }
        if (targetCell.chip) return { success: false, error: 'Cell is already occupied' };
        if (isWild(targetCell.card)) return { success: false, error: 'Cannot place on a corner space' };
        board[boardIndex] = { ...board[boardIndex], chip: player.color };
    }

    // Check for new sequences
    const newSeqs = isOneEyedJack(card) ? [] : findNewSequences(board, player.color);
    let sequencesGained = 0;
    for (const seq of newSeqs) {
        for (const idx of seq) {
            board[idx] = { ...board[idx], inSequence: true };
        }
        sequencesGained++;
    }

    // Draw a replacement card
    const deck = [...state.deck];
    const discardPile = [...state.discardPile, card];
    const newHand = [...player.hand];
    newHand.splice(cardIndex, 1);
    if (deck.length > 0) {
        newHand.push(deck.shift()!);
    }

    const updatedPlayer: Player = {
        ...player,
        hand: newHand,
        sequences: player.sequences + sequencesGained,
    };

    const players = state.players.map((p, i) => (i === playerIndex ? updatedPlayer : p));

    // Check win
    let winner: string | null = null;
    let phase: GamePhase = 'playing';
    if (updatedPlayer.sequences >= state.sequencesNeeded) {
        winner = updatedPlayer.id;
        phase = 'finished';
    }

    const nextPlayerIndex = (playerIndex + 1) % state.players.length;

    const lastAction = isOneEyedJack(card)
        ? `${player.name} removed a chip`
        : isTwoEyedJack(card)
          ? `${player.name} placed a chip (jack)`
          : `${player.name} played ${card}`;

    return {
        success: true,
        state: {
            ...state,
            board,
            players,
            deck,
            discardPile,
            currentPlayerIndex: phase === 'finished' ? playerIndex : nextPlayerIndex,
            phase,
            winner,
            lastAction,
        },
    };
}

/**
 * Exchange a "dead" card (all matching board positions are occupied).
 * The player discards the card and draws a new one.
 */
export function exchangeDeadCard(
    state: GameState,
    playerId: string,
    cardIndex: number,
): MoveResult {
    if (state.phase !== 'playing') return { success: false, error: 'Game not in progress' };

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return { success: false, error: 'Player not found' };
    if (playerIndex !== state.currentPlayerIndex) return { success: false, error: 'Not your turn' };

    const player = state.players[playerIndex];
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
        return { success: false, error: 'Invalid card index' };
    }

    const card = player.hand[cardIndex];

    if (isJack(card)) return { success: false, error: 'Jacks cannot be dead cards' };

    const positions = getCardPositions(card);
    const allOccupied = positions.every((idx) => state.board[idx].chip !== null);
    if (!allOccupied) return { success: false, error: 'Card is not dead — there are open positions' };

    const deck = [...state.deck];
    const discardPile = [...state.discardPile, card];
    const newHand = [...player.hand];
    newHand.splice(cardIndex, 1);
    if (deck.length > 0) {
        newHand.push(deck.shift()!);
    }

    const updatedPlayer: Player = { ...player, hand: newHand };
    const players = state.players.map((p, i) => (i === playerIndex ? updatedPlayer : p));

    return {
        success: true,
        state: {
            ...state,
            deck,
            discardPile,
            players,
            lastAction: `${player.name} exchanged a dead card`,
        },
    };
}

export function reconnectPlayer(state: GameState, playerId: string, connected: boolean): GameState {
    return {
        ...state,
        players: state.players.map((p) => (p.id === playerId ? { ...p, connected } : p)),
    };
}

// ---------------------------------------------------------------------------
// Game manager (in-memory store)
// ---------------------------------------------------------------------------

class GameManager {
    private games = new Map<string, GameState>();

    create(maxPlayers: 2 | 3): GameState {
        const state = createGame(maxPlayers);
        this.games.set(state.id, state);
        return state;
    }

    get(id: string): GameState | undefined {
        return this.games.get(id);
    }

    set(state: GameState): void {
        this.games.set(state.id, state);
    }

    delete(id: string): void {
        this.games.delete(id);
    }

    /** Remove games older than 4 hours. */
    cleanup(): void {
        const cutoff = Date.now() - 4 * 60 * 60 * 1000;
        for (const [id, game] of this.games) {
            if (game.createdAt < cutoff) this.games.delete(id);
        }
    }
}

export const gameManager = new GameManager();

// Hourly cleanup
setInterval(() => gameManager.cleanup(), 60 * 60 * 1000);
