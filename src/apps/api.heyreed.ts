import express from 'express';
import getSheet from '../utils/googleSheets';
import { spotifySearch } from '../utils/spotify';

export type RsvpData = {
    attending: 'yes' | 'no';
    code: string;
    email: string;
    guests: string;
    message: string;
    name: string;
    song: string;
    song_id: string;
};

export async function getRowByCode(spreadsheetId: string, sheetTitle: string, inviteCode: string) {
    if (inviteCode.length !== 4) return null;

    const sheet = await getSheet(spreadsheetId, sheetTitle);
    const rows = await sheet.getRows();
    return (
        rows.find((r) => r.get('code').toString().toUpperCase() === inviteCode.toString().toUpperCase()) ||
        null
    );
}

export async function rsvpSubmit(rsvp: RsvpData) {
    const { HEYREED_GOOGLE_SPREADSHEET_ID } = process.env;
    if (!HEYREED_GOOGLE_SPREADSHEET_ID) throw new Error('HEYREED_GOOGLE_SPREADSHEET_ID not set');

    const row = await getRowByCode(HEYREED_GOOGLE_SPREADSHEET_ID, 'RSVP', rsvp.code);

    if (!row) return null;

    row.set('attending', rsvp.attending || 'no');
    row.set('email', rsvp.email || '');
    row.set('guests', rsvp.attending === 'yes' ? rsvp.guests : 0);
    row.set('message', rsvp.message || '');
    row.set('song', rsvp.song || '');
    row.set('song_id', rsvp.song_id || '');
    row.set(
        'updated',
        new Date().toLocaleString('en-us', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    );

    row.save();

    return row.toObject();
}

const app = express();

app.get('/', function (req, res) {
    res.send('heyreed beffe');
});

app.get('/rsvp-check', async function (req, res) {
    const { HEYREED_GOOGLE_SPREADSHEET_ID } = process.env;
    if (!HEYREED_GOOGLE_SPREADSHEET_ID) throw new Error('HEYREED_GOOGLE_SPREADSHEET_ID not set');

    const inviteCode = req.query.id?.toString()?.trim() || '';
    if (inviteCode.length !== 4) return res.status(400).json({ error: 'Invalid invite code' });
    const row = await getRowByCode(HEYREED_GOOGLE_SPREADSHEET_ID, 'RSVP', inviteCode);
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
    const { HEYREED_GOOGLE_SPREADSHEET_ID } = process.env;
    if (!HEYREED_GOOGLE_SPREADSHEET_ID) throw new Error('HEYREED_GOOGLE_SPREADSHEET_ID not set');

    const data = req.body as {
        code: string;
        query: string;
    };

    const hasRow = await getRowByCode(HEYREED_GOOGLE_SPREADSHEET_ID, 'RSVP', data.code);

    if (!hasRow) return res.status(400).json({ error: 'Invalid invite code' });

    const row = await spotifySearch(data.query);

    return res.json(row);
});
export default app;
