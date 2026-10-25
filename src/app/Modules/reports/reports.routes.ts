import { Routes } from '@angular/router';
export default [
    {
        path: '',
        loadComponent: () => import('./reports-layout/reports-layout').then((m) => m.ReportsLayout),
        children: [
            { path: '', redirectTo: 'general-ledger', pathMatch: 'full' },
            { path: 'general-ledger', title: 'General ledger | Aster ERP', loadComponent: () => import('./all-reports/general-ledger/general-ledger').then((m) => m.GeneralLedger) },
            { path: 'trial-balance', title: 'Trial balance | Aster ERP', loadComponent: () => import('./all-reports/trial-balance/trial-balance').then((m) => m.TrialBalance) }
        ]
    }
] as Routes;
