import express, { Express } from 'express';
import vhost from 'vhost';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { SocketServer } from '@bsr-comm/utils';
import crypto from 'node:crypto';
import http from 'node:http';
import { apiVersionHeaders } from './utils/apiHeaders';
import getApps from './utils/getApps';

export default async function App(app: Express, server: http.Server | http.Server[]) {
    const apps = await getApps();

    /** Origins allowed to call this API. Override with CORS_ALLOWED_ORIGINS. */
    const corsAllowedOrigins = new Set(
        apps
            .flatMap((app) => [...(app.hostname as string[]), ...(app.corsOrigins || [])])
            .flatMap((h) => [`http://${h}`, `https://${h}`]),
    );

    /** Hosts allowed to open Socket.IO connections. Override with SOCKET_IO_ALLOWED_HOSTS. */
    const socketIoAllowedHosts = new Set([
        'localhost',
        '127.0.0.1',
        'beffe.onrender.com',
        ...apps.flatMap((app) => app.socketIoAllowedHosts || []),
    ]);

    const servers = Array.isArray(server) ? server : [server];

    app.use(helmet());
    app.all('*', function (req, res, next) {
        const origin = req.headers.origin;
        if (origin && corsAllowedOrigins.has(origin)) {
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
    app.use(apiVersionHeaders);

    const socketIoConnectionHandler = (socket: import('socket.io').Socket) => {
        SocketServer({ socket, getUid: () => crypto.randomBytes(16).toString('hex'), maxUsers: 5 });
    };

    for (const { hostname, app: subApp } of apps) {
        for (const host of hostname) {
            app.use(vhost(host, subApp));
        }
    }

    for (const s of servers) {
        const io = new Server(s, {
            allowRequest: (req, callback) => {
                const host = req.headers.host;
                if (!host || !socketIoAllowedHosts.has(host.split(':')[0])) {
                    callback(null, false);
                    return;
                }
                callback(null, true);
            },
            cors: {
                origin: (origin, cb) => {
                    if (origin == null || corsAllowedOrigins.has(origin)) {
                        cb(null, true);
                    } else {
                        cb(null, false);
                    }
                },
                methods: ['GET', 'POST'],
                allowedHeaders: '*',
            },
        });
        io.on('connection', socketIoConnectionHandler);
    }
}
