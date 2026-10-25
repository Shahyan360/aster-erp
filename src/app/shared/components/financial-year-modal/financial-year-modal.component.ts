import { Component, DestroyRef, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { AuthService, FinancialYear } from '@/app/core/services/auth.service';
import { AuthActions } from '@/app/store/auth/auth.actions';
import { selectFinancialYear, selectIsAuthenticated } from '@/app/store/auth/auth.selectors';

@Component({
    selector: 'app-financial-year-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, SelectModule, FloatLabelModule],
    templateUrl: './financial-year-modal.component.html',
    styleUrl: './financial-year-modal.component.scss'
})
export class FinancialYearModalComponent implements OnDestroy {
    private authService = inject(AuthService);
    private store = inject(Store);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    private isAuthenticated = this.store.selectSignal(selectIsAuthenticated);
    private selectedFy = this.store.selectSignal(selectFinancialYear);

    /** Shown only when the user is logged in AND no financial year has been picked yet. */
    visible = computed(() => this.isAuthenticated() && !this.selectedFy());

    financialYears = signal<FinancialYear[]>([]);
    loading = signal(false);
    /** Non-null when the list failed to load — drives the error state + Retry button. */
    error = signal<string | null>(null);
    selectedYearId = signal<number | null>(null);

    constructor() {
        // Fetch the list whenever the modal flips from hidden → visible.
        // On logout the modal hides; on next login it shows again and re-fetches.
        let lastVisible = false;
        effect(() => {
            const v = this.visible();
            if (v && !lastVisible) this.fetchYears();
            lastVisible = v;
        });
    }

    ngOnDestroy(): void {
        // Reset any scroll blocking class or styles that might have been applied by the p-dialog
        // when navigating away and destroying the component mid-animation.
        document.body.classList.remove('blocked-scroll', 'p-overflow-hidden');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }

    private fetchYears(): void {
        this.loading.set(true);
        this.error.set(null);
        this.authService
            .getFinancialYearList()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.loading.set(false);
                    if (res?.success) {
                        const list = res.data ?? [];
                        this.financialYears.set(list);
                        // Pre-select the active, open year (skip closed years).
                        const preferred = list.find((y) => y.isActive && !y.isClosed);
                        this.selectedYearId.set(preferred?.id ?? list[0]?.id ?? null);
                    } else {
                        this.error.set(res?.message || 'Could not load financial years.');
                    }
                },
                error: (err) => {
                    this.loading.set(false);
                    this.error.set(this.extractError(err));
                    console.error('Failed to load financial years:', err);
                }
            });
    }

    /** Pull a readable message out of an HTTP error. */
    private extractError(err: any): string {
        const body = err?.error;
        if (typeof body === 'string' && body) return body;
        if (body?.message) return body.message;
        if (err?.status === 0) return 'Cannot reach the server. Check your connection and try again.';
        if (err?.status) return `Request failed (${err.status}). Please try again.`;
        return 'Could not load financial years. Please try again.';
    }

    /** Re-attempt the lookup after a failure. */
    retry(): void {
        this.fetchYears();
    }

    /** Escape hatch: when the list can't load, let the user return to the login screen. */
    logout(): void {
        this.store.dispatch(AuthActions.logout());
    }

    confirm(): void {
        const id = this.selectedYearId();
        if (id == null) return;
        const year = this.financialYears().find((y) => y.id === id);
        if (!year || year.isClosed || !year.isActive) return;
        this.store.dispatch(AuthActions.setFinancialYear({ financialYear: year }));
        // Year chosen — now (and only now) enter the application.
        this.router.navigate(['/']);
    }
}
