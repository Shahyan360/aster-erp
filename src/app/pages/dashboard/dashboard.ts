import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DemoStore } from '@/app/demo/demo-store';
import { environment } from '@/environments/environment';
import { sumMoney } from '@/app/shared/utils/money.util';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: ` <section class="workspace-page" aria-labelledby="overview-title">
        <div class="page-heading">
            <div>
                <p class="eyebrow">YOUR FINANCIAL WORKSPACE</p>
                <h1 id="overview-title">A clearer view of your business.</h1>
                <p class="page-description">Accounts, payments and financial insights, together in one workspace.</p>
            </div>
            <a class="action-primary" routerLink="/accounts/payment-voucher/new"><i class="pi pi-plus" aria-hidden="true"></i> New payment</a>
        </div>
        @if (demo) {
            <div class="metric-grid">
                <article class="metric-card">
                    <span class="metric-icon"><i class="pi pi-wallet"></i></span>
                    <p>Operating bank</p>
                    <h2>{{ store.bankBalance() | number: '1.0-0' }} <small>PKR</small></h2>
                    <span class="metric-note">Balance from posted entries</span>
                </article>
                <article class="metric-card">
                    <span class="metric-icon green"><i class="pi pi-arrow-down-left"></i></span>
                    <p>Service revenue</p>
                    <h2>{{ store.revenue() | number: '1.0-0' }} <small>PKR</small></h2>
                    <span class="metric-note">Synthetic receipts and invoices</span>
                </article>
                <article class="metric-card">
                    <span class="metric-icon amber"><i class="pi pi-arrow-up-right"></i></span>
                    <p>Operating expenses</p>
                    <h2>{{ store.expenseTotal() | number: '1.0-0' }} <small>PKR</small></h2>
                    <span class="metric-note">Posted payments only</span>
                </article>
                <article class="metric-card">
                    <span class="metric-icon violet"><i class="pi pi-clock"></i></span>
                    <p>Awaiting review</p>
                    <h2>{{ store.pendingCount() }} <small>voucher</small></h2>
                    <span class="metric-note">Simulated approval queue</span>
                </article>
            </div>
            <div class="dashboard-columns">
                <article class="surface-panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">PAYMENTS</p>
                            <h2>Recent activity</h2>
                        </div>
                        <a routerLink="/accounts/payment-voucher" class="text-link">View all <i class="pi pi-arrow-right"></i></a>
                    </div>
                    <div class="table-scroll">
                        <table class="finance-table">
                            <caption class="sr-only">
                                Recent synthetic payment vouchers
                            </caption>
                            <thead>
                                <tr>
                                    <th>Voucher / description</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th class="amount">Amount · PKR</th>
                                    <th><span class="sr-only">Open</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (v of recent(); track v.id) {
                                    <tr>
                                        <td>
                                            <a [routerLink]="['/accounts/payment-voucher', v.id]" class="record-link">{{ v.docNo }}</a
                                            ><span class="cell-detail">{{ v.remarks }}</span>
                                        </td>
                                        <td>{{ v.docDate | date: 'dd MMM' }}</td>
                                        <td>
                                            <span class="status-pill" [class.posted]="v.status === 'Posted'" [class.submitted]="v.status === 'Submitted'">{{ v.status }}</span>
                                        </td>
                                        <td class="amount">{{ v.voucherAmount | number: '1.2-2' }}</td>
                                        <td>
                                            <a [routerLink]="['/accounts/payment-voucher', v.id]" [attr.aria-label]="'Open ' + v.docNo" class="icon-action"><i class="pi pi-arrow-up-right"></i></a>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </article>
                <aside class="surface-panel">
                    <div class="panel-heading">
                        <div>
                            <p class="eyebrow">SPEND OVERVIEW</p>
                            <h2>Where payments go</h2>
                        </div>
                        <span class="subtle-label">Posted</span>
                    </div>
                    <div class="spend-list">
                        @for (a of expenses(); track a.id) {
                            <div>
                                <div class="spend-label">
                                    <span>{{ a.accountName }}</span
                                    ><strong>{{ a.debit | number: '1.0-0' }}</strong>
                                </div>
                                <div class="spend-track"><span [style.width.%]="a.share" [style.background]="a.color"></span></div>
                            </div>
                        }
                    </div>
                    <div class="insight-note">
                        <i class="pi pi-info-circle"></i>
                        <p>Drafts and submissions stay outside the journal until posted. Reversals preserve a matching counter-entry.</p>
                    </div>
                </aside>
            </div>
            <div class="quick-access">
                <a routerLink="/reports/general-ledger"
                    ><span class="metric-icon"><i class="pi pi-book"></i></span><span><strong>Follow every entry</strong><small>Explore the general ledger</small></span
                    ><i class="pi pi-arrow-right"></i></a
                ><a routerLink="/reports/trial-balance"
                    ><span class="metric-icon green"><i class="pi pi-calculator"></i></span><span><strong>Keep the books balanced</strong><small>Review the synthetic trial balance</small></span
                    ><i class="pi pi-arrow-right"></i></a
                ><a routerLink="/accounts/chart-of-account"
                    ><span class="metric-icon violet"><i class="pi pi-sitemap"></i></span><span><strong>A place for every account</strong><small>Browse the chart of accounts</small></span
                    ><i class="pi pi-arrow-right"></i
                ></a>
            </div>
        } @else {
            <article class="surface-panel empty-panel">
                <i class="pi pi-chart-bar"></i>
                <h2>Your finance workspace</h2>
                <p>Live dashboard aggregation requires your backend's reporting endpoints. Open Payment vouchers or General Ledger to work with your connected API.</p>
                <a class="action-primary" routerLink="/accounts/payment-voucher">Open payment vouchers</a>
            </article>
        }
    </section>`
})
export class Dashboard {
    readonly demo = environment.demoMode;
    readonly store = inject(DemoStore);
    readonly recent = computed(() => [...this.store.vouchers()].sort((a, b) => b.docDate.localeCompare(a.docDate)).slice(0, 5));
    readonly expenses = computed(() => {
        const rows = this.store.trialBalance().filter((a) => a.accountCode.startsWith('5'));
        const total = sumMoney(rows.map((a) => a.debit));
        return rows.map((a, i) => ({ ...a, share: total ? (a.debit / total) * 100 : 0, color: ['#4056ed', '#35a58a', '#a08ce8'][i % 3] }));
    });
}
