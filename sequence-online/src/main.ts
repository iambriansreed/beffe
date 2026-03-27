import './style.css';
import { getSocket } from './socket';
import { cardColor, cardLabel, getValidMoves, isJack, isOneEyedJack, isTwoEyedJack } from './cards';
import type { AppState, CellState, GameState, Player } from './types';

// ---------------------------------------------------------------------------
// Persistent session
// ---------------------------------------------------------------------------

const SESSION_KEY = 'sequence_session';

function saveSession(gameId: string, playerId: string, playerName: string) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ gameId, playerId, playerName }));
}

function loadSession(): { gameId: string; playerId: string; playerName: string } | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

const state: AppState = {
    screen: 'home',
    gameId: null,
    playerId: null,
    playerName: null,
    gameState: null,
    selectedCardIndex: null,
    validMoves: [],
    error: null,
};

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

const app = document.getElementById('app')!;

function render() {
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'waiting') renderWaiting();
    else if (state.screen === 'game') renderGame();
}

// ---------------------------------------------------------------------------
// Home screen
// ---------------------------------------------------------------------------

function renderHome() {
    app.innerHTML = `
    <div class="home-screen">
        <div class="home-logo">
            <h1>Se<span>q</span>uence</h1>
            <p>The classic board game, online</p>
        </div>

        <div class="home-card">
            <h2>Create a Game</h2>

            <div>
                <label for="create-name">Your name</label>
                <input id="create-name" type="text" placeholder="Enter your name" maxlength="20" autocomplete="off" />
            </div>

            <div>
                <label>Players</label>
                <div class="player-count-row">
                    <button class="btn btn-secondary" id="btn-2p">2 players</button>
                    <button class="btn btn-secondary" id="btn-3p">3 players</button>
                </div>
            </div>
        </div>

        <div class="divider">or</div>

        <div class="home-card">
            <h2>Join a Game</h2>
            <div>
                <label for="join-name">Your name</label>
                <input id="join-name" type="text" placeholder="Enter your name" maxlength="20" autocomplete="off" />
            </div>
            <div>
                <label for="join-code">Game code</label>
                <input id="join-code" type="text" placeholder="e.g. AB12CD" maxlength="8"
                       style="text-transform:uppercase;letter-spacing:.1em" autocomplete="off" />
            </div>
            <button class="btn btn-primary" id="btn-join">Join Game</button>
        </div>

        ${state.error ? `<div class="error-msg">${state.error}</div>` : ''}
    </div>`;

    const createName = document.getElementById('create-name') as HTMLInputElement;
    const joinName = document.getElementById('join-name') as HTMLInputElement;
    const joinCode = document.getElementById('join-code') as HTMLInputElement;

    // Auto-fill name from last session
    const session = loadSession();
    if (session?.playerName) {
        createName.value = session.playerName;
        joinName.value = session.playerName;
    }

    document.getElementById('btn-2p')!.addEventListener('click', () => {
        const name = createName.value.trim();
        if (!name) { createName.focus(); return; }
        createGame(name, 2);
    });

    document.getElementById('btn-3p')!.addEventListener('click', () => {
        const name = createName.value.trim();
        if (!name) { createName.focus(); return; }
        createGame(name, 3);
    });

    document.getElementById('btn-join')!.addEventListener('click', () => {
        const name = joinName.value.trim();
        const code = joinCode.value.trim().toUpperCase();
        if (!name) { joinName.focus(); return; }
        if (!code) { joinCode.focus(); return; }
        joinGame(name, code);
    });

    joinCode.addEventListener('input', () => {
        joinCode.value = joinCode.value.toUpperCase();
    });
}

// ---------------------------------------------------------------------------
// Waiting screen
// ---------------------------------------------------------------------------

