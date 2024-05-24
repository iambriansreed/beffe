import express from 'express';

const main = express();

main.get('/dev', function (req, res) {
    res.send('dev ONLY!');
});

export default main;
