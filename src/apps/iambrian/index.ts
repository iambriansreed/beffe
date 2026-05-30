import { verify } from 'hcaptcha';
import getSheet from '../../utils/googleSheets';
import { appFromConfig } from '../../utils/appFromConfig';

export default appFromConfig({
    hostname: ['api.iambrian.dev', 'api.iambrian.com', 'api.iambrian.local'],
    corsOrigins: ['iambrian.com', 'iambrian.dev', 'local.local:3000'],
    socketIoAllowedHosts: ['chat.iambrian.com'],
    get: {
        '/': (_req: import('express').Request, res: import('express').Response) => {
            res.send('iambrian beffe');
        },
    },
    post: {
        '/contact': async (req: import('express').Request, res: import('express').Response) => {
            try {
                const { token } = req.body;
                const { success } = await verify(HCAPTCHA_SECRET, token);
                if (success === true) {
                    await addRow({ ...req.body, type: 'contact' });
                }
                res.json({ success });
            } catch (err) {
                console.error('contact error', err);
                if (!res.headersSent) res.status(500).json({ success: false });
            }
        },
        '/quiz': async (req: import('express').Request, res: import('express').Response) => {
            try {
                const { message, token } = req.body;
                const data = typeof message === 'string' ? JSON.parse(message) : message;
                const { success } = await verify(HCAPTCHA_SECRET, token);
                console.log({ data, success });
                if (success === true) {
                    await addRow({
                        ...req.body,
                        message: JSON.stringify(data, null, 4),
                        type: 'quiz',
                    });
                }
                res.json({ success });
            } catch (err) {
                console.error('quiz error', err);
                if (!res.headersSent) res.status(500).json({ success: false });
            }
        },
    },
});

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';

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
