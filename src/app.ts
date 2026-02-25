import express, { Express } from 'express';
import vhost from 'vhost';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { SocketServer } from '@bsr-comm/utils';
import crypto from 'node:crypto';
import http from 'node:http';

const CORS_ALLOWED_ORIGINS = new Set(
    (process.env.CORS_ALLOWED_ORIGINS || 'http://local.com,http://local.dev,https://heyreed.com,https://heyreed.dev,https://iambrian.com,https://iambrian.dev,https://splndr.iambrian.dev,http://localhost:3000,http://127.0.0.1:3000')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
);

export default async function App(app: Express, server: http.Server) {
    app.use(helmet());
    app.all('*', function (req, res, next) {
        const origin = req.headers.origin;
        if (origin && CORS_ALLOWED_ORIGINS.has(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.setHeader(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        );
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        next();
    });
    app.use(express.json());

    app.use(vhost('local.com', (await import('./apps/default')).default));
    app.use(vhost('local.dev', (await import('./apps/default')).default));

    app.use(vhost('api.heyreed.dev', (await import('./apps/api.heyreed')).default));
    app.use(vhost('api.heyreed.com', (await import('./apps/api.heyreed')).default));

    app.use(vhost('api.iambrian.dev', (await import('./apps/api.iambrian')).default));
    app.use(vhost('api.iambrian.com', (await import('./apps/api.iambrian')).default));

    // chat.iambrian.com
    new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            allowedHeaders: '*',
        },
    }).on('connection', (socket) => {
        SocketServer({ socket, getUid: () => crypto.randomBytes(16).toString('hex'), maxUsers: 5 });
    });
}
