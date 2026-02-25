import path from 'node:path';
import { Request, Response, NextFunction } from 'express';

const PKG_PATH = path.join(__dirname, '..', '..', 'package.json');

let cached: { name: string; version: string } | null = null;

function getApiInfo(): { name: string; version: string } {
    if (cached) return cached;
    try {
        const pkg = require(PKG_PATH) as { name?: string; version?: string };
        cached = {
            name: pkg.name ?? 'beffe',
            version: pkg.version ?? '0.0.0',
        };
        return cached;
    } catch {
        cached = { name: 'beffe', version: '0.0.0' };
        return cached;
    }
}

/**
 * Express middleware that sets X-API-Name and X-API-Version on all responses.
 * Name and version are read from package.json (cached); overridable via env API_NAME / API_VERSION.
 */
export function apiVersionHeaders(_req: Request, res: Response, next: NextFunction): void {
    const { name, version } = getApiInfo();
    res.setHeader('X-API-Name', process.env.API_NAME ?? name);
    res.setHeader('X-API-Version', process.env.API_VERSION ?? version);
    next();
}
