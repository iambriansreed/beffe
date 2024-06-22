import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

async function getSheet() {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SPREADSHEET_ID } = process.env;
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL not set');
    if (!GOOGLE_PRIVATE_KEY) throw new Error('GOOGLE_PRIVATE_KEY not set');
    if (!GOOGLE_SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID not set');

    const jwt = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
        ],
    });
    const doc = new GoogleSpreadsheet(GOOGLE_SPREADSHEET_ID, jwt);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    sheet.loadHeaderRow();
    return sheet;
}

export async function getRowByCode(inviteCode: string) {
    if (inviteCode.length !== 4) return null;

    const sheet = await getSheet();
    const rows = await sheet.getRows();
    return (
        rows.find((r) => r.get('code').toString().toUpperCase() === inviteCode.toString().toUpperCase()) ||
        null
    );
}

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

export async function rsvpSubmit(rsvp: RsvpData) {
    const row = await getRowByCode(rsvp.code);

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
