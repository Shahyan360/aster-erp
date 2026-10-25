/** Saved attachments — returned by GET /Voucher/{id} and similar document endpoints. */
export interface SavedAttachment {
    id: number;
    uploadMode: string;
    screenId: number;
    referenceDocId: number;
    attachmentFolderId: number | null;
    folderPath: string | null;
    companyCode: string;
    moduleCode: string;
    subModuleCode: string;
    screenName: string;
    originalFileName: string;
    fileExtension: string;
    contentType: string;
    fileSizeBytes: number;
    fileSizeDisplay: string;
    revisionNo: number;
    isLatestVersion: boolean;
    notes: string | null;
    isDeleted: boolean;
    uploadedOn: string;
    uploadedBy: number;
}

/** Temp attachments staged on the server until the parent document is saved. */
export interface TempAttachment {
    tempId: string;
    originalFileName: string;
    storedFileName: string;
    storedTempFolderPath: string;
    fileExtension: string;
    contentType: string;
    fileSizeBytes: number;
    fileSizeDisplay: string;
    uploadedAt: string;
    previewUrl?: string;
}

/** @deprecated Use `TempAttachment` — kept for payment-voucher compatibility. */
export type tempAttachment = TempAttachment;

export interface TempAttachmentUploadResponse {
    success: boolean;
    message: string;
    data: TempAttachment[];
    errors: string | null;
    errorCode: string | null;
}

/** @deprecated Use `TempAttachmentUploadResponse`. */
export type tempAttachmentUploadResponse = TempAttachmentUploadResponse;

export interface TempAttachmentDeleteResponse {
    success: boolean;
    message: string;
    data: null;
    errors: string | null;
    errorCode: string | null;
}

/** @deprecated Use `TempAttachmentDeleteResponse`. */
export type tempAttachmentDeleteResponse = TempAttachmentDeleteResponse;

export interface CommitLinkedRequest {
    documentTypeId: number;
    referenceDocId: number;
    notes: string;
    tempFiles: TempAttachment[];
}

/** @deprecated Use `CommitLinkedRequest`. */
export type commitLinkedRequest = CommitLinkedRequest;

export interface CommitLinkedResponse {
    success: boolean;
    message: string;
    data: SavedAttachment[] | null;
    errors: string | null;
    errorCode: string | null;
}

/** @deprecated Use `CommitLinkedResponse`. */
export type commitLinkedResponse = CommitLinkedResponse;
