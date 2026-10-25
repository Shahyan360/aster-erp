// System settings — returned by GET /system-settings.

export interface SystemSetting {
    id: number;
    settingId: number;
    settingKey: string;
    description: string;
    valueType: string;
    value: string;
    createdOn: string;
    modifiedOn: string | null;
    isActive: boolean;
    rowVersion: string;
}

export interface SystemSettingsResponse {
    success: boolean;
    message: string;
    data: SystemSetting[] | null;
    errors: string | null;
    errorCode: string | null;
}

/** Stable setting ids (independent of row `id`). */
export const SETTING_ID = {
    baseFcyCurrency: 11,
    baseFcyRate: 12,
    baseLcyCurrency: 13,
    baseLcyRate: 14,
    // DecimalPrecision.* — per-type decimal precision.
    lcyAmountPrecision: 21,
    fcyAmountPrecision: 22,
    lcyRatePrecision: 23,
    fcyRatePrecision: 24,
    qtyPrecision: 25,
    baseQtyPrecision: 26,
    percentPrecision: 27,
    /** Default.PreviousDaysToSetInFromDate — days to subtract from today for list/report From Date. */
    previousDaysFromDate: 31,
} as const;

/** Fallback when setting 31 is missing, null, or zero. */
export const DEFAULT_PREVIOUS_DAYS_FOR_FROM_DATE = 3;

/** Per-type decimal precision resolved from the DecimalPrecision.* settings. */
export interface DecimalPrecisionConfig {
    lcyAmount: number;
    fcyAmount: number;
    lcyRate: number;
    fcyRate: number;
    percent: number;
    qty: number;
}

/** Sensible fallbacks used until the settings load (or when a value is missing). */
export const DEFAULT_DECIMAL_PRECISION: DecimalPrecisionConfig = {
    lcyAmount: 2,
    fcyAmount: 2,
    lcyRate: 4,
    fcyRate: 4,
    percent: 2,
    qty: 2,
};

/** Convenience shape: the base currency configuration resolved from settings. */
export interface BaseCurrencyConfig {
    fcyCurrency: string;
    fcyRate: number;
    lcyCurrency: string;
    lcyRate: number;
}
