import { sumMoney } from '@/app/shared/utils/money.util';
import { Component, DestroyRef, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ACCOUNT_TYPE_IDS, DecimalPrecisionConfig, DEFAULT_DECIMAL_PRECISION, LookupService } from '@/app/shared';
import { BankAccounts } from '../../payment-voucher.types';

@Component({
    selector: 'app-voucher-summary',
    standalone: true,
    imports: [CommonModule, FormsModule, SelectModule],
    templateUrl: './voucher-summary.html',
    styleUrl: './voucher-summary.scss'
})
export class VoucherSummary implements OnInit, OnChanges {
    @Input() grossAmount = 0;
    @Input() discount = 0;
    /** Two-way bindable so the parent can capture the entered discount. */
    @Output() discountChange = new EventEmitter<number>();
    /** Selected discount account (AccountTypeId 12). Two-way bindable. */
    @Input() discountAccountId: number | null = null;
    @Output() discountAccountIdChange = new EventEmitter<number | null>();
    @Input() totalTax = 0;
    @Input() otherCharges = 0;
    @Input() fcyTotal = 0;
    @Input() exchangeRate = 1;
    /** Grid's FCY total (Σ per-row FCY, full precision). When present, the FCY section is derived
     * from this so the summary matches the grid exactly instead of re-dividing by the header rate. */
    @Input() fcyNet = 0;
    /** FCY currency code from settings (e.g. "USD") — shown on the FCY section labels. */
    @Input() fcyCurrencyCode: string | null = null;
    @Input() valid = true;
    @Input() validationMessage = 'No validation errors.';
    /** True only when the detail table has at most one distinct account — required to add discount. */
    @Input() canDiscount = true;
    /** Per-type decimal precision (from system settings). */
    @Input() precision: DecimalPrecisionConfig = DEFAULT_DECIMAL_PRECISION;
    /** LCY-section amount format. */
    get lcyFmt(): string {
        return `1.${this.precision.lcyAmount}-${this.precision.lcyAmount}`;
    }
    /** FCY-section amount format. */
    get fcyFmt(): string {
        return `1.${this.precision.fcyAmount}-${this.precision.fcyAmount}`;
    }

    /** Display code for the FCY section — falls back to "FCY" until a currency is chosen. */
    get fcyCode(): string {
        return this.fcyCurrencyCode || 'FCY';
    }

    /** Discount account options (AccountTypeId 12). */
    discountAccounts = signal<BankAccounts[]>([]);

    private lookupService = inject(LookupService);
    private destroyRef = inject(DestroyRef);
    private message = inject(MessageService);

    ngOnInit(): void {
        this.loadDiscountAccounts();
    }

    ngOnChanges(changes: SimpleChanges): void {
        const canDiscChange = changes['canDiscount'];
        if (canDiscChange && !canDiscChange.currentValue) {
            // Auto-clear discount value and selected account if multiple accounts/parties are added
            if (this.discount > 0) {
                this.discount = 0;
                this.discountChange.emit(0);
            }
            if (this.discountAccountId != null) {
                this.discountAccountId = null;
                this.discountAccountIdChange.emit(null);
            }
        }
    }

    private loadDiscountAccounts(): void {
        this.lookupService
            .getAccountDropdown(ACCOUNT_TYPE_IDS.discount)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => this.discountAccounts.set(res.data ?? []),
                error: (err) => console.error('Error fetching discount accounts:', err)
            });
    }

    /** Re-fetch the discount account list (the parent clears the lookup cache first). */
    refreshLookups(): void {
        this.loadDiscountAccounts();
    }

    /** Update the discount from the input and notify the parent. */
    onDiscountChange(value: number | null): void {
        const next = Number(value) || 0;
        // Discount can only be added when the detail has a single account.
        if (next > 0 && !this.canDiscount) {
            this.message.add({
                severity: 'warn',
                summary: 'Single account only',
                detail: 'Discount can only be added when the detail has a single account. Use one account across all detail lines first.',
                life: 6000
            });
            this.discount = 0;
            this.discountChange.emit(0);
            return;
        }
        this.discount = next;
        this.discountChange.emit(this.discount);
    }

    /** Update the discount account selection and notify the parent. */
    onDiscountAccountChange(value: number | null): void {
        this.discountAccountId = value;
        this.discountAccountIdChange.emit(value);
    }

    /** Tax amount (LCY) — added into the net payable. */
    get taxableAmount(): number {
        return this.totalTax;
    }

    /** Gross, plus discount, tax amount and any other charges */
    get netPayable(): number {
        return sumMoney([this.grossAmount, this.discount, this.totalTax, this.otherCharges]);
    }

    /**
     * Effective exchange rate used for the whole FCY section. Derived from the grid's own
     * FCY total (LCY net ÷ grid FCY) so every FCY figure stays consistent with the detail grid
     * and carries full precision; falls back to the header rate when there are no rows yet.
     */
    private get effectiveRate(): number {
        if (this.fcyNet > 0 && this.grossAmount > 0) return this.grossAmount / this.fcyNet;
        return this.exchangeRate > 0 ? this.exchangeRate : 1;
    }

    /** Convert a local amount to FCY (single conversion, full precision — rounded only for display). */
    private toFcy(lcy: number): number {
        const rate = this.effectiveRate;
        return rate > 0 ? lcy / rate : 0;
    }

    /** FCY mirror of the LCY rows. `grossAmountFcy` equals the grid's FCY total by construction. */
    get grossAmountFcy(): number {
        return this.toFcy(this.grossAmount);
    }
    get discountFcy(): number {
        return this.toFcy(this.discount);
    }
    get taxAmountFcy(): number {
        return this.toFcy(this.taxableAmount);
    }
    get otherChargesFcy(): number {
        return this.toFcy(this.otherCharges);
    }
    get netPayableFcy(): number {
        return this.toFcy(this.netPayable);
    }
}
