import { Injectable, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { paymentVoucherPayload, paymentVoucherListItem, LedgerPrintData } from '@/app/Modules/accounts/payment-voucher/payment-voucher.types';
import { DEMO_ACCOUNTS, DEMO_COMPANY, DemoVoucher, JournalLine, demoDate, demoYear, seedJournal, seedVouchers } from './demo-data';
import { sumMoney, moneyDifference } from '@/app/shared/utils/money.util';

@Injectable({ providedIn: 'root' })
export class DemoStore {
    readonly accounts = DEMO_ACCOUNTS;
    readonly vouchers = signal<DemoVoucher[]>(this.restore());
    readonly journal = computed(() => {
        const lines = [...seedJournal()];
        for (const voucher of this.vouchers().filter((v) => v.isPosted)) {
            const details: JournalLine[] = voucher.voucherDetails.map((row) => ({
                accountId: row.accountId,
                debit: row.debit,
                credit: row.credit,
                date: voucher.docDate,
                voucherId: voucher.id,
                voucherNo: voucher.docNo,
                description: voucher.remarks,
                partyId: row.subLedgerId || undefined
            }));
            const net = sumMoney(details.map((r) => r.debit));
            // Existing contract: gross voucher = net + discount + tax.
            const tax = sumMoney(voucher.taxes.map((t) => t.taxAmount));
            if (details[0]) details[0] = { ...details[0], debit: sumMoney([details[0].debit, tax, voucher.discount]) };
            const shared = { date: voucher.docDate, voucherId: voucher.id, voucherNo: voucher.docNo, description: voucher.remarks };
            details.push({ ...shared, accountId: voucher.accountId, debit: 0, credit: net });
            for (const row of voucher.taxes) details.push({ ...shared, accountId: row.accountId, debit: 0, credit: row.taxAmount });
            if (voucher.discount) details.push({ ...shared, accountId: voucher.discountAccountId, debit: 0, credit: voucher.discount });
            lines.push(...details);
            if (voucher.reversed) lines.push(...details.map((r) => ({ ...r, debit: r.credit, credit: r.debit, voucherNo: 'REV-' + r.voucherNo, description: 'Reversal · ' + r.description })));
        }
        return lines;
    });
    readonly trialBalance = computed(() =>
        this.accounts.map((account) => {
            const rows = this.journal().filter((row) => row.accountId === account.id);
            const movement = moneyDifference(sumMoney(rows.map((r) => r.debit)), sumMoney(rows.map((r) => r.credit)));
            return { ...account, debit: Math.max(movement, 0), credit: Math.max(-movement, 0) };
        })
    );
    readonly bankBalance = computed(() => this.trialBalance().find((a) => a.id === 101)?.debit ?? 0);
    readonly expenseTotal = computed(() =>
        sumMoney(
            this.trialBalance()
                .filter((a) => a.accountCode.startsWith('5'))
                .map((a) => a.debit)
        )
    );
    readonly receivables = computed(() => this.trialBalance().find((a) => a.id === 110)?.debit ?? 0);
    readonly revenue = computed(() => this.trialBalance().find((a) => a.id === 401)?.credit ?? 0);
    readonly pendingCount = computed(() => this.vouchers().filter((v) => v.status === 'Submitted').length);
    private restore(): DemoVoucher[] {
        try {
            const value = JSON.parse(sessionStorage.getItem('aster.demo.vouchers.v1') ?? 'null');
            if (Array.isArray(value) && value.length <= 500 && value.every((v) => Number.isSafeInteger(v.id) && Array.isArray(v.voucherDetails) && Array.isArray(v.taxes))) return value;
        } catch {
            /* New or unavailable session storage. */
        }
        return seedVouchers();
    }
    private commit(items: DemoVoucher[]): void {
        this.vouchers.set(items);
        try {
            sessionStorage.setItem('aster.demo.vouchers.v1', JSON.stringify(items));
        } catch {
            /* In-memory demo stays usable. */
        }
    }
    reset(): void {
        this.commit(seedVouchers());
    }
    nextNumber(): string {
        return 'PV-DEMO-' + String(Math.max(0, ...this.vouchers().map((v) => v.id)) + 1).padStart(4, '0');
    }
    get(id: number): DemoVoucher {
        const voucher = this.vouchers().find((v) => v.id === id);
        if (!voucher) this.fail(404, 'Demo voucher not found.');
        return structuredClone(voucher!);
    }
    fail(status: number, message: string): never {
        throw new HttpErrorResponse({ status, error: { success: false, message }, statusText: 'Demo request rejected' });
    }
    save(payload: paymentVoucherPayload, id?: number): number {
        if (id && this.get(id).status !== 'Draft') this.fail(409, 'Only draft vouchers can be edited in this demo.');
        if (![1, 2].includes(payload.documentStatusId)) this.fail(400, 'Only Draft and Submitted are supported for demo saves.');
        if (!this.accounts.some((a) => a.id === payload.accountId && a.accountTypeId === 2)) this.fail(400, 'Select a demo bank account.');
        if (payload.financialYearId !== 1) this.fail(400, 'Select the open demo financial year.');
        if (!payload.voucherDetails?.length || payload.voucherDetails.length > 100) this.fail(400, 'Add between 1 and 100 detail rows.');
        if (payload.attachments?.length) this.fail(400, 'File storage is unavailable in this sandbox.');
        for (const row of payload.voucherDetails) {
            if (!this.accounts.some((a) => a.id === row.accountId) || !Number.isFinite(row.debit) || row.debit <= 0 || row.debit > 100000000 || row.credit !== 0) this.fail(400, 'Each demo payment line requires a valid account and positive amount.');
        }
        if (!Number.isFinite(payload.discount) || payload.discount < 0 || !Number.isFinite(payload.voucherAmount)) this.fail(400, 'Invalid monetary amount.');
        if (payload.discount > 0 && !this.accounts.some((a) => a.id === payload.discountAccountId)) this.fail(400, 'Choose a discount account.');
        for (const tax of payload.taxes ?? []) if (!this.accounts.some((a) => a.id === tax.accountId) || !Number.isFinite(tax.taxAmount) || tax.taxAmount < 0) this.fail(400, 'Invalid tax line.');
        const expectedGross = sumMoney([...payload.voucherDetails.map((row) => row.debit), payload.discount, ...(payload.taxes ?? []).map((row) => row.taxAmount)]);
        if (Math.abs(moneyDifference(expectedGross, payload.voucherAmount)) > 0.01) this.fail(400, 'Voucher amount does not match detail, discount and tax totals.');
        if (!Number.isFinite(Date.parse(payload.docDate))) this.fail(400, 'Enter a valid document date.');
        const nextId = id ?? Math.max(0, ...this.vouchers().map((v) => v.id)) + 1;
        const voucher: DemoVoucher = {
            id: nextId,
            docNo: id ? this.get(id).docNo : this.nextNumber(),
            voucherType: 'Bank payment',
            docDate: payload.docDate,
            postingDate: payload.postingDate,
            isPosted: false,
            status: payload.documentStatusId === 1 ? 'Draft' : 'Submitted',
            accountId: payload.accountId,
            accountName: this.accounts.find((a) => a.id === payload.accountId)!.accountName,
            baseCurrencyId: payload.baseCurrencyId,
            baseExchangeRate: payload.baseExchangeRate,
            fcyId: payload.fcyId,
            fcyExchangeRate: payload.fcyExchangeRate,
            remarks: (payload.remarks ?? '').slice(0, 2000),
            discountAccountId: payload.discountAccountId,
            discountAccountName: null,
            discount: payload.discount,
            voucherAmount: payload.voucherAmount,
            createdOn: id ? this.get(id).createdOn : demoDate(),
            totalDebit: sumMoney(payload.voucherDetails.map((r) => r.debit)),
            totalCredit: sumMoney(payload.voucherDetails.map((r) => r.debit)),
            voucherDetails: payload.voucherDetails.map((row, index) => ({
                ...row,
                id: index + 1,
                lineId: index + 1,
                accountCode: this.accounts.find((a) => a.id === row.accountId)!.accountCode,
                accountName: this.accounts.find((a) => a.id === row.accountId)!.accountName
            })),
            taxes: (payload.taxes ?? []).map((row, index) => ({ ...row, id: index + 1 })),
            attachments: []
        };
        this.commit([...this.vouchers().filter((v) => v.id !== nextId), voucher]);
        return nextId;
    }
    remove(id: number): void {
        if (this.get(id).status !== 'Draft') this.fail(409, 'Only drafts can be deleted. Posted records require a reversal.');
        this.commit(this.vouchers().filter((v) => v.id !== id));
    }
    reverse(id: number): void {
        const voucher = this.get(id);
        if (!voucher.isPosted || voucher.reversed) this.fail(409, 'Only a posted, unreversed voucher can be reversed.');
        this.commit(this.vouchers().map((v) => (v.id === id ? { ...v, reversed: true, status: 'Reversed' } : v)));
    }
    listItems(): paymentVoucherListItem[] {
        return this.vouchers().map((v) => ({
            id: v.id,
            docNo: v.docNo,
            voucherType: v.voucherType ?? 'Bank payment',
            docDate: v.docDate,
            bankAccount: v.accountName,
            totalAmountPkr: v.voucherAmount,
            fcyCurrency: 'USD',
            totalAmountFcy: v.voucherAmount / (v.fcyExchangeRate || 280),
            status: v.status,
            createdByName: 'Demo Reviewer',
            createdOn: v.createdOn,
            isPosted: v.isPosted && !v.reversed,
            remarks: v.remarks,
            totalDebit: v.totalDebit,
            totalCredit: v.totalCredit,
            noofAttachment: 0
        }));
    }
    print(id: number): LedgerPrintData {
        const v = this.get(id);
        const line = (accountId: number, debit: number, credit: number, index: number) => ({
            rowNo: index + 1,
            accountName: this.accounts.find((a) => a.id === accountId)?.accountName ?? 'Demo account',
            accountCode: this.accounts.find((a) => a.id === accountId)?.accountCode ?? '',
            subLedger: null,
            department: 'Operations',
            costCenter: 'Head office',
            paymentMode: 'Transfer',
            chequeNumber: null,
            chequeDate: null,
            payeeNarration: v.remarks,
            debit,
            credit
        });
        const printLines = v.voucherDetails.map((r, i) => line(r.accountId, r.debit, 0, i));
        if (printLines[0]) printLines[0].debit = sumMoney([printLines[0].debit, v.discount, ...v.taxes.map((t) => t.taxAmount)]);
        printLines.push(line(v.accountId, 0, v.totalDebit, printLines.length));
        for (const tax of v.taxes) printLines.push(line(tax.accountId, 0, tax.taxAmount, printLines.length));
        if (v.discount) printLines.push(line(v.discountAccountId, 0, v.discount, printLines.length));
        const summary = { label: 'PKR', netPayable: v.totalDebit, discount: v.discount, taxAmount: sumMoney(v.taxes.map((t) => t.taxAmount)), grossAmount: v.voucherAmount };
        return {
            company: { name: DEMO_COMPANY, address: 'Fictional portfolio workspace', email: 'demo@example.com', phone: '' },
            documentNo: v.docNo,
            docDate: v.docDate,
            fiscalYearPeriod: demoYear().financialYearName,
            status: v.status,
            isPosted: v.isPosted,
            title: 'Payment Voucher · Simulated',
            bankAccount: v.accountName,
            iban: null,
            fcyCurrency: 'USD',
            fcyCurrencySymbol: '$',
            fcyExchangeRate: v.fcyExchangeRate,
            narration: v.remarks,
            lines: printLines,
            totalDebit: sumMoney(printLines.map((r) => r.debit)),
            totalCredit: sumMoney(printLines.map((r) => r.credit)),
            lcy: summary,
            fcy: {
                ...summary,
                label: 'USD',
                netPayable: summary.netPayable / (v.fcyExchangeRate || 280),
                discount: summary.discount / (v.fcyExchangeRate || 280),
                taxAmount: summary.taxAmount / (v.fcyExchangeRate || 280),
                grossAmount: summary.grossAmount / (v.fcyExchangeRate || 280)
            },
            createdByName: 'Demo Reviewer',
            createdOn: v.createdOn,
            lastModifiedByName: null,
            lastModifiedOn: null,
            approvedByName: null,
            approvedOn: null,
            generatedOn: demoDate()
        };
    }
}
