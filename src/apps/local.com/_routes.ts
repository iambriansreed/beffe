import express from 'express';

const main = express();

main.get('/com', function (req, res) {
    res.send('com ONLY!');
});

export default main;
