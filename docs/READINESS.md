# Portfolio release review — 25 October 2026

## Scope and ownership

The product remains **Aster ERP**. The owner explicitly confirmed authorization
to publish the adapted source/assets in this chat. This does not imply sole
authorship. Upstream PrimeTek MIT attribution remains in LICENSE.md and the
portfolio README explicitly describes the project's origin and this edition's
contributions. No additional blanket license was granted to employer-origin code.

The earlier sanitation step preserved original Git metadata in a private
external backup at the owner's request. It is excluded from this new source
snapshot. The portfolio's new Git history must be described as an adapted
snapshot, not the original application's full development history.

## Completed work

- Actionable architecture, confidentiality, authentication, financial and
  dependency audit (AUDIT.md).
- Preserved Aster ERP branding, neutral fixture companies and original monogram.
- Added an isolated, clearly labeled browser demo with synthetic accounts,
  customers/suppliers, vouchers, journal and reports.
- Added a finance overview, read-only Chart of Accounts and synthetic Trial
  Balance, all derived from shared data.
- Preserved existing voucher DTOs/routes, added an optional display status,
  decimal arithmetic, duplicate-line identity reset, demo draft/submission
  simulation, draft-only edits/deletes, reversal and balanced print data.
- Added tests for journal balance, precision, print tax/discount credits,
  draft/submission non-posting, numbering, invalid values, refresh concurrency
  and failure, bounded 401 retry, demo isolation, guards and service contracts.
- Fixed logout navigation, scoped API credentials, separated demo storage,
  pure reducers/effect persistence, valid-year checks, current-user menu loading,
  session cache cleanup and sanitized development devtools state.
- Added request deadlines without automatic financial-write retries, stale
  report/list cancellation and General Ledger pagination.
- Replaced misleading UI actions, password logging, decorative account actions
  and unrelated storefront dashboard content with accurate finance experiences.
- Improved focus styles, page search, semantic account menu, button names,
  report labels, reduced-motion support and responsive surfaces.
- Split eager components/routes, excluded production devtools, removed unused
  CLI/editor dependencies and remote font requirements.
- Added environment examples, explicit public-config generation, neutral Git
  exclusions, pinned CI actions, source scanning, security headers, SPA routing,
  documentation and synthetic desktop screenshots.

## Check results

Final clean-install verification completed successfully:
- npm ci: passed; lockfile reproduced the dependency tree.
- Application and test TypeScript: passed.
- ESLint errors: none. Inherited unused declarations remain warnings and legacy any types are permitted.
- Source signature scan: passed.
- Production build: passed without warnings; 716.73 kB initial / 174.63 kB estimated transfer.
- ChromeHeadless: 58 of 58 tests passed, including current-user menu scope and balanced demo print cases.
- Runtime npm dependency audit: zero vulnerabilities.
- Full dependency audit: five moderate development-tool findings (Angular build-angular/build-webpack, webpack-dev-server, sockjs and uuid), zero high/critical. No forced framework downgrade was applied.

Static HTTP verification passed for a deep report link, normal stylesheet loading under CSP, public demo configuration, security headers, API 404 behavior and retained attribution.

The final source also contains the mobile containment, current-user menu and logout cache refinements. Mobile and tablet browser rechecks passed as described below.
The initial baseline was 2.16 MB initial / 418.21 kB estimated transfer with a
bundle warning, and 10/14 existing tests passing. The measured bundle reduction
is approximately 67% raw / 58% estimated transfer. This is a build-size
comparison, not a claim about real-world loading time or backend throughput.

## Browser evidence

Verified in the local production build at 1440px desktop width:
- Demo login and financial-year selection.
- Populated overview and six payment vouchers.
- Draft filter yields two fixtures.
- Existing draft editor loads and successfully saves a synthetic change.
- Workspace search navigates to Trial Balance.
- Trial Balance totals: debit and credit both 1,620,000.00 PKR.
- Bank General Ledger ends at 1,307,000.00 PKR and matches the overview/account
  balance. The underlying synthetic journal supplies both reports.
- No browser console warnings/errors were reported during those flows.
- Overview, voucher-list and Trial Balance screenshots contain synthetic data.

Live production verification on https://aster-erp.vercel.app passed for demo login, financial-year selection, overview and balanced Trial Balance. The 390px mobile and 768px tablet report screenshots showed contained, stacked surfaces without a page-level horizontal scrollbar.

Additional browser coverage for detail-row creation/submission, print rendering and an automated accessibility scan remains a follow-up; the underlying simulator has unit coverage. No WCAG conformance claim is made.

## Security findings and limitations

- Browser configuration contains only public mode/API settings.
- No former company identifiers, old deployment URLs or known contributor
  handles were found in the current publishable tree by the targeted rescan.
- No configured secret signatures, local environment files or private data
  exports were found by the source scan. A pattern scan cannot certify every
  possible secret or the provenance of every binary asset.
- Demo APIs terminate in the synthetic interceptor, including unknown writes.
- File uploads are disabled in the public sandbox; real document storage,
  approval actions and linked-document operations are not implemented.
- Existing live JWT storage uses localStorage. Moving to HttpOnly cookies
  requires a coordinated backend change. Guards are navigation controls only.
- Company ID 1 remains in existing report/payment requests. Real tenant scope
  must be obtained and enforced by the replacement backend.
- Multiple withholding tax rates remain an explicitly documented financial-rule
  question; the original additive discount convention remains unchanged.
- Live API integration, production accounting correctness, token revocation,
  real approval enforcement, concurrency and large-dataset backend performance
  could not be tested because no replacement backend is included.
- Retained template source and public third-party assets are not production ERP features. Legacy UIKit, generic pages and landing routes are disabled by canMatch in the public sandbox, preventing access to unrelated external upload demos.

## Publication state

Published with explicit owner approval on 25 October 2026:
- Public repository: https://github.com/Shahyan360/aster-erp
- Production demo: https://aster-erp.vercel.app
- Initial GitHub Actions quality workflow: passed.
- Vercel source deployment: READY in the personal aster-erp project.

The live hosting check identified an Angular API fallback issue. The release follow-up uses explicit routing to reject API paths before static-file and SPA resolution. The runtime is an isolated synthetic sandbox. GitHub automatic deployments are not connected; see PUBLICATION.md and DEPLOYMENT.md.
