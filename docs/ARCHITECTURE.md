# Architecture

Aster ERP is an Angular 21 static browser application. There is no server
application or database schema in this repository.

## Source boundaries

```text
src/app/core       guards, API boundaries, refresh coordination, session helpers
src/app/store      NgRx authentication and router state
src/app/layout     responsive navigation, theme, shell and menu transformation
src/app/Modules    accounts, vouchers, authentication and reports
src/app/shared     reusable fields, grids, lookups, file/audit/approval services
src/app/demo       fictional fixtures, browser-only storage and HTTP adapter
public            public runtime settings and static assets
scripts           build configuration, source scan and static preview
```

## Browser request flow

In demo mode, HTTP API requests stop in the demo interceptor and receive an
explicit synthetic response or error. Unknown API operations fail with 501.
They never fall through to a backend. Unrelated static resource requests are
not intercepted as ERP API requests.

In live mode, requests go through a 30-second deadline, API-scoped JWT handling
and the loader. Only the exact configured API origin and base path receive
credentials. Authentication requests are not signed with a stale access token.
Concurrent 401 responses share one refresh operation; failures reach every
waiter; retried requests cannot re-enter an infinite refresh loop. Financial
writes are never automatically retried.

NgRx reducers are pure. Effects perform login navigation and session persistence.
Demo auth keys are prefixed independently of live auth keys. Logout clears only
the active application's authentication keys. JWT decoding in guards is for
navigation convenience; only the backend can verify a signature and authorize
access. The current live contract uses localStorage, which remains accessible
to JavaScript; moving to HttpOnly cookie sessions needs backend coordination.

A selected financial year must be active, open and structurally valid. The
server must independently authorize company/year scope for every live request.

## View state and performance

Signals/computed values derive overview totals and filter report rows. New
finance views use OnPush. The application remains zoneless. Routes, the layout,
print view, voucher list/editor and report screens load lazily. Lookup requests
are shared and cached; transactional balances are not cached.

Ledger/voucher requests cancel obsolete subscriptions before loading a new
filter/page. HTTP streams also unsubscribe when their component is destroyed.
Ledger queries page 25 rows; search is explicitly scoped to the loaded page.

Production omits NgRx devtools. Critical CSS inlining is disabled because the
strict script policy forbids its inline event handlers; styles load as ordinary
stylesheets. Default fonts are system fonts and need no remote font service.

## Simulation state

Fixtures are generated relative to the current date. Voucher edits use a
namespaced sessionStorage entry to survive refreshes in the current tab; reset
restores the samples. A print tab opened by the app receives the initiating tab's
sessionStorage snapshot. It is not a multi-user ledger or durable storage.

A computed synthetic journal includes balanced opening/receipt/invoice entries
and posted sample payments. Draft/submitted payments do not post. A reversal
adds equal counter-entries. Trial Balance and General Ledger read this same
journal. No frontend demo operation can persist into a real database.

Legacy UIKit, generic template pages and landing routes cannot match in demo mode. They remain available only when live mode is deliberately configured. Navigation requests use the signed-in user ID; logout clears session caches and development devtools redact action payloads/tokens.
