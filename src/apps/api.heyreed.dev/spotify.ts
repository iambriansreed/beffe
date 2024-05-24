import { SpotifyApi } from '@spotify/web-api-ts-sdk';

export async function spotifySearch(query: string) {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
    if (!SPOTIFY_CLIENT_ID) throw new Error('SPOTIFY_CLIENT_ID not set');
    if (!SPOTIFY_CLIENT_SECRET) throw new Error('SPOTIFY_CLIENT_SECRET not set');

    console.log('Searching Spotify for The Beatles...');

    const api = SpotifyApi.withClientCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);

    const result = await api.search('The Beatles', ['track']);

    const data = result.tracks.items.map((item) => ({
        name: item.name,
        artist: item.artists[0].name,
        album: item.album.name,
    }));

    return data;
}
