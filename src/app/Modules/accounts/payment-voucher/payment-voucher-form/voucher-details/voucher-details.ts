import { sumMoney, grossUpTax } from '@/app/shared/utils/money.util';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MessageService } from 'primeng/api';
import { DataTableComponent, DecimalPrecisionConfig, DEFAULT_DECIMAL_PRECISION, TableCellDirective, TableColumn, TableRowActionsDirective } from '@/app/shared';
import { VoucherDetailModal } from '../voucher-detail-modal/voucher-detail-modal';

export interface VoucherDetailTotals {
    gross: number;
    discount: number;
    /** Sum of per-row FCY amounts (Σ amount ÷ line rate) — full precision, the grid's FCY total. */
    fcyGross: number;
    /** Number of distinct accounts across the detail lines. */
    accountCount: number;
    /** True when at least one line uses a Cheque payment mode. */
    hasCheque: boolean;
}

@Component({
    selector: 'app-voucher-details',
    standalone: true,
    imports: [DecimalPipe, DataTableComponent, TableCellDirective, TableRowActionsDirective, VoucherDetailModal],
    templateUrl: './voucher-details.html',
    styleUrl: './voucher-details.scss'
})
export class VoucherDetails implements OnChanges {
    @ViewChild(VoucherDetailModal) private detailModal?: VoucherDetailModal;

    /** Re-fetch the entry modal's combo/dropdown data (parent clears the lookup cache first). */
    refreshLookups(): void {
        this.detailModal?.refreshLookups();
    }

    /** Tax rate (sum of WHT %) sourced from the Tax Deductions table */
    @Input() taxRate = 0;
    /** Selected bank account id from the header — forwarded to the detail modal for the cheque book. */
    @Input() bankAccountId: number | null = null;
    /** FCY exchange rate from the main header — seeds new rows and, when the user edits it,
     * re-applies to every existing row so FCY amounts recalculate live. */
    private _fcyExchangeRate: number | null = null;
    @Input() set fcyExchangeRate(rate: number | null) {
        this._fcyExchangeRate = rate;
        // Re-stamp existing rows with the new header rate and recompute FCY amounts.
        if (rate != null && this.voucherRows.length) {
            this.voucherRows = this.voucherRows.map((r) => this.applyTax({ ...r, exchangeRate: rate }));
            this.emitTotals();
        }
    }
    get fcyExchangeRate(): number | null {
        return this._fcyExchangeRate;
    }
    /** FCY currency code from the header (e.g. "USD") — shown as the FCY Currency column. */
    @Input() fcyCurrencyCode: string | null = null;
    /** True when Tax or Discount is applied — then all detail lines must share one account. */
    @Input() taxOrDiscountActive = false;
    /** Per-type decimal precision (from system settings). Re-stamps the column formats when set. */
    private _precision: DecimalPrecisionConfig = DEFAULT_DECIMAL_PRECISION;
    @Input() set precision(p: DecimalPrecisionConfig) {
        this._precision = p ?? DEFAULT_DECIMAL_PRECISION;
        this.applyColumnFormats();
    }
    get precision(): DecimalPrecisionConfig {
        return this._precision;
    }
    private fmt(n: number): string {
        return `1.${n}-${n}`;
    }
    /** LCY / FCY amount pipe formats derived from the precision config. */
    get lcyFmt(): string {
        return this.fmt(this._precision.lcyAmount);
    }
    get fcyFmt(): string {
        return this.fmt(this._precision.fcyAmount);
    }
    /** Apply per-column formats: FCY amount, exchange rate, and tax % have their own precision. */
    private applyColumnFormats(): void {
        const fcy = this.fcyFmt;
        const rate = this.fmt(this._precision.fcyRate);
        const pct = this.fmt(this._precision.percent);
        this.voucherColumns = this.voucherColumns.map((c) => {
            switch (c.field) {
                case 'fcyAmount':
                    return { ...c, format: fcy };
                case 'exchangeRate':
                    return { ...c, format: rate };
                case 'taxPercent':
                    return { ...c, format: pct };
                default:
                    return c; // LCY amount columns use the table's numberFormat (lcyFmt)
            }
        });
    }

