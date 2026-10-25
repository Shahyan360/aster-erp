import { environment } from '@/environments/environment';

// Demo credentials cannot become a live session when deployment mode changes.
export const authKey = (key: string): string => (environment.demoMode ? `aster.demo.auth.${key}` : key);

export function readSession(key: string): string | null {
    try {
        return localStorage.getItem(authKey(key));
    } catch {
        return null;
    }
}

export function writeSession(key: string, value: string): void {
    try {
        localStorage.setItem(authKey(key), value);
    } catch {
        /* Memory-only store remains usable. */
    }
}

export function clearSession(): void {
    for (const key of ['token', 'refreshToken', 'user', 'financialYear']) {
        try {
            localStorage.removeItem(authKey(key));
        } catch {
            /* Storage may be unavailable. */
        }
    }
}

export function readSessionJson<T>(key: string): T | null {
    try {
        return JSON.parse(readSession(key) ?? 'null') as T | null;
    } catch {
        return null;
    }
}

export function hasSession(): boolean {
    const token = readSession('token');
    if (!token) return false;
    if (environment.demoMode) return token === 'aster-demo-session';
    // An expired access token may still be refreshed by the authenticated API flow.
    try {
        const segment = token.split('.')[1];
        const payload = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
        return typeof payload.exp === 'number' && (payload.exp * 1000 > Date.now() || !!readSession('refreshToken'));
    } catch {
        return false;
    }
}

export function hasFinancialYear(): boolean {
    const year = readSessionJson<{ id?: number; isClosed?: boolean; isActive?: boolean }>('financialYear');
    return !!year && typeof year.id === 'number' && year.id > 0 && !year.isClosed && year.isActive === true;
}
