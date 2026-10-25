import { environment } from '@/environments/environment';
import { sumMoney } from '@/app/shared/utils/money.util';
import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CheckboxModule } from 'primeng/checkbox';
import { VoucherDetails, VoucherDetailTotals } from './voucher-details/voucher-details';
import { VoucherTax } from './voucher-tax/voucher-tax';
import { VoucherSummary } from './voucher-summary/voucher-summary';
import { PaymentVoucherService } from '../payment-voucher-service';
import {
    ACCOUNT_TYPE_IDS,
    AccountBalanceData,
    AttachmentService,
    BaseCurrencyConfig,
    DecimalPrecisionConfig,
    DEFAULT_DECIMAL_PRECISION,
    LookupService,
    SubLedger,
    PAYMENT_VOUCHER_DOCUMENT_TYPE_ID,
    SystemSettingsService,
    VoucherTabs,
    VoucherTabsConfig
} from '@/app/shared';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Store } from '@ngrx/store';
import { selectFinancialYearId } from '@/app/store/auth/auth.selectors';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    BankAccounts,
    currencyLookupData,
    EditModeLookups,
    paymentVoucherByIdData,
    paymentVoucherPayload,
    paymentVoucherSaveResponse,
    paymentVoucherTax,
    paymentVoucherTaxByIdResponse,
    VoucherDetailRow,
    VoucherTaxRow
} from '../payment-voucher.types';

type VoucherStatus = 'Draft' | 'Submitted' | 'Posted' | 'Cancelled' | 'Reversed';

