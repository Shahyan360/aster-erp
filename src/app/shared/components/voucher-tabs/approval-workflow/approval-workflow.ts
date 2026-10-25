import { Component, input } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import type { ApprovalWorkflowData, ApprovalWorkflowRow } from '@/app/shared/services/approval.types';

@Component({
    selector: 'app-approval-workflow-tab',
    standalone: true,
    imports: [CommonModule, NgClass],
    templateUrl: './approval-workflow.html',
    styleUrl: './approval-workflow.scss',
})
export class ApprovalWorkflowTab {
    workflow = input<ApprovalWorkflowData | null>(null);
    loading = input<boolean>(false);
    error = input<string | null>(null);

    formatStatus(status: string): string {
        return (status ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
    }

    amountRange(row: ApprovalWorkflowRow): string {
        const min = row.minAmount ?? 0;
        const max = row.maxAmount;
        return max != null ? `${min.toLocaleString()} – ${max.toLocaleString()}` : `${min.toLocaleString()}+`;
    }

    statusClass(status: string): string {
        const s = (status ?? '').toLowerCase();
        if (s.includes('approve')) return 'status--approved';
        if (s.includes('reject')) return 'status--rejected';
        if (s.includes('pending')) return 'status--pending';
        return 'status--default';
    }
}
