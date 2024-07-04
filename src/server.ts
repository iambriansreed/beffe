import express from 'express';
import App from './app';
import http from 'node:http';

async function main() {
    const app = express();

    const server = http.createServer(app);

    await App(app, server);

    server.listen(process.env.PORT, function () {
        console.log('Server started at localhost:' + process.env.PORT);
    });
}

main();
