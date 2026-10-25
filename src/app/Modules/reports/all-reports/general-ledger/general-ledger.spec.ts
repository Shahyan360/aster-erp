import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { GeneralLedger } from './general-ledger';
import { GeneralLedgerService } from './general-ledger.service';
import { LookupService } from '@/app/shared/services/lookup.service';
import { GeneralLedgerResponse, LedgerFilters } from './general-ledger.types';
describe('GeneralLedger', () => {
    let component: GeneralLedger;
    let fixture: ComponentFixture<GeneralLedger>;
    let service: jasmine.SpyObj<GeneralLedgerService>;
    const filters: LedgerFilters = { dateType: 'custom', fromDate: null, toDate: null, accountId: 101, subLedgerId: null, companyId: 1, showZeroBalances: true, includeFcy: false };
    beforeEach(async () => {
        service = jasmine.createSpyObj('GeneralLedgerService', ['getAccountLedger']);
        service.getAccountLedger.and.returnValue(of({ success: true, message: '', data: null, errors: null, errorCode: null }));
        await TestBed.configureTestingModule({
            imports: [GeneralLedger],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                MessageService,
                { provide: GeneralLedgerService, useValue: service },
                { provide: LookupService, useValue: { getAccountDropdown: () => of({ data: [] }), getSubLedgers: () => of({ data: [] }) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(GeneralLedger);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });
    it('renders', () => expect(component).toBeTruthy());
    it('rejects a report request without an account', () => {
        component.onApply({ ...filters, accountId: null });
        expect(service.getAccountLedger).not.toHaveBeenCalled();
    });
    it('cancels stale report loads before applying new filters', () => {
        const pending = new Subject<GeneralLedgerResponse>();
        service.getAccountLedger.and.returnValue(pending);
        component.onApply(filters);
        expect(pending.observed).toBeTrue();
        component.onReset();
        expect(pending.observed).toBeFalse();
        expect(component.loading()).toBeFalse();
    });
});
