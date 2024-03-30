import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import { devNull } from 'node:os';

const app = express();

const httpServer = http.createServer(app);
const httpsServer = https.createServer(
    {
        key: fs.readFileSync('.sslcert/localhost-key.pem', 'utf8'),
        cert: fs.readFileSync('.sslcert/localhost.pem', 'utf8'),
    },
    app
);

app.get('/', function (req, res) {
    console.log(req.hostname);

    res.send('Hello World!, I am server created by express!');
});

app.get('/sheet', function (req, res) {
    res.header('Content-Type', 'application/json');

    fetch(
        'https://sheets.googleapis.com/v4/spreadsheets/1Y5ChX0nBVj2Vjeuc-6MQCSMIpDo6egdXjk3KJfquuQY/values/Sheet1'
    )
        .then((data) => data.json())
        .then((json) => {
            res.send(json);
        });
});

httpsServer.listen(process.env.PORT, function () {
    console.log('server started at https://localhost:' + process.env.PORT);
});

httpServer.listen(process.env.PORT, function () {
    console.log('server started at https://localhost:' + process.env.PORT);
});
