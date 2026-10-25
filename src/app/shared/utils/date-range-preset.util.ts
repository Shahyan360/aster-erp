export type DateRangePresetType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'financialYear' | 'custom';

export const DEFAULT_DATE_TYPE: DateRangePresetType = 'custom';

export const DATE_TYPE_OPTIONS: { label: string; value: DateRangePresetType }[] = [
    { label: 'Custom Range', value: 'custom' },
    { label: 'This Day', value: 'day' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
    { label: 'This Year', value: 'year' },
    { label: 'Financial Year', value: 'financialYear' },
];

/** From = today − N days, To = today. */
export function buildCustomRangeFromPreviousDays(
    previousDays: number,
    referenceDate: Date = new Date(),
): { fromDate: Date; toDate: Date } {
    const toDate = new Date(referenceDate);
    const fromDate = new Date(referenceDate);
    fromDate.setDate(fromDate.getDate() - previousDays);
    return { fromDate, toDate };
}

/** Parse API ISO date/time as a local calendar date (no UTC shift). */
export function parseApiDateLocal(iso: string): Date {
    const [y, m, d] = iso.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function buildFinancialYearDateRange(startDate: string, endDate: string): { fromDate: Date; toDate: Date } {
    return {
        fromDate: parseApiDateLocal(startDate),
        toDate: parseApiDateLocal(endDate),
    };
}

export function computeDateRangePreset(
    type: DateRangePresetType,
    referenceDate: Date = new Date(),
): { fromDate: Date; toDate: Date } {
    const now = new Date(referenceDate);

    switch (type) {
        case 'day':
            return { fromDate: new Date(now), toDate: new Date(now) };
        case 'week':
            return { fromDate: startOfWeek(now), toDate: endOfWeek(now) };
        case 'month':
            return { fromDate: startOfMonth(now), toDate: endOfMonth(now) };
        case 'quarter': {
            const quarterIndex = calendarQuarterIndex(now.getMonth());
            return {
                fromDate: quarterStartDate(now.getFullYear(), quarterIndex),
                toDate: quarterEndDate(now.getFullYear(), quarterIndex),
            };
        }
        case 'year':
            return {
                fromDate: new Date(now.getFullYear(), 0, 1),
                toDate: new Date(now.getFullYear(), 11, 31),
            };
        default:
            return { fromDate: new Date(now), toDate: new Date(now) };
    }
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** 0 = Q1 (Jan–Mar), 1 = Q2 (Apr–Jun), 2 = Q3 (Jul–Sep), 3 = Q4 (Oct–Dec). */
function calendarQuarterIndex(monthIndex: number): number {
    return Math.floor(monthIndex / 3);
}

function quarterStartDate(year: number, quarterIndex: number): Date {
    return new Date(year, quarterIndex * 3, 1);
}

function quarterEndDate(year: number, quarterIndex: number): Date {
    return new Date(year, quarterIndex * 3 + 3, 0);
}

/** Week starts on Monday. */
function startOfWeek(d: Date): Date {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - daysSinceMonday);
    return date;
}

function endOfWeek(d: Date): Date {
    const start = startOfWeek(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
}
