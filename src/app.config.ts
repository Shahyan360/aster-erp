import { AppState } from './app/store';
import { demoInterceptor } from './app/demo/demo.interceptor';
import { apiReliabilityInterceptor } from './app/core/interceptors/api-reliability.interceptor';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { AsterPreset } from './app/layout/theme/brand-theme';
import { ConfirmationService, MessageService } from 'primeng/api';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { appRoutes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { reducers, metaReducers } from './app/store';
import { AuthEffects } from './app/store/auth/auth.effects';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { loaderInterceptor } from './app/core/interceptors/loader.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptors([demoInterceptor, apiReliabilityInterceptor, authInterceptor, loaderInterceptor])),
        provideAnimationsAsync(),

        providePrimeNG({ theme: { preset: AsterPreset, options: { darkModeSelector: '.app-dark' } } }),
        MessageService,
        ConfirmationService,
        provideStore(reducers, { metaReducers }),
        provideEffects([AuthEffects]),
        provideRouterStore(),
        provideZonelessChangeDetection(),
        ...(isDevMode()
            ? [
                  provideStoreDevtools({
                      maxAge: 25,
                      actionSanitizer: (action) => ({ type: action.type }),
                      stateSanitizer: (state: AppState) => ({ ...state, auth: { ...state.auth, user: null, token: null, refreshToken: null, error: null } }),
                      logOnly: !isDevMode(),
                      autoPause: true,
                      connectInZone: true
                  })
              ]
            : [])
    ]
};