function renderWaiting() {
    const gs = state.gameState;
    const maxPlayers = gs?.maxPlayers ?? 2;
    const players = gs?.players ?? [];

    const slots = Array.from({ length: maxPlayers }, (_, i) => {
        const p = players[i];
        const colors = ['blue', 'red', 'green'];
        if (p) {
            const isYou = p.id === state.playerId;
            return `
            <div class="player-slot">
                <div class="player-chip chip-${colors[i]}"></div>
                <span class="player-slot-name">${p.name}</span>
                <span class="player-slot-badge ${isYou ? 'badge-you' : p.connected ? 'badge-online' : 'badge-offline'}">
                    ${isYou ? 'You' : p.connected ? 'Online' : 'Offline'}
                </span>
            </div>`;
        }
        return `
        <div class="player-slot empty">
            <div class="player-chip chip-${colors[i]}"></div>
            <span class="player-slot-name">Waiting for player…</span>
        </div>`;
    });

    app.innerHTML = `
    <div class="waiting-screen">
        <h1>Game Lobby</h1>

        <div class="game-code-box">
            <div class="label">Share this code</div>
            <div class="code">${state.gameId ?? ''}</div>
        </div>

        <div class="players-list">${slots.join('')}</div>

        <p style="color:var(--text-dim);font-size:13px;text-align:center">
            Waiting for ${maxPlayers - players.length} more player${maxPlayers - players.length !== 1 ? 's' : ''}…
        </p>

        <button class="btn btn-secondary" id="btn-leave" style="width:100%">Leave</button>

        ${state.error ? `<div class="error-msg">${state.error}</div>` : ''}
    </div>`;

    document.getElementById('btn-leave')!.addEventListener('click', () => {
        clearSession();
        state.screen = 'home';
        state.gameId = null;
        state.playerId = null;
        state.gameState = null;
        state.error = null;
        render();
    });
}

// ---------------------------------------------------------------------------
// Game screen
// ---------------------------------------------------------------------------

