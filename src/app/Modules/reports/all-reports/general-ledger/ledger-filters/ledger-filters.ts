import { environment } from '@/environments/environment';
import { Component, DestroyRef, inject, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ACCOUNT_TYPE_IDS, LookupService } from '@/app/shared';
import { DateType, LedgerFilters as LedgerFilterValues, LedgerOption } from '../general-ledger.types';

@Component({
    selector: 'app-ledger-filters',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePickerModule, SelectModule, CheckboxModule],
    templateUrl: './ledger-filters.html',
    styleUrl: './ledger-filters.scss'
})
export class LedgerFilters implements OnInit {
    private fb = inject(FormBuilder);
    private lookupService = inject(LookupService);
    private destroyRef = inject(DestroyRef);

    apply = output<LedgerFilterValues>();
    resetFilters = output<void>();

    dateTypes: { label: string; value: DateType }[] = [
        { label: 'Custom Range', value: 'custom' },
        { label: 'This Month', value: 'month' },
        { label: 'This Quarter', value: 'quarter' },
        { label: 'This Year', value: 'year' }
    ];

    accounts = signal<LedgerOption[]>([]);
    subLedgers = signal<LedgerOption[]>([]);
    companies = signal<LedgerOption[]>([{ id: 1, name: environment.demoMode ? 'Aster Trading · Demo' : 'Your company' }]);

    filtersOpen = signal(true);
    showZeroBalances = signal(true);
    includeFcy = signal(false);

    filterForm = this.fb.group({
        dateType: ['custom' as DateType, Validators.required],
        fromDate: [this.startOfMonth(new Date()) as Date | null, Validators.required],
        toDate: [this.endOfMonth(new Date()) as Date | null, Validators.required],
        accountId: [null as number | null, Validators.required],
        subLedgerId: [null as number | null],
        companyId: [1 as number | null]
    });

    ngOnInit(): void {
        this.lookupService
            .getAccountDropdown(ACCOUNT_TYPE_IDS.bank)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.accounts.set(
                        (res.data ?? []).map((a) => ({
                            id: a.id,
                            name: a.displayText || `${a.accountCode} — ${a.accountName}`
                        }))
                    );
                },
                error: (err) => console.error('Bank account dropdown failed:', err)
            });

        this.filterForm
            .get('accountId')
            ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((accountId) => this.loadSubLedgers(accountId));
    }

    toggleFilters(): void {
        this.filtersOpen.update((v) => !v);
    }

    filterSummary(): string {
        const v = this.filterForm.getRawValue();
        const account = this.accounts().find((a) => a.id === v.accountId)?.name;
        const sub = this.subLedgers().find((s) => s.id === v.subLedgerId)?.name;
        return [account, sub].filter(Boolean).join('  ·  ');
    }

    applyFilter(): void {
        this.applyDatePreset();
        const dates = this.filterForm.getRawValue();
        if (dates.fromDate && dates.toDate && dates.fromDate > dates.toDate) {
            this.filterForm.controls.toDate.setErrors({ dateOrder: true });
        }
        if (this.filterForm.invalid) {
            this.filterForm.markAllAsTouched();
            return;
        }
        this.apply.emit(this.currentValues());
    }

    reset(): void {
        const now = new Date();
        this.filterForm.reset({
            dateType: 'custom',
            fromDate: this.startOfMonth(now),
            toDate: this.endOfMonth(now),
            accountId: null,
            subLedgerId: null,
            companyId: 1
        });
        this.subLedgers.set([]);
        this.showZeroBalances.set(true);
        this.includeFcy.set(false);
        this.resetFilters.emit();
    }

    private loadSubLedgers(accountId: number | null): void {
        this.filterForm.patchValue({ subLedgerId: null }, { emitEvent: false });
        if (!accountId) {
            this.subLedgers.set([]);
            return;
        }

        this.lookupService
            .getSubLedgers(undefined, accountId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.subLedgers.set(
                        (res.data ?? []).map((s) => ({
                            id: s.id,
                            name: s.name
                        }))
                    );
                },
                error: (err) => {
                    console.error('Sub-ledger dropdown failed:', err);
                    this.subLedgers.set([]);
                }
            });
    }

    private applyDatePreset(): void {
        const dateType = this.filterForm.get('dateType')?.value ?? 'custom';
        if (dateType === 'custom') return;

        const now = new Date();
        let from: Date;
        let to: Date;

        switch (dateType) {
            case 'month':
                from = this.startOfMonth(now);
                to = this.endOfMonth(now);
                break;
            case 'quarter': {
                const q = Math.floor(now.getMonth() / 3);
                from = new Date(now.getFullYear(), q * 3, 1);
                to = new Date(now.getFullYear(), q * 3 + 3, 0);
                break;
            }
            case 'year':
                from = new Date(now.getFullYear(), 0, 1);
                to = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        this.filterForm.patchValue({ fromDate: from, toDate: to });
    }

    private startOfMonth(d: Date): Date {
        return new Date(d.getFullYear(), d.getMonth(), 1);
    }

    private endOfMonth(d: Date): Date {
        return new Date(d.getFullYear(), d.getMonth() + 1, 0);
    }

    private currentValues(): LedgerFilterValues {
        const v = this.filterForm.getRawValue();
        return {
            dateType: v.dateType ?? 'custom',
            fromDate: v.fromDate ?? null,
            toDate: v.toDate ?? null,
            accountId: v.accountId ?? null,
            subLedgerId: v.subLedgerId ?? null,
            companyId: v.companyId ?? null,
            showZeroBalances: this.showZeroBalances(),
            includeFcy: this.includeFcy()
        };
    }
}
