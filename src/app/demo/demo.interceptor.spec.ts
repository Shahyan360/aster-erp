import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@/environments/environment';
import { demoInterceptor } from './demo.interceptor';
import { clearSession, writeSession } from '@/app/core/services/session-storage';
import { DemoStore } from './demo-store';

describe('demo isolation', () => {
    let http: HttpClient;
    let backend: HttpTestingController;
    let previous: boolean;
    beforeEach(() => {
        previous = environment.demoMode;
        environment.demoMode = true;
        TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([demoInterceptor])), provideHttpClientTesting()] });
        http = TestBed.inject(HttpClient);
        backend = TestBed.inject(HttpTestingController);
        clearSession();
        TestBed.inject(DemoStore).reset();
    });
    afterEach(() => {
        backend.verify();
        clearSession();
        sessionStorage.removeItem('aster.demo.vouchers.v1');
        environment.demoMode = previous;
    });
    it('serves synthetic login without a network request', async () => {
        const result = firstValueFrom(http.post<{ user: { email: string } }>(environment.apiUrl + '/auth/login', { email: 'reviewer@example.com', password: 'demo-session' }));
        backend.expectNone(environment.apiUrl + '/auth/login');
        expect((await result).user.email).toBe('reviewer@example.com');
    });
    it('requires a demo session for data requests', () => {
        let status = 0;
        http.get(environment.apiUrl + '/financial-years').subscribe({ error: (e) => (status = e.status) });
        expect(status).toBe(401);
        backend.expectNone(environment.apiUrl + '/financial-years');
    });
    it('fails closed for unknown APIs', () => {
        writeSession('token', 'aster-demo-session');
        let status = 0;
        http.post(environment.apiUrl + '/unsupported-write', {}).subscribe({ error: (e) => (status = e.status) });
        expect(status).toBe(501);
        backend.expectNone(environment.apiUrl + '/unsupported-write');
    });
    it('forwards configured live requests only when demo is disabled', () => {
        environment.demoMode = false;
        http.get(environment.apiUrl + '/financial-years').subscribe();
        backend.expectOne(environment.apiUrl + '/financial-years').flush({ data: [] });
    });
    it('does not intercept unrelated resource hosts', () => {
        http.get('https://example.com/api/financial-years').subscribe();
        backend.expectOne('https://example.com/api/financial-years').flush({});
    });
});
