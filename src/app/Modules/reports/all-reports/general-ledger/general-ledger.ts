import { CommonModule } from '@angular/common';
import { moneyDifference } from '@/app/shared/utils/money.util';
import { Subscription } from 'rxjs';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { LedgerHeader } from './ledger-header/ledger-header';
import { LedgerFilters } from './ledger-filters/ledger-filters';
import { LedgerCards } from './ledger-cards/ledger-cards';
import { LedgerTable } from './ledger-table/ledger-table';
import { GeneralLedgerService } from './general-ledger.service';
import { GeneralLedgerSummary, LedgerAction, LedgerFilters as LedgerFilterValues, LedgerTransaction, mapLedgerEntryToTransaction } from './general-ledger.types';

@Component({
    selector: 'app-general-ledger',
    imports: [CommonModule, LedgerHeader, LedgerFilters, LedgerCards, LedgerTable],
    templateUrl: './general-ledger.html',
    styleUrl: './general-ledger.scss'
})
export class GeneralLedger {
    private ledgerService = inject(GeneralLedgerService);
    private messageService = inject(MessageService);
    private destroyRef = inject(DestroyRef);

    searchTerm = signal('');
    loading = signal(false);
    transactions = signal<LedgerTransaction[]>([]);
    summary = signal<GeneralLedgerSummary | null>(null);
    totalCount = signal(0);

    private lastFilters = signal<LedgerFilterValues | null>(null);
    pageNumber = 1;
    private request?: Subscription;
    readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));
    private readonly pageSize = 25;

    filteredTransactions = computed(() => {
        const term = this.searchTerm().trim().toLowerCase();
        const rows = this.transactions();
        if (!term) return rows;
        return rows.filter((t) => {
            const hay = [t.voucherNo, t.accountCode, t.accountName, t.subLedger, t.counterAccount, t.reference, t.description, t.company, t.user].join(' ').toLowerCase();
            return hay.includes(term);
        });
    });

    entryCount = computed(() => this.summary()?.totalEntries ?? this.totalCount());
    totalDebit = computed(() => this.summary()?.totalDebit ?? 0);
    totalCredit = computed(() => this.summary()?.totalCredit ?? 0);
    netMovement = computed(() => moneyDifference(this.totalDebit(), this.totalCredit()));

    onAction(action: LedgerAction): void {
        switch (action) {
            case 'print':
                window.print();
                break;
            case 'refresh':
                this.load();
                break;
            default:
                this.messageService.add({ severity: 'info', summary: 'Not connected', detail: 'This action is not available.' });
        }
    }

    onApply(filters: LedgerFilterValues): void {
        if (!filters.accountId) {
            this.showError('Please select a bank account.');
            return;
        }
        this.lastFilters.set(filters);
        this.pageNumber = 1;
        this.searchTerm.set('');
        this.load();
    }

    onReset(): void {
        this.request?.unsubscribe();
        this.loading.set(false);
        this.searchTerm.set('');
        this.transactions.set([]);
        this.summary.set(null);
        this.totalCount.set(0);
        this.lastFilters.set(null);
    }

    changePage(delta: number): void {
        const next = this.pageNumber + delta;
        if (next < 1 || next > this.pageCount() || this.loading()) return;
        this.pageNumber = next;
        this.load();
    }

    private load(): void {
        const filters = this.lastFilters();
        if (!filters?.accountId) return;

        this.request?.unsubscribe();
        this.loading.set(true);
        this.request = this.ledgerService
            .getAccountLedger({
                companyId: filters.companyId ?? 1,
                accountId: filters.accountId,
                partyId: filters.subLedgerId,
                fromDate: filters.fromDate ? this.startOfDayLocal(filters.fromDate) : null,
                toDate: filters.toDate ? this.endOfDayLocal(filters.toDate) : null,
                pageNumber: this.pageNumber,
                pageSize: this.pageSize
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.loading.set(false);
                    if (!res?.success || !res.data) {
                        this.showError(res?.message || 'Failed to load the general ledger.');
                        this.transactions.set([]);
                        this.summary.set(null);
                        this.totalCount.set(0);
                        return;
                    }

                    const { summary, entries, totalCount } = res.data;
                    let rows = (entries ?? []).map((e, i) => mapLedgerEntryToTransaction(e, summary, i));

                    if (!filters.showZeroBalances) {
                        rows = rows.filter((r) => r.debit !== 0 || r.credit !== 0);
                    }

                    this.summary.set(summary);
                    this.totalCount.set(totalCount ?? summary.totalEntries ?? rows.length);
                    this.transactions.set(rows);
                },
                error: (err) => {
                    this.loading.set(false);
                    this.showError(this.extractError(err));
                    this.transactions.set([]);
                    this.summary.set(null);
                    this.totalCount.set(0);
                }
            });
    }

    private toLocalIso(d: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` + `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    private startOfDayLocal(d: Date): string {
        return this.toLocalIso(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
    }

    private endOfDayLocal(d: Date): string {
        return this.toLocalIso(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59));
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'General Ledger', detail, life: 5000 });
    }

    private extractError(err: unknown): string {
        const body = (err as { error?: { message?: string; errors?: string } })?.error;
        return body?.message || body?.errors || 'Unable to load the general ledger.';
    }
}
