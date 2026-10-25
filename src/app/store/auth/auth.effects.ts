import { LookupService } from '@/app/shared/services/lookup.service';
import { SystemSettingsService } from '@/app/shared/services/system-settings.service';
import { MenuService } from '@/app/layout/service/menu.service';
import { AttachmentService } from '@/app/shared/services/attachment.service';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthService } from '../../core/services/auth.service';
import { AuthActions } from './auth.actions';
import { catchError, map, switchMap, of, tap } from 'rxjs';
import { Router } from '@angular/router';
import { clearSession, writeSession } from '@/app/core/services/session-storage';

@Injectable()
export class AuthEffects {
    private actions$ = inject(Actions);
    private authService = inject(AuthService);
    private router = inject(Router);
    private lookups = inject(LookupService);
    private settings = inject(SystemSettingsService);
    private menu = inject(MenuService);
    private attachments = inject(AttachmentService);
    login$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.login),
            switchMap(({ credentials }) =>
                this.authService.login(credentials).pipe(
                    map((response) => AuthActions.loginSuccess({ response })),
                    catchError((error) => of(AuthActions.loginFailure({ error: { message: error?.error?.message || 'Unable to sign in. Check your credentials and connection.', status: error?.status } })))
                )
            )
        )
    );
    loginSuccess$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(AuthActions.loginSuccess),
                tap(({ response }) => {
                    clearSession();
                    writeSession('token', response.accessToken);
                    writeSession('refreshToken', response.refreshToken);
                    writeSession('user', JSON.stringify(response.user));
                    this.router.navigate(['/']);
                })
            ),
        { dispatch: false }
    );
    refreshSuccess$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(AuthActions.refreshSuccess),
                tap(({ response }) => {
                    writeSession('token', response.accessToken);
                    writeSession('refreshToken', response.refreshToken);
                })
            ),
        { dispatch: false }
    );
    financialYear$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(AuthActions.setFinancialYear),
                tap(({ financialYear }) => writeSession('financialYear', JSON.stringify(financialYear)))
            ),
        { dispatch: false }
    );
    logout$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(AuthActions.logout),
                tap(() => {
                    clearSession();
                    this.lookups.clearCache();
                    this.settings.clearCache();
                    this.menu.resetMenu();
                    this.attachments.loadSaved([]);
                    this.attachments.commit();
                    this.router.navigate(['/auth/login']);
                })
            ),
        { dispatch: false }
    );
}
