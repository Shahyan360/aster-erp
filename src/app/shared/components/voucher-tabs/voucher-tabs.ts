import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttachmentsTab } from './attachments/attachments';
import { AuditLogTab } from './audit-log/audit-log';
import { ApprovalWorkflowTab } from './approval-workflow/approval-workflow';
import { LinkedDocumentsTab } from './linked-documents/linked-documents';
import { AttachmentService } from '@/app/shared/services/attachment.service';
import { ApprovalService, PAYMENT_VOUCHER_DOCUMENT_TYPE_ID } from '@/app/shared/services/approval.service';
import type { ApprovalWorkflowData } from '@/app/shared/services/approval.types';
import { AuditService } from '@/app/shared/services/audit.service';
import type { AuditEntry } from '@/app/shared/services/audit.types';
import {
    DEFAULT_VOUCHER_TABS_CONFIG,
    DEFAULT_VOUCHER_TAB_LABELS,
    VOUCHER_TAB_KEY_MAP,
    VoucherTabConfigKey,
    VoucherTabKey,
    VoucherTabsConfig,
    resolveVoucherTabConfig,
} from './voucher-tabs.types';

interface TabDef {
    key: VoucherTabKey;
    label: string;
    count?: number;
}

const TAB_CONFIG_KEYS: VoucherTabConfigKey[] = [
    'attachments',
    'auditLog',
    'approvalWorkflow',
    'linkedDocuments',
];

@Component({
    selector: 'app-voucher-tabs',
    standalone: true,
    imports: [
        CommonModule,
        AttachmentsTab,
        AuditLogTab,
        ApprovalWorkflowTab,
        LinkedDocumentsTab,
    ],
    templateUrl: './voucher-tabs.html',
    styleUrl: './voucher-tabs.scss',
})
export class VoucherTabs {
    private attachmentService = inject(AttachmentService);
    private auditService = inject(AuditService);
    private approvalService = inject(ApprovalService);
    private destroyRef = inject(DestroyRef);

    /**
     * Which tabs to show and their labels.
     * @example { attachments: true, auditLog: true, approvalWorkflow: { label: 'Approvals' }, linkedDocuments: false }
     */
    tabsConfig = input<VoucherTabsConfig>(DEFAULT_VOUCHER_TABS_CONFIG);

    /** Saved document id (null when creating). Drives audit log fetch. */
    documentId = input<number | null>(null);

    /** Current document amount — drives approval workflow preview. */
    documentAmount = input<number>(0);

    /** Document type id for approval workflow API. */
    documentTypeId = input<number>(PAYMENT_VOUCHER_DOCUMENT_TYPE_ID);

    /** Audit entity type passed to GET audit (e.g. `voucher`). */
    auditEntityType = input<string>('voucher');

    active = signal<VoucherTabKey>('attachments');

    auditEntries = signal<AuditEntry[]>([]);
    auditLoading = signal(false);
    auditError = signal<string | null>(null);
    private auditLoadedFor: number | null = null;

    approvalWorkflow = signal<ApprovalWorkflowData | null>(null);
    approvalLoading = signal(false);
    approvalError = signal<string | null>(null);
    private approvalDebounce?: ReturnType<typeof setTimeout>;

    constructor() {
        effect(() => {
            const visible = this.tabs();
            const current = this.active();
            if (visible.length && !visible.some((t) => t.key === current)) {
                this.active.set(visible[0].key);
            }
        });

        effect(() => {
            const id = this.documentId();
            const cfg = this.tabsConfig();
            const auditEnabled = resolveVoucherTabConfig(
                cfg.auditLog,
                DEFAULT_VOUCHER_TAB_LABELS.auditLog,
            ).enabled;
            if (!auditEnabled) return;
            if (id == null) {
                this.auditLoadedFor = null;
                this.auditEntries.set([]);
                return;
            }
            if (id === this.auditLoadedFor) return;
            this.auditLoadedFor = id;
            this.loadAudit(id);
        });

        effect(() => {
            const cfg = this.tabsConfig();
            const approvalEnabled = resolveVoucherTabConfig(
                cfg.approvalWorkflow,
                DEFAULT_VOUCHER_TAB_LABELS.approvalWorkflow,
            ).enabled;
            if (!approvalEnabled) return;
            const id = this.documentId();
            const amount = this.documentAmount();
            const typeId = this.documentTypeId();
            this.scheduleApprovalLoad(typeId, amount, id);
        });
    }

    private loadAudit(id: number): void {
        this.auditLoading.set(true);
        this.auditError.set(null);
        this.auditService
            .getEntityAudit(this.auditEntityType(), id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.auditLoading.set(false);
                    if (res?.success) {
                        this.auditEntries.set(res.data ?? []);
                    } else {
                        this.auditError.set(res?.message || 'Failed to load the audit log.');
                    }
                },
                error: (err) => {
                    this.auditLoading.set(false);
                    this.auditError.set(err?.error?.message || err?.message || 'Failed to load the audit log.');
                },
            });
    }

    private scheduleApprovalLoad(refDocumentTypeId: number, amount: number, docId: number | null): void {
        clearTimeout(this.approvalDebounce);
        this.approvalDebounce = setTimeout(() => {
            this.loadApproval(refDocumentTypeId, amount, docId);
        }, 400);
    }

    private loadApproval(refDocumentTypeId: number, amount: number, docId: number | null): void {
        this.approvalLoading.set(true);
        this.approvalError.set(null);
        this.approvalService
            .getWorkflow(refDocumentTypeId, amount, docId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.approvalLoading.set(false);
                    if (res?.success) {
                        this.approvalWorkflow.set(res.data);
                    } else {
                        this.approvalError.set(res?.message || 'Failed to load the approval workflow.');
                    }
                },
                error: (err) => {
                    this.approvalLoading.set(false);
                    this.approvalError.set(err?.error?.message || err?.message || 'Failed to load the approval workflow.');
                },
            });
    }

    tabs = computed<TabDef[]>(() => {
        const cfg = this.tabsConfig();
        const result: TabDef[] = [];

        for (const configKey of TAB_CONFIG_KEYS) {
            const resolved = resolveVoucherTabConfig(cfg[configKey], DEFAULT_VOUCHER_TAB_LABELS[configKey]);
            if (!resolved.enabled) continue;

            const key = VOUCHER_TAB_KEY_MAP[configKey];
            result.push({
                key,
                label: resolved.label,
                count: this.tabCount(key),
            });
        }

        return result;
    });

    private tabCount(key: VoucherTabKey): number | undefined {
        switch (key) {
            case 'attachments':
                return this.attachmentService.saved().length + this.attachmentService.pending().length;
            case 'audit-log':
                return this.auditEntries().length || undefined;
            case 'approval-workflow':
                return this.approvalWorkflow()?.rows?.length || undefined;
            case 'linked-documents':
                return undefined;
        }
    }

    isTabEnabled(key: VoucherTabKey): boolean {
        return this.tabs().some((t) => t.key === key);
    }

    setActive(key: VoucherTabKey): void {
        this.active.set(key);
    }
}
