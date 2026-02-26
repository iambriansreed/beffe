import express, { Express } from 'express';

const METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

/**
 * Builds an Express app from a site config (hostnames + method/path handlers).
 */
export function appFromConfig(site: App): {
    hostname: (string | RegExp)[];
    app: Express;
} {
    const app = express();

    for (const method of METHODS) {
        const routes = site[method];
        if (!routes || typeof routes !== 'object') continue;
        for (const [path, handler] of Object.entries(routes)) {
            (app as Express & Record<string, (p: string, h: import('express').RequestHandler) => void>)[
                method
            ](path, handler);
        }
    }

    return { hostname: site.hostname, app };
}
