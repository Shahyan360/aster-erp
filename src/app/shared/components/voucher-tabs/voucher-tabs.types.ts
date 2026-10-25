/** Tab keys exposed in the shared voucher-tabs config (camelCase). */
export type VoucherTabConfigKey = 'attachments' | 'auditLog' | 'approvalWorkflow' | 'linkedDocuments';

/** Internal tab key used by the tab nav + content switch. */
export type VoucherTabKey = 'attachments' | 'audit-log' | 'approval-workflow' | 'linked-documents';

export interface VoucherTabItemConfig {
    /** When false the tab is hidden. Defaults to true. */
    enabled?: boolean;
    /** Custom tab label. Falls back to the default English label. */
    label?: string;
}

/** Per-tab enable/label overrides — pass `true`/`false` or `{ enabled, label }`. */
export type VoucherTabConfigValue = boolean | VoucherTabItemConfig;

export interface VoucherTabsConfig {
    attachments?: VoucherTabConfigValue;
    auditLog?: VoucherTabConfigValue;
    approvalWorkflow?: VoucherTabConfigValue;
    linkedDocuments?: VoucherTabConfigValue;
}

export const DEFAULT_VOUCHER_TABS_CONFIG: VoucherTabsConfig = {
    attachments: true,
    auditLog: true,
    approvalWorkflow: true,
    linkedDocuments: true,
};

export const DEFAULT_VOUCHER_TAB_LABELS: Record<VoucherTabConfigKey, string> = {
    attachments: 'Attachments',
    auditLog: 'Audit Log',
    approvalWorkflow: 'Approval Workflow',
    linkedDocuments: 'Linked Documents',
};

export const VOUCHER_TAB_KEY_MAP: Record<VoucherTabConfigKey, VoucherTabKey> = {
    attachments: 'attachments',
    auditLog: 'audit-log',
    approvalWorkflow: 'approval-workflow',
    linkedDocuments: 'linked-documents',
};

/** Resolve a config entry into enabled + label. */
export function resolveVoucherTabConfig(
    value: VoucherTabConfigValue | undefined,
    defaultLabel: string,
    defaultEnabled = true,
): { enabled: boolean; label: string } {
    if (value === false) return { enabled: false, label: defaultLabel };
    if (value === true || value === undefined) return { enabled: defaultEnabled, label: defaultLabel };
    return {
        enabled: value.enabled !== false,
        label: value.label?.trim() || defaultLabel,
    };
}
