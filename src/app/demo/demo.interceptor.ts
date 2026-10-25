import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, delay, of, throwError } from 'rxjs';
import { environment } from '@/environments/environment';
import { paymentVoucherListRequest, paymentVoucherPayload } from '@/app/Modules/accounts/payment-voucher/payment-voucher.types';
import { DemoStore } from './demo-store';
import { DEMO_ACCOUNTS, DEMO_COMPANY, DEMO_USER, demoDate, demoYear } from './demo-data';
import { isApiRequest } from '@/app/core/interceptors/api-request';
import { readSession } from '@/app/core/services/session-storage';
import { sumMoney, moneyDifference } from '@/app/shared/utils/money.util';

const ok = (data: unknown) => ({ success: true, message: 'Simulated in this browser only.', data, errors: null, errorCode: null });
const menu = [
    { id: 1, moduleName: 'WORKSPACE', icon: 'pi pi-th-large', subModules: [{ id: 1, subModuleName: 'Overview', icon: 'pi pi-home', route: '/', screens: [] }] },
    {
        id: 2,
        moduleName: 'FINANCE',
        icon: 'pi pi-wallet',
        subModules: [
            { id: 2, subModuleName: 'Payment vouchers', icon: 'pi pi-credit-card', route: '/accounts/payment-voucher', screens: [] },
            { id: 3, subModuleName: 'Chart of accounts', icon: 'pi pi-sitemap', route: '/accounts/chart-of-account', screens: [] }
        ]
    },
    {
        id: 3,
        moduleName: 'REPORTING',
        icon: 'pi pi-chart-bar',
        subModules: [
            { id: 4, subModuleName: 'General ledger', icon: 'pi pi-book', route: '/reports/general-ledger', screens: [] },
            { id: 5, subModuleName: 'Trial balance', icon: 'pi pi-calculator', route: '/reports/trial-balance', screens: [] }
        ]
    }
];

