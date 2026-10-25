import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AuditEntry } from '@/app/shared/services/audit.types';

@Component({
    selector: 'app-audit-log-tab',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './audit-log.html',
    styleUrl: './audit-log.scss',
})
export class AuditLogTab {
    /** Saved document id; null while creating (no history yet). */
    documentId = input<number | null>(null);

    /** Audit data is fetched by the parent (VoucherTabs) so the tab badge can show the count. */
    entries = input<AuditEntry[]>([]);
    loading = input<boolean>(false);
    error = input<string | null>(null);

    /** "VoucherUpdated" → "Voucher Updated". */
    actionLabel(action: string): string {
        return (action ?? '').replace(/([a-z])([A-Z])/g, '$1 $2');
    }
}
