import { createReducer, on } from '@ngrx/store';
import { FinancialYear, LoginResponse } from '../../core/services/auth.service';
import { AuthActions } from './auth.actions';
import { readSession, readSessionJson } from '@/app/core/services/session-storage';

export interface AuthState {
    user: LoginResponse['user'] | null;
    token: string | null;
    loading: boolean;
    error: { message?: string; status?: number } | null;
    refreshToken: string | null;
    financialYear: FinancialYear | null;
}
export const initialState: AuthState = {
    user: readSessionJson<LoginResponse['user']>('user'),
    token: readSession('token'),
    loading: false,
    error: null,
    refreshToken: readSession('refreshToken'),
    financialYear: readSessionJson<FinancialYear>('financialYear')
};
export const authReducer = createReducer(
    initialState,
    on(AuthActions.login, (state) => ({ ...state, loading: true, error: null })),
    on(AuthActions.loginSuccess, (state, { response }) => ({ ...state, user: response.user, token: response.accessToken, refreshToken: response.refreshToken, financialYear: null, loading: false, error: null })),
    on(AuthActions.refreshSuccess, (state, { response }) => ({ ...state, token: response.accessToken, refreshToken: response.refreshToken })),
    on(AuthActions.setFinancialYear, (state, { financialYear }) => ({ ...state, financialYear })),
    on(AuthActions.loginFailure, (state, { error }) => ({ ...state, loading: false, error })),
    on(AuthActions.logout, () => ({ ...initialState, user: null, token: null, refreshToken: null, financialYear: null, error: null, loading: false }))
);
