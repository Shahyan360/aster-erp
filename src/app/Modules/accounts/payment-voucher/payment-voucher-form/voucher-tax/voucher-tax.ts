import { sumMoney, grossUpTax } from '@/app/shared/utils/money.util';
import { Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ACCOUNT_TYPE_IDS, DataTableComponent, DecimalPrecisionConfig, DEFAULT_DECIMAL_PRECISION, LookupService, TableCellDirective, TableRowActionsDirective, TableColumn } from '@/app/shared';
import { BankAccounts, taxTypeLookupData } from '../../payment-voucher.types';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-voucher-tax',
    standalone: true,
    imports: [CommonModule, FormsModule, SelectModule, DataTableComponent, TableCellDirective, TableRowActionsDirective],
    templateUrl: './voucher-tax.html',
    styleUrl: './voucher-tax.scss'
})
export class VoucherTax implements OnInit {
    taxAccounts = signal<BankAccounts[]>([]);

    taxColumns: TableColumn[] = [
        { field: 'taxAccount', header: 'Tax Account (Cr)', required: true, width: '210px' },
        { field: 'taxType', header: 'Tax Type', width: '150px' },
        { field: 'whtPercent', header: 'WHT %', width: '110px' },
        { field: 'taxAmount', header: 'Tax Amount', type: 'number', align: 'left', total: true }
    ];

    taxRows: any[] = [];

    /** Sum of all detail-line amounts — the shared base every tax row is calculated against. */
    private _baseAmount = 0;
    @Input() set baseAmount(value: number | null) {
        this._baseAmount = Number(value) || 0;
        this.recalcAll();
    }
    get baseAmount(): number {
        return this._baseAmount;
    }

    /** Per-type decimal precision (from system settings). */
    private _precision: DecimalPrecisionConfig = DEFAULT_DECIMAL_PRECISION;
    @Input() set precision(p: DecimalPrecisionConfig) {
        this._precision = p ?? DEFAULT_DECIMAL_PRECISION;
        // Tax Amount is an LCY amount → use the LCY amount precision for the column total.
        this.taxColumns = this.taxColumns.map((c) => (c.field === 'taxAmount' ? { ...c, format: this.amtFmt } : c));
    }
    get precision(): DecimalPrecisionConfig {
        return this._precision;
    }
    /** LCY amount pipe format (Tax Amount is an LCY amount). */
    get amtFmt(): string {
        return `1.${this._precision.lcyAmount}-${this._precision.lcyAmount}`;
    }

    /** True only when the detail grid has at most one distinct party — required to add tax. */
    private _singleAccount = true;
    @Input() set singleAccount(value: boolean) {
        const wasSingle = this._singleAccount;
        this._singleAccount = value;
        if (!value && this.taxRows.length) {
            // A second party was added — tax is no longer applicable; clear any pending/entered tax.
            this.taxRows = [];
            this.emitTotal();
        } else if (value && !wasSingle && this.taxRows.length === 0) {
            // Back to a single party — restore an empty entry row so the user can add tax again.
            this.onAddRow();
        }
    }
    get singleAccount(): boolean {
        return this._singleAccount;
    }

    /** Replace the rows wholesale — used by the parent form when loading a saved voucher for edit. */
    @Input() set initialTaxRows(rows: any[] | null) {
        if (rows && rows.length) {
            this.taxRows = rows;
            this.emitTotal();
        }
    }

    /** Tax type lookup loaded from the API */
    taxTypes = signal<taxTypeLookupData[]>([]);

    /** Emits the summed Tax Amount whenever the rows change */
    @Output() totalTaxChange = new EventEmitter<number>();

    /** Emits the summed WHT % (used as the voucher-line tax rate) */
    @Output() taxRateChange = new EventEmitter<number>();

    private lookupService = inject(LookupService);
    private $destroyRef = inject(DestroyRef);
    private message = inject(MessageService);

