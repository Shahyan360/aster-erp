import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, switchMap, take, throwError } from 'rxjs';
import { AuthActions } from '@/app/store/auth/auth.actions';
import { selectAuthState } from '@/app/store/auth/auth.selectors';
import { AuthRefreshService } from './auth-refresh.service';
import { isApiRequest } from './api-request';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    if (!isApiRequest(req.url)) return next(req);
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const requestPath = new URL(req.url, origin).pathname.replace(/\/+$/, '');
    if (/\/auth\/(login|refresh)$/.test(requestPath)) return next(req);
    const store = inject(Store);
    const refresh = inject(AuthRefreshService);
    return store.select(selectAuthState).pipe(
        take(1),
        switchMap((state) => {
            const signed = state.token ? req.clone({ setHeaders: { Authorization: 'Bearer ' + state.token } }) : req;
            return next(signed).pipe(
                catchError((error) => {
                    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return throwError(() => error);
                    if (!state.refreshToken) {
                        store.dispatch(AuthActions.logout());
                        return throwError(() => error);
                    }
                    return refresh.refresh(state.refreshToken).pipe(
                        switchMap((response) =>
                            // next() continues downstream; it cannot re-enter this interceptor.
                            next(req.clone({ setHeaders: { Authorization: 'Bearer ' + response.accessToken } })).pipe(
                                catchError((retryError) => {
                                    if (retryError instanceof HttpErrorResponse && retryError.status === 401) store.dispatch(AuthActions.logout());
                                    return throwError(() => retryError);
                                })
                            )
                        )
                    );
                })
            );
        })
    );
};