    private message = inject(MessageService);
    /** LCY currency code from the header (e.g. "PKR") — drives the Amount label + modal. */
    private _lcyCurrencyCode: string | null = null;
    @Input() set lcyCurrencyCode(code: string | null) {
        this._lcyCurrencyCode = code;
        // Re-stamp the Amount column header with the currency code (new array ref for CD).
        this.voucherColumns = this.voucherColumns.map((c) => (c.field === 'amount' ? { ...c, header: `Amount (${code || 'PKR'})` } : c));
    }
    get lcyCurrencyCode(): string | null {
        return this._lcyCurrencyCode;
    }
    voucherColumns: TableColumn[] = [
        { field: 'transactionType', header: 'Transaction Type' },
        { field: 'account', header: 'Account (Dr)' },
        { field: 'subLedgerType', header: 'Sub Ledger Type' },
        { field: 'subLedger', header: 'Sub Ledger' },
        { field: 'department', header: 'Department' },
        { field: 'costCenter', header: 'Cost Center' },
        { field: 'paymentMode', header: 'Payment Mode' },
        { field: 'chequeType', header: 'Cheque Type' },
        { field: 'chequeNo', header: 'Cheque No' },
        { field: 'chequeDate', header: 'Cheque Date' },
        { field: 'payeeTitle', header: 'Payee Title / Narration' },
        { field: 'amount', header: 'Amount (PKR)', type: 'currency', total: true },
        { field: 'exchangeRate', header: 'Exchange Rate', type: 'number' },
        { field: 'fcyAmount', header: 'FCY Amount', type: 'number', total: true },
        { field: 'taxPercent', header: 'Tax %', type: 'number' },
        { field: 'taxAmount', header: 'Tax Amount', type: 'number', total: true },
        { field: 'netAmount', header: 'Total Amount (LCY)', type: 'currency', total: true }
    ];

    voucherRows: any[] = [];

    /** Replace the rows wholesale — used by the parent form when loading a saved voucher for edit. */
    @Input() set initialRows(rows: any[] | null) {
        if (rows && rows.length) {
            this.voucherRows = rows.map((r) => this.applyTax({ ...r }));
            this.emitTotals();
        }
    }

    modalVisible = false;
    /** Index of the row currently being edited (null when adding a new row) */
    editingIndex: number | null = null;
    /** Snapshot of the row passed to the modal for editing */
    editingRow: any | null = null;

    /** Saved grid rows visible to the modal — excludes the row being edited so a duplicate
     * cheque number can inherit cheque metadata from an earlier line. */
    get existingRowsForModal(): any[] {
        if (this.editingIndex !== null) {
            return this.voucherRows.filter((_, i) => i !== this.editingIndex);
        }
        return this.voucherRows;
    }

