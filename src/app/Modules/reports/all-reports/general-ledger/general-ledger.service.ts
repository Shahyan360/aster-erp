import { environment } from '@/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GeneralLedgerRequest, GeneralLedgerResponse } from './general-ledger.types';

@Injectable({ providedIn: 'root' })
export class GeneralLedgerService {
    private http = inject(HttpClient);

    /** GET /Ledger/account — ledger entries with running balance for a single account. */
    getAccountLedger(req: GeneralLedgerRequest): Observable<GeneralLedgerResponse> {
        let params = new HttpParams()
            .set('AccountId', req.accountId)
            .set('PageNumber', req.pageNumber)
            .set('PageSize', req.pageSize);

        if (req.companyId != null) params = params.set('CompanyId', req.companyId);
        if (req.partyId != null) params = params.set('PartyId', req.partyId);
        if (req.subLedgerTypeId != null) params = params.set('SubLedgerTypeId', req.subLedgerTypeId);
        if (req.isPosted != null) params = params.set('IsPosted', req.isPosted);
        if (req.fromDate) params = params.set('FromDate', req.fromDate);
        if (req.toDate) params = params.set('ToDate', req.toDate);

        return this.http.get<GeneralLedgerResponse>(`${environment.apiUrl}/Ledger/account`, { params });
    }
}
