import express, { Express } from 'express';
import vhost from 'vhost';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { SocketServer } from '@bsr-comm/utils';
import crypto from 'node:crypto';
import http from 'node:http';

export default async function App(app: Express, server: http.Server) {
    app.use(helmet());
    app.all('*', function (_, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        );
        next();
    });
    app.use(express.json());

    app.use(vhost('local.com', (await import('./apps/local')).default));
    app.use(vhost('local.dev', (await import('./apps/local')).default));

    app.use(vhost('api.heyreed.dev', (await import('./apps/api.heyreed')).default));
    app.use(vhost('api.heyreed.com', (await import('./apps/api.heyreed')).default));

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