    /** Emits the gross + discount totals whenever the rows change */
    @Output() totalsChange = new EventEmitter<VoucherDetailTotals>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['taxRate'] && this.voucherRows.length) {
            this.voucherRows = this.voucherRows.map((r) => this.applyTax({ ...r }));
        }
    }

    /**
     * Apply the current WHT rate to a row using the gross-up model:
     * the row `amount` is the NET (after WHT), Gross = Net / (1 − WHT%),
     * and the withheld tax = Gross − Net.
     */
    private applyTax(row: any): any {
        const net = Number(row.amount) || 0;
        const tax = grossUpTax(net, this.taxRate);
        row.taxPercent = this.taxRate;
        row.taxAmount = tax; // WHT withheld
        row.netAmount = sumMoney([net, row.taxAmount]); // Total Amount (LCY) = amount + tax amount
        row.fcyAmount = this.fcyAmount(row); // LCY → FCY using the line's exchange rate
        return row;
    }

    /** Block opening the detail modal until the header Bank Account is chosen. */
    private canOpenModal(): boolean {
        if (this.bankAccountId != null) return true;
        this.message.add({
            severity: 'warn',
            summary: 'Bank account required',
            detail: 'Please select a Bank Account in the voucher header before adding or editing detail lines.',
            life: 6000
        });
        return false;
    }

    onAddRow(): void {
        if (!this.canOpenModal()) return;
        this.editingIndex = null;
        this.editingRow = null;
        this.modalVisible = true;
    }

    onModalVisibleChange(visible: boolean): void {
        this.modalVisible = visible;
        // Clear edit state when the modal closes (cancel or save & close)
        if (!visible) {
            this.editingIndex = null;
            this.editingRow = null;
        }
    }

    onModalSaved(row: any): void {
        const taxed = this.applyTax(row);
        const next = this.editingIndex !== null ? this.voucherRows.map((r, i) => (i === this.editingIndex ? taxed : r)) : [...this.voucherRows, taxed];

        // Tax/Discount requires a single account across all lines.
        if (this.taxOrDiscountActive && this.distinctAccountCount(next) > 1) {
            this.message.add({
                severity: 'warn',
                summary: 'Single account only',
                detail: 'Tax/Discount is applied, so all detail lines must use the same account. Remove Tax/Discount to add a different account.',
                life: 6000
            });
            return; // reject the row
        }

        this.voucherRows = next;
        this.emitTotals();
    }

    /** Duplicate the picked row — inserts the copy right after it */
    onDuplicateRow(event: { row: any; index: number }): void {
        const copy = this.applyTax({ ...event.row, lineId: 0 });
        this.voucherRows = [...this.voucherRows.slice(0, event.index + 1), copy, ...this.voucherRows.slice(event.index + 1)];
        this.emitTotals();
    }

    onEditRow(event: { row: any; index: number }): void {
        if (!this.canOpenModal()) return;
        this.editingIndex = event.index;
        this.editingRow = { ...event.row };
        this.modalVisible = true;
    }

    onRemoveRow(event: { row: any; index: number }): void {
        this.voucherRows = this.voucherRows.filter((_, i) => i !== event.index);
        this.emitTotals();
    }

    /** Clear every row — called by the parent form after a "Save & New". */
    reset(): void {
        this.voucherRows = [];
        this.emitTotals();
    }

    /** Convert a row's LCY amount to FCY using its line exchange rate (FCY = LCY ÷ rate). */
    fcyAmount(row: any): number {
        const amount = Number(row?.amount) || 0;
        const rate = Number(row?.exchangeRate) || 0;
        return rate > 0 ? amount / rate : 0;
    }

    /** Count of distinct parties across the rows — a party is an (account + sub-ledger) pair. */
    private distinctAccountCount(rows: any[]): number {
        const keys = rows.filter((r) => r.accountId != null).map((r) => `${r.accountId}:${r.subLedgerId ?? 0}`);
        return new Set(keys).size;
    }

    /**
     * The single existing party (account + sub-ledger) that new/edited rows must match while
     * Tax/Discount is applied — `null` when there's no restriction. Passed to the modal so it can
     * warn the moment a different party is selected.
     */
    get lockedPartyKey(): string | null {
        if (!this.taxOrDiscountActive) return null;
        // Look at the OTHER rows (exclude the one being edited) — changing the sole line's
        // party is still a single party, so it shouldn't be restricted.
        const others = this.voucherRows.filter((_, i) => i !== this.editingIndex);
        const r = others.find((row) => row.accountId != null);
        return r ? `${r.accountId}:${r.subLedgerId ?? 0}` : null;
    }

    /** A line "has a cheque" when its payment mode is Cheque or a cheque number was entered. */
    private isChequeRow(r: any): boolean {
        const chequeNo = (r?.chequeNo ?? '').toString().trim();
        return !!chequeNo || /cheque/i.test((r?.paymentMode ?? '').toString());
    }

    private emitTotals(): void {
        const gross = sumMoney(this.voucherRows.map((r) => Number(r.amount) || 0));
        const discount = sumMoney(this.voucherRows.map((r) => Number(r.discount) || 0));
        // Sum the per-row FCY amounts so the summary matches the grid's FCY total exactly.
        const fcyGross = sumMoney(this.voucherRows.map((r) => this.fcyAmount(r)));
        const accountCount = this.distinctAccountCount(this.voucherRows);
        const hasCheque = this.voucherRows.some((r) => this.isChequeRow(r));
        this.totalsChange.emit({ gross, discount, fcyGross, accountCount, hasCheque });
    }
}
