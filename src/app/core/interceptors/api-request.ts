import { environment } from '@/environments/environment';

export function isApiRequest(value: string): boolean {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const base = new URL(environment.apiUrl, origin);
    const request = new URL(value, origin);
    const prefix = base.pathname.replace(/\/+$/, '');
    return request.origin === base.origin && (request.pathname === prefix || request.pathname.startsWith(`${prefix}/`));
}