function renderGame() {
    const gs = state.gameState;
    if (!gs) return;

    const me = gs.players.find((p) => p.id === state.playerId);
    const isMyTurn = me && gs.players[gs.currentPlayerIndex]?.id === state.playerId;
    const currentPlayer = gs.players[gs.currentPlayerIndex];

    // Header
    const playerBadges = gs.players.map((p) => {
        const isActive = gs.players[gs.currentPlayerIndex]?.id === p.id;
        const seqStr = `${'★'.repeat(p.sequences)}${'☆'.repeat(Math.max(0, gs.sequencesNeeded - p.sequences))}`;
        return `
        <div class="player-badge ${isActive ? 'active' : ''}">
            <div class="dot" style="background:var(--chip-${p.color})"></div>
            <span>${p.name}${p.id === state.playerId ? ' (you)' : ''}</span>
            <span class="seqs" title="Sequences">${seqStr}</span>
            ${!p.connected ? '<span class="offline-tag">offline</span>' : ''}
        </div>`;
    }).join('');

    const turnText = isMyTurn ? 'Your turn' : `${currentPlayer?.name ?? ''}'s turn`;

    // Board
    const boardHtml = gs.board.map((cell, idx) => {
        const isValid = state.validMoves.includes(idx);
        const classes = ['cell'];
        if (cell.card === 'W') classes.push('wild');
        if (cell.inSequence) classes.push('in-sequence');
        if (isValid) classes.push('valid-move');

        const label = cardLabel(cell.card);
        const color = cell.card === 'W' ? 'wild' : cardColor(cell.card);
        const chipHtml = cell.chip
            ? `<div class="chip ${cell.chip}"></div>`
            : '';

        return `<div class="${classes.join(' ')}" data-idx="${idx}">
            ${chipHtml}
            <span class="card-text ${color}">${label}</span>
        </div>`;
    }).join('');

    // Hand
    const handHtml = me
        ? me.hand.map((card, ci) => {
            const isSelected = state.selectedCardIndex === ci;
            const isHidden = card === '??';
            if (isHidden) return `<div class="hand-card back"></div>`;

            const classes = ['hand-card'];
            if (isSelected) classes.push('selected');
            const col = cardColor(card);
            if (col) classes.push(col);
            if (isOneEyedJack(card)) classes.push('jack-one');
            if (isTwoEyedJack(card)) classes.push('jack-two');
            if (!isMyTurn) classes.push('disabled');

            // Dead card indicator
            const isDead = !isJack(card) &&
                gs.board
                    .reduce<number[]>((acc, c, i) => { if (c.card === card) acc.push(i); return acc; }, [])
                    .every((i) => gs.board[i].chip !== null);

            const parsed = card.slice(-1);
            const rank = card.slice(0, -1);
            const suitSym = { S: '♠', H: '♥', D: '♦', C: '♣' }[parsed] ?? parsed;

            return `<div class="${classes.join(' ')}" data-ci="${ci}">
                <span class="rank">${rank}</span>
                <span class="suit">${suitSym}</span>
                ${isDead ? '<span class="dead-card-btn">dead</span>' : ''}
            </div>`;
        }).join('')
        : '';

    app.innerHTML = `
    <div class="game-screen">
        <div class="game-header">
            ${playerBadges}
            <div class="turn-indicator">${turnText}</div>
        </div>

        <div class="board-wrap">
            <div class="board">${boardHtml}</div>
        </div>

        <div class="hand-wrap">
            <div class="hand-label">Your hand</div>
            <div class="hand">${handHtml}</div>
        </div>

        <div class="action-bar">
            <span class="last-action">${gs.lastAction ?? ''}</span>
            ${state.selectedCardIndex !== null
                ? '<button class="btn btn-secondary" id="btn-cancel" style="font-size:12px;padding:6px 12px">Cancel</button>'
                : ''}
        </div>

        ${state.error ? `<div class="error-msg" style="grid-column:1;margin:0 0 4px">${state.error}</div>` : ''}
    </div>`;

    // Board click
    document.querySelector('.board')!.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('[data-idx]') as HTMLElement | null;
        if (!target) return;
        const idx = parseInt(target.dataset.idx!);
        if (!state.validMoves.includes(idx)) return;
        if (state.selectedCardIndex === null) return;
        playCard(state.selectedCardIndex, idx);
    });

    // Hand click
    document.querySelector('.hand')?.addEventListener('click', (e) => {
        if (!isMyTurn || !me) return;
        const target = (e.target as HTMLElement).closest('[data-ci]') as HTMLElement | null;
        if (!target) return;
        const ci = parseInt(target.dataset.ci!);
        if (isNaN(ci)) return;

        const card = me.hand[ci];

        // Click selected card → check dead card exchange
        if (state.selectedCardIndex === ci) {
            const isDead = !isJack(card) &&
                gs.board
                    .reduce<number[]>((acc, c, i) => { if (c.card === card) acc.push(i); return acc; }, [])
                    .every((i) => gs.board[i].chip !== null);
            if (isDead) {
                exchangeDeadCard(ci);
                return;
            }
            // Deselect
            state.selectedCardIndex = null;
            state.validMoves = [];
            renderGame();
            return;
        }

        state.selectedCardIndex = ci;
        state.error = null;
        state.validMoves = getValidMoves(card, gs.board, me.color);
        renderGame();
    });

    document.getElementById('btn-cancel')?.addEventListener('click', () => {
        state.selectedCardIndex = null;
        state.validMoves = [];
        renderGame();
    });

    // Game over overlay
    if (gs.phase === 'finished') {
        const winner = gs.players.find((p) => p.id === gs.winner);
        const isWinner = winner?.id === state.playerId;
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.innerHTML = `
        <div class="overlay-card">
            <h2>${isWinner ? '🎉 You Win!' : `${winner?.name ?? 'Someone'} Wins!`}</h2>
            <p>${isWinner ? 'Congratulations! You completed the sequences first.' : 'Better luck next time!'}</p>
            <button class="btn btn-primary" id="btn-new-game" style="width:100%">Play Again</button>
        </div>`;
        app.appendChild(overlay);
        document.getElementById('btn-new-game')!.addEventListener('click', () => {
            clearSession();
            state.screen = 'home';
            state.gameId = null;
            state.playerId = null;
            state.gameState = null;
            state.selectedCardIndex = null;
            state.validMoves = [];
            state.error = null;
            render();
        });
    }
}

