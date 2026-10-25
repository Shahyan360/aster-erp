import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentVoucherService } from './payment-voucher-service';
import { environment } from '@/environments/environment';
describe('PaymentVoucherService', () => {
    let service: PaymentVoucherService;
    let backend: HttpTestingController;
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(PaymentVoucherService);
        backend = TestBed.inject(HttpTestingController);
    });
    afterEach(() => backend.verify());
    it('is created', () => expect(service).toBeTruthy());
    it('loads a requested voucher by ID', () => {
        service.getPaymentVoucherById(4).subscribe();
        const req = backend.expectOne(environment.apiUrl + '/Voucher/4');
        expect(req.request.method).toBe('GET');
        req.flush({ success: true, data: { id: 4 } });
    });
    it('reverses using the existing POST contract', () => {
        service.reversePaymentVoucher(1).subscribe();
        const req = backend.expectOne(environment.apiUrl + '/Voucher/1/reverse');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toBeNull();
        req.flush({ success: true });
    });
    it('keeps numbering parameters', () => {
        service.generateVoucherNo(1, 2, 'vouchers').subscribe();
        const req = backend.expectOne((r) => r.url === environment.apiUrl + '/Voucher/generate-no');
        expect(req.request.params.get('financialYearId')).toBe('2');
        expect(req.request.params.get('entityName')).toBe('vouchers');
        req.flush({ success: true, data: { voucherNo: 'PV-DEMO-0001' } });
    });
});
