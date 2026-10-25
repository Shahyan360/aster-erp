import { BankAccounts } from '@/app/shared/services/lookup.types';
import { paymentVoucherByIdData } from '@/app/Modules/accounts/payment-voucher/payment-voucher.types';

export interface DemoVoucher extends paymentVoucherByIdData {
    status: 'Draft' | 'Submitted' | 'Posted' | 'Reversed';
    reversed?: boolean;
}
export interface JournalLine {
    accountId: number;
    debit: number;
    credit: number;
    date: string;
    voucherId: number;
    voucherNo: string;
    description: string;
    partyId?: number;
}
export const DEMO_USER = {
    id: 1,
    email: 'reviewer@example.com',
    fullName: 'Portfolio Reviewer',
    firstName: 'Portfolio',
    lastName: 'Reviewer',
    role: 'Demo reviewer'
};
export const DEMO_COMPANY = 'Aster Trading · Demo';
export const DEMO_ACCOUNTS: BankAccounts[] = [
    { id: 101, accountCode: '1010', accountName: 'Operating bank', accountTypeId: 2, isControlAccount: false, displayText: '1010 — Operating bank' },
    { id: 110, accountCode: '1100', accountName: 'Trade receivables', accountTypeId: 3, isControlAccount: true, controlTypeId: 1, displayText: '1100 — Trade receivables' },
    { id: 201, accountCode: '2010', accountName: 'Trade payables', accountTypeId: 19, isControlAccount: true, controlTypeId: 2, displayText: '2010 — Trade payables' },
    { id: 301, accountCode: '3010', accountName: 'Owner capital', accountTypeId: 10, isControlAccount: false, displayText: '3010 — Owner capital' },
    { id: 401, accountCode: '4010', accountName: 'Service revenue', accountTypeId: 9, isControlAccount: false, displayText: '4010 — Service revenue' },
    { id: 501, accountCode: '5010', accountName: 'Office supplies', accountTypeId: 5, isControlAccount: false, displayText: '5010 — Office supplies' },
    { id: 502, accountCode: '5020', accountName: 'Office rent', accountTypeId: 5, isControlAccount: false, displayText: '5020 — Office rent' },
    { id: 503, accountCode: '5030', accountName: 'Professional services', accountTypeId: 6, isControlAccount: false, displayText: '5030 — Professional services' },
    { id: 601, accountCode: '6010', accountName: 'Discount received', accountTypeId: 12, isControlAccount: false, displayText: '6010 — Discount received' },
    { id: 701, accountCode: '7010', accountName: 'Withholding tax payable', accountTypeId: 20, isControlAccount: false, displayText: '7010 — Withholding tax payable' }
];
export function demoDate(daysAgo = 0): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
}
export function demoYear() {
    const now = new Date();
    const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return { id: 1, financialYearName: year + '–' + (year + 1), startDate: year + '-07-01', endDate: year + 1 + '-06-30', isClosed: false, isActive: true };
}
export function seedVouchers(): DemoVoucher[] {
    return [
        { amount: 48500, account: 501, status: 'Posted', memo: 'Workspace equipment · Harbor Office Supplies' },
        { amount: 72000, account: 502, status: 'Posted', memo: 'Monthly studio rent · Willow Properties' },
        { amount: 12500, account: 503, status: 'Posted', memo: 'Design consultation · Juniper Studio' },
        { amount: 28400, account: 501, status: 'Submitted', memo: 'Office materials · Awaiting review' },
        { amount: 18500, account: 503, status: 'Draft', memo: 'Quarterly support · Draft payment' },
        { amount: 9700, account: 501, status: 'Draft', memo: 'Team supplies · Draft payment' }
    ].map((item, index) => ({
        id: index + 1,
        docNo: 'PV-DEMO-' + String(index + 1).padStart(4, '0'),
        voucherType: 'Bank payment',
        docDate: demoDate(index % 3),
        postingDate: demoDate(index % 3),
        isPosted: item.status === 'Posted',
        status: item.status as DemoVoucher['status'],
        accountId: 101,
        accountName: 'Operating bank',
        baseCurrencyId: 1,
        baseExchangeRate: 1,
        fcyId: 2,
        fcyExchangeRate: 280,
        remarks: item.memo,
        discountAccountId: 0,
        discountAccountName: null,
        discount: 0,
        voucherAmount: item.amount,
        createdOn: demoDate(index % 3),
        totalDebit: item.amount,
        totalCredit: item.amount,
        voucherDetails: [
            {
                id: index + 1,
                accountId: item.account,
                accountCode: DEMO_ACCOUNTS.find((a) => a.id === item.account)!.accountCode,
                accountName: DEMO_ACCOUNTS.find((a) => a.id === item.account)!.accountName,
                subLedgerTypeId: 0,
                subLedgerId: 0,
                counterAccountId: 101,
                comments: item.memo,
                paymentModeId: 3,
                chequeId: 0,
                chequeNumber: '',
                chequeDate: demoDate(),
                payeeTitle: null,
                chequeTypeId: 0,
                transactionTypeId: 1,
                debit: item.amount,
                credit: 0,
                exchangeRate: 280,
                amountFcy: item.amount / 280,
                taxAmount: 0,
                discountAmount: 0,
                costCenterId: 1,
                departmentId: 1,
                lineId: index + 1
            }
        ],
        taxes: [],
        attachments: []
    }));
}
export function seedJournal(): JournalLine[] {
    const entry = (accountId: number, debit: number, credit: number, voucherId: number, description: string, partyId?: number): JournalLine => ({
        accountId,
        debit,
        credit,
        voucherId,
        description,
        partyId,
        date: demoDate(2),
        voucherNo: 'JV-DEMO-' + Math.abs(voucherId)
    });
    return [
        entry(101, 1200000, 0, -1, 'Opening capital'),
        entry(301, 0, 1200000, -1, 'Opening capital'),
        entry(101, 240000, 0, -2, 'Service receipt · Juniper Studio'),
        entry(401, 0, 240000, -2, 'Service receipt · Juniper Studio'),
        entry(110, 180000, 0, -3, 'Service invoice · Maple Labs', 1),
        entry(401, 0, 180000, -3, 'Service invoice · Maple Labs')
    ];
}
