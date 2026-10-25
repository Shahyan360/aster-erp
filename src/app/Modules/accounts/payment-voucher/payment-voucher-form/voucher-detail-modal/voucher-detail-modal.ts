import { sumMoney, grossUpTax } from '@/app/shared/utils/money.util';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageService } from 'primeng/api';
import { ACCOUNT_TYPE_IDS, AccountBalanceData, ChequeLeaf, ChequeLeafResponse, DecimalPrecisionConfig, DEFAULT_DECIMAL_PRECISION, FormFieldComponent, LookupService, SelectFieldComponent, SubLedger } from '@/app/shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { BankAccounts, costCenterLookupData, departmentLookupData, LookupType } from '../../payment-voucher.types';

@Component({
    selector: 'app-voucher-detail-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, InputNumberModule, DatePickerModule, FloatLabelModule, FormFieldComponent, SelectFieldComponent],
    templateUrl: './voucher-detail-modal.html',
    styleUrl: './voucher-detail-modal.scss'
})
export class VoucherDetailModal implements OnInit, OnChanges {
    private fb = inject(FormBuilder);

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    /** Emitted by Save Row / Save & Add New / Save & Close with a display-ready row */
    @Output() saved = new EventEmitter<any>();

    maximized = signal(false);

    /** Tax rate sourced from the Tax Deductions table (0% when empty) */
    @Input() taxRate = 0;

    /** When set, the modal pre-fills its form with this row for editing.
     * `null` means we're adding a new row — the form gets wiped on open. */
    @Input() editRow: any | null = null;

    /** Selected bank account id from the main header — used to load the cheque book. */
    @Input() bankAccountId: number | null = null;

    /** LCY currency code from the header (e.g. "PKR") — shown on the Amount label. */
    @Input() lcyCurrencyCode: string | null = null;

    /** FCY exchange rate from the main header — seeds a new row's Exchange Rate (user can edit it). */
    @Input() fcyExchangeRate: number | null = null;

    /** Per-type decimal precision (from system settings). */
    @Input() precision: DecimalPrecisionConfig = DEFAULT_DECIMAL_PRECISION;
    private fmt(n: number): string {
        return `1.${n}-${n}`;
    }
    /** LCY amount pipe format (the entered amount + modal summary are LCY). */
    get amtFmt(): string {
        return this.fmt(this.precision.lcyAmount);
    }
    /** Decimal places for the amount input. */
    get amountDp(): number {
        return this.precision.lcyAmount;
    }
    /** Decimal places for the exchange-rate input (FCY rate). */
    get rateDp(): number {
        return this.precision.fcyRate;
    }

    /** The single party ("accountId:subLedgerId") all lines must match while Tax/Discount is applied.
     * `null` = no restriction. Used to warn immediately when a different party is picked. */
    @Input() lockedPartyKey: string | null = null;

    /** Rows already saved in the grid (excluding the row being edited) — used to inherit
     * cheque type / date / payee when the same cheque number is reused on another line. */
    @Input() existingRows: any[] = [];

    /** True when Cheque Type / Date / Payee Title were copied from a prior row and are read-only. */
    chequeFieldsLocked = signal(false);

    private message = inject(MessageService);

    /** True the moment the selection would create a different party than the locked one. */
    private partyConflict(): boolean {
        if (!this.lockedPartyKey) return false;
        const [lockAcc, lockSub] = this.lockedPartyKey.split(':').map(Number);
        const acc = this.form.get('account')?.value;
        const sub = this.form.get('subLedger')?.value;
        if (acc == null) return false; // party not chosen yet
        if (Number(acc) !== lockAcc) return true; // different account = different party
        // Same account: only a conflict once a different sub-ledger is actually chosen.
        return sub != null && Number(sub) !== lockSub;
    }

    /** Strict check used on Save — the full (account + sub-ledger) party must match the lock. */
    private partySaveBlocked(): boolean {
        if (!this.lockedPartyKey) return false;
        const acc = this.form.get('account')?.value;
        const sub = this.form.get('subLedger')?.value;
        const key = acc == null ? null : `${acc}:${sub ?? 0}`;
        return key !== this.lockedPartyKey;
    }

    private warnDifferentParty(): void {
        this.message.add({
            severity: 'warn',
            summary: 'Single party only',
            detail: 'Tax is applied, so every detail line must use the same party (account & sub-ledger). Remove the tax to use a different party.',
            life: 6000
        });
    }

