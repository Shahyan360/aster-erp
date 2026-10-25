import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemoStore } from '@/app/demo/demo-store';
import { environment } from '@/environments/environment';

@Component({ selector: 'app-chart-of-account', imports: [CommonModule, FormsModule], changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './chart-of-account.html', styleUrl: './chart-of-account.scss' })
export class ChartOfAccount {
    readonly demo = environment.demoMode;
    readonly store = inject(DemoStore);
    readonly search = signal('');
    readonly accounts = computed(() => this.store.trialBalance().filter((a) => (a.accountCode + ' ' + a.accountName).toLowerCase().includes(this.search().toLowerCase())));
}