@Component({
    selector: 'app-payment-voucher-form',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, CheckboxModule, InputTextModule, InputNumberModule, SelectModule, DatePickerModule, FloatLabelModule, VoucherDetails, VoucherTax, VoucherSummary, VoucherTabs],
    templateUrl: './payment-voucher-form.html',
    styleUrl: './payment-voucher-form.scss'
})
export class PaymentVoucherForm implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private $destroyRef = inject(DestroyRef);
    private paymentVoucherService = inject(PaymentVoucherService);
    private lookupService = inject(LookupService);
    private systemSettingsService = inject(SystemSettingsService);

    /** Base currency codes + rates resolved from system settings (seeds the header defaults). */
    private baseCurrencyConfig = signal<BaseCurrencyConfig | null>(null);
    /** Per-type decimal precision from system settings (falls back to defaults). */
    precision = signal<DecimalPrecisionConfig>(DEFAULT_DECIMAL_PRECISION);
    private attachmentService = inject(AttachmentService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private store = inject(Store);

    /** Selected financial year id from the post-login modal (persisted in localStorage). */
    private financialYearId = this.store.selectSignal(selectFinancialYearId);

    @ViewChild(VoucherDetails) voucherDetailsCmp?: VoucherDetails;
    @ViewChild(VoucherTax) voucherTaxCmp?: VoucherTax;
    @ViewChild(VoucherSummary) voucherSummaryCmp?: VoucherSummary;

    readonly demo = environment.demoMode;
    readonly readOnlyDemo = computed(() => this.demo && this.isEditMode() && this.status() !== 'Draft');
    title = signal('Payment Voucher');
    status = signal<VoucherStatus>('Draft');
    printMenuOpen = signal(false);
    bankAccounts = signal<BankAccounts[]>([]);
    /** Live ledger balance for the selected bank account (from GET /Ledger/balance). */
    accountBalance = signal<AccountBalanceData | null>(null);
    currencies = signal<currencyLookupData[]>([]);
    /** LCY dropdown is restricted to the base currency (single-option select). */
    baseCurrencies = computed(() => this.currencies().filter((c) => c.isBaseCurrency));

    /** Edit-mode state. Populated when the route has a numeric `:id`. */
    private voucherId = signal<number | null>(null);
    isEditMode = computed(() => this.voucherId() != null);
    /** Public, read-only view of the current voucher id — passed to child tabs (audit log). */
    currentVoucherId = computed(() => this.voucherId());

    /** Cached GET /Voucher/{id} payload — used to re-bind dropdowns once lookups arrive. */
    private loadedVoucher = signal<paymentVoucherByIdData | null>(null);

    /** Rows pushed down to the detail / tax tables when loading an existing voucher. */
    initialDetailRows = signal<VoucherDetailRow[] | null>(null);
    initialTaxRows = signal<VoucherTaxRow[] | null>(null);

    /** Shared voucher tabs — enable/disable tabs per screen. */
    readonly voucherTabsConfig: VoucherTabsConfig = {
        attachments: true,
        auditLog: true,
        approvalWorkflow: true,
        linkedDocuments: true
    };

    readonly paymentVoucherDocumentTypeId = PAYMENT_VOUCHER_DOCUMENT_TYPE_ID;

    ngOnInit(): void {
        // AttachmentService is providedIn: 'root', so wipe any stale state from a prior
        // voucher form before this one mounts. loadVoucherForEdit will re-populate when editing.
        this.attachmentService.loadSaved([]);

        this.getBankAccountList();
        this.getCurrencyList();
        this.loadDecimalPlaces();

        const idParam = this.route.snapshot.paramMap.get('id');
        const id = idParam != null ? Number(idParam) : NaN;
        if (Number.isFinite(id) && id > 0) {
            this.voucherId.set(id);
            this.title.set('Edit Payment Voucher');
            this.loadVoucherForEdit(id);
        } else {
            this.generateVoucherNo();
        }
    }

    /**
     * Fetch the voucher + every lookup we need to resolve display names, in parallel.
     * The child tables only display labels, so the parent has to resolve id → name
     * before pushing rows down.
     */
    private loadVoucherForEdit(id: number): void {
        forkJoin({
            voucher: this.paymentVoucherService.getPaymentVoucherById(id),
            transactionTypes: this.lookupService.getTransactionTypes(),
            subLedgerTypes: this.lookupService.getSubLedgerTypes(),
            departments: this.lookupService.getDepartments(),
            costCenters: this.lookupService.getCostCenters(),
            chequeTypes: this.lookupService.getChequeTypes(),
            paymentModes: this.lookupService.getPaymentModes(),
            accounts: this.lookupService.getAccountDropdown(ACCOUNT_TYPE_IDS.debit),
            taxTypes: this.lookupService.getTaxTypes(),
            taxAccounts: this.lookupService.getAccountDropdown(ACCOUNT_TYPE_IDS.tax)
        })
            .pipe(
                switchMap((r) => {
                    if (!r.voucher?.success || !r.voucher.data) {
                        return of({ ...r, subLedgerNameById: new Map<number, string>() });
                    }
                    return this.resolveSubLedgerNames(r.voucher.data.voucherDetails ?? []).pipe(map((subLedgerNameById) => ({ ...r, subLedgerNameById })));
                }),
                takeUntilDestroyed(this.$destroyRef)
            )
            .subscribe({
                next: (r) => {
                    if (!r.voucher?.success || !r.voucher.data) {
                        this.showError(r.voucher?.message || 'Failed to load the voucher.');
                        return;
                    }
                    const v = r.voucher.data;
                    this.loadedVoucher.set(v);

                    this.patchHeaderFromVoucher(v);
                    this.status.set(v.status ?? (v.isPosted ? 'Posted' : 'Draft'));
                    // Tax rows first so WHT % is available when detail lines bind.
                    this.initialTaxRows.set(this.buildTaxRows(v.taxes, v.voucherDetails));
                    this.initialDetailRows.set(this.buildDetailRows(v.voucherDetails, r, r.subLedgerNameById));

                    // Seed already-saved attachments so the Attachments tab renders them.
                    this.attachmentService.loadSaved(v.attachments ?? []);
                },
                error: (err) => {
                    console.error('Failed to load voucher for edit:', err);
                    this.showError(this.extractApiError(err));
                }
            });
    }

    /** Patch the header form controls from a loaded voucher. */
    private patchHeaderFromVoucher(v: paymentVoucherByIdData): void {
        // FormGroup.patchValue skips disabled controls — set each field explicitly.
        this.setControlValue('voucherNo', v.docNo);
        this.setControlValue('voucherDate', this.parseApiDate(v.docDate));
        this.setControlValue('bankAccount', v.accountId);
        this.setControlValue('narration', v.remarks ?? '');
        this.setControlValue('lcyCurrency', v.baseCurrencyId);
        this.setControlValue('lcyExRate', v.baseExchangeRate);
        this.setControlValue('fcyCurrency', v.fcyId);
        this.setControlValue('fcyExRate', v.fcyExchangeRate);
        // Summary panel: header-level discount + discount account.
        this.summaryDiscount = v.discount ?? 0;
        this.summaryDiscountAccountId = v.discountAccountId ? v.discountAccountId : null;
        this.onBankAccountChange(v.accountId ?? null);
    }

    /** Set a control value even when the control is disabled (patchValue skips those). */
    private setControlValue(name: string, value: unknown): void {
        this.form.get(name)?.setValue(value, { emitEvent: false });
    }

    /** Parse an API date, treating the .NET min date ("0001-...") / empty as null. */
    private parseApiDate(value: string | null | undefined): Date | null {
        if (!value || value.startsWith('0001')) return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }

    /** Fetch sub-ledger labels for each distinct (type, account) pair on the saved lines. */
    private resolveSubLedgerNames(details: paymentVoucherByIdData['voucherDetails']): Observable<Map<number, string>> {
        const seen = new Set<string>();
        const fetches: Observable<SubLedger[]>[] = [];

        for (const d of details) {
            if (!d.subLedgerId || !d.subLedgerTypeId || !d.accountId) continue;
            const key = `${d.subLedgerTypeId}:${d.accountId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            fetches.push(this.lookupService.getSubLedgers(d.subLedgerTypeId, d.accountId).pipe(map((res) => res.data ?? [])));
        }

        if (!fetches.length) {
            return of(new Map<number, string>());
        }

        return forkJoin(fetches).pipe(
            map((lists) => {
                const nameById = new Map<number, string>();
                for (const list of lists) {
                    for (const sl of list) {
                        nameById.set(sl.id, sl.name);
                    }
                }
                return nameById;
            })
        );
    }

    /** Resolve each saved detail line into a display row (id → name via the loaded lookups). */
    private buildDetailRows(details: paymentVoucherByIdData['voucherDetails'], lookups: EditModeLookups, subLedgerNameById: Map<number, string>): VoucherDetailRow[] {
        return details.map((d) => {
            const amount = d.debit || d.credit || 0;
            return {
                // Display names
                transactionType: lookups.transactionTypes.data.find((t) => t.id === d.transactionTypeId)?.name ?? '',
                account: lookups.accounts.data.find((a) => a.id === d.accountId)?.accountName ?? d.accountName ?? '',
                subLedgerType: lookups.subLedgerTypes.data.find((t) => t.id === d.subLedgerTypeId)?.name ?? '',
                subLedger: d.subLedgerId ? (subLedgerNameById.get(d.subLedgerId) ?? '') : '',
                department: lookups.departments.data.find((dep) => dep.id === d.departmentId)?.departmentName ?? '',
                costCenter: lookups.costCenters.data.find((c) => c.id === d.costCenterId)?.costCenterName ?? '',
                paymentMode: lookups.paymentModes.data.find((p) => p.id === d.paymentModeId)?.name ?? '',
                chequeType: lookups.chequeTypes.data.find((c) => c.id === d.chequeTypeId)?.name ?? '',
                // Lookup ids (kept for the save payload)
                transactionTypeId: d.transactionTypeId,
                accountId: d.accountId,
                subLedgerTypeId: d.subLedgerTypeId,
                subLedgerId: d.subLedgerId,
                departmentId: d.departmentId,
                costCenterId: d.costCenterId,
                paymentModeId: d.paymentModeId,
                chequeTypeId: d.chequeTypeId,
                chequeId: d.chequeId ?? 0,
                // Update-only: lineId tells the backend this is an existing row.
                lineId: d.lineId ?? 0,
                // Plain fields
                exchangeRate: d.exchangeRate,
                chequeNo: d.chequeNumber ?? '',
                chequeDate: d.chequeDate ? formatDate(new Date(d.chequeDate), 'dd-MMM-yyyy', 'en-US') : '',
                payeeTitle: d.payeeTitle ?? '',
                comments: d.comments ?? '',
                amount,
                discount: d.discountAmount ?? 0,
                taxPercent: 0, // Recomputed by VoucherDetails' applyTax once tax rows arrive.
                taxAmount: d.taxAmount ?? 0,
                netAmount: sumMoney([amount, -(d.discountAmount ?? 0), d.taxAmount ?? 0])
            };
        });
    }

    /** Map header-level taxes from GET /Voucher/{id} into the Tax table rows. */
    private buildTaxRows(taxes: paymentVoucherTaxByIdResponse[] | undefined, details: paymentVoucherByIdData['voucherDetails']): VoucherTaxRow[] {
        // Prefer root-level taxes; fall back to legacy nested taxes on the first detail line.
        const source = taxes?.length ? taxes : (details[0]?.taxes ?? []);
        return source.map((t) => ({
            taxAccount: t.accountId,
            taxType: t.taxTypeId,
            whtPercent: t.taxPercent,
            baseAmount: 0,
            taxAmount: t.taxAmount,
            id: t.id,
            editing: false
        }));
    }

    /** Asks the backend for the next voucher number and patches the disabled field. */
    private generateVoucherNo(): void {
        const fyId = this.financialYearId();
        if (fyId == null) return; // Modal blocks app until selected — defensive guard.
        const documentTypeId = 1; // Payment voucher.
        this.paymentVoucherService
            .generateVoucherNo(documentTypeId, fyId, 'vouchers')
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (res) => {
                    if (res?.success && res.data?.voucherNo) {
                        this.setControlValue('voucherNo', res.data.voucherNo);
                    }
                },
                error: (err) => console.error('Error generating voucher no:', err)
            });
    }

    /** Pull the configured per-type decimal precision from system settings. */
    private loadDecimalPlaces(): void {
        this.systemSettingsService
            .getDecimalPrecision()
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (config) => this.precision.set(config),
                error: (err) => console.error('Error fetching decimal precision:', err)
            });
    }

    private getBankAccountList(): void {
        this.lookupService
            .getAccountDropdown(ACCOUNT_TYPE_IDS.bank)
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: (accounts) => {
                    this.bankAccounts.set(accounts.data ?? []);
                    // p-select needs options loaded before it can display the saved bank account.
                    const v = this.loadedVoucher();
                    if (v?.accountId) this.setControlValue('bankAccount', v.accountId);
                },
                error: (err) => console.error('Error fetching bank accounts:', err)
            });
    }

    /**
     * Load the currency list + base-currency system settings, then seed the header
     * defaults from those settings (LCY/FCY currency + rates).
     */
    private getCurrencyList(): void {
        forkJoin({
            currencies: this.lookupService.getCurrencies(),
            settings: this.systemSettingsService.getBaseCurrencyConfig()
        })
            .pipe(takeUntilDestroyed(this.$destroyRef))
            .subscribe({
                next: ({ currencies, settings }) => {
                    this.currencies.set(currencies.data ?? []);
                    this.baseCurrencyConfig.set(settings);
                    const v = this.loadedVoucher();
                    if (v) {
                        // Currency selects also need the option list before labels bind in edit mode.
                        this.setControlValue('lcyCurrency', v.baseCurrencyId);
                        this.setControlValue('lcyExRate', v.baseExchangeRate);
                        this.setControlValue('fcyCurrency', v.fcyId);
                        this.setControlValue('fcyExRate', v.fcyExchangeRate);
                    } else {
                        this.seedCurrencyDefaults();
                    }
                },
                error: (err) => console.error('Error fetching currencies / settings:', err)
            });
    }

    /**
     * Seed LCY + FCY currency selects and their rates from system settings
     * (matching the currency code to its id). Skipped in edit mode, where the
     * loaded voucher's own values take precedence.
     */
    private seedCurrencyDefaults(): void {
        if (this.isEditMode()) return;

        const list = this.currencies();
        const cfg = this.baseCurrencyConfig();
        const idForCode = (code: string | undefined) => (code ? (list.find((c) => c.currencyCode === code)?.id ?? null) : null);

        this.form.patchValue({
            lcyCurrency: idForCode(cfg?.lcyCurrency) ?? list.find((c) => c.isBaseCurrency)?.id ?? null,
            lcyExRate: cfg?.lcyRate ?? null,
            fcyCurrency: idForCode(cfg?.fcyCurrency) ?? list.find((c) => c.currencyCode === 'USD')?.id ?? null,
            fcyExRate: cfg?.fcyRate ?? null
        });
    }

    form = this.fb.group({
        voucherNo: [{ value: '' as string, disabled: true }],
        voucherDate: [new Date() as Date | null, Validators.required],
        bankAccount: [null as number | null, Validators.required],
        narration: [''],
        // Seeded from system settings — read-only to the user.
        lcyCurrency: [{ value: null as number | null, disabled: true }],
        lcyExRate: [{ value: null as number | null, disabled: true }],
        fcyCurrency: [{ value: null as number | null, disabled: true }],
        // Editable: changing this live-recalculates FCY amounts across the grid + summary.
        fcyExRate: [null as number | null]
    });

    get f() {
        return this.form.controls;
    }

    get selectedBalance(): string | null {
        const bal = this.accountBalance();
        if (!bal) return null;
        const dp = this.precision().lcyAmount;
        return `${(bal.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })} ${bal.balanceType ?? ''}`.trim();
    }

    /** Fetch the live ledger balance whenever the bank account changes. */
    onBankAccountChange(accountId: number | null): void {
        if (accountId == null) {
            this.accountBalance.set(null);
            return;
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
    }

    /** Currency code of the header's LCY currency (e.g. "PKR") — shown on detail amount labels. */
    get lcyCurrencyCode(): string {
        const id = this.form.get('lcyCurrency')?.value;
        return this.baseCurrencies().find((c) => c.id === id)?.currencyCode ?? '';
    }

    /** Currency code of the header's FCY currency (e.g. "USD") — shown as the detail FCY column. */
    get fcyCurrencyCode(): string {
        const id = this.form.get('fcyCurrency')?.value;
        return this.currencies().find((c) => c.id === id)?.currencyCode ?? '';
    }

    // ── Summary state (fed by the detail + tax tables) ─────────────────────────
    summaryGross = 0;
    /** Grid's FCY total (Σ per-row FCY) — drives the summary's FCY figures for consistency. */
    summaryFcyGross = 0;
    summaryDiscount = 0;
    /** Discount account chosen in the summary panel (AccountTypeId 12). */
    summaryDiscountAccountId: number | null = null;
    summaryTotalTax = 0;
    /** Distinct account count in the detail table — Tax/Discount need this to be ≤ 1. */
    detailAccountCount = 0;

    /** Tax/Discount allowed only with a single account in the detail. */
    get singleDetailAccount(): boolean {
        return this.detailAccountCount <= 1;
    }

    /** Detail lines must stay single-account once Tax or Discount is applied. */
    get taxOrDiscountActive(): boolean {
        return this.summaryTotalTax > 0 || this.summaryDiscount > 0;
    }

    /** Effective tax rate for voucher detail lines = Σ(WHT %) from the tax table */
    detailTaxRate = 0;

    /** Total voucher amount passed to the approval workflow tab. */
    get voucherAmount(): number {
        return sumMoney([this.summaryGross, this.summaryDiscount, this.summaryTotalTax]);
    }

    /** Valid once the header is complete and at least one line item exists */
    get summaryValid(): boolean {
        return this.form.valid && this.summaryGross > 0;
    }

    get summaryValidationMessage(): string {
        if (this.summaryGross <= 0) return 'Please add at least one row in Voucher Details to continue.';
        if (this.form.invalid) return 'Complete the required header fields.';
        return 'No validation errors.';
    }

    onDetailsTotals(totals: VoucherDetailTotals): void {
        this.summaryGross = totals.gross;
        this.summaryFcyGross = totals.fcyGross;
        this.detailAccountCount = totals.accountCount;
        // Lock the header Bank Account while any cheque line exists (avoids cheque/bank mismatch).
        this.lockBankAccount(totals.hasCheque);
        // Discount is entered in the Summary panel — don't overwrite it from the detail totals.
    }

    /** Disable the header Bank Account when cheque lines exist; re-enable once they're all gone. */
    private lockBankAccount(lock: boolean): void {
        const ctrl = this.form.get('bankAccount');
        if (!ctrl) return;
        if (lock && ctrl.enabled) ctrl.disable({ emitEvent: false });
        else if (!lock && ctrl.disabled) ctrl.enable({ emitEvent: false });
    }

    onTaxTotal(total: number): void {
        this.summaryTotalTax = total;
    }

    onTaxRate(rate: number): void {
        this.detailTaxRate = rate;
    }

    onCancel(): void {
        // Pending temp attachments get wiped by the CanDeactivate guard during navigation.
        this.router.navigate(['/accounts/payment-voucher']);
    }

    /** Reset the whole form back to a fresh new-entry state (header, grid, tax, summary). */
    onReset(): void {
        this.resetFormForNew();
        this.messageService.add({ severity: 'info', summary: 'Reset', detail: 'The form was reset for a new entry.', life: 2500 });
    }

    /**
     * Re-fetch every combo/dropdown + config value WITHOUT discarding data the user
     * already entered. Clears the shared lookup/settings caches, then re-triggers the
     * loaders on the form and all child tables.
     */
    onRefresh(): void {
        this.lookupService.clearCache();
        this.systemSettingsService.clearCache();

        // Form-level lists (bank accounts, currencies) + system-settings config.
        this.getBankAccountList();
        this.getCurrencyList();
        this.loadDecimalPlaces();

        // Child tables re-fetch their own combos (accounts, sub ledgers, payment modes,
        // tax types, discount accounts). User-entered rows/values are left untouched.
        this.voucherDetailsCmp?.refreshLookups();
        this.voucherTaxCmp?.refreshLookups();
        this.voucherSummaryCmp?.refreshLookups();

        this.messageService.add({ severity: 'success', summary: 'Refreshed', detail: 'Dropdown and configuration data reloaded.', life: 2500 });
    }

    /** Submit guard against concurrent clicks of Save / Save & New while a POST is in flight. */
    saving = signal(false);

    /** Persisted preference: open print preview after Submit & Save. */
    printPreviewEnabled = signal(this.readPrintPreviewPref());

    /** Document status codes sent with the save payload. */
    private static readonly STATUS_DRAFT = 1;
    private static readonly STATUS_SUBMIT = 2;
    private static readonly PRINT_PREVIEW_KEY = 'payment-voucher-print-preview';

    /** Save as Draft (status 1). */
    onSaveDraft(): void {
        this.submit(PaymentVoucherForm.STATUS_DRAFT);
    }

    /** Submit & Save (status 2). */
    onSubmitSave(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        if (this.summaryGross <= 0) {
            this.showError('Please add at least one row in Voucher Details to continue.');
            return;
        }

        this.confirmationService.confirm({
            header: 'Submit voucher',
            message: 'Are you sure you want to save it?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes, save',
            rejectLabel: 'Cancel',
            accept: () => this.submit(PaymentVoucherForm.STATUS_SUBMIT)
        });
    }

    /**
     * Branches between POST (create) and PUT (update) based on edit mode.
     * `status` (1=Draft, 2=Submit, 3=Post) is sent in the payload.
     */
    private submit(status: number): void {
        if (this.readOnlyDemo()) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        if (this.saving()) return;
        this.saving.set(true);

        const payload = this.buildSavePayload(status);
        const id = this.voucherId();
        const request$ = id != null ? this.paymentVoucherService.updatePaymentVoucher(id, payload) : this.paymentVoucherService.savePaymentVoucher(payload);

        const successMessage = id != null ? 'Payment voucher updated successfully.' : 'Payment voucher saved successfully.';

        request$.pipe(takeUntilDestroyed(this.$destroyRef)).subscribe({
            next: (res) => {
                this.saving.set(false);
                if (res?.success) {
                    // Backend has committed the attachments; clear local pending so the guard doesn't delete them.
                    this.attachmentService.commit();
                    this.showSuccess(successMessage);

                    const isSubmit = status === PaymentVoucherForm.STATUS_SUBMIT;
                    const savedId = this.resolveSavedVoucherId(res, id ?? null);
                    if (isSubmit && this.printPreviewEnabled() && savedId != null) {
                        this.openPrintPreview(savedId);
                    }

                    this.resetFormForNew(true);
                } else {
                    this.showError(res?.message || 'Failed to save the payment voucher.');
                }
            },
            error: (err) => {
                this.saving.set(false);
                this.showError(this.extractApiError(err));
            }
        });
    }

    /** Clear the form, child tables, summary, and attachments so the user can enter a fresh voucher. */
    private resetFormForNew(navigateToNew = false): void {
        const wasEditMode = this.voucherId() != null;

        // Whether we were creating or editing, this becomes a brand-new voucher.
        this.voucherId.set(null);
        this.loadedVoucher.set(null);
        this.initialDetailRows.set(null);
        this.initialTaxRows.set(null);
        this.title.set('Payment Voucher');
        this.status.set('Draft');

        this.form.reset({
            voucherNo: '',
            voucherDate: new Date(),
            bankAccount: null,
            narration: '',
            lcyCurrency: null,
            lcyExRate: null,
            fcyCurrency: null,
            fcyExRate: null
        });
        this.seedCurrencyDefaults();

        // Child tables + summary back to empty.
        this.voucherDetailsCmp?.reset();
        this.voucherTaxCmp?.reset();
        this.summaryGross = 0;
        this.summaryFcyGross = 0;
        this.summaryDiscount = 0;
        this.summaryDiscountAccountId = null;
        this.summaryTotalTax = 0;
        this.detailTaxRate = 0;
        this.detailAccountCount = 0;
        this.accountBalance.set(null);

        // Attachments were already committed; clear the local display + queues.
        this.attachmentService.loadSaved([]);

        // Pull a fresh voucher number for the new entry.
        this.generateVoucherNo();

        if (navigateToNew && wasEditMode) {
            this.router.navigate(['/accounts/payment-voucher/new'], { replaceUrl: true });
        }
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Success', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 5000 });
    }

    /** Pull a human-readable message out of a .NET API error response. */
    private extractApiError(err: any): string {
        const body = err?.error;
        if (!body) return err?.message || 'Something went wrong. Please try again.';
        // Validation problem details: { errors: { '$.field': ['msg'] } }
        if (body.errors && typeof body.errors === 'object') {
            const messages = Object.values(body.errors).flat() as string[];
            if (messages.length) return messages.join(' ');
        }
        return body.message || body.title || 'Failed to save the payment voucher.';
    }

    /** Coerce a form/row value (possibly string or null) to a number, defaulting to 0. */
    private toNum(value: unknown): number {
        return Number(value) || 0;
    }

    /**
     * Assemble the save payload from the current form state, the detail rows,
     * the tax rows, and the staged attachments. The .NET API rejects `null` for
     * int/string DTO fields, so unknown / not-yet-collected values default to
     * `0` / `""` (matching the swagger example).
     */
    private buildSavePayload(status: number): paymentVoucherPayload {
        const header = this.form.getRawValue();
        const detailRows = this.voucherDetailsCmp?.voucherRows ?? [];
        const taxRows = this.voucherTaxCmp?.taxRows ?? [];
        const attachments = this.attachmentService.pending();

        const voucherDateIso = header.voucherDate ? new Date(header.voucherDate).toISOString() : new Date().toISOString();

        // Header-level tax deductions (POST expects `taxes` at the root, not on each detail line).
        // Skip rows that the user never filled in — the placeholder row added by
        // VoucherTax on init would otherwise post as `{ all zeros }`.
        const taxes: paymentVoucherTax[] = taxRows
            .filter((t) => t.taxAccount != null)
            .map((t) => ({
                id: this.toNum(t.id),
                taxTypeId: this.toNum(t.taxType),
                accountId: this.toNum(t.taxAccount),
                taxPercent: this.toNum(t.whtPercent),
                taxAmount: this.toNum(t.taxAmount)
            }));

        // Total voucher amount = net (Σ line amounts) + discount + tax.
        const voucherAmount = sumMoney([this.summaryGross, this.summaryDiscount, this.summaryTotalTax]);

        return {
            documentTypeId: 1,
            documentStatusId: status, // 1 = Draft, 2 = Submitted, 3 = Posted
            docDate: voucherDateIso,
            // Posting date isn't collected yet — fall back to voucher date.
            postingDate: voucherDateIso,
            accountId: this.toNum(header.bankAccount),
            baseCurrencyId: this.toNum(header.lcyCurrency),
            baseExchangeRate: this.toNum(header.lcyExRate),
            fcyId: this.toNum(header.fcyCurrency),
            fcyExchangeRate: this.toNum(header.fcyExRate),
            remarks: header.narration ?? '',
            financialYearId: this.financialYearId() ?? 0,
            discountAccountId: this.toNum(this.summaryDiscountAccountId),
            discount: this.summaryDiscount,
            voucherAmount,
            isOffline: false,
            voucherDetails: detailRows.map((r) => ({
                accountId: this.toNum(r.accountId),
                subLedgerTypeId: this.toNum(r.subLedgerTypeId),
                subLedgerId: this.toNum(r.subLedgerId),
                // Header bank account (Cr) — not the detail line's Dr account.
                counterAccountId: this.toNum(header.bankAccount),
                comments: r.comments ?? '',
                paymentModeId: this.toNum(r.paymentModeId),
                chequeId: this.toNum(r.chequeId),
                chequeNumber: r.chequeNo ?? '',
                chequeDate: r.chequeDate ? new Date(r.chequeDate).toISOString() : voucherDateIso,
                payeeTitle: r.payeeTitle ?? '',
                chequeTypeId: this.toNum(r.chequeTypeId),
                transactionTypeId: this.toNum(r.transactionTypeId),
                debit: this.toNum(r.amount), // for now, treat amount as debit
                credit: 0,
                exchangeRate: this.toNum(r.exchangeRate),
                amountFcy: 0,
                taxAmount: this.toNum(r.taxAmount),
                discountAmount: this.toNum(r.discount),
                costCenterId: this.toNum(r.costCenterId),
                departmentId: this.toNum(r.departmentId),
                // Existing rows carry the API's lineId; new rows added in the modal default to 0.
                lineId: this.toNum(r.lineId)
            })),
            taxes,
            attachments,
            // Update endpoint only — POST ignores this; PUT consumes the queued removals.
            deleteAttachmentIds: this.attachmentService.deletedIds()
        };
    }

    togglePrintMenu(event: Event): void {
        event.stopPropagation();
        this.printMenuOpen.update((v) => !v);
    }

    onPrintPreviewChange(checked: boolean): void {
        this.printPreviewEnabled.set(checked);
        try {
            localStorage.setItem(PaymentVoucherForm.PRINT_PREVIEW_KEY, JSON.stringify(checked));
        } catch {
            // Ignore storage failures (private mode, quota, etc.).
        }
    }

    print(type: 'pdf' | 'print'): void {
        this.printMenuOpen.set(false);
        const id = this.voucherId();
        if (id == null) {
            this.showError('Save the voucher before printing or downloading PDF.');
            return;
        }

        const autoprint = type === 'pdf' ? 'pdf' : '1';
        this.openPrintPreview(id, autoprint);
    }

    /** Open the voucher print route in a new tab (browser print dialog when autoprint=1). */
    private openPrintPreview(voucherId: number, autoprint: '1' | 'pdf' = '1'): void {
        const url = `${window.location.origin}/accounts/payment-voucher/${voucherId}/print?autoprint=${autoprint}`;
        const win = window.open(url, '_blank');
        if (!win) {
            this.showError('Popup blocked — allow popups for this site to open the print preview.');
        }
    }

    private readPrintPreviewPref(): boolean {
        try {
            return JSON.parse(localStorage.getItem(PaymentVoucherForm.PRINT_PREVIEW_KEY) ?? 'false') === true;
        } catch {
            return false;
        }
    }

    /** Resolve voucher id after save — existing edit id, or id returned by POST. */
    private resolveSavedVoucherId(res: paymentVoucherSaveResponse, existingId: number | null): number | null {
        if (existingId != null) return existingId;
        const data = res.data;
        if (typeof data === 'number' && data > 0) return data;
        if (data && typeof data === 'object') {
            const record = data as Record<string, unknown>;
            if (typeof record['id'] === 'number' && record['id'] > 0) return record['id'];
            if (typeof record['voucherId'] === 'number' && record['voucherId'] > 0) return record['voucherId'];
        }
        return null;
    }

    @HostListener('document:click')
    closePrintMenu(): void {
        this.printMenuOpen.set(false);
    }
}
