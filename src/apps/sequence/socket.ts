import type { Server } from 'socket.io';
import { addPlayer, exchangeDeadCard, gameManager, playCard, reconnectPlayer } from './game';

/** Sanitise game state for sending to clients (hide other players' hands). */
function stateForPlayer(state: ReturnType<typeof gameManager.get>, playerId: string) {
    if (!state) return null;
    return {
        ...state,
        deck: [],                         // never expose the deck
        discardPile: [],
        players: state.players.map((p) => ({
            ...p,
            hand: p.id === playerId ? p.hand : p.hand.map(() => '??'),
        })),
    };
}

/** Broadcast the full game state to every player in the game, customised per player. */
function broadcastState(io: Server, state: NonNullable<ReturnType<typeof gameManager.get>>) {
    for (const player of state.players) {
        io.to(socketId(state.id, player.id)).emit('game:state', stateForPlayer(state, player.id));
    }
    // Also emit to the room (for spectators / reconnection before player ID is known)
    io.to(state.id).emit('game:state:public', {
        ...state,
        deck: [],
        discardPile: [],
        players: state.players.map((p) => ({ ...p, hand: p.hand.map(() => '??') })),
    });
}

/** Per-player private room name: game-id:player-id */
function socketId(gameId: string, playerId: string) {
    return `${gameId}:${playerId}`;
}

export function setupSequenceSocket(io: Server): void {
    const ns = io.of('/sequence');

    ns.on('connection', (socket) => {
        /** CREATE GAME */
        socket.on('game:create', ({ name, maxPlayers }: { name: string; maxPlayers: 2 | 3 }) => {
            const players = [2, 3].includes(maxPlayers) ? maxPlayers : 2;
            const state = gameManager.create(players as 2 | 3);
            const result = addPlayer(state, name || 'Player 1');

            if ('error' in result) {
                socket.emit('error', { message: result.error });
                return;
            }

            gameManager.set(result.state);

            const player = result.player;
            socket.join(result.state.id);
            socket.join(socketId(result.state.id, player.id));

            socket.emit('game:created', {
                gameId: result.state.id,
                playerId: player.id,
                state: stateForPlayer(result.state, player.id),
            });

            if (result.state.phase === 'playing') {
                broadcastState(ns as unknown as Server, result.state);
            }
        });

        /** JOIN GAME */
        socket.on('game:join', ({ gameId, name, playerId }: { gameId: string; name: string; playerId?: string }) => {
            const id = gameId?.toUpperCase();
            const existing = gameManager.get(id);

            if (!existing) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }

            // Reconnect existing player
            if (playerId) {
                const player = existing.players.find((p) => p.id === playerId);
                if (player) {
                    const updated = reconnectPlayer(existing, playerId, true);
                    gameManager.set(updated);
                    socket.join(id);
                    socket.join(socketId(id, playerId));
                    socket.emit('game:joined', {
                        playerId,
                        state: stateForPlayer(updated, playerId),
                    });
                    broadcastState(ns as unknown as Server, updated);
                    return;
                }
            }

            // New player joining
            const result = addPlayer(existing, name || 'Player');
            if ('error' in result) {
                socket.emit('error', { message: result.error });
                return;
            }

            gameManager.set(result.state);

            const player = result.player;
            socket.join(id);
            socket.join(socketId(id, player.id));

            socket.emit('game:joined', {
                playerId: player.id,
                state: stateForPlayer(result.state, player.id),
            });

            broadcastState(ns as unknown as Server, result.state);
        });

        /** PLAY CARD */
        socket.on(
            'game:play',
            ({
                gameId,
                playerId,
                cardIndex,
                boardIndex,
            }: {
                gameId: string;
                playerId: string;
                cardIndex: number;
                boardIndex: number;
            }) => {
                const state = gameManager.get(gameId);
                if (!state) {
                    socket.emit('error', { message: 'Game not found' });
                    return;
                }

                const result = playCard(state, playerId, cardIndex, boardIndex);
                if (!result.success) {
                    socket.emit('error', { message: result.error });
                    return;
                }

                gameManager.set(result.state);
                broadcastState(ns as unknown as Server, result.state);

                if (result.state.phase === 'finished') {
                    const winner = result.state.players.find((p) => p.id === result.state.winner);
                    ns.to(gameId).emit('game:over', { winner: winner?.name ?? 'Unknown' });
                }
            },
        );

        /** DEAD CARD EXCHANGE */
        socket.on(
            'game:dead-card',
            ({ gameId, playerId, cardIndex }: { gameId: string; playerId: string; cardIndex: number }) => {
                const state = gameManager.get(gameId);
                if (!state) {
                    socket.emit('error', { message: 'Game not found' });
                    return;
                }

                const result = exchangeDeadCard(state, playerId, cardIndex);
                if (!result.success) {
                    socket.emit('error', { message: result.error });
                    return;
                }

                gameManager.set(result.state);
                broadcastState(ns as unknown as Server, result.state);
            },
        );

        /** DISCONNECT */
        socket.on('disconnect', () => {
            // Mark player disconnected if we stored their info in socket data
            const { gameId, playerId } = socket.data as { gameId?: string; playerId?: string };
            if (gameId && playerId) {
                const state = gameManager.get(gameId);
                if (state) {
                    gameManager.set(reconnectPlayer(state, playerId, false));
                }
            }
        });

        /** PING (keep-alive) */
        socket.on('ping', () => socket.emit('pong'));
    });
}
