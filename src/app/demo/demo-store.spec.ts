import { TestBed } from '@angular/core/testing';
import { DemoStore } from './demo-store';
import { sumMoney } from '@/app/shared/utils/money.util';
import { paymentVoucherPayload } from '@/app/Modules/accounts/payment-voucher/payment-voucher.types';

describe('synthetic finance workspace', () => {
    let store: DemoStore;
    const payload = (): paymentVoucherPayload => ({
        documentTypeId: 1,
        documentStatusId: 1,
        docDate: new Date().toISOString(),
        postingDate: new Date().toISOString(),
        accountId: 101,
        baseCurrencyId: 1,
        baseExchangeRate: 1,
        fcyId: 2,
        fcyExchangeRate: 280,
        remarks: 'Synthetic test',
        financialYearId: 1,
        discountAccountId: 0,
        discount: 0,
        voucherAmount: 100,
        isOffline: false,
        taxes: [],
        attachments: [],
        voucherDetails: [
            {
                accountId: 501,
                subLedgerTypeId: 0,
                subLedgerId: 0,
                counterAccountId: 101,
                comments: 'Synthetic test',
                paymentModeId: 3,
                chequeId: 0,
                chequeNumber: '',
                chequeDate: new Date().toISOString(),
                payeeTitle: '',
                chequeTypeId: 0,
                transactionTypeId: 1,
                debit: 100,
                credit: 0,
                exchangeRate: 280,
                amountFcy: 0,
                taxAmount: 0,
                discountAmount: 0,
                costCenterId: 1,
                departmentId: 1,
                lineId: 0
            }
        ]
    });
    beforeEach(() => {
        TestBed.configureTestingModule({});
        store = TestBed.inject(DemoStore);
        store.reset();
    });
    afterEach(() => sessionStorage.removeItem('aster.demo.vouchers.v1'));
    it('seeds a balanced journal', () => expect(sumMoney(store.journal().map((r) => r.debit))).toBe(sumMoney(store.journal().map((r) => r.credit))));
    it('derives a balanced trial balance from the journal', () => expect(sumMoney(store.trialBalance().map((r) => r.debit))).toBe(sumMoney(store.trialBalance().map((r) => r.credit))));
    it('does not post drafts or submissions', () => {
        const before = store.journal().length;
        store.save(payload());
        store.save({ ...payload(), documentStatusId: 2 });
        expect(store.journal().length).toBe(before);
    });
    it('generates unique IDs and numbers for actual saves', () => {
        const a = store.save(payload()),
            b = store.save(payload());
        expect(a).not.toBe(b);
        expect(store.get(a).docNo).not.toBe(store.get(b).docNo);
    });
    it('updates and deletes drafts locally', () => {
        const id = store.save(payload());
        store.save({ ...payload(), remarks: 'Updated synthetic test' }, id);
        expect(store.get(id).remarks).toBe('Updated synthetic test');
        store.remove(id);
        expect(() => store.get(id)).toThrow();
    });
    it('rejects edits/deletes of posted records', () => {
        expect(() => store.save(payload(), 1)).toThrow();
        expect(() => store.remove(1)).toThrow();
    });
    it('reverses posted records with matching counter-entries', () => {
        const before = store.bankBalance();
        store.reverse(1);
        expect(store.bankBalance()).toBe(before + 48500);
        expect(sumMoney(store.journal().map((r) => r.debit))).toBe(sumMoney(store.journal().map((r) => r.credit)));
        expect(() => store.reverse(1)).toThrow();
    });
    it('rejects invalid amounts and unknown accounts', () => {
        const bad = payload();
        bad.voucherDetails[0].debit = NaN;
        expect(() => store.save(bad)).toThrow();
        expect(() => store.save({ ...payload(), accountId: 999 })).toThrow();
    });
    it('rejects mismatched header totals', () => expect(() => store.save({ ...payload(), voucherAmount: 999 })).toThrow());
    it('prints balanced tax and discount credits using the existing additive contract', () => {
        const input = { ...payload(), discount: 20, discountAccountId: 601, voucherAmount: 125, taxes: [{ id: 0, taxTypeId: 1, accountId: 701, taxPercent: 5, taxAmount: 5 }] };
        const report = store.print(store.save(input));
        expect(report.totalDebit).toBe(125);
        expect(report.totalCredit).toBe(125);
        expect(report.lines.some((r) => r.accountCode === '7010' && r.credit === 5)).toBeTrue();
    });
    it('produces a print report for a sample', () => {
        const print = store.print(1);
        expect(print.totalDebit).toBe(print.totalCredit);
        expect(print.company.name).toContain('Demo');
        expect(print.title).toContain('Simulated');
    });
});
