# Deployment

## Target

This is a static Angular SPA. Vercel needs Node 24, npm ci, npm run build and
output directory dist/aster-erp/browser. vercel.json specifies these settings.

The public portfolio defaults to ASTER_DEMO_MODE=true and ASTER_API_URL=/api.
No private API, database, external authentication provider or secret is needed.
The prepared settings generator rejects malformed mode values and API URLs
containing credentials, queries or fragments.

SPA rewrites exclude /api, so a missing API never returns the index page as
fake JSON. App configuration is served without caching. Security headers include
nosniff, frame denial, referrer/permissions policies and a Content Security Policy.
Inline scripts are forbidden; inline styles remain permitted for Angular/PrimeNG.
Public images required by retained template pages have explicitly listed origins.

## Live backend integration

1. Supply your own compatible backend; do not reconnect employer infrastructure.
2. Set ASTER_DEMO_MODE=false and ASTER_API_URL to its public API base.
3. Add the exact backend origin to connect-src in the CSP.
4. Permit only the deployed frontend origin in backend CORS.
5. Enforce JWT verification, token rotation/revocation, tenant/year authorization,
   monetary validation, transactional numbering/posting, approval policy, audit
   records, file access and persistence on the server.
6. Rebuild and test the real integration separately.

The backend contract resembles an existing HTTP API (including Voucher,
Ledger, ChartOfAccount, lookup, auth, financial-years, approval and attachments).
A technology-specific backend is not included, and this frontend's tests do not
establish the behavior of any server implementation.

## CI and release

The generic quality workflow uses pinned actions and read-only contents access.
It runs installation, typechecks, lint, source scan, production build, headless
tests and a runtime dependency audit. It contains no deployment credentials.
Vercel Git integration can build the production branch after publication.
A direct source deployment can also be created through the authenticated Vercel
connection. The released project and scope must be verified before either path.

Before release, review staged files, only synthetic screenshots, retained
license attribution, actual test results and the ownership confirmation.
The attached preparation prompt requires approval of the reviewed release.
Do not infer a live URL from a planned project name. Record the URL and READY
status returned by Vercel, then verify deep links, settings, headers and the
browser demo. Do not change an unrelated Vercel project.

## Local preview

npm run preview serves only the compiled SPA on 127.0.0.1:4173 with matching
security headers. It is a development aid, not an ERP backend. /api returns 404.
