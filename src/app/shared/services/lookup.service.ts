import { environment } from '@/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';
import {
    AccountBalanceResponse,
    bankAccountResponse,
    ChequeBookResponse,
    ChequeLeafResponse,
    costCenterLookupResponse,
    currencyLookupResponse,
    departmentLookupResponse,
    LookupTypeResponse,
    SubLedgerResponse,
    taxTypeLookupResponse,
} from './lookup.types';

/**
 * Standard account-type id groups for the ChartOfAccount dropdown.
 * Each list is passed to {@link LookupService.getAccountDropdown} as `accountTypeIds`.
 */
export const ACCOUNT_TYPE_IDS = {
    /** Bank Account header dropdown. */
    bank: [2],
    /** Detail "Account (Dr)" dropdown. */
    debit: [3, 5, 6, 7, 8, 9, 10, 12, 19],
    /** Discount account dropdown. */
    discount: [12],
    /** Tax account dropdown. */
    tax: [20],
} as const;

/**
 * Central source for reference-data (lookup) lists used across the app —
 * transaction types, departments, cost centers, accounts, currencies, etc.
 *
 * Lookups are static for a session and requested from many places, so each
 * distinct request is fetched once and shared (`shareReplay`). A failed request
 * is evicted so the next caller retries instead of replaying a cached error.
 */
@Injectable({ providedIn: 'root' })
export class LookupService {
    private http = inject(HttpClient);
    private cache = new Map<string, Observable<unknown>>();

    private cached<T>(key: string, request: () => Observable<T>): Observable<T> {
        const existing = this.cache.get(key) as Observable<T> | undefined;
        if (existing) return existing;

        const shared = request().pipe(
            catchError((err) => {
                this.cache.delete(key);
                return throwError(() => err);
            }),
            shareReplay({ bufferSize: 1, refCount: false }),
        );
        this.cache.set(key, shared);
        return shared;
    }

    /** Drop all cached lookups (call if reference data is known to have changed). */
    clearCache(): void {
        this.cache.clear();
    }

    getTransactionTypes(): Observable<LookupTypeResponse> {
        return this.cached('transaction-types', () =>
            this.http.get<LookupTypeResponse>(`${environment.apiUrl}/lookup/transaction-types`));
    }

    getCurrencies(): Observable<currencyLookupResponse> {
        return this.cached('currencies', () =>
            this.http.get<currencyLookupResponse>(`${environment.apiUrl}/currencies`));
    }

    getSubLedgerTypes(): Observable<LookupTypeResponse> {
        return this.cached('sub-ledger-types', () =>
            this.http.get<LookupTypeResponse>(`${environment.apiUrl}/lookup/sub-ledger-types`));
    }

    /** Sub-ledgers for a type, optionally scoped to a specific account (when one is chosen). */
    getSubLedgers(ledgerTypeId?: number, accountId?: number | null): Observable<SubLedgerResponse> {
        return this.cached(`sub-ledgers:${ledgerTypeId}:${accountId ?? 'x'}`, () => {
            let params = new HttpParams();
            if(ledgerTypeId) params = params.set('subLedgerTypeId', ledgerTypeId.toString());
            if (accountId != null) params = params.set('accountId', accountId.toString());
            return this.http.get<SubLedgerResponse>(`${environment.apiUrl}/lookup/sub-ledgers`, { params });
        });
    }

    getDepartments(): Observable<departmentLookupResponse> {
        return this.cached('departments', () =>
            this.http.get<departmentLookupResponse>(`${environment.apiUrl}/lookup/departments`));
    }

    getCostCenters(): Observable<costCenterLookupResponse> {
        return this.cached('cost-centers', () =>
            this.http.get<costCenterLookupResponse>(`${environment.apiUrl}/lookup/cost-centers`));
    }

    getChequeTypes(): Observable<LookupTypeResponse> {
        return this.cached('cheque-types', () =>
            this.http.get<LookupTypeResponse>(`${environment.apiUrl}/lookup/cheque-types`));
    }

    getPaymentModes(): Observable<LookupTypeResponse> {
        return this.cached('payment-modes', () =>
            this.http.get<LookupTypeResponse>(`${environment.apiUrl}/lookup/payment-modes`));
    }

    getTaxTypes(): Observable<taxTypeLookupResponse> {
        return this.cached('tax-types', () =>
            this.http.get<taxTypeLookupResponse>(`${environment.apiUrl}/lookup/tax-types`));
    }

    /**
     * Chart-of-account dropdown filtered by one or more account-type ids.
     * `postingAllowed` is always sent; `accountTypeIds` are appended as repeated query params
     * (`?accountTypeIds=3&accountTypeIds=5…`). `classType`/`controlType` are only sent when
     * explicitly provided — sending them unconditionally filters out all accounts.
     * Use the {@link ACCOUNT_TYPE_IDS} groups for the standard Bank / Debit / Discount / Tax bindings.
     */
    getAccountDropdown(
        accountTypeIds: readonly number[] = [],
        classType?: number,
        controlType?: number,
        postingAllowed = true,
    ): Observable<bankAccountResponse> {
        const key = `accounts:${classType ?? 'x'}:${controlType ?? 'x'}:${accountTypeIds.join('-') || 'all'}:${postingAllowed}`;
        return this.cached(key, () => {
            let params = new HttpParams().set('postingAllowed', postingAllowed.toString());
            if (classType != null) params = params.set('classType', classType.toString());
            if (controlType != null) params = params.set('controlType', controlType.toString());
            for (const id of accountTypeIds) {
                params = params.append('accountTypeIds', id.toString());
            }
            return this.http.get<bankAccountResponse>(`${environment.apiUrl}/ChartOfAccount/dropdown`, { params });
        });
    }

    // ── Account balance (transactional — never cached so it reflects the latest ledger) ──

    /** Current ledger balance for an account (optionally scoped to a party / sub-ledger type). */
    getAccountBalance(accountId: number, partyId?: number | null, subLedgerTypeId?: number | null): Observable<AccountBalanceResponse> {
        let params = new HttpParams().set('AccountId', accountId.toString());
        if (partyId != null) params = params.set('PartyId', partyId.toString());
        if (subLedgerTypeId != null) params = params.set('SubLedgerTypeId', subLedgerTypeId.toString());
        return this.http.get<AccountBalanceResponse>(`${environment.apiUrl}/Ledger/balance`, { params });
    }

    // ── Cheque book (transactional — not cached so available leaves stay fresh) ──

    /** Cheque books for a bank account. */
    getChequeBooks(bankAccountId: number): Observable<ChequeBookResponse> {
        const params = new HttpParams().set('bankAccountId', bankAccountId);
        return this.http.get<ChequeBookResponse>(`${environment.apiUrl}/ChequeBook/dropdown`, { params });
    }

    /** Available (unused) cheque leaves for a given cheque book + bank account. */
    getChequeLeaves(bookId: number, bankAccountId: number): Observable<ChequeLeafResponse> {
        const params = new HttpParams()
            .set('id', bookId)
            .set('bankAccountId', bankAccountId);
        return this.http.get<ChequeLeafResponse>(`${environment.apiUrl}/ChequeBook/available-leaves`, { params });
    }
}