    /** Re-sync the form every time the modal transitions from hidden → visible.
     * Driving this off `visible` instead of `editRow` makes it work even when
     * the parent re-emits the same `null` value on Add → Close → Add. */
    ngOnChanges(changes: SimpleChanges): void {
        const v = changes['visible'];
        if (v && v.currentValue === true && v.previousValue !== true) {
            if (this.editRow) this.patchFromRow(this.editRow);
            else this.resetForm();
        }
    }

    transactionTypes = signal<LookupType[]>([]);
    subLedgerTypes = signal<LookupType[]>([]);
    subLedgers = signal<SubLedger[]>([]);
    departments = signal<departmentLookupData[]>([]);
    costCenters = signal<costCenterLookupData[]>([]);
    chequeTypes = signal<LookupType[]>([]);
    paymentModes = signal<LookupType[]>([]);
    accounts = signal<BankAccounts[]>([]);
    /** Live ledger balance for the selected Account (Dr). */
    accountBalance = signal<AccountBalanceData | null>(null);
    /** Live ledger balance for the selected Sub Ledger (party-scoped). */
    subLedgerBalance = signal<AccountBalanceData | null>(null);
    /** True when the selected Dr Account is a control account → Sub Ledger Type/Account are required. */
    controlAccount = signal(false);
    /** Mirrors form validity reactively (programmatic validator changes don't refresh `form.valid` in zoneless CD). */
    formValid = signal(true);
    private lookupService = inject(LookupService);
    private $destroyRef = inject(DestroyRef);

    /** Formatted balance shown under the Account (Dr) field, e.g. "21,830.00 Cr". */
    get selectedBalance(): string | null {
        const bal = this.accountBalance();
        if (!bal) return null;
        const dp = this.precision.lcyAmount;
        return `${(bal.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })} ${bal.balanceType ?? ''}`.trim();
    }

    /** Formatted balance shown under the Sub Ledger field. */
    get selectedSubLedgerBalance(): string | null {
        const bal = this.subLedgerBalance();
        if (!bal) return null;
        const dp = this.precision.lcyAmount;
        return `${(bal.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })} ${bal.balanceType ?? ''}`.trim();
    }

