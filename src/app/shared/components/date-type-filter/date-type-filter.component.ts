import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    ControlContainer,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import { filter, merge, skip, take } from 'rxjs';
import { AuthService, FinancialYear } from '@/app/core/services/auth.service';
import { selectFinancialYear } from '@/app/store/auth/auth.selectors';
import { SelectFieldComponent } from '../select-field/select-field.component';
import { SystemSettingsService } from '../../services/system-settings.service';
import {
    buildCustomRangeFromPreviousDays,
    buildFinancialYearDateRange,
    computeDateRangePreset,
    DATE_TYPE_OPTIONS,
    DEFAULT_DATE_TYPE,
    DateRangePresetType,
} from '../../utils/date-range-preset.util';

@Component({
    selector: 'app-date-type-filter',
    standalone: true,
    imports: [ReactiveFormsModule, SelectFieldComponent],
    viewProviders: [
        {
            provide: ControlContainer,
            useExisting: FormGroupDirective,
        },
    ],
    templateUrl: './date-type-filter.component.html',
})
export class DateTypeFilterComponent implements OnInit {
    private controlContainer = inject(ControlContainer);
    private systemSettingsService = inject(SystemSettingsService);
    private authService = inject(AuthService);
    private store = inject(Store);
    private destroyRef = inject(DestroyRef);

    readonly dateTypeOptions = DATE_TYPE_OPTIONS;
    readonly financialYears = signal<FinancialYear[]>([]);
    readonly showFinancialYearSelect = signal(false);

    private loginFinancialYear = this.store.selectSignal(selectFinancialYear);
    private syncingDates = false;

    ngOnInit(): void {
        const form = this.controlContainer.control as FormGroup;
        const dateTypeControl = form.get('dateType');
        if (!dateTypeControl?.value) {
            dateTypeControl?.setValue(DEFAULT_DATE_TYPE, { emitEvent: false });
        }

        this.showFinancialYearSelect.set(dateTypeControl?.value === 'financialYear');
        this.loadFinancialYears(form);

        dateTypeControl?.valueChanges.pipe(
            skip(1),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((type) => {
            this.showFinancialYearSelect.set(type === 'financialYear');
            this.applyDateType(form, type as DateRangePresetType);
        });

        form.get('financialYearId')?.valueChanges.pipe(
            skip(1),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(() => {
            form.patchValue({ dateType: 'financialYear' }, { emitEvent: false });
            this.showFinancialYearSelect.set(true);
            this.applyFinancialYearDates(form);
        });

        merge(
            form.get('fromDate')?.valueChanges ?? [],
            form.get('toDate')?.valueChanges ?? [],
        ).pipe(
            filter(() => !this.syncingDates),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(() => {
            if (form.get('dateType')?.value !== DEFAULT_DATE_TYPE) {
                form.patchValue({ dateType: DEFAULT_DATE_TYPE }, { emitEvent: false });
                this.showFinancialYearSelect.set(false);
            }
        });
    }

    private loadFinancialYears(form: FormGroup): void {
        this.authService.getFinancialYearList().pipe(
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: (res) => {
                const list = res?.data ?? [];
                this.financialYears.set(list);

                const loginFy = this.loginFinancialYear();
                const currentId = form.get('financialYearId')?.value as number | null;
                const resolvedId = currentId ?? loginFy?.id ?? list.find((y) => y.isActive && !y.isClosed)?.id ?? list[0]?.id ?? null;

                if (resolvedId != null && currentId == null) {
                    form.patchValue({ financialYearId: resolvedId }, { emitEvent: false });
                }
            },
            error: (err) => console.error('Failed to load financial years for filters:', err),
        });
    }

    private applyDateType(form: FormGroup, type: DateRangePresetType): void {
        if (type === DEFAULT_DATE_TYPE) {
            this.systemSettingsService.getPreviousDaysForFromDate().pipe(
                take(1),
                takeUntilDestroyed(this.destroyRef),
            ).subscribe({
                next: (days) => this.patchDates(form, buildCustomRangeFromPreviousDays(days)),
                error: (err) => console.error('Failed to load custom date range setting:', err),
            });
            return;
        }

        if (type === 'financialYear') {
            this.applyFinancialYearDates(form);
            return;
        }

        this.patchDates(form, computeDateRangePreset(type));
    }

    private applyFinancialYearDates(form: FormGroup): void {
        const loginFy = this.loginFinancialYear();
        const id = (form.get('financialYearId')?.value as number | null) ?? loginFy?.id ?? null;
        const fy = this.financialYears().find((y) => y.id === id)
            ?? (loginFy?.id === id ? loginFy : null)
            ?? loginFy;

        if (!fy) return;

        if (form.get('financialYearId')?.value !== fy.id) {
            form.patchValue({ financialYearId: fy.id }, { emitEvent: false });
        }

        this.patchDates(form, buildFinancialYearDateRange(fy.startDate, fy.endDate));
    }

    private patchDates(form: FormGroup, range: { fromDate: Date; toDate: Date }): void {
        this.syncingDates = true;
        form.patchValue({ fromDate: range.fromDate, toDate: range.toDate });
        this.syncingDates = false;
    }
}
