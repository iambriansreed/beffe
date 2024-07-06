import express from 'express';
import getSheet from '../utils/googleSheets';
import { spotifySearch } from '../utils/spotify';

const app = express();

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
    await addRow({
        ...req.body,
        type: 'contact',
    });

    res.json({ success: true });
});

app.post('/quiz', async function (req, res) {
    const { message } = req.body;
    const data = typeof message === 'string' ? JSON.parse(message) : message;

    await addRow({
        ...req.body,
        message: JSON.stringify(data, null, 4),
        type: 'quiz',
    });

    res.json({ success: true });
});

export default app;
