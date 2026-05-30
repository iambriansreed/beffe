# beffe

**Backend for frontend** — one Node server that hosts multiple small APIs, each tied to different domains.

## What it does

Instead of running a separate backend per site, this single app listens on one port and routes by **hostname**. So `api.iambrian.com` gets the iambrian API, `api.heyreed.com` gets the heyreed API, `local.com` gets the default app, and so on. Same process, different behavior depending on the domain you hit.

Each “app” is just a folder under `src/apps/` with an `index.ts` that defines its hostnames, CORS origins, and routes (get/post/whatever). The server discovers those folders at startup and wires them up with [vhost](https://github.com/expressjs/vhost). Add a new folder and an app, and it’s live — no central config to edit.

There’s also a **Socket.IO** server for real-time stuff (e.g. chat), with host allowlisting so only certain domains can connect.

## Quick start

```bash
npm install
npm run build
npm start
```

Or for local dev with auto-reload and HTTPS:

```bash
npm run dev
```

Set `PORT` for the main server (default in start script is 1010). Use a `.env` for secrets (Google Sheets, hCaptcha, Spotify, etc.) as needed by each app.

## Project layout

- **`src/apps/<name>/index.ts`** — One file per app: hostnames, optional `corsOrigins`, and route handlers via `appFromConfig({ hostname, get: { '/': ... }, post: { ... } })`.
- **`src/utils/`** — Shared helpers (e.g. `appFromConfig`, `getApps`, `apiHeaders`, Google Sheets, Spotify).
- **`src/app.ts`** — Loads apps, sets up CORS, helmet, Socket.IO, and mounts each app by vhost.
- **`src/server.ts`** / **`src/dev-server.ts`** — HTTP only vs HTTP+HTTPS (with local certs) entry points.

## Env (examples)

- `PORT` — Server port.
- `CORS_EXTRA_ORIGINS` — Comma-separated extra origins (e.g. `https://restfox.dev`) for API clients.
- `SOCKET_IO_ALLOWED_HOSTS` — Hosts that can open Socket.IO connections (if you override the defaults).
- Per-app: Google service account, hCaptcha secret, Spotify client id/secret, spreadsheet IDs, etc., as used in each app.

## Scripts

- `npm run build` — Compile TypeScript to `.build/`.
- `npm run lint` — ESLint (e.g. prefer template strings).
- `npm start` — Build and run production server.
- `npm run dev` — Build and run dev server with nodemon and local HTTPS.
- `npm run cert` — Generate local SSL cert (for dev).

That’s the gist. One backend, many domains, minimal config.
