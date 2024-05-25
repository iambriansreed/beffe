import express, { Express } from 'express';
import vhost from 'vhost';
import helmet from 'helmet';

import localComApp from './apps/local.com/_routes';
import localDevApp from './apps/local.dev/_routes';
import heyreedApp from './apps/api.heyreed.dev/_routes';

export default function App(app: Express) {
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
    app.use(vhost('local.com', localComApp));
    app.use(vhost('local.dev', localDevApp));
    app.use(vhost('api.heyreed.dev', heyreedApp));
    app.use(vhost('api.heyreed.com', heyreedApp));
}
