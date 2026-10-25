declare global {
    interface Window {
        __APP_CONFIG__?: {
            demoMode?: boolean;
            apiUrl?: string;
        };
    }
}

// Loaded by index.html before Angular starts, with a same-origin default for tests.
const configuredApiUrl = typeof window === 'undefined' ? undefined : window.__APP_CONFIG__?.apiUrl;

export const appSettings = {
    demoMode: typeof window !== 'undefined' && window.__APP_CONFIG__?.demoMode === true,
    apiUrl: configuredApiUrl?.trim().replace(/\/+$/, '') || '/api'
};