    /**
     * Fetch the live ledger balance whenever the Account (Dr) changes and enforce the
     * control-account rule (Sub Ledger Type/Account required when IsControl).
     * On a genuine user account change (`autoBindControlType`), a control account's
     * `controlTypeId` is bound to Sub Ledger Type and its sub-ledgers are loaded.
     */
    /**
     * @param preserveSubLedgerId When the user picked Sub Ledger first (which then
     * auto-fills Account), keep that selection instead of clearing it while the
     * filtered sub-ledger list reloads.
     */
    onAccountChange(accountId: number | null, autoBindControlType = false, preserveSubLedgerId: number | null = null): void {
        const account = this.accounts().find((a) => a.id === accountId);
        const isControl = !!account?.isControlAccount;
        this.controlAccount.set(isControl);
        this.applySubLedgerValidators(isControl);

        // Warn the instant a different party is picked while tax is applied.
        if (this.partyConflict()) this.warnDifferentParty();

        if (accountId == null) {
            this.accountBalance.set(null);
            this.subLedgerBalance.set(null);
            // Clearing the account clears its dependent sub-ledger selections.
            this.form.patchValue({ subLedgerType: null, subLedger: null });
            this.subLedgers.set([]);
            this.lookupService
                .getSubLedgers()
                .pipe(takeUntilDestroyed(this.$destroyRef))
                .subscribe({
                    next: (response) => this.subLedgers.set(response.data),
                    error: (err) => console.error('Error fetching sub ledgers:', err)
                });
            return;
        }

        if (isControl && account?.controlTypeId != null) {
            if (autoBindControlType) {
                this.form.patchValue({ subLedgerType: account.controlTypeId });
            }
            this.loadSubLedgersForType(account.controlTypeId, preserveSubLedgerId);
        } else if (preserveSubLedgerId != null) {
            const typeId = (this.form.get('subLedgerType')?.value as number | null) ?? null;
            if (typeId != null) {
                this.loadSubLedgersForType(typeId, preserveSubLedgerId);
            }
        } else {
            this.form.patchValue({ subLedgerType: null, subLedger: null });
            this.subLedgers.set([]);
        }

        this.lookupService
            .getAccountBalance(accountId)
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (res) => this.accountBalance.set(res?.success ? res.data : null),
                error: (err) => {
                    this.accountBalance.set(null);
                    console.error('Error fetching account balance:', err);
                }
            });

        this.loadSubLedgerBalance();
    }

    /** Fetch party-scoped balance when a sub-ledger is selected. */
    private loadSubLedgerBalance(): void {
        const accountId = this.form.get('account')?.value as number | null;
        const partyId = this.form.get('subLedger')?.value as number | null;
        const subLedgerTypeId = this.form.get('subLedgerType')?.value as number | null;

        if (accountId == null || partyId == null) {
            this.subLedgerBalance.set(null);
            return;
        }

        this.lookupService
            .getAccountBalance(accountId, partyId, subLedgerTypeId)
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (res) => this.subLedgerBalance.set(res?.success ? res.data : null),
                error: (err) => {
                    this.subLedgerBalance.set(null);
                    console.error('Error fetching sub-ledger balance:', err);
                }
            });
    }

    ngOnInit(): void {
        // Keep the reactive validity mirror in sync with the form.
        this.formValid.set(this.form.valid);
        this.form.statusChanges.pipe(takeUntilDestroyed(this.$destroyRef)).subscribe(() => this.formValid.set(this.form.valid));

        // Cheque-book select and manual text entry both flow through the same handler.
        this.form
            .get('chequeNo')
            ?.valueChanges.pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe((no) => this.onChequeNoChange(no ?? null));

        this.loadLookups();
    }

    private loadLookups(): void {
        this.getTransactionTypes();
        this.getSubLedgerTypes();
        this.getAllDepartmentsList();
        this.getCostCenters();
        this.getChequeTypes();
        this.getPaymentModes();
        this.getAccounts();
        this.getSubLedgers();
    }

    /** Re-fetch all combo/dropdown data (the parent clears the lookup cache first). */
    refreshLookups(): void {
        this.loadLookups();
    }

    /** Payment mode where the cheque number is picked from the bank's cheque book. */
    private static readonly CHEQUE_BOOK_MODE = 2;
    /** Payment mode that needs a manually-entered cheque/instrument number + date. */
    private static readonly MANUAL_INSTRUMENT_MODE = 3;

    /** Available cheque numbers for the header's bank account (cheque-book mode). */
    chequeLeaves = signal<ChequeLeaf[]>([]);

    /** True when Cheque No should be picked from the cheque-book dropdown (mode 2). */
    get isChequeBookMode(): boolean {
        return this.form.get('paymentMode')?.value === VoucherDetailModal.CHEQUE_BOOK_MODE;
    }

    /** Cheque No is required for both cheque-book (2) and manual instrument (3) modes. */
    get isChequeNoRequired(): boolean {
        const mode = this.form.get('paymentMode')?.value;
        return mode === VoucherDetailModal.CHEQUE_BOOK_MODE || mode === VoucherDetailModal.MANUAL_INSTRUMENT_MODE;
    }

    /** Cheque Date is required for cheque-book (2) and manual instrument (3) modes. */
    get isChequeDateRequired(): boolean {
        const mode = this.form.get('paymentMode')?.value;
        return mode === VoucherDetailModal.CHEQUE_BOOK_MODE || mode === VoucherDetailModal.MANUAL_INSTRUMENT_MODE;
    }

    /** Payee Title is required for cheque-book (2) and manual instrument (3) modes. */
    get isPayeeTitleRequired(): boolean {
        const mode = this.form.get('paymentMode')?.value;
        return mode === VoucherDetailModal.CHEQUE_BOOK_MODE || mode === VoucherDetailModal.MANUAL_INSTRUMENT_MODE;
    }

    /** Called when Cheque No changes — bind the cheque-book leaf id and inherit duplicate metadata. */
    onChequeNoChange(chequeNumber: string | null): void {
        this.syncChequeFieldsFromDuplicate(chequeNumber);
        if (this.chequeFieldsLocked()) return;

        if (!this.isChequeBookMode) {
            this.form.patchValue({ chequeId: 0 }, { emitEvent: false });
            return;
        }
        const leaf = this.chequeLeaves().find((l) => l.chequeNumber === chequeNumber);
        this.form.patchValue({ chequeId: leaf?.id ?? 0 }, { emitEvent: false });
    }

    /** Find the first saved row that uses the same cheque number (trimmed string match). */
    private findMatchingChequeRow(chequeNo: string | null): any | null {
        const normalized = (chequeNo ?? '').toString().trim();
        if (!normalized) return null;
        return this.existingRows.find((r) => (r.chequeNo ?? '').toString().trim() === normalized) ?? null;
    }

    /** Resolve chequeTypeId from a saved grid row (id-first, name fallback). */
    private resolveChequeTypeId(row: any): number | null {
        if (row.chequeTypeId != null) return row.chequeTypeId;
        return this.chequeTypes().find((c) => c.name === row.chequeType)?.id ?? null;
    }

    /** Resolve chequeDate from a saved grid row (formatted string or Date). */
    private resolveChequeDate(row: any): Date | null {
        if (row.chequeDate instanceof Date) return row.chequeDate;
        return this.parseDate(row.chequeDate);
    }

    /** When the cheque number matches a prior line, copy and lock its cheque metadata. */
    private syncChequeFieldsFromDuplicate(chequeNo: string | null): void {
        if (!this.isChequeNoRequired) {
            this.clearChequeDuplicateLock();
            return;
        }

        const source = this.findMatchingChequeRow(chequeNo);
        if (!source) {
            this.clearChequeDuplicateLock();
            return;
        }

        this.form.patchValue(
            {
                chequeType: this.resolveChequeTypeId(source),
                chequeDate: this.resolveChequeDate(source) ?? new Date(),
                payeeTitle: source.payeeTitle ?? '',
                chequeId: source.chequeId ?? 0
            },
            { emitEvent: false }
        );

        this.form.get('chequeType')?.disable({ emitEvent: false });
        this.form.get('chequeDate')?.disable({ emitEvent: false });
        this.form.get('payeeTitle')?.disable({ emitEvent: false });
        this.chequeFieldsLocked.set(true);
    }

    /** Re-enable cheque metadata fields after the duplicate match is cleared. */
    private clearChequeDuplicateLock(): void {
        this.form.get('chequeType')?.enable({ emitEvent: false });
        this.form.get('chequeDate')?.enable({ emitEvent: false });
        this.form.get('payeeTitle')?.enable({ emitEvent: false });
        this.chequeFieldsLocked.set(false);
    }

    /** Called when the Payment Mode changes (user select or programmatic edit). */
    onPaymentModeChange(mode: number | null): void {
        this.applyChequeValidators(mode);
        const isChequeOrOnline = mode === VoucherDetailModal.CHEQUE_BOOK_MODE || mode === VoucherDetailModal.MANUAL_INSTRUMENT_MODE;
        if (isChequeOrOnline && !this.form.get('chequeDate')?.value) {
            this.form.patchValue({ chequeDate: new Date() });
        }
        if (mode === VoucherDetailModal.CHEQUE_BOOK_MODE) {
            this.loadChequeNumbers();
        } else {
            this.chequeLeaves.set([]);
            this.form.patchValue({ chequeId: 0 }, { emitEvent: false });
        }
        if (!isChequeOrOnline) {
            this.clearChequeDuplicateLock();
        }
    }

    /** Make Sub Ledger Type / Sub Ledger required when the Dr Account is a control account. */
    private applySubLedgerValidators(required: boolean): void {
        const slType = this.form.get('subLedgerType');
        const sl = this.form.get('subLedger');
        required ? slType?.setValidators([Validators.required]) : slType?.clearValidators();
        required ? sl?.setValidators([Validators.required]) : sl?.clearValidators();
        slType?.updateValueAndValidity();
        sl?.updateValueAndValidity();
    }

    /** Toggle required validators on Cheque Type / No / Date / Payee Title based on the payment mode. */
    private applyChequeValidators(mode: number | null): void {
        const chequeType = this.form.get('chequeType');
        const chequeNo = this.form.get('chequeNo');
        const chequeDate = this.form.get('chequeDate');
        const payeeTitle = this.form.get('payeeTitle');
        const isChequeOrOnline = mode === VoucherDetailModal.CHEQUE_BOOK_MODE || mode === VoucherDetailModal.MANUAL_INSTRUMENT_MODE;
        const typeRequired = mode === VoucherDetailModal.CHEQUE_BOOK_MODE;

        typeRequired ? chequeType?.setValidators([Validators.required]) : chequeType?.clearValidators();
        isChequeOrOnline ? chequeNo?.setValidators([Validators.required]) : chequeNo?.clearValidators();
        isChequeOrOnline ? chequeDate?.setValidators([Validators.required]) : chequeDate?.clearValidators();
        isChequeOrOnline ? payeeTitle?.setValidators([Validators.required]) : payeeTitle?.clearValidators();
        chequeType?.updateValueAndValidity();
        chequeNo?.updateValueAndValidity();
        chequeDate?.updateValueAndValidity();
        payeeTitle?.updateValueAndValidity();
    }

    /**
     * Load available cheque numbers for the header's bank account:
     * cheque-book dropdown → the first book's available leaves.
     */
    private loadChequeNumbers(): void {
        const bankAccountId = this.bankAccountId;

        if (bankAccountId == null) {
            this.chequeLeaves.set([]);
            return;
        }
        this.lookupService
            .getChequeBooks(bankAccountId)
            .pipe(
                switchMap((res) => {
                    const bookId = res.data?.[0]?.id;
                    return bookId != null ? this.lookupService.getChequeLeaves(bookId, bankAccountId) : of({ data: [] } as unknown as ChequeLeafResponse);
                }),
                takeUntilDestroyed(this.$destroyRef)
            )
            .subscribe({
                next: (res) => this.chequeLeaves.set(res.data ?? []),
                error: (err) => console.error('Error loading cheque numbers:', err)
            });
    }

    getAllDepartmentsList() {
        this.lookupService
            .getDepartments()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => this.departments.set(response.data),
                error: (err) => console.error('Error fetching departments:', err)
            });
    }

    /** Loads the Account (Dr) dropdown — debit account types per business spec. */
    getAccounts() {
        this.lookupService
            .getAccountDropdown(ACCOUNT_TYPE_IDS.debit)
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => this.accounts.set(response.data),
                error: (err) => console.error('Error fetching accounts:', err)
            });
    }

    getPaymentModes() {
        this.lookupService
            .getPaymentModes()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => {
                    this.paymentModes.set(response.data);
                    this.applyNewRowDefaults(); // seed "Cheque" once the list is available
                },
                error: (err) => console.error('Error fetching payment modes:', err)
            });
    }

    getCostCenters() {
        this.lookupService
            .getCostCenters()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => this.costCenters.set(response.data),
                error: (err) => console.error('Error fetching cost centers:', err)
            });
    }

    getChequeTypes() {
        this.lookupService
            .getChequeTypes()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => this.chequeTypes.set(response.data),
                error: (err) => console.error('Error fetching cheque types:', err)
            });
    }

    getTransactionTypes() {
        this.lookupService
            .getTransactionTypes()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => {
                    this.transactionTypes.set(response.data);
                    this.applyNewRowDefaults(); // seed "Invoice Payment" once the list is available
                },
                error: (err) => {
                    console.error('Error fetching transaction types:', err);
                }
            });
    }

    getSubLedgers() {
        this.lookupService
            .getSubLedgers()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => this.subLedgers.set(response.data),
                error: (err) => console.error('Error fetching sub ledgers:', err)
            });
    }

    getSubLedgerTypes() {
        this.lookupService
            .getSubLedgerTypes()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => {
                    this.subLedgerTypes.set(response.data);
                },
                error: (err) => {
                    console.error('Error fetching sub ledger types:', err);
                }
            });
    }

    /** Fires when the Sub Ledger Type select changes — fetches the dependent Sub Ledgers. */
    handleOnchnageOfsubLedgerType(value: any): void {
        this.loadSubLedgersForType(value, null);
    }

    /**
     * Load sub-ledgers for a type. Clears the current Sub Ledger selection unless
     * `preserveSubLedgerId` is provided (Sub Ledger → Account auto-bind path).
     *
     * When preserving, keep the current options until the new list arrives —
     * emptying options while a value is selected makes PrimeNG emit null and
     * wipe the control (which then fails the required validator).
     */
    private loadSubLedgersForType(typeId: number | null, preserveSubLedgerId: number | null): void {
        if (preserveSubLedgerId == null) {
            this.form.patchValue({ subLedger: null });
            this.subLedgers.set([]);
            this.subLedgerBalance.set(null);
        }
        if (typeId == null) return;

        // Scope to the chosen Dr Account when the user has picked one; otherwise by type only.
        const accountId = this.form.get('account')?.value ?? null;
        this.lookupService
            .getSubLedgers(typeId, accountId)
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (response) => {
                    let list = response.data ?? [];
                    if (preserveSubLedgerId != null && !list.some((s) => s.id === preserveSubLedgerId)) {
                        const savedName = this.editRow?.subLedger;
                        if (savedName) {
                            list = [
                                {
                                    id: preserveSubLedgerId,
                                    name: savedName,
                                    accountId: this.form.get('account')?.value ?? undefined,
                                    subLedgerTypeId: typeId ?? undefined
                                } as SubLedger,
                                ...list
                            ];
                        }
                    }
                    this.subLedgers.set(list);
                    // Re-apply the preserved selection once the filtered list is available.
                    if (preserveSubLedgerId != null) {
                        this.form.patchValue({ subLedger: preserveSubLedgerId });
                        this.form.get('subLedger')?.updateValueAndValidity();
                        this.loadSubLedgerBalance();
                    }
                },
                error: (err) => console.error('Error fetching sub ledgers:', err)
            });
    }

    /**
     * Fires when the Sub Ledger changes. If the user picked a sub-ledger account
     * without choosing a Dr-Account, auto-fill the Dr-Account with the sub-ledger's
     * own accountId. An explicit Dr-Account selection is never overridden.
     */
    handleOnchangeOfSubLedger(value: any): void {
        // A different sub-ledger (same account) is still a different party — warn immediately.
        if (this.partyConflict()) this.warnDifferentParty();

        const selected = this.subLedgers().find((s) => s.id === value);
        if (!selected) return;

        // Always reflect the picked sub-ledger's own type in the Sub Ledger Type dropdown,
        // even when a Dr-Account is already chosen (otherwise the type stays blank).
        if (selected.subLedgerTypeId != null) {
            this.form.patchValue({ subLedgerType: selected.subLedgerTypeId });
        }

        const accountCtrl = this.form.get('account');
        if (accountCtrl?.value) {
            // Account already chosen — ensure the just-set Sub Ledger re-validates
            // after any concurrent control-account validator updates.
            this.form.get('subLedger')?.updateValueAndValidity();
            this.loadSubLedgerBalance();
            return;
        }
        const accountId = selected.accountId ?? null;
        if (accountId == null) return;

        // The sub-ledger's GL account may not be in the Dr-Account dropdown — add it so it displays.
        // Mark as control account so onAccountChange applies the correct validators/type.
        if (!this.accounts().some((a) => a.id === accountId)) {
            this.accounts.update((list) => [
                {
                    id: accountId,
                    accountName: selected.name,
                    isControlAccount: true,
                    controlTypeId: selected.subLedgerTypeId ?? undefined
                } as BankAccounts,
                ...list
            ]);
        }
        accountCtrl?.setValue(accountId);
        // Preserve the Sub Ledger the user just picked — account change would otherwise clear it.
        this.onAccountChange(accountId, false, value);
    }

    form = this.fb.group({
        transactionType: [null as number | null, Validators.required],
        account: [null as number | null, Validators.required],
        subLedgerType: [{ value: null as number | null, disabled: true }],
        subLedger: [null as number | null],
        department: [null as number | null],
        costCenter: [null as number | null],
        paymentMode: [null as number | null, Validators.required],
        exchangeRate: [1.0 as number | null],
        chequeId: [0 as number],
        chequeType: [null as number | null],
        chequeNo: [''],
        chequeDate: [null as Date | null],
        payeeTitle: [''],
        comments: [''],
        amount: [0 as number | null, [Validators.required, Validators.min(0.01)]],
        discount: [0 as number | null]
    });

    get f() {
        return this.form.controls;
    }

    /** Human-readable labels for each form control. */
    private static readonly FIELD_LABELS: Record<string, string> = {
        transactionType: 'Transaction Type',
        account: 'Account (Dr)',
        subLedgerType: 'Sub Ledger Type',
        subLedger: 'Sub Ledger',
        department: 'Department',
        costCenter: 'Cost Center',
        paymentMode: 'Payment Mode',
        exchangeRate: 'Exchange Rate',
        chequeType: 'Cheque Type',
        chequeNo: 'Cheque No',
        chequeDate: 'Cheque Date',
        payeeTitle: 'Payee Title',
        comments: 'Remarks',
        amount: 'Amount',
        discount: 'Discount'
    };

    /**
     * Returns an array of validation error messages for every invalid control.
     * Used by the Validation Status panel in the sidebar to show the full error list.
     */
    get validationErrors(): { field: string; message: string }[] {
        const errors: { field: string; message: string }[] = [];
        const labels = VoucherDetailModal.FIELD_LABELS;
        for (const [key, ctrl] of Object.entries(this.form.controls)) {
            if (!ctrl.errors) continue;
            const label = labels[key] ?? key;
            for (const [errorKey, errorVal] of Object.entries(ctrl.errors)) {
                let msg: string;
                switch (errorKey) {
                    case 'required':
                        msg = `${label} is required`;
                        break;
                    case 'min':
                        msg = `${label} must be at least ${errorVal?.['min']}`;
                        break;
                    case 'max':
                        msg = `${label} must be at most ${errorVal?.['max']}`;
                        break;
                    case 'minlength':
                        msg = `${label} must be at least ${errorVal?.['requiredLength']} characters`;
                        break;
                    case 'maxlength':
                        msg = `${label} must be at most ${errorVal?.['requiredLength']} characters`;
                        break;
                    default:
                        msg = `${label}: ${errorKey}`;
                }
                errors.push({ field: label, message: msg });
            }
        }
        return errors;
    }

    /** The entered amount is the NET payable (the amount after WHT is deducted). */
    get netAmount(): number {
        return Number(this.form.get('amount')?.value) || 0;
    }

    /**
     * Withholding-tax gross-up: Gross = Net / (1 − WHT%).
     * e.g. 100,000 / (1 − 0.04) = 104,166.67
     */
    get grossAmount(): number {
        return sumMoney([this.netAmount, grossUpTax(this.netAmount, this.taxRate)]);
    }

    /** WHT withheld = Gross − Net. */
    get taxAmount(): number {
        return grossUpTax(this.netAmount, this.taxRate);
    }

    /** Discount applied to the line. */
    get discountAmount(): number {
        return Number(this.form.get('discount')?.value) || 0;
    }

    /** Net payable to the payee = entered net + discount. */
    get netPayable(): number {
        return this.netAmount + this.discountAmount;
    }

    onVisibleChange(v: boolean): void {
        this.visibleChange.emit(v);
    }

    toggleMaximize(): void {
        this.maximized.update((m) => !m);
    }

    onCancel(): void {
        this.close();
    }

    onSaveRow(): void {
        this.emitRow();
    }

    onSaveAddNew(): void {
        if (!this.emitRow()) return;
        this.resetForm();
    }

    /** Reset every field to its initial blank state. */
    private resetForm(): void {
        this.form.reset({
            transactionType: null,
            account: null,
            subLedgerType: null,
            subLedger: null,
            department: null,
            costCenter: null,
            paymentMode: null,
            // Default to the header's FCY exchange rate; user can override per line.
            exchangeRate: this.fcyExchangeRate ?? 1.0,
            chequeId: 0,
            chequeType: null,
            chequeNo: '',
            chequeDate: new Date(),
            payeeTitle: '',
            comments: '',
            amount: 0,
            discount: 0
        });
        this.accountBalance.set(null);
        this.subLedgerBalance.set(null);
        this.controlAccount.set(false);
        this.applySubLedgerValidators(false);
        this.clearChequeDuplicateLock();
        this.applyNewRowDefaults();
    }

    /** Default field labels used to seed a new detail row. */
    private static readonly DEFAULT_TRANSACTION_TYPE = 'Invoice Payment';
    private static readonly DEFAULT_PAYMENT_MODE = 'Cheque';

    /**
     * Seed a new row's Transaction Type ("Invoice Payment") and Payment Mode ("Cheque")
     * from the loaded lookups. Only fills empty fields, so it never overrides an edit
     * or a user selection. Safe to call before lookups arrive (re-run once they load).
     */
    private applyNewRowDefaults(): void {
        if (this.editRow) return;

        // Match tolerantly (ignore case + spaces) so "Invoice Payment" ≈ "InvoicePayment".
        const norm = (s: string) => (s ?? '').toLowerCase().replace(/\s+/g, '');
        const findByName = (list: LookupType[], name: string) => list.find((o) => norm(o.name) === norm(name))?.id ?? null;

        const txnCtrl = this.form.get('transactionType');
        if (txnCtrl && !txnCtrl.value) {
            const id = findByName(this.transactionTypes(), VoucherDetailModal.DEFAULT_TRANSACTION_TYPE);
            if (id != null) txnCtrl.setValue(id);
        }

        const modeCtrl = this.form.get('paymentMode');
        if (modeCtrl && !modeCtrl.value) {
            const id = findByName(this.paymentModes(), VoucherDetailModal.DEFAULT_PAYMENT_MODE);
            if (id != null) {
                modeCtrl.setValue(id);
                // Programmatic patch doesn't fire the select's (onChange) — apply cheque rules.
                this.onPaymentModeChange(id);
            }
        }
    }

    onSaveClose(): void {
        if (this.emitRow()) this.close();
    }

    private emitRow(): boolean {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return false;
        }
        // Block saving a row that would introduce a second party while tax is applied.
        if (this.partySaveBlocked()) {
            this.warnDifferentParty();
            return false;
        }
        this.saved.emit(this.buildRow());
        return true;
    }

    private close(): void {
        this.maximized.set(false);
        this.visibleChange.emit(false);
    }

    /** Parse "dd-MMM-yyyy" (the format buildRow emits) back into a Date. */
    private parseDate(s: string | null | undefined): Date | null {
        if (!s) return null;
        const m = /^(\d{1,2})-(\w{3})-(\d{4})$/.exec(s);
        if (!m) return null;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months.indexOf(m[2]);
        if (month === -1) return null;
        return new Date(Number(m[3]), month, Number(m[1]));
    }

    private patchFromRow(row: any): void {
        // Bind by the saved ids (robust across async dropdown loading); fall back to name for
        // any legacy row that only carries display labels.
        const txnId = row.transactionTypeId ?? this.transactionTypes().find((t) => t.name === row.transactionType)?.id ?? null;
        const accountId = row.accountId ?? this.accounts().find((a) => a.accountName === row.account)?.id ?? null;
        const subLedgerTypeId = row.subLedgerTypeId ?? this.subLedgerTypes().find((t) => t.name === row.subLedgerType)?.id ?? null;
        const departmentId = row.departmentId ?? this.departments().find((d) => d.departmentName === row.department)?.id ?? null;
        const costCenterId = row.costCenterId ?? this.costCenters().find((c) => c.costCenterName === row.costCenter)?.id ?? null;
        const paymentModeId = row.paymentModeId ?? this.paymentModes().find((p) => p.name === row.paymentMode)?.id ?? null;
        const chequeTypeId = row.chequeTypeId ?? this.chequeTypes().find((c) => c.name === row.chequeType)?.id ?? null;

        // The saved Dr account may be a sub-ledger account that isn't in the debit dropdown — add it so it displays.
        if (accountId != null && !this.accounts().some((a) => a.id === accountId)) {
            this.accounts.update((list) => [{ id: accountId, accountName: row.account || `Account ${accountId}` } as BankAccounts, ...list]);
        }

        this.form.patchValue({
            transactionType: txnId,
            account: accountId,
            subLedgerType: subLedgerTypeId,
            subLedger: null, // restored once sub-ledgers load (see onAccountChange preserve)
            department: departmentId,
            costCenter: costCenterId,
            paymentMode: paymentModeId,
            chequeId: row.chequeId ?? 0,
            chequeType: chequeTypeId,
            exchangeRate: row.exchangeRate ?? this.fcyExchangeRate ?? 1.0,
            chequeNo: row.chequeNo ?? '',
            chequeDate: this.parseDate(row.chequeDate) ?? new Date(),
            payeeTitle: row.payeeTitle ?? '',
            comments: row.comments ?? '',
            amount: row.amount ?? 0,
            discount: row.discount ?? 0
        });

        // Programmatic patch doesn't fire the selects' (onChange) — apply cheque + account rules manually.
        // Pass the saved subLedgerId so onAccountChange doesn't wipe it while reloading options.
        this.onPaymentModeChange(paymentModeId);
        const preserveSubLedgerId = row.subLedgerId ?? null;
        if (accountId != null) {
            this.onAccountChange(accountId, true, preserveSubLedgerId);
        } else if (subLedgerTypeId != null) {
            this.loadSubLedgersForType(subLedgerTypeId, preserveSubLedgerId);
        }

        this.syncChequeFieldsFromDuplicate(row.chequeNo ?? null);
    }

    private buildRow() {
        const v = this.form.getRawValue();
        return {
            // Display names (used by the read-only Voucher Details table)
            transactionType: this.transactionTypes().find((t) => t.id === v.transactionType)?.name ?? '',
            account: this.accounts().find((a) => a.id === v.account)?.accountName ?? '',
            subLedgerType: this.subLedgerTypes().find((t) => t.id === v.subLedgerType)?.name ?? '',
            subLedger: this.subLedgers().find((s) => s.id === v.subLedger)?.name ?? this.editRow?.subLedger ?? '',
            department: this.departments().find((d) => d.id === v.department)?.departmentName ?? '',
            costCenter: this.costCenters().find((c) => c.id === v.costCenter)?.costCenterName ?? '',
            paymentMode: this.paymentModes().find((p) => p.id === v.paymentMode)?.name ?? '',
            chequeType: this.chequeTypes().find((c) => c.id === v.chequeType)?.name ?? '',
            // Lookup ids (used by the save payload)
            transactionTypeId: v.transactionType ?? null,
            accountId: v.account ?? null,
            isControlAccount: !!this.accounts().find((a) => a.id === v.account)?.isControlAccount,
            subLedgerTypeId: v.subLedgerType ?? null,
            subLedgerId: v.subLedger ?? null,
            departmentId: v.department ?? null,
            costCenterId: v.costCenter ?? null,
            paymentModeId: v.paymentMode ?? null,
            chequeTypeId: v.chequeType ?? null,
            chequeId: v.chequeId ?? 0,
            exchangeRate: v.exchangeRate ?? null,
            chequeNo: v.chequeNo,
            chequeDate: v.chequeDate ? formatDate(v.chequeDate, 'dd-MMM-yyyy', 'en-US') : '',
            payeeTitle: v.payeeTitle,
            comments: v.comments ?? '',
            amount: v.amount ?? 0,
            discount: v.discount ?? 0,
            taxPercent: this.taxRate,
            taxAmount: this.taxAmount,
            netAmount: this.netPayable
        };
    }
}
