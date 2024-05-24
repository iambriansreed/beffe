import express from 'express';
import { rsvpCheck, rsvpSubmit } from './googleSheets';
import { spotifySearch } from './spotify';

const app = express();

app.get('/', function (req, res) {
    res.send('heyreed beffe');
});

app.get('/rsvp-check', async function (req, res) {
    const inviteCode = req.query.id?.toString()?.trim() || '';
    if (inviteCode.length !== 6) return res.status(400).json({ error: 'Invalid invite code' });
    const row = await rsvpCheck(inviteCode);
    if (!row) return res.status(404).json({ error: 'Invite not found' });
    return res.json(row.toObject());
});

app.get('/rsvp-submit', async function (req, res) {
    const { inviteCode, rsvpGuestCount, songId } = req.body;
    if (!rsvpGuestCount) return res.status(400).json({ error: 'Invalid guest count' });
    const success = await rsvpSubmit(inviteCode, rsvpGuestCount, songId);
    if (!success) return res.status(400).json({ error: 'Failed to submit RSVP' });
    res.json(success);
});

app.get('/rsvp-song', async function (req, res) {
    const inviteCode = req.query.id?.toString()?.trim() || '';
    if (inviteCode.length !== 6) return res.status(400).json({ error: 'Invalid invite code' });

    const row = await spotifySearch('');
    if (!row) return res.status(404).json({ error: 'Invite not found' });
    return res.json(row);
});
export default app;
