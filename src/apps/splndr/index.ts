import { appFromConfig } from '../../utils/appFromConfig';

const games: Record<string, number> = {};

export default appFromConfig({
    hostname: ['api.splndr.dev', 'api.splndr.com'],
    get: {
        '/': (_req: import('express').Request, res: import('express').Response) => {
            res.send('splndr beffe');
        },
        '/start-game/:gameId': (req: import('express').Request, res: import('express').Response) => {
            games[req.params.gameId] = Date.now();
            res.json({ success: true });
        },
        '/turn/:id': (_req: import('express').Request, res: import('express').Response) => {
            res.end();
        },
    },
    post: {
        '/games': (req: import('express').Request, res: import('express').Response) => {
            res.json({ success: true, games, key: req.body.key });
        },
    },
});
