/**
 * Sequence board layout — 10×10 grid (100 cells).
 *
 * Rules:
 *  - 4 corner cells are wild (any player may use them for sequences).
 *  - Every non-Jack card from a standard 52-card deck appears exactly twice.
 *  - Jacks are NOT placed on the board; they have special gameplay effects.
 *
 * Card notation: '{rank}{suit}'
 *   rank: A 2 3 4 5 6 7 8 9 10 Q K
 *   suit: S(♠) H(♥) D(♦) C(♣)
 *   wild: W
 */

export const BOARD_LAYOUT: string[] = [
    // Row 0 — top border
    'W',   '2S',  '3S',  '4S',  '5S',  '6S',  '7S',  '8S',  '9S',  'W',
    // Row 1
    '10S', '2C',  '3C',  '4C',  '5C',  '6C',  '7C',  '8C',  '9C',  '10C',
    // Row 2
    'QS',  '2D',  '3D',  '4D',  '5D',  '6D',  '7D',  '8D',  '9D',  'QC',
    // Row 3
    'KS',  'KS',  'AS',  '2C',  '3C',  '4C',  '5C',  '6C',  '7C',  'KC',
    // Row 4
    'AS',  'QS',  '10S', '8C',  '9C',  '2D',  '3D',  '4D',  '5D',  'AC',
    // Row 5
    '10H', '2S',  '3S',  '4S',  '5S',  '6S',  '7S',  '8S',  '9S',  '10D',
    // Row 6
    'QH',  '2H',  '3H',  '4H',  '5H',  '6H',  '7H',  '8H',  '9H',  'QD',
    // Row 7
    'KH',  '10H', 'QH',  'KH',  'AH',  '6D',  '7D',  '8D',  '9D',  'KD',
    // Row 8
    'AH',  '10C', 'QC',  'KC',  'AC',  '10D', 'QD',  'KD',  'AD',  'AD',
    // Row 9 — bottom border
    'W',   '2H',  '3H',  '4H',  '5H',  '6H',  '7H',  '8H',  '9H',  'W',
];

/** Returns all board indices that match the given card. */
export function getCardPositions(card: string): number[] {
    return BOARD_LAYOUT.reduce<number[]>((acc, c, i) => {
        if (c === card) acc.push(i);
        return acc;
    }, []);
}

export const isWild = (card: string) => card === 'W';

/** One-eyed jacks (JH, JS) — remove an opponent's chip. */
export const isOneEyedJack = (card: string) => card === 'JH' || card === 'JS';

/** Two-eyed jacks (JD, JC) — place chip on any empty non-corner cell. */
export const isTwoEyedJack = (card: string) => card === 'JD' || card === 'JC';

export const isJack = (card: string) => isOneEyedJack(card) || isTwoEyedJack(card);

/** All lines (rows, columns, diagonals) used for sequence detection. */
export function getAllLines(): number[][] {
    const lines: number[][] = [];

    // 10 rows
    for (let r = 0; r < 10; r++) {
        lines.push(Array.from({ length: 10 }, (_, c) => r * 10 + c));
    }

    // 10 columns
    for (let c = 0; c < 10; c++) {
        lines.push(Array.from({ length: 10 }, (_, r) => r * 10 + c));
    }

    // Diagonals (top-left to bottom-right), length >= 5
    for (let start = 0; start <= 5; start++) {
        const len = 10 - start;
        lines.push(Array.from({ length: len }, (_, i) => (start + i) * 10 + i));
        if (start > 0) {
            lines.push(Array.from({ length: len }, (_, i) => i * 10 + (start + i)));
        }
    }

    // Diagonals (top-right to bottom-left), length >= 5
    for (let start = 4; start < 10; start++) {
        const len = start + 1;
        lines.push(Array.from({ length: len }, (_, i) => i * 10 + (start - i)));
        if (start < 9) {
            const offset = 9 - start;
            const len2 = 10 - offset;
            lines.push(Array.from({ length: len2 }, (_, i) => (offset + i) * 10 + (9 - i)));
        }
    }

    return lines.filter((l) => l.length >= 5);
}
