// ── General Ledger (GET /Ledger/account) ──────────────────────────────────────

/** Query params for the account-ledger endpoint. */
export interface GeneralLedgerRequest {
    companyId?: number | null;
    accountId: number;
    partyId?: number | null;
    subLedgerTypeId?: number | null;
    /** null = all, true = posted only, false = unposted only. */
    isPosted?: boolean | null;
    fromDate?: string | null;
    toDate?: string | null;
    pageNumber: number;
    pageSize: number;
}

export interface GeneralLedgerSummary {
    accountCode: string | null;
    accountName: string | null;
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    totalEntries: number;
}

/** Single ledger line returned by GET /Ledger/account. */
export interface LedgerEntry {
    voucherId?: number;
    voucherNo?: string | null;
    voucherType?: string | null;
    date?: string | null;
    docDate?: string | null;
    accountCode?: string | null;
    accountName?: string | null;
    bankName?: string | null;
    subLedger?: string | null;
    subLedgerName?: string | null;
    partyName?: string | null;
    counterAccount?: string | null;
    counterAccountName?: string | null;
    reference?: string | null;
    description?: string | null;
    narration?: string | null;
    debit?: number;
    credit?: number;
    balance?: number;
    runningBalance?: number;
    branchName?: string | null;
    companyName?: string | null;
    userName?: string | null;
    createdByName?: string | null;
    hasAttachment?: boolean;
}

export interface GeneralLedgerData {
    summary: GeneralLedgerSummary;
    entries: LedgerEntry[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface GeneralLedgerResponse {
    success: boolean;
    message: string;
    data: GeneralLedgerData | null;
    errors: string | null;
    errorCode: string | null;
}

// ── UI models (component layer) ────────────────────────────────────────────────

export type DateType = 'custom' | 'month' | 'quarter' | 'year';
export type LedgerAction = 'favorite' | 'export' | 'print' | 'share' | 'schedule' | 'refresh';

export interface LedgerOption {
    id: number;
    name: string;
}

/** A flat transaction row rendered in the ledger table. */
export interface LedgerTransaction {
    id: string;
    voucherNo: string;
    date: string;
    accountCode: string;
    accountName: string;
    bankTag?: string;
    subLedger: string;
    counterAccount: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    hasAttachment: boolean;
    company: string;
    user: string;
}

/** Filter values emitted by the filters bar. */
export interface LedgerFilters {
    dateType: DateType;
    fromDate: Date | null;
    toDate: Date | null;
    accountId: number | null;
    subLedgerId: number | null;
    companyId: number | null;
    showZeroBalances: boolean;
    includeFcy: boolean;
}

export function mapLedgerEntryToTransaction(
    entry: LedgerEntry,
    summary: GeneralLedgerSummary,
    index: number,
): LedgerTransaction {
    return {
        id: String(entry.voucherId ?? index),
        voucherNo: entry.voucherNo ?? '—',
        date: entry.date ?? entry.docDate ?? '',
        accountCode: entry.accountCode ?? summary.accountCode ?? '',
        accountName: entry.accountName ?? summary.accountName ?? '',
        bankTag: entry.bankName ?? undefined,
        subLedger: entry.subLedger ?? entry.subLedgerName ?? entry.partyName ?? '—',
        counterAccount: entry.counterAccount ?? entry.counterAccountName ?? '—',
        reference: entry.reference ?? '',
        description: entry.description ?? entry.narration ?? '',
        debit: entry.debit ?? 0,
        credit: entry.credit ?? 0,
        balance: entry.balance ?? entry.runningBalance ?? 0,
        hasAttachment: entry.hasAttachment ?? false,
        company: entry.branchName ?? entry.companyName ?? '—',
        user: entry.userName ?? entry.createdByName ?? '—',
    };
}
