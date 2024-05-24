import express, { Express } from 'express';
import vhost from 'vhost';
import helmet from 'helmet';

import localComApp from './apps/local.com/_routes';
import localDevApp from './apps/local.dev/_routes';
import heyreedApp from './apps/api.heyreed.dev/_routes';

export default function App(app: Express) {
    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        })
    );
    app.use(express.json());
    app.use(vhost('local.com', localComApp));
    app.use(vhost('local.dev', localDevApp));
    app.use(vhost('api.heyreed.dev', heyreedApp));
    app.use(vhost('api.heyreed.com', heyreedApp));
}
