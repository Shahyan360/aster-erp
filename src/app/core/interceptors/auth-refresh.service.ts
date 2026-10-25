import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, catchError, finalize, shareReplay, tap, throwError } from 'rxjs';
import { AuthService, RefreshResponse } from '../services/auth.service';
import { AuthActions } from '@/app/store/auth/auth.actions';

@Injectable({ providedIn: 'root' })
export class AuthRefreshService {
    private auth = inject(AuthService);
    private store = inject(Store);
    private pending?: Observable<RefreshResponse>;

    refresh(token: string): Observable<RefreshResponse> {
        if (!this.pending) {
            this.pending = this.auth.refresh(token).pipe(
                tap((response) => this.store.dispatch(AuthActions.refreshSuccess({ response }))),
                catchError((error) => {
                    this.store.dispatch(AuthActions.logout());
                    return throwError(() => error);
                }),
                finalize(() => {
                    this.pending = undefined;
                }),
                shareReplay({ bufferSize: 1, refCount: true })
            );
        }
        return this.pending;
    }
}
