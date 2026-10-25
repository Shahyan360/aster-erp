import { writeFile } from 'node:fs/promises';
const rawMode = process.env.ASTER_DEMO_MODE ?? 'true';
if (!['true', 'false'].includes(rawMode)) throw new Error('ASTER_DEMO_MODE must be true or false.');
const apiUrl = (process.env.ASTER_API_URL ?? '/api').trim().replace(/\/+$/, '') || '/api';
if (!apiUrl.startsWith('/') && !/^https?:\/\//.test(apiUrl)) throw new Error('ASTER_API_URL must be an HTTP(S) base URL or same-origin path.');
if (apiUrl.startsWith('//')) throw new Error('Protocol-relative API URLs are not supported.');
if (/^https?:/.test(apiUrl)) {
    const url = new URL(apiUrl);
    if (url.username || url.password || url.search || url.hash) throw new Error('The public API URL must not contain credentials, query strings or fragments.');
}
await writeFile(new URL('../public/app-config.js', import.meta.url), '// Generated public settings. Never add server secrets.\nwindow.__APP_CONFIG__ = ' + JSON.stringify({ demoMode: rawMode === 'true', apiUrl }, null, 4) + ';\n');
console.log('Public configuration prepared (' + (rawMode === 'true' ? 'isolated demo' : 'live backend') + ').');
