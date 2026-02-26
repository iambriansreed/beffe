declare global {}

type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

type App = {
    hostname: (string | RegExp)[];
} & Partial<Record<Method, Record<string, import('express').RequestHandler>>>;
