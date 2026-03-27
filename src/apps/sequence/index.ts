import { appFromConfig } from '../../utils/appFromConfig';
import { setupSequenceSocket } from './socket';
import { gameManager } from './game';

export default appFromConfig({
    hostname: ['api.sequence-online.com', 'api.sequence-online.dev'],
    corsOrigins: ['sequence-online.com', 'sequence-online.dev'],
    socketIoAllowedHosts: ['api.sequence-online.com', 'api.sequence-online.dev'],
    setupSocket: setupSequenceSocket,

    get: {
        '/': (_req, res) => {
            res.json({ name: 'sequence-online api', status: 'ok' });
        },
        '/game/:id': (req, res) => {
            const state = gameManager.get(req.params.id.toUpperCase());
            if (!state) {
                res.status(404).json({ error: 'Game not found' });
                return;
            }
            // Return a public view (no hands)
            res.json({
                ...state,
                deck: [],
                discardPile: [],
                players: state.players.map((p) => ({ ...p, hand: [] })),
            });
        },
    },

    post: {
        '/game': (req, res) => {
            const maxPlayers = req.body?.maxPlayers === 3 ? 3 : 2;
            const state = gameManager.create(maxPlayers);
            res.json({ gameId: state.id });
        },
    },
});