function response(req: HttpRequest<unknown>, store: DemoStore): unknown {
    const base = new URL(environment.apiUrl, window.location.origin);
    const url = new URL(req.url, window.location.origin);
    const route = url.pathname.slice(base.pathname.replace(/\/+$/, '').length).toLowerCase();
    const query = (key: string) => req.params.get(key) ?? url.searchParams.get(key);
    if (route === '/auth/login' && req.method === 'POST') {
        const body = req.body as { email?: string; password?: string };
        if (body.email !== 'reviewer@example.com' || body.password !== 'demo-session') store.fail(401, 'Use Explore demo to enter the simulated workspace.');
        return { accessToken: 'aster-demo-session', refreshToken: 'aster-demo-refresh', expiresIn: 3600, user: DEMO_USER };
    }
    if (readSession('token') !== 'aster-demo-session') store.fail(401, 'Enter the demo workspace first.');
    if (route === '/auth/refresh' && req.method === 'POST') return { accessToken: 'aster-demo-session', refreshToken: 'aster-demo-refresh', expiresIn: 3600 };
    if (req.method === 'GET') {
        if (route === '/financial-years') return ok([demoYear()]);
        if (route.startsWith('/menu/')) return menu;
        if (route === '/chartofaccount/dropdown') {
            const types = req.params.getAll('accountTypeIds')?.map(Number) ?? [];
            return ok(DEMO_ACCOUNTS.filter((a) => !types.length || types.includes(a.accountTypeId!)));
        }
        if (route === '/currencies')
            return ok([
                { id: 1, currencyCode: 'PKR', currencyName: 'Pakistani rupee', symbol: 'Rs', isBaseCurrency: true, isActive: true },
                { id: 2, currencyCode: 'USD', currencyName: 'US dollar', symbol: '$', isBaseCurrency: false, isActive: true }
            ]);
        if (route === '/system-settings')
            return ok(
                [
                    [11, 'USD'],
                    [12, '280'],
                    [13, 'PKR'],
                    [14, '1'],
                    [21, '2'],
                    [22, '2'],
                    [23, '4'],
                    [24, '4'],
                    [25, '2'],
                    [27, '2'],
                    [31, '30']
                ].map(([settingId, value]) => ({ id: settingId, settingId, value: String(value), settingKey: 'Demo', isActive: true }))
            );
        if (route === '/lookup/transaction-types')
            return ok([
                { id: 1, name: 'Invoice Payment' },
                { id: 2, name: 'Expense Payment' }
            ]);
        if (route === '/lookup/sub-ledger-types')
            return ok([
                { id: 1, name: 'Customer' },
                { id: 2, name: 'Supplier' }
            ]);
        if (route === '/lookup/sub-ledgers') {
            const parties = [
                { id: 1, code: 'C-001', name: 'Maple Labs · Demo', accountId: 110, subLedgerTypeId: 1 },
                { id: 2, code: 'S-001', name: 'Harbor Office Supplies · Demo', accountId: 201, subLedgerTypeId: 2 }
            ];
            return ok(parties.filter((p) => (!query('accountId') || p.accountId === Number(query('accountId'))) && (!query('subLedgerTypeId') || p.subLedgerTypeId === Number(query('subLedgerTypeId')))));
        }
        if (route === '/lookup/departments') return ok([{ id: 1, departmentCode: 'OPS', departmentName: 'Operations', isActive: true }]);
        if (route === '/lookup/cost-centers') return ok([{ id: 1, costCenterCode: 'HQ', costCenterName: 'Head office', isActive: true }]);
        if (route === '/lookup/payment-modes')
            return ok([
                { id: 1, name: 'Cheque' },
                { id: 2, name: 'Manual Instrument' },
                { id: 3, name: 'Bank Transfer' }
            ]);
        if (route === '/lookup/cheque-types')
            return ok([
                { id: 1, name: 'Crossed' },
                { id: 2, name: 'Pay order' }
            ]);
        if (route === '/lookup/tax-types')
            return ok([{ id: 1, taxTypeName: 'Illustrative withholding', defaultRate: 5, accountId: 701, accountName: 'Withholding tax payable', mainTaxTypeId: 1, mainTaxTypeName: 'Illustrative tax', isActive: true, effectiveDate: demoDate() }]);
        if (route === '/chequebook/dropdown') return ok([{ id: 1, bookNumber: 'DEMO-BOOK', bankAccount: 'Operating bank', availableLeaves: 3 }]);
        if (route === '/chequebook/available-leaves')
            return ok([
                { id: 1, chequeNumber: 'DEMO-001' },
                { id: 2, chequeNumber: 'DEMO-002' },
                { id: 3, chequeNumber: 'DEMO-003' }
            ]);
        if (route === '/ledger/balance') {
            const accountId = Number(query('AccountId'));
            const account = store.trialBalance().find((a) => a.id === accountId);
            return ok({
                accountId,
                accountCode: account?.accountCode,
                accountName: account?.accountName,
                partyId: null,
                partyName: null,
                balance: account?.debit || account?.credit || 0,
                balanceType: account?.credit ? 'Cr' : 'Dr',
                asOfDate: demoDate()
            });
        }
        if (route === '/voucher/generate-no') return ok({ voucherNo: store.nextNumber() });
        if (/^\/voucher\/\d+$/.test(route)) return ok(store.get(Number(route.split('/')[2])));
        if (route === '/ledger/getledgerprint') return ok(store.print(Number(query('id'))));
        if (route === '/ledger/account') {
            const accountId = Number(query('AccountId'));
            const account = DEMO_ACCOUNTS.find((a) => a.id === accountId);
            const from = query('FromDate');
            const to = query('ToDate');
            const all = store
                .journal()
                .filter((r) => r.accountId === accountId && (!query('PartyId') || r.partyId === Number(query('PartyId'))))
                .sort((a, b) => a.date.localeCompare(b.date) || a.voucherId - b.voucherId);
            const before = all.filter((r) => from && r.date < new Date(from).toISOString());
            const rows = all.filter((r) => (!from || r.date >= new Date(from).toISOString()) && (!to || r.date <= new Date(to).toISOString()));
            const opening = moneyDifference(sumMoney(before.map((r) => r.debit)), sumMoney(before.map((r) => r.credit)));
            let balance = opening;
            const entries = rows.map((r) => {
                balance = sumMoney([balance, r.debit, -r.credit]);
                return {
                    ...r,
                    accountCode: account?.accountCode,
                    accountName: account?.accountName,
                    companyName: DEMO_COMPANY,
                    createdByName: 'Demo Reviewer',
                    runningBalance: balance,
                    hasAttachment: false,
                    counterAccountName: r.voucherId > 0 ? 'Operating bank / expense' : 'Capital / revenue',
                    subLedgerName: r.partyId === 1 ? 'Maple Labs · Demo' : null
                };
            });
            const page = Math.max(1, Number(query('PageNumber')) || 1),
                size = Math.min(100, Math.max(1, Number(query('PageSize')) || 25));
            return ok({
                summary: {
                    accountCode: account?.accountCode,
                    accountName: account?.accountName,
                    openingBalance: opening,
                    totalDebit: sumMoney(rows.map((r) => r.debit)),
                    totalCredit: sumMoney(rows.map((r) => r.credit)),
                    closingBalance: balance,
                    totalEntries: rows.length
                },
                entries: entries.slice((page - 1) * size, page * size),
                totalCount: rows.length,
                pageNumber: page,
                pageSize: size
            });
        }
        if (route.startsWith('/audit/entity/'))
            return ok([
                {
                    id: 1,
                    auditAction: 'Created',
                    auditModule: 'Finance',
                    entityName: 'Voucher',
                    entityId: Number(route.split('/').pop()),
                    description: 'Synthetic sample created for this portfolio session',
                    userId: 1,
                    userName: 'Demo Reviewer',
                    actionDate: demoDate(),
                    ipAddress: '',
                    details: []
                }
            ]);
        if (route.startsWith('/approval/workflow/'))
            return ok({
                mode: 'Preview',
                refDocumentTypeId: 1,
                referenceDocId: Number(query('docId')) || null,
                referenceDocNo: null,
                documentAmount: Number(query('amount')),
                overallStatus: 'Simulated preview',
                rows: [
                    {
                        logId: 1,
                        referenceDocNo: null,
                        documentType: 'Payment voucher',
                        module: 'Finance',
                        screen: 'Payment vouchers',
                        level: '1',
                        group: 'Demo finance',
                        approvalType: 'Amount based',
                        minAmount: 0,
                        maxAmount: null,
                        assignedUser: 'Demo finance lead',
                        isMandatory: true,
                        isFinal: true,
                        status: 'Pending',
                        actionBy: null,
                        actionDate: null,
                        remarks: 'Read-only illustration; no real approvals are performed.',
                        submissionNo: 1,
                        isViewOnly: true,
                        canReject: false,
                        assignedUserId: 2,
                        assignedUserEmail: 'approver@example.com',
                        createdOn: demoDate()
                    }
                ]
            });
    }
    if (route === '/voucher/list' && req.method === 'POST') {
        const body = req.body as paymentVoucherListRequest;
        let items = store.listItems().filter((v) => (!body.fromDate || v.docDate >= new Date(body.fromDate).toISOString()) && (!body.toDate || v.docDate <= new Date(body.toDate).toISOString()));
        if (body.statusFilter) {
            const status = body.statusFilter.toLowerCase().replace(/\s/g, '');
            items = items.filter((v) => (status === 'draft' || status === '1' ? v.status === 'Draft' : status === 'approved' || status === 'posted' || status === '3' ? v.status === 'Posted' : v.status === 'Submitted'));
        }
        if (body.bankAccountId) items = items.filter((v) => store.get(v.id).accountId === body.bankAccountId);
        if (body.debitAccountId) items = items.filter((v) => store.get(v.id).voucherDetails.some((r) => r.accountId === body.debitAccountId));
        for (const filter of body.filters ?? []) {
            items = items.filter((v) => {
                const value = (v as unknown as Record<string, unknown>)[filter.column];
                if (filter.stringValue !== undefined) {
                    const a = String(value ?? '').toLowerCase(),
                        b = filter.stringValue.toLowerCase();
                    return filter.stringFilter === 2 ? a === b : filter.stringFilter === 3 ? a.startsWith(b) : filter.stringFilter === 4 ? a.endsWith(b) : a.includes(b);
                }
                if (filter.numericValue !== undefined) {
                    const n = Number(value),
                        target = filter.numericValue;
                    return filter.numericFilter === 2 ? n !== target : filter.numericFilter === 3 ? n > target : filter.numericFilter === 4 ? n < target : n === target;
                }
                if (filter.dateValue) {
                    const actual = String(value ?? '').slice(0, 10),
                        target = filter.dateValue.slice(0, 10);
                    return filter.dateFilter === 2 ? actual < target : filter.dateFilter === 3 ? actual > target : filter.dateFilter === 4 ? actual >= target && actual <= (filter.dateValue2 ?? filter.dateValue).slice(0, 10) : actual === target;
                }
                return true;
            });
        }
        const field = body.sortBy && ['docNo', 'docDate', 'totalAmountPkr', 'totalAmountFcy', 'status', 'bankAccount', 'createdOn'].includes(body.sortBy) ? body.sortBy : 'docDate';
        items.sort((a, b) => {
            const av = (a as unknown as Record<string, unknown>)[field],
                bv = (b as unknown as Record<string, unknown>)[field];
            const comparison = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
            return body.sortDesc ? -comparison : comparison;
        });
        const totals = (rows: typeof items) => ({
            totalAmountPkr: sumMoney(rows.map((v) => v.totalAmountPkr)),
            totalAmountFcy: sumMoney(rows.map((v) => v.totalAmountFcy)),
            totalDebit: sumMoney(rows.map((v) => v.totalDebit)),
            totalCredit: sumMoney(rows.map((v) => v.totalCredit))
        });
        const size = Math.min(100, Math.max(1, body.pageSize || 25)),
            page = Math.max(1, body.pageNumber || 1),
            selected = items.slice((page - 1) * size, page * size);
        return ok({ items: selected, pageTotals: totals(selected), grandTotals: totals(items), totalCount: items.length, pageNumber: page, pageSize: size, totalPages: Math.ceil(items.length / size) });
    }
    if (route === '/voucher' && req.method === 'POST') return ok({ id: store.save(req.body as paymentVoucherPayload) });
    if (/^\/voucher\/\d+$/.test(route) && req.method === 'PUT') return ok({ id: store.save(req.body as paymentVoucherPayload, Number(route.split('/')[2])) });
    if (/^\/voucher\/\d+$/.test(route) && req.method === 'DELETE') {
        store.remove(Number(route.split('/')[2]));
        return ok(null);
    }
    if (/^\/voucher\/\d+\/reverse$/.test(route) && req.method === 'POST') {
        store.reverse(Number(route.split('/')[2]));
        return ok(null);
    }
    store.fail(501, 'This operation is unavailable in the portfolio sandbox. No request was sent to a server.');
}

export const demoInterceptor: HttpInterceptorFn = (req, next) => {
    if (!environment.demoMode || !isApiRequest(req.url)) return next(req);
    const store = inject(DemoStore);
    // Every matching API request terminates here, including unknown endpoints.
    return defer(() => {
        try {
            return of(new HttpResponse({ status: 200, body: response(req, store), url: req.url })).pipe(delay(120));
        } catch (error) {
            return throwError(() => (error instanceof HttpErrorResponse ? error : new HttpErrorResponse({ status: 400, error: { message: 'Invalid demo request.' } })));
        }
    });
};
