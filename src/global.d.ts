declare global {}

type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

type AppConfig = {
    hostname: (string | RegExp)[];
    /** Frontend origins allowed to call this API (e.g. https://iambrian.com for api.iambrian.com). */
    corsOrigins?: (string | RegExp)[];
    socketIoAllowedHosts?: string[];
} & Partial<Record<Method, Record<string, import('express').RequestHandler>>>;

type App = {
    hostname: (string | RegExp)[];
    corsOrigins?: (string | RegExp)[];
    app: Express;
    socketIoAllowedHosts?: string[];
};
