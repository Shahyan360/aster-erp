import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
    selector: 'app-documentation',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: ` <section class="workspace-page">
        <div class="page-heading">
            <div>
                <p class="eyebrow">WORKSPACE GUIDE</p>
                <h1>Built around financial clarity.</h1>
                <p class="page-description">Aster ERP is an Angular 21 and PrimeNG finance frontend with an isolated, synthetic portfolio sandbox.</p>
            </div>
        </div>
        <div class="surface-panel" style="padding:2rem;line-height:1.9">
            <h2>Take a guided look</h2>
            <ol>
                <li>Review the <a class="text-link" routerLink="/">finance overview</a>.</li>
                <li>Browse <a class="text-link" routerLink="/accounts/payment-voucher">payment vouchers</a>, open a draft, and try the detail-row editor.</li>
                <li>Save a simulated draft or submission. These changes stay in the current browser tab.</li>
                <li>Choose a bank account in <a class="text-link" routerLink="/reports/general-ledger">General Ledger</a> and apply a date range.</li>
                <li>Check <a class="text-link" routerLink="/reports/trial-balance">Trial Balance</a>, derived from the same synthetic posted journal.</li>
                <li>Reset the samples using the demo banner.</li>
            </ol>
            <h2>What the sandbox demonstrates</h2>
            <p>Reactive voucher forms, cached reference data, detail rows, gross-up tax previews, currency conversion, filtered lists, print layouts, approval previews, audit views, signal-based reports and a balanced synthetic journal.</p>
            <h2>Boundaries</h2>
            <p>
                This is a frontend demonstration. It has no production database, banking integration or server-enforced authorization. Demo saves are simulated; a browser reload in the same tab keeps them until reset or the session closes. File
                uploads, approval actions, linked-document operations and live Trial Balance are not connected. Journal and Receipt Voucher management remain placeholders.
            </p>
            <h2>Live integration</h2>
            <p>
                Use your own backend, set demoMode to false in the public configuration, and provide its API base URL. Real authentication requires a compatible JWT login/refresh service, company and financial-year authorization, server-side
                validation, posting rules, audit persistence and file storage.
            </p>
            <h2>Implementation</h2>
            <p>
                The layout, feature routes and editor load on demand. NgRx handles authentication; signals manage view state. The demo adapter sits ahead of the real API interceptors and never forwards an unmatched demo API request to a server.
                Third-party PrimeNG template attribution remains in the repository license.
            </p>
        </div>
    </section>`
})
export class Documentation {}
