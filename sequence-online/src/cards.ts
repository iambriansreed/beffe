/** Card utility functions. */

export const SUIT_SYMBOLS: Record<string, string> = {
    S: '♠',
    H: '♥',
    D: '♦',
    C: '♣',
};

export const SUIT_COLORS: Record<string, string> = {
    S: 'black',
    H: 'red',
    D: 'red',
    C: 'black',
};

export function parseCard(card: string): { rank: string; suit: string; symbol: string; color: string } | null {
    if (card === 'W' || card === '??') return null;
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);
    return { rank, suit, symbol: SUIT_SYMBOLS[suit] ?? suit, color: SUIT_COLORS[suit] ?? 'black' };
}

export function cardLabel(card: string): string {
    if (card === 'W') return '★';
    if (card === '??') return '?';
    const parsed = parseCard(card);
    if (!parsed) return card;
    return `${parsed.rank}${parsed.symbol}`;
}

/** Returns the suit color for CSS use. */
export function cardColor(card: string): string {
    if (card === 'W' || card === '??') return '';
    const suit = card.slice(-1);
    return SUIT_COLORS[suit] ?? 'black';
}

/** One-eyed jacks (JH, JS) — remove opponent chip. */
export const isOneEyedJack = (c: string) => c === 'JH' || c === 'JS';

/** Two-eyed jacks (JD, JC) — place anywhere. */
export const isTwoEyedJack = (c: string) => c === 'JD' || c === 'JC';

export const isJack = (c: string) => isOneEyedJack(c) || isTwoEyedJack(c);

/** Returns board indices that are valid targets for the given card.
 *  `board` is the full 100-cell board state from the server.
 */
export function getValidMoves(
    card: string,
    board: import('./types').CellState[],
    playerColor: import('./types').ChipColor,
): number[] {
    if (isOneEyedJack(card)) {
        // Can remove any opponent chip that is NOT in a completed sequence
        return board.reduce<number[]>((acc, cell, idx) => {
            if (cell.chip && cell.chip !== playerColor && !cell.inSequence) acc.push(idx);
            return acc;
        }, []);
    }

    if (isTwoEyedJack(card)) {
        // Can place on any empty non-corner cell
        return board.reduce<number[]>((acc, cell, idx) => {
            if (!cell.chip && cell.card !== 'W') acc.push(idx);
            return acc;
        }, []);
    }

    // Regular card — find matching board positions that are empty
    return board.reduce<number[]>((acc, cell, idx) => {
        if (cell.card === card && !cell.chip) acc.push(idx);
        return acc;
    }, []);
}