// ---------------------------------------------------------------------------
// Socket actions
// ---------------------------------------------------------------------------

function createGame(name: string, maxPlayers: 2 | 3) {
    state.error = null;
    state.playerName = name;
    const socket = getSocket();
    socket.emit('game:create', { name, maxPlayers });
}

function joinGame(name: string, gameId: string, playerId?: string) {
    state.error = null;
    state.playerName = name;
    const socket = getSocket();
    socket.emit('game:join', { gameId, name, playerId });
}

function playCard(cardIndex: number, boardIndex: number) {
    const socket = getSocket();
    socket.emit('game:play', {
        gameId: state.gameId,
        playerId: state.playerId,
        cardIndex,
        boardIndex,
    });
    state.selectedCardIndex = null;
    state.validMoves = [];
}

function exchangeDeadCard(cardIndex: number) {
    const socket = getSocket();
    socket.emit('game:dead-card', {
        gameId: state.gameId,
        playerId: state.playerId,
        cardIndex,
    });
    state.selectedCardIndex = null;
    state.validMoves = [];
}

// ---------------------------------------------------------------------------
// Socket event handlers
// ---------------------------------------------------------------------------

function applyGameState(gs: GameState) {
    state.gameState = gs;
    // If game started, switch to game screen
    if (gs.phase === 'playing' || gs.phase === 'finished') {
        if (state.screen !== 'game') {
            state.screen = 'game';
            state.selectedCardIndex = null;
            state.validMoves = [];
        }
    } else if (gs.phase === 'waiting') {
        state.screen = 'waiting';
    }
    state.error = null;
    render();
}

function initSocket() {
    const socket = getSocket();

    socket.on('game:created', (data: { gameId: string; playerId: string; state: GameState }) => {
        state.gameId = data.gameId;
        state.playerId = data.playerId;
        saveSession(data.gameId, data.playerId, state.playerName ?? '');
        applyGameState(data.state);
    });

    socket.on('game:joined', (data: { playerId: string; state: GameState }) => {
        state.playerId = data.playerId;
        saveSession(data.state.id, data.playerId, state.playerName ?? '');
        state.gameId = data.state.id;
        applyGameState(data.state);
    });

    socket.on('game:state', (gs: GameState) => {
        // Only update if this state belongs to our current game
        if (gs.id === state.gameId) {
            // Reset selection if turn changed
            const prevPlayer = state.gameState?.currentPlayerIndex;
            if (prevPlayer !== gs.currentPlayerIndex) {
                state.selectedCardIndex = null;
                state.validMoves = [];
            }
            applyGameState(gs);
        }
    });

    socket.on('game:over', (_data: { winner: string }) => {
        // The final state will come via game:state — just re-render
        render();
    });

    socket.on('error', (data: { message: string }) => {
        state.error = data.message;
        render();
    });

    socket.on('connect_error', () => {
        state.error = 'Connection error — retrying…';
        render();
    });

    socket.on('connect', () => {
        // Clear connection error
        if (state.error?.startsWith('Connection')) {
            state.error = null;
            render();
        }
        // Attempt to rejoin in-progress game
        const session = loadSession();
        if (session && state.screen !== 'game' && state.screen !== 'waiting') {
            state.playerName = session.playerName;
            joinGame(session.playerName, session.gameId, session.playerId);
        }
    });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

initSocket();

// Try to resume session on load
const session = loadSession();
if (session) {
    state.playerName = session.playerName;
    state.gameId = session.gameId;
    state.playerId = session.playerId;
}

render();
