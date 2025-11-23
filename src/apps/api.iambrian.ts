import express from 'express';
import { verify } from 'hcaptcha';

import getSheet from '../utils/googleSheets';
import { spotifySearch } from '../utils/spotify';

const app = express();

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';

app.get('/', function (_req, res) {
    res.send('iambrian beffe');
});

async function addRow(body: { email: string; message: string; type: string }) {
    const { IAMBRIAN_GOOGLE_SPREADSHEET_ID } = process.env;
    if (!IAMBRIAN_GOOGLE_SPREADSHEET_ID) throw new Error('IAMBRIAN_GOOGLE_SPREADSHEET_ID not set');

    const { email, message, type } = body;

    const sheet = await getSheet(IAMBRIAN_GOOGLE_SPREADSHEET_ID, 0);

    await sheet.addRow({
        email,
        message,
        type,
        timestamp: new Date().toLocaleString('en-us', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }),
    });
}

app.post('/contact', async function (req, res) {
    const { token } = req.body;

    verify(HCAPTCHA_SECRET, token).then(async ({ success }) => {
        if (success === true) {
            await addRow({
                ...req.body,
                type: 'contact',
            });
        }

        res.json({ success });
    });
});

app.post('/quiz', async function (req, res) {
    const { message, token } = req.body;
    const data = typeof message === 'string' ? JSON.parse(message) : message;

    verify(HCAPTCHA_SECRET, token).then(async ({ success }) => {
        console.log({ data, success });

        if (success === true) {
            await addRow({
                ...req.body,
                message: JSON.stringify(data, null, 4),
                type: 'quiz',
            });
        }

        res.json({ success });
    });
});

export default app;
