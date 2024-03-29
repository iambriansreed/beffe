import express from 'express';

const app = express();

app.get('/', function (req, res) {
    res.send('Hello World!, I am server created by express!');
});

app.listen(process.env.PORT, function () {
    console.log('server started at http://localhost:' + process.env.PORT);
});
