import { afterNextRender, Component, DestroyRef, inject, Injector, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaymentVoucherService } from '../payment-voucher-service';
import { LedgerPrintData } from '../payment-voucher.types';

@Component({
    selector: 'app-payment-voucher-print',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './payment-voucher-print.html',
    styleUrl: './payment-voucher-print.scss'
})
export class PaymentVoucherPrint implements OnInit {
    private route = inject(ActivatedRoute);
    private paymentVoucherService = inject(PaymentVoucherService);
    private destroyRef = inject(DestroyRef);
    private injector = inject(Injector);

    report = signal<LedgerPrintData | null>(null);
    error = signal<string | null>(null);
    loading = signal(true);

    /** Guard so autoprint only runs once after the sheet has painted. */
    private autoPrintQueued = false;

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        const id = idParam != null ? Number(idParam) : NaN;
        if (!Number.isFinite(id) || id <= 0) {
            this.loading.set(false);
            this.error.set('No voucher id supplied.');
            return;
        }

        const autoprint = this.route.snapshot.queryParamMap.get('autoprint');
        this.autoPrintQueued = autoprint === '1' || autoprint === 'pdf';

        this.paymentVoucherService
            .getLedgerPrint(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.loading.set(false);
                    if (res?.success && res.data) {
                        this.report.set(res.data);
                        if (autoprint === 'pdf' && res.data.documentNo) {
                            document.title = res.data.documentNo;
                        }
                        if (this.autoPrintQueued) {
                            this.autoPrintQueued = false;
                            this.scheduleAutoPrint();
                        }
                    } else {
                        this.error.set(res?.message || 'Voucher not found.');
                    }
                },
                error: (err) => {
                    this.loading.set(false);
                    this.error.set(err?.error?.message || err?.message || 'Failed to load print data.');
                }
            });
    }

    close(): void {
        window.close();
    }

    print(): void {
        window.print();
    }

    /** Wait for Angular to paint the report before opening the browser print / Save-as-PDF dialog. */
    private scheduleAutoPrint(): void {
        afterNextRender(
            () => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            },
            { injector: this.injector }
        );
    }

    /** e.g. "PendingApproval" → "Pending Approval" */
    formatStatus(status: string): string {
        return status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
    }
}
