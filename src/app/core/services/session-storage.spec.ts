import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { environment } from '@/environments/environment';
import { authKey, clearSession, hasSession, hasFinancialYear, writeSession } from './session-storage';
import { authGuard } from '../guards/auth.guard';
import { guestGuard } from '../guards/guest.guard';
import { financialYearGuard } from '../guards/financial-year.guard';

describe('session and routing controls', () => {
    let previous: boolean;
    beforeEach(() => {
        previous = environment.demoMode;
        environment.demoMode = true;
        clearSession();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });
    afterEach(() => {
        clearSession();
        environment.demoMode = previous;
    });
    it('namespaces demo authentication independently of live storage', () => expect(authKey('token')).toBe('aster.demo.auth.token'));
    it('rejects a missing session and redirects to login', () => {
        const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)) as UrlTree;
        expect(TestBed.inject(Router).serializeUrl(result)).toBe('/auth/login');
    });
    it('accepts only the explicit demo marker', () => {
        writeSession('token', 'not-a-session');
        expect(hasSession()).toBeFalse();
        writeSession('token', 'aster-demo-session');
        expect(hasSession()).toBeTrue();
    });
    it('redirects signed-in guests to the workspace', () => {
        writeSession('token', 'aster-demo-session');
        const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never)) as UrlTree;
        expect(TestBed.inject(Router).serializeUrl(result)).toBe('/');
    });
    it('requires a valid open active year', () => {
        writeSession('financialYear', 'not-json');
        expect(hasFinancialYear()).toBeFalse();
        writeSession('financialYear', JSON.stringify({ id: 1, isActive: true, isClosed: true }));
        expect(hasFinancialYear()).toBeFalse();
        writeSession('financialYear', JSON.stringify({ id: 1, isActive: true, isClosed: false }));
        expect(hasFinancialYear()).toBeTrue();
    });
    it('routes users without a year to the selector', () => {
        const result = TestBed.runInInjectionContext(() => financialYearGuard({} as never, {} as never)) as UrlTree;
        expect(TestBed.inject(Router).serializeUrl(result)).toBe('/select-financial-year');
    });
    it('clears only this app session keys', () => {
        localStorage.setItem('aster.test.unrelated', 'keep');
        writeSession('token', 'aster-demo-session');
        clearSession();
        expect(localStorage.getItem('aster.test.unrelated')).toBe('keep');
        localStorage.removeItem('aster.test.unrelated');
    });
    it('rejects expired live JWTs without a refresh session', () => {
        environment.demoMode = false;
        const prior = localStorage.getItem('token');
        writeSession('token', 'header.' + btoa(JSON.stringify({ exp: 1 })) + '.signature');
        const priorRefresh = localStorage.getItem('refreshToken');
        localStorage.removeItem('refreshToken');
        expect(hasSession()).toBeFalse();
        if (prior) localStorage.setItem('token', prior);
        else localStorage.removeItem('token');
        if (priorRefresh) localStorage.setItem('refreshToken', priorRefresh);
    });
});
