import { Routes } from '@angular/router';
import { attachmentsCleanupGuard } from './payment-voucher/attachments-cleanup.guard';
export default [
    { path: '', redirectTo: 'payment-voucher', pathMatch: 'full' },
    { path: 'chart-of-account', title: 'Chart of accounts | Aster ERP', loadComponent: () => import('./chart-of-account/chart-of-account').then((m) => m.ChartOfAccount) },
    { path: 'journal-voucher', title: 'Journal voucher | Aster ERP', loadComponent: () => import('./journal-voucher/journal-voucher').then((m) => m.JournalVoucher) },
    { path: 'receipt-voucher', title: 'Receipt voucher | Aster ERP', loadComponent: () => import('./receipt-voucher/receipt-voucher').then((m) => m.ReceiptVoucher) },
    { path: 'payment-voucher', title: 'Payment vouchers | Aster ERP', loadComponent: () => import('./payment-voucher/payment-voucher-list/payment-voucher-list').then((m) => m.PaymentVoucherList) },
    { path: 'payment-voucher/new', title: 'New payment voucher | Aster ERP', loadComponent: () => import('./payment-voucher/payment-voucher-form/payment-voucher-form').then((m) => m.PaymentVoucherForm), canDeactivate: [attachmentsCleanupGuard] },
    { path: 'payment-voucher/:id', title: 'Edit payment voucher | Aster ERP', loadComponent: () => import('./payment-voucher/payment-voucher-form/payment-voucher-form').then((m) => m.PaymentVoucherForm), canDeactivate: [attachmentsCleanupGuard] }
] as Routes;
