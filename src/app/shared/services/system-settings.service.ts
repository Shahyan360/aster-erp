import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';
import { BaseCurrencyConfig, DecimalPrecisionConfig, DEFAULT_DECIMAL_PRECISION, DEFAULT_PREVIOUS_DAYS_FOR_FROM_DATE, SETTING_ID, SystemSettingsResponse } from './system-settings.types';

/**
 * Reads application-wide system settings (e.g. base currency / rates).
 * Settings are static for a session, so the response is cached and shared.
 */
@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
    private http = inject(HttpClient);
    private settings$?: Observable<SystemSettingsResponse>;

    /** Drop the cached settings so the next read re-fetches (used by the form's Refresh). */
    clearCache(): void {
        this.settings$ = undefined;
    }

    getSettings(): Observable<SystemSettingsResponse> {
        if (!this.settings$) {
            this.settings$ = this.http.get<SystemSettingsResponse>(`${environment.apiUrl}/system-settings`).pipe(
                catchError((err) => {
                    this.settings$ = undefined; // allow a retry on the next call
                    return throwError(() => err);
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        }
        return this.settings$;
    }

    /** Per-type amount/rate/percent decimal precision from the DecimalPrecision.* settings. */
    getDecimalPrecision(): Observable<DecimalPrecisionConfig> {
        return this.getSettings().pipe(
            map((res) => {
                const data = res?.data ?? [];
                const val = (settingId: number, fallback: number) => {
                    const n = Number(data.find((s) => s.settingId === settingId)?.value);
                    return Number.isFinite(n) && n >= 0 && n <= 8 ? n : fallback;
                };
                return {
                    lcyAmount: val(SETTING_ID.lcyAmountPrecision, DEFAULT_DECIMAL_PRECISION.lcyAmount),
                    fcyAmount: val(SETTING_ID.fcyAmountPrecision, DEFAULT_DECIMAL_PRECISION.fcyAmount),
                    lcyRate: val(SETTING_ID.lcyRatePrecision, DEFAULT_DECIMAL_PRECISION.lcyRate),
                    fcyRate: val(SETTING_ID.fcyRatePrecision, DEFAULT_DECIMAL_PRECISION.fcyRate),
                    percent: val(SETTING_ID.percentPrecision, DEFAULT_DECIMAL_PRECISION.percent),
                    qty: val(SETTING_ID.qtyPrecision, DEFAULT_DECIMAL_PRECISION.qty),
                };
            }),
        );
    }

    /** Resolve the base currency codes + rates from the settings list. */
    getBaseCurrencyConfig(): Observable<BaseCurrencyConfig> {
        return this.getSettings().pipe(
            map((res) => {
                const data = res?.data ?? [];
                const valueOf = (settingId: number) => data.find((s) => s.settingId === settingId)?.value ?? '';
                return {
                    fcyCurrency: valueOf(SETTING_ID.baseFcyCurrency),
                    fcyRate: Number(valueOf(SETTING_ID.baseFcyRate)) || 0,
                    lcyCurrency: valueOf(SETTING_ID.baseLcyCurrency),
                    lcyRate: Number(valueOf(SETTING_ID.baseLcyRate)) || 0,
                };
            }),
        );
    }

    /**
     * Days to subtract from today when seeding a From Date filter (setting id 31).
     * Returns 3 when the setting is missing, null, or zero.
     */
    getPreviousDaysForFromDate(): Observable<number> {
        return this.getSettings().pipe(
            map((res) => {
                const data = res?.data ?? [];
                const raw = data.find((s) => s.settingId === SETTING_ID.previousDaysFromDate)?.value;
                if (raw == null || String(raw).trim() === '') {
                    return DEFAULT_PREVIOUS_DAYS_FOR_FROM_DATE;
                }
                const n = Number(raw);
                if (!Number.isFinite(n) || n <= 0) {
                    return DEFAULT_PREVIOUS_DAYS_FOR_FROM_DATE;
                }
                return n;
            }),
        );
    }
}
