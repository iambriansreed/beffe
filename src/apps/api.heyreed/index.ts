import express from 'express';
import { RsvpData, getRowByCode, rsvpSubmit } from './googleSheets';
import { spotifySearch } from './spotify';

const app = express();

app.get('/', function (req, res) {
    res.send('heyreed beffe');
});

app.get('/rsvp-check', async function (req, res) {
    const inviteCode = req.query.id?.toString()?.trim() || '';
    if (inviteCode.length !== 4) return res.status(400).json({ error: 'Invalid invite code' });
    const row = await getRowByCode(inviteCode);
    if (!row) return res.status(404).json({ error: 'Invite not found' });
    return res.json(row.toObject());
});

app.post('/rsvp-submit', async function (req, res) {
    const data = req.body as RsvpData;
    const success = await rsvpSubmit(data);
    if (!success) return res.status(400).json({ error: 'Failed to submit RSVP' });
    res.json(success);
});

app.post('/rsvp-song', async function (req, res) {
    const data = req.body as {
        code: string;
        query: string;
    };

    const hasRow = await getRowByCode(data.code);

    if (!hasRow) return res.status(400).json({ error: 'Invalid invite code' });

    const row = await spotifySearch(data.query);

    return res.json(row);
});
export default app;
