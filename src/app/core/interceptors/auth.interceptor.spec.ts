import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { authInterceptor } from './auth.interceptor';
import { initialState } from '@/app/store/auth/auth.reducer';
import { environment } from '@/environments/environment';
import { AuthActions } from '@/app/store/auth/auth.actions';

describe('authenticated API boundary', () => {
    let http: HttpClient;
    let backend: HttpTestingController;
    let store: MockStore;
    const base = environment.apiUrl;
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideMockStore({ initialState: { auth: { ...initialState, token: 'old-access', refreshToken: 'test-refresh' } } })]
        });
        http = TestBed.inject(HttpClient);
        backend = TestBed.inject(HttpTestingController);
        store = TestBed.inject(MockStore);
    });
    afterEach(() => backend.verify());
    it('never sends credentials to unrelated hosts', () => {
        http.get('https://example.com/external').subscribe();
        const req = backend.expectOne('https://example.com/external');
        expect(req.request.headers.has('Authorization')).toBeFalse();
        req.flush({});
    });
    it('does not sign login or refresh endpoints', () => {
        http.post(base + '/auth/login', {}).subscribe({ error: () => {} });
        const req = backend.expectOne(base + '/auth/login');
        expect(req.request.headers.has('Authorization')).toBeFalse();
        req.flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectNone(base + '/auth/refresh');
    });
    it('shares one refresh for concurrent unauthorized requests', () => {
        let count = 0;
        http.get(base + '/one').subscribe(() => count++);
        http.get(base + '/two').subscribe(() => count++);
        backend.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectOne(base + '/two').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectOne(base + '/auth/refresh').flush({ accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 3600 });
        const one = backend.expectOne(base + '/one'),
            two = backend.expectOne(base + '/two');
        expect(one.request.headers.get('Authorization')).toBe('Bearer new-access');
        expect(two.request.headers.get('Authorization')).toBe('Bearer new-access');
        one.flush({});
        two.flush({});
        expect(count).toBe(2);
    });
    it('propagates refresh failure to all waiting requests', () => {
        let errors = 0;
        const dispatch = spyOn(store, 'dispatch');
        http.get(base + '/one').subscribe({ error: () => errors++ });
        http.get(base + '/two').subscribe({ error: () => errors++ });
        backend.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectOne(base + '/two').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectOne(base + '/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
        expect(errors).toBe(2);
        expect(dispatch).toHaveBeenCalledWith(AuthActions.logout());
    });
    it('does not loop when the retried request remains unauthorized', () => {
        const dispatch = spyOn(store, 'dispatch');
        let failed = false;
        http.get(base + '/one').subscribe({ error: () => (failed = true) });
        backend.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectOne(base + '/auth/refresh').flush({ accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 3600 });
        backend.expectOne(base + '/one').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectNone(base + '/auth/refresh');
        expect(failed).toBeTrue();
        expect(dispatch).toHaveBeenCalledWith(AuthActions.logout());
    });
});
