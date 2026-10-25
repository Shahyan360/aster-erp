/** A single approval step returned by GET /approval/workflow/{refDocumentTypeId}. */
export interface ApprovalWorkflowRow {
    logId: number;
    referenceDocNo: string | null;
    documentType: string;
    module: string;
    screen: string;
    level: string;
    group: string;
    approvalType: string;
    minAmount: number;
    maxAmount: number | null;
    assignedUser: string;
    isMandatory: boolean;
    isFinal: boolean;
    status: string;
    actionBy: string | null;
    actionDate: string | null;
    remarks: string | null;
    submissionNo: number;
    isViewOnly: boolean;
    canReject: boolean;
    assignedUserId: number;
    assignedUserEmail: string;
    createdOn: string | null;
}

export interface ApprovalWorkflowData {
    mode: string;
    refDocumentTypeId: number;
    referenceDocId: number | null;
    referenceDocNo: string | null;
    documentAmount: number;
    overallStatus: string | null;
    rows: ApprovalWorkflowRow[];
}

export interface ApprovalWorkflowResponse {
    success: boolean;
    message: string;
    data: ApprovalWorkflowData | null;
    errors: string | null;
    errorCode: string | null;
}
