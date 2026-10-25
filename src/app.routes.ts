import { environment } from './environments/environment';
import { Routes } from '@angular/router';
import { authGuard } from './app/core/guards/auth.guard';
import { guestGuard } from './app/core/guards/guest.guard';
import { financialYearGuard, financialYearSelectionGuard } from './app/core/guards/financial-year.guard';

export const appRoutes: Routes = [
    {
        path: 'select-financial-year',
        title: 'Financial year | Aster ERP',
        loadComponent: () => import('./app/pages/financial-year/financial-year-selection').then((m) => m.FinancialYearSelection),
        canActivate: [authGuard, financialYearSelectionGuard]
    },
    {
        path: 'accounts/payment-voucher/:id/print',
        title: 'Print payment voucher | Aster ERP',
        loadComponent: () => import('./app/Modules/accounts/payment-voucher/payment-voucher-print/payment-voucher-print').then((m) => m.PaymentVoucherPrint),
        canActivate: [authGuard, financialYearGuard]
    },
    {
        path: '',
        loadComponent: () => import('./app/layout/component/app.layout').then((m) => m.AppLayout),
        canActivate: [authGuard, financialYearGuard],
        children: [
            { path: '', title: 'Overview | Aster ERP', loadComponent: () => import('./app/pages/dashboard/dashboard').then((m) => m.Dashboard) },
            { path: 'uikit', canMatch: [() => !environment.demoMode], loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'documentation', title: 'Documentation | Aster ERP', loadComponent: () => import('./app/pages/documentation/documentation').then((m) => m.Documentation) },
            { path: 'pages', canMatch: [() => !environment.demoMode], loadChildren: () => import('./app/pages/pages.routes') },
            { path: 'accounts', loadChildren: () => import('./app/Modules/accounts/accounts.routes') },
            { path: 'reports', loadChildren: () => import('./app/Modules/reports/reports.routes') }
        ]
    },
    { path: 'landing', canMatch: [() => !environment.demoMode], loadComponent: () => import('./app/pages/landing/landing').then((m) => m.Landing) },
    { path: 'notfound', loadComponent: () => import('./app/pages/notfound/notfound').then((m) => m.Notfound) },
    { path: 'auth', canActivate: [guestGuard], loadChildren: () => import('./app/Modules/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
