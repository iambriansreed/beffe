import express from 'express';
import App from './main';

const app = express();

App(app);

app.listen(process.env.PORT, function () {
    console.log('Server started at localhost:' + process.env.PORT);
});