    ngOnInit(): void {
        // Seed one empty row for new vouchers only — skip when edit data was bound first.
        if (!this.taxRows.length) {
            this.onAddRow();
        }
        this.getTaxAccountsList();
        this.getTaxTypesList();
    }

    /** Re-fetch tax accounts + tax types (the parent clears the lookup cache first). */
    refreshLookups(): void {
        this.getTaxAccountsList();
        this.getTaxTypesList();
    }

    getTaxAccountsList() {
        this.lookupService
            .getAccountDropdown(ACCOUNT_TYPE_IDS.tax)
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => this.taxAccounts.set(response.data),
                error: (err) => console.error('Error fetching tax accounts:', err)
            });
    }

    /** Display name for the tax account stored on a saved row (used in read-only cells). */
    taxAccountNameFor(row: any): string {
        return this.taxAccounts().find((a) => a.id === row.taxAccount)?.accountName ?? '';
    }

    getTaxTypesList() {
        this.lookupService
            .getTaxTypes()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => this.taxTypes.set(response.data),
                error: (err) => console.error('Error fetching tax types:', err)
            });
    }

    /** Fires when the Tax Type select changes — auto-fills WHT % from defaultRate. */
    onTaxTypeChange(row: any, value: number): void {
        const picked = this.taxTypes().find((t) => t.id === value);
        row.whtPercent = picked?.defaultRate ?? 0;
        this.recalc(row);
    }

    /** Display name for the tax type stored on a saved row (used in read-only cells). */
    taxTypeNameFor(row: any): string {
        return this.taxTypes().find((t) => t.id === row.taxType)?.taxTypeName ?? '';
    }

    onAddRow(): void {
        // Tax can only be added when the detail table has a single account.
        if (!this.singleAccount) {
            this.message.add({
                severity: 'warn',
                summary: 'Single account only',
                detail: 'Tax can only be added when the detail has a single account. Use one account across all detail lines first.',
                life: 6000
            });
            return;
        }
        this.taxRows = [...this.taxRows, { taxAccount: null, taxType: null, whtPercent: 0, baseAmount: this._baseAmount, taxAmount: 0, editing: true }];
    }

    /**
     * Tax Amount uses the same gross-up model as the detail table, but against the
     * sum of all detail amounts: the base is treated as NET, Gross = Net / (1 − WHT%),
     * and Tax Amount = Gross − Net. With a single WHT row this equals the detail's
     * total tax amount exactly.
     */
    private computeTax(whtPercent: number): number {
        return grossUpTax(this._baseAmount, Number(whtPercent) || 0);
    }

    recalc(row: any): void {
        row.baseAmount = this._baseAmount;
        row.taxAmount = this.computeTax(row.whtPercent);
        this.emitTotal();
    }

    /** Re-stamp every row when the shared base amount changes (new array ref for CD). */
    private recalcAll(): void {
        this.taxRows = this.taxRows.map((r) => ({
            ...r,
            baseAmount: this._baseAmount,
            taxAmount: this.computeTax(r.whtPercent)
        }));
        this.emitTotal();
    }

    saveRow(row: any): void {
        if (row.taxAccount == null) return; // require an account before submitting
        row.editing = false;
    }

    editRow(row: any): void {
        row.editing = true;
    }

    onRemoveRow(event: { row: any; index: number }): void {
        this.taxRows = this.taxRows.filter((_, i) => i !== event.index);
        this.emitTotal();
    }

    /** Reset to a single empty row — called by the parent form after a "Save & New". */
    reset(): void {
        this.taxRows = [];
        this.onAddRow();
        this.emitTotal();
    }

    private emitTotal(): void {
        const total = sumMoney(this.taxRows.map((r) => Number(r.taxAmount) || 0));
        const rate = this.taxRows.reduce((sum, r) => sum + (Number(r.whtPercent) || 0), 0);
        this.totalTaxChange.emit(total);
        this.taxRateChange.emit(rate);
    }
}
