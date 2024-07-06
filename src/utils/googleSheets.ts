import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

async function createJwt() {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL not set');
    if (!GOOGLE_PRIVATE_KEY) throw new Error('GOOGLE_PRIVATE_KEY not set');

    return new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
        ],
    });
}

export default async function getSheet(
    spreadsheetId: string,
    sheetIndex: number
): Promise<GoogleSpreadsheetWorksheet>;
export default async function getSheet(
    spreadsheetId: string,
    sheetTitle: string
): Promise<GoogleSpreadsheetWorksheet>;
export default async function getSheet(spreadsheetId: string, sheetId: string | number) {
    const doc = new GoogleSpreadsheet(spreadsheetId, await createJwt());
    await doc.loadInfo();
    const sheet = typeof sheetId === 'number' ? doc.sheetsByIndex[sheetId] : doc.sheetsByTitle[sheetId];
    sheet.loadHeaderRow();
    return sheet;
}
