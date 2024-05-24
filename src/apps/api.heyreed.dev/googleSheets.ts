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

export async function rsvpCheck(inviteCode: string) {
    const sheet = await getSheet();

    sheet.addRows([]);
    const rows = await sheet.getRows();
    return rows.find((r) => r.get('invite_code') === inviteCode) || null;
}

export async function rsvpSubmit(inviteCode: string, rsvpGuestCount: number, songId?: string) {
    const row = await rsvpCheck(inviteCode);

    if (!row) return null;

    row.set('rsvp_guest_count', rsvpGuestCount);
    row.set('song_id', songId || 'None selected');
    row.set('api_updated_at', new Date().toISOString());
    row.save();

    return row.toObject();
}
