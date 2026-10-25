# Initial engineering audit — 25 October 2026

Scope: the Angular source tree, routing, NgRx auth, HTTP services, accounting
forms, reusable controls, assets, tests, dependencies and deployment settings.
This records the starting state before the portfolio engineering changes.

| Area | Evidence and action |
| --- | --- |
| Architecture | Angular 21 standalone SPA, zoneless, PrimeNG 21, Tailwind 4, SCSS, NgRx 21. No backend or SSR. Duplicate zoneless provider; production includes store devtools. Remove duplication and exclude devtools in production. |
| Routing | Accounts/reports modules lazy, but layout, dashboard, landing, documentation and print eagerly imported. Split route components and voucher editor. |
| Authentication | JWT and refresh tokens in localStorage, side effects inside reducers; guards check token presence only. Logout navigates to a nonexistent sign-in route and clears unrelated origin storage. Refresh waiters never receive a failure. Scope credentials to the configured API, bound refresh, propagate failure, fix logout, validate stored state, isolate demo storage. |
| API | Runtime API configuration defaults to /api. Menu service imports development environment directly. No global request deadline; automatic retries must not replay financial writes. |
| Financial year | Dedicated guarded selector and shared modal. UI can confirm closed years via a fallback; reject closed/inactive selections. Server must authorize year/company on every request. |
| Payment voucher | List, filters, lazy pagination, draft/submission, edit/delete/reverse, numbering, currency settings, cheque selection, attachments, approval preview, audit and print have service/UI implementations. Approval actions and linked-document tab are not implemented. Original server unavailable for verification. |
| Calculations | Gross-up tax uses net/(1-rate)-net. Multiple tax rates are grossed up separately in the header but combined on detail lines; treatment needs business confirmation. Discount is ADDED by the existing summary contract. Preserve these formulas; introduce decimal arithmetic for demonstrated 0.1+0.2 precision defects and test unchanged semantics. |
| General Ledger | Account/sub-ledger/date filters, summary and search, first 100 entries, print. No user-facing server pagination; toolbar export/share/schedule/favorite are stubs. Cancel stale loads, add pagination, expose only implemented actions. |
| Trial Balance / COA | Placeholders. Implement explicitly labeled synthetic views in demo; retain an honest live-backend limitation. Journal and receipt screens are placeholders. |
| Dashboard | Unrelated e-commerce sample widgets. Replace portfolio landing dashboard with finance overview derived from synthetic journal data. |
| Demo | None. Add an opt-in/default-public sandbox interceptor with synthetic fixtures, local simulated writes, no network fallback, separate auth namespace and visible simulation notice. |
| Security | Signup logs full form including passwords. Remove immediately. Auth interceptor currently adds tokens to every HttpClient URL. Remove credential logging and restrict to exact API origin/path. |
| UX | Consistent shell exists; missing icon-button labels, inaccessible dropdown trigger, decorative notification/profile actions, no meaningful topbar search. Improve keyboard semantics, navigation, responsive surfaces and reduced-motion behavior. |
| QA baseline | Production build passed previously: 2.16 MB initial, 418.21 kB estimated transfer, warning budget 1 MB. Existing ChromeHeadless suite: 10/14 pass, four missing-provider fixture failures. |
| Dependencies | Initial npm audit: 79 affected packages (3 low, 22 moderate, 49 high, 5 critical). Update compatible Angular 21/PrimeNG 21 patches and transitive fixes; remove unused primeclt CLI. Do not force a framework-major upgrade. |
| Ownership | User explicitly confirmed authorization in this chat. Existing third-party MIT attribution must remain. The previous sanitation step retained original repository metadata privately outside the publishable folder; do not import it into the new public repository. |

## Release criteria

Build, typecheck, focused authentication/monetary/demo tests, repaired existing
tests, browser walkthrough, responsive checks, dependency and secret scan,
synthetic-data-only screenshots, accurate limitations and reviewed staged files.
The attached prompt requires final approval of the reviewed result before upload.

## References

- [Angular interceptors](https://angular.dev/guide/http/interceptors)
- [Lazy routes](https://angular.dev/best-practices/performance/lazy-loaded-routes)
- [Change detection subtrees](https://angular.dev/best-practices/skipping-subtrees)

Implementation remains Angular 21 compatible; current documentation may also
describe defaults introduced in later Angular versions.
