// Generic lookup/reference-data types now live with the shared LookupService.
// Re-exported here so existing feature imports keep resolving from this file.
import type { BankAccounts } from '@/app/shared/services/lookup.types';
import type { SavedAttachment, tempAttachment } from '@/app/shared/services/attachment.types';

export type {
    BankAccounts,
    bankAccountResponse,
    LookupType,
    LookupTypeResponse,
    departmentLookupData,
    departmentLookupResponse,
    costCenterLookupData,
    costCenterLookupResponse,
    taxTypeLookupData,
    taxTypeLookupResponse,
    currencyLookupData,
    currencyLookupResponse
} from '@/app/shared/services/lookup.types';

export interface generateVoucherNoResponse {
    success: boolean;
    message: string;
    data: { voucherNo: string } | null;
    errors: string | null;
    errorCode: string | null;
}

// ── Voucher list (POST /Voucher/list) ─────────────────────────────────────────

export interface paymentVoucherListFilter {
    column: string;
    stringValue?: string;
    numericValue?: number;
    numericValue2?: number;
    dateValue?: string;
    dateValue2?: string;
    /** 1=Contains, 2=Equals, 3=StartsWith, 4=EndsWith — confirm with backend */
    stringFilter?: number;
    /** 1=Equals, 2=NotEquals, 3=GreaterThan, 4=LessThan — confirm with backend */
    numericFilter?: number;
    /** 1=On, 2=Before, 3=After, 4=Between — confirm with backend */
    dateFilter?: number;
}

/** Which date field the From/To range filters against. */
export enum DateFilterField {
    DocDate = 0,
    CreatedOn = 1,
    ModifiedOn = 2,
    ApprovedOn = 3
}

export interface paymentVoucherListRequest {
    pageNumber: number;
    pageSize: number;
    sortBy?: string;
    sortDesc?: boolean;
    filters?: paymentVoucherListFilter[];
    companyId?: number;
    documentTypeId?: number;
    statusFilter?: string;
    fromDate?: string;
    toDate?: string;
    /** 0=DocDate (default), 1=CreatedOn, 2=ModifiedOn, 3=ApprovedOn — the field From/To filter on. */
    dateFilterField?: number;
    bankAccountId?: number;
    debitAccountId?: number;
}

export interface paymentVoucherListTotals {
    totalAmountPkr: number;
    totalAmountFcy: number;
    totalDebit: number;
    totalCredit: number;
}

export interface paymentVoucherListItem {
    id: number;
    docNo: string;
    voucherType: string;
    docDate: string;
    bankAccount: string;
    totalAmountPkr: number;
    fcyCurrency: string;
    totalAmountFcy: number;
    /** Sometimes a display label ("Draft"), sometimes an enum code ("0") — handle both in the UI. */
    status: string;
    createdByName: string | null;
    createdOn: string;
    modifiedByName?: string | null;
    modifiedOn?: string | null;
    approvedByName?: string | null;
    approvedOn?: string | null;
    isPosted: boolean;
    remarks: string;
    totalDebit: number;
    totalCredit: number;
    noofAttachment: number;
}

