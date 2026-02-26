import path from 'node:path';
import fs from 'node:fs';

export default async function getApps(): Promise<App[]> {
    const appsDir = path.join(__dirname, '../apps');

    const appNames = fs.readdirSync(appsDir).filter((f) => fs.statSync(path.join(appsDir, f)).isDirectory());

    return await Promise.all(
        appNames.map(async (name) => (await import(`../apps/${name}/index.js`))?.default),
    );
}
