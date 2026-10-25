import { environment } from '@/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApprovalWorkflowResponse } from './approval.types';

/** refDocumentTypeId for Bank Payment Voucher. */
export const PAYMENT_VOUCHER_DOCUMENT_TYPE_ID = 1;

@Injectable({ providedIn: 'root' })
export class ApprovalService {
    private http = inject(HttpClient);

    /**
     * Preview or load the approval workflow for a document type.
     * New voucher: omit `docId`. Edit/saved voucher: pass `docId`.
     */
    getWorkflow(
        refDocumentTypeId: number,
        amount: number,
        docId?: number | null,
    ): Observable<ApprovalWorkflowResponse> {
        let params = new HttpParams().set('amount', amount.toString());
        if (docId != null && docId > 0) {
            params = params.set('docId', docId.toString());
        }
        return this.http.get<ApprovalWorkflowResponse>(
            `${environment.apiUrl}/approval/workflow/${refDocumentTypeId}`,
            { params },
        );
    }
}
