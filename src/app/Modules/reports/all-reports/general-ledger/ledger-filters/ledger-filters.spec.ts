import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LedgerFilters } from './ledger-filters';
import { LookupService } from '@/app/shared/services/lookup.service';
describe('LedgerFilters', () => {
    let component: LedgerFilters;
    let fixture: ComponentFixture<LedgerFilters>;
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [LedgerFilters], providers: [{ provide: LookupService, useValue: { getAccountDropdown: () => of({ data: [] }), getSubLedgers: () => of({ data: [] }) } }] }).compileComponents();
        fixture = TestBed.createComponent(LedgerFilters);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });
    it('renders', () => expect(component).toBeTruthy());
    it('does not emit an inverted date range', () => {
        const emit = spyOn(component.apply, 'emit');
        component.filterForm.patchValue({ accountId: 101, fromDate: new Date(2026, 9, 25), toDate: new Date(2026, 9, 1) });
        component.applyFilter();
        expect(emit).not.toHaveBeenCalled();
        expect(component.filterForm.controls.toDate.hasError('dateOrder')).toBeTrue();
    });
});
