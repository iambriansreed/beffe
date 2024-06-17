import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import App from './app';

const app = express();

const httpServer = http.createServer(app);
const httpsServer = https.createServer(
    {
        key: fs.readFileSync('.sslcert/key.pem', 'utf8'),
        cert: fs.readFileSync('.sslcert/cert.pem', 'utf8'),
    },
    app
);

app.use((req, res, next) => {
    next();
});

App(app, httpServer);

httpsServer.listen(443, function () {
    console.log('server started at https://localhost');
});

httpServer.listen(80, function () {
    console.log('server started at http://localhost');
});
