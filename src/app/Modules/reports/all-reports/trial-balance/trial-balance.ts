import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemoStore } from '@/app/demo/demo-store';
import { environment } from '@/environments/environment';
import { sumMoney, moneyDifference } from '@/app/shared/utils/money.util';

@Component({ selector: 'app-trial-balance', imports: [CommonModule, FormsModule], changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './trial-balance.html', styleUrl: './trial-balance.scss' })
export class TrialBalance {
    readonly demo = environment.demoMode;
    readonly store = inject(DemoStore);
    readonly search = signal('');
    readonly rows = computed(() => this.store.trialBalance().filter((r) => (r.debit || r.credit) && (r.accountCode + ' ' + r.accountName).toLowerCase().includes(this.search().toLowerCase())));
    // Totals describe all accounts; search only changes the visible rows.
    readonly debit = computed(() => sumMoney(this.store.trialBalance().map((a) => a.debit)));
    readonly credit = computed(() => sumMoney(this.store.trialBalance().map((a) => a.credit)));
    readonly difference = computed(() => moneyDifference(this.debit(), this.credit()));
    print(): void {
        window.print();
    }
}
