import { SpotifyApi } from '@spotify/web-api-ts-sdk';

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

let api: SpotifyApi | null = null;

function spotifyApiInit() {
    if (api) return api;

    if (!SPOTIFY_CLIENT_ID) throw new Error('SPOTIFY_CLIENT_ID not set');
    if (!SPOTIFY_CLIENT_SECRET) throw new Error('SPOTIFY_CLIENT_SECRET not set');

    api =
        (SPOTIFY_CLIENT_ID &&
            SPOTIFY_CLIENT_SECRET &&
            SpotifyApi.withClientCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)) ||
        null;

    return api;
}

export async function spotifySearch(query: string) {
    spotifyApiInit();

    if (!api) return [];

    const result = await api.search(query, ['track']);

    const data = result?.tracks?.items.map((item) => ({
        name: item.name,
        artist: item.artists[0].name,
        id: item.external_urls.spotify,
    }));

    return data;
}
