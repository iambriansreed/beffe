import express from 'express';

const main = express();

main.get('/', function (req, res) {
    res.send('local com ONLY!');
});

export default main;