export interface paymentVoucherListData {
    items: paymentVoucherListItem[];
    pageTotals: paymentVoucherListTotals;
    grandTotals: paymentVoucherListTotals;
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

export interface paymentVoucherListResponse {
    success: boolean;
    message: string;
    data: paymentVoucherListData | null;
    errors: string | null;
    errorCode: string | null;
}

// ── Voucher detail by id (GET /Voucher/{id}) ──────────────────────────────────

export interface paymentVoucherTaxByIdResponse {
    id: number;
    taxTypeId: number;
    accountId: number;
    taxPercent: number;
    taxAmount: number;
}

export interface paymentVoucherDetailByIdResponse {
    id: number;
    accountId: number;
    accountCode: string;
    accountName: string;
    subLedgerTypeId: number;
    subLedgerId: number;
    counterAccountId: number;
    comments: string;
    paymentModeId: number;
    chequeId: number;
    chequeNumber: string;
    chequeDate: string;
    payeeTitle: string | null;
    chequeTypeId: number;
    transactionTypeId: number;
    debit: number;
    credit: number;
    exchangeRate: number;
    amountFcy: number;
    taxAmount: number;
    discountAmount: number;
    costCenterId: number;
    departmentId: number;
    lineId: number;
    /** Legacy — some responses may still nest taxes on detail lines. */
    taxes?: paymentVoucherTaxByIdResponse[];
}

export interface paymentVoucherByIdData {
    /** Optional display status used by the sandbox; older live APIs may omit it. */
    status?: 'Draft' | 'Submitted' | 'Posted' | 'Reversed';
    id: number;
    docNo: string;
    voucherType: string | null;
    docDate: string;
    postingDate: string | null;
    isPosted: boolean;
    accountId: number;
    accountName: string;
    baseCurrencyId: number;
    baseExchangeRate: number;
    fcyId: number;
    fcyExchangeRate: number;
    remarks: string;
    discountAccountId: number;
    discountAccountName: string | null;
    discount: number;
    voucherAmount: number;
    createdOn: string;
    totalDebit: number;
    totalCredit: number;
    voucherDetails: paymentVoucherDetailByIdResponse[];
    /** Header-level tax deductions (GET /Voucher/{id}). */
    taxes: paymentVoucherTaxByIdResponse[];
    attachments: SavedAttachment[];
}

export interface paymentVoucherByIdResponse {
    success: boolean;
    message: string;
    data: paymentVoucherByIdData | null;
    errors: string | null;
    errorCode: string | null;
}

// Saved attachments — re-exported from shared for backward compatibility.
export type {
    SavedAttachment,
    TempAttachment,
    tempAttachment,
    TempAttachmentUploadResponse,
    tempAttachmentUploadResponse,
    TempAttachmentDeleteResponse,
    tempAttachmentDeleteResponse,
    CommitLinkedRequest,
    commitLinkedRequest,
    CommitLinkedResponse,
    commitLinkedResponse
} from '@/app/shared/services/attachment.types';

// ── Save payload (POST /Voucher) ──────────────────────────────────────────────
// All fields are non-nullable — the .NET API rejects `null` for int/string fields.
// Use `0` for an unset id and `""` for an unset string.

export interface paymentVoucherTax {
    /** 0 for new tax lines; existing id when editing. */
    id: number;
    taxTypeId: number;
    accountId: number;
    taxPercent: number;
    taxAmount: number;
}

export interface paymentVoucherDetail {
    accountId: number;
    subLedgerTypeId: number;
    subLedgerId: number;
    counterAccountId: number;
    comments: string;
    paymentModeId: number;
    chequeId: number;
    chequeNumber: string;
    /** ISO date string. */
    chequeDate: string;
    payeeTitle: string;
    chequeTypeId: number;
    transactionTypeId: number;
    debit: number;
    credit: number;
    exchangeRate: number;
    amountFcy: number;
    taxAmount: number;
    discountAmount: number;
    costCenterId: number;
    departmentId: number;
    /** 0 for new lines; carries the existing id when editing. */
    lineId: number;
}

export interface paymentVoucherPayload {
    documentTypeId: number;
    /** ISO date string (voucher date). */
    docDate: string;
    /** ISO date string. */
    postingDate: string;
    /** Header bank account id. */
    accountId: number;
    baseCurrencyId: number;
    baseExchangeRate: number;
    /** FCY currency id. */
    fcyId: number;
    fcyExchangeRate: number;
    remarks: string;
    financialYearId: number;
    /** Header-level discount account + amount (from the Summary panel). */
    discountAccountId: number;
    discount: number;
    /** Total voucher amount (net + discount + tax). */
    voucherAmount: number;
    isOffline: boolean;
    /** Document status — 1 = Draft, 2 = Submitted, 3 = Posted. */
    documentStatusId: number;
    voucherDetails: paymentVoucherDetail[];
    /** Header-level tax deductions (from the Tax table). */
    taxes: paymentVoucherTax[];
    /** Staged temp attachments; the backend commits them on save. */
    attachments: tempAttachment[];
    /** Update-only: ids of previously-saved attachments the user removed during this edit. */
    deleteAttachmentIds?: number[];
}

export interface paymentVoucherSaveResponse {
    success: boolean;
    message: string;
    data: unknown;
    errors: string | null;
    errorCode: string | null;
}

// ── Ledger print (GET /Ledger/GetLedgerPrint) ────────────────────────────────

export interface LedgerPrintCompany {
    name: string;
    address: string;
    email: string;
    phone: string;
}

export interface LedgerPrintLine {
    rowNo: number;
    accountName: string;
    accountCode: string;
    subLedger: string | null;
    department: string | null;
    costCenter: string | null;
    paymentMode: string;
    chequeNumber: string | null;
    chequeDate: string | null;
    payeeNarration: string | null;
    debit: number;
    credit: number;
}

export interface LedgerPrintAmountSummary {
    label: string;
    netPayable: number;
    discount: number;
    taxAmount: number;
    grossAmount: number;
}

export interface LedgerPrintData {
    company: LedgerPrintCompany;
    documentNo: string;
    docDate: string;
    fiscalYearPeriod: string;
    status: string;
    isPosted: boolean;
    title: string;
    bankAccount: string;
    iban: string | null;
    fcyCurrency: string;
    fcyCurrencySymbol: string;
    fcyExchangeRate: number;
    narration: string;
    lines: LedgerPrintLine[];
    totalDebit: number;
    totalCredit: number;
    lcy: LedgerPrintAmountSummary;
    fcy: LedgerPrintAmountSummary;
    createdByName: string;
    createdOn: string;
    lastModifiedByName: string | null;
    lastModifiedOn: string | null;
    approvedByName: string | null;
    approvedOn: string | null;
    generatedOn: string;
}

export interface LedgerPrintResponse {
    success: boolean;
    message: string;
    data: LedgerPrintData | null;
    errors: string | null;
    errorCode: string | null;
}

// ── Form view-models (payment-voucher-form ⇄ detail / tax child tables) ────────

/** Row shape fed to the VoucherDetails table when loading a voucher for edit. */
export interface VoucherDetailRow {
    transactionType: string;
    account: string;
    subLedgerType: string;
    subLedger: string;
    department: string;
    costCenter: string;
    paymentMode: string;
    chequeType: string;
    transactionTypeId: number;
    accountId: number;
    /** True when Account (Dr) is a control account — Sub Ledger Type/Sub Ledger are required. */
    isControlAccount?: boolean;
    subLedgerTypeId: number;
    subLedgerId: number;
    departmentId: number;
    costCenterId: number;
    paymentModeId: number;
    chequeTypeId: number;
    /** Cheque-book leaf id (0 when manual instrument or no cheque). */
    chequeId?: number;
    lineId: number;
    exchangeRate: number;
    chequeNo: string;
    chequeDate: string;
    payeeTitle: string;
    /** Line-level remarks — maps to the detail's `comments` field. */
    comments: string;
    amount: number;
    discount: number;
    taxPercent: number;
    taxAmount: number;
    netAmount: number;
}

/** Row shape fed to the VoucherTax table when loading a voucher for edit. */
export interface VoucherTaxRow {
    taxAccount: number;
    taxType: number;
    whtPercent: number;
    baseAmount: number;
    taxAmount: number;
    /** API tax id when editing an existing row; 0 for new rows. */
    id?: number;
    editing: boolean;
}

/** The id → name lookups resolved alongside the voucher when entering edit mode. */
export interface EditModeLookups {
    transactionTypes: { data: { id: number; name: string }[] };
    subLedgerTypes: { data: { id: number; name: string }[] };
    departments: { data: { id: number; departmentName: string }[] };
    costCenters: { data: { id: number; costCenterName: string }[] };
    paymentModes: { data: { id: number; name: string }[] };
    chequeTypes: { data: { id: number; name: string }[] };
    accounts: { data: BankAccounts[] };
}
