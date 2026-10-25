# Initial sanitization report

> Historical record of the first sanitation pass. The current portfolio edition
> restores a neutral .gitignore and quality workflow, adds an isolated demo, and
> updates verification results. See docs/READINESS.md and docs/CHANGES.md for
> the current release review. Publication still requires final approval.

The portfolio brand is **Aster ERP**. Changes are limited to branding, public
configuration, documentation, and repository metadata. ERP services, payloads,
authentication flows, business rules, and database structures are unchanged.
Existing uncommitted work was preserved.

## 1. Replace branding and package metadata

| Modified file | Change |
| --- | --- |
| `package.json` | Neutral npm package name: `aster-erp`. |
| `package-lock.json` | Matching root package names; existing dependency edits preserved. |
| `angular.json` | Project name, build targets, output directory; tests copy public configuration and favicon. |
| `README.md` | Portfolio overview, setup, backend configuration, and publishing guidance. |
| `src/index.html` | Browser title, local favicon, runtime settings script. |
| `src/app.config.ts` | Use renamed theme preset. |
| `src/app.routes.ts` | Print-page title. |
| `src/app/Modules/accounts/accounts.routes.ts` | Account and voucher page titles. |
| `src/app/Modules/auth/auth.routes.ts` | Login and signup page titles. |
| `src/app/Modules/reports/reports.routes.ts` | Report page titles. |
| `src/app/Modules/auth/sign-in/sign-in.html` | Welcome heading. |
| `src/app/Modules/auth/signup/signup.html` | Signup heading. |
| `src/app/Modules/accounts/payment-voucher/payment-voucher-print/payment-voucher-print.html` | Print footer credit. |
| `src/app/Modules/reports/all-reports/general-ledger/ledger-filters/ledger-filters.ts` | Employer label becomes `Example Company`; ID and filter behavior preserved. |
| `src/app/layout/component/app.sidebar.ts` | Product name and A monogram. |
| `src/app/layout/component/app.topbar.ts` | Fallback email becomes `user@example.com`. |
| `src/app/layout/component/app.footer.ts` | Neutral credit with accurate third-party attribution. |
| `src/app/layout/service/layout.service.ts` | Neutral preference key, `aster.layoutConfig`; old appearance preferences reset. |
| `src/app/layout/theme/brand-theme.ts` | Neutral comments and `AsterPreset` export; palette unchanged. |
| `src/app/pages/documentation/documentation.ts` | Product name and setup commands; remove unrelated template clone instruction. |
| `src/app/pages/financial-year/financial-year-selection.ts` | Product label. |
| `src/app/pages/landing/components/footerwidget.ts` | Landing footer brand. |
| `src/app/pages/landing/components/topbarwidget.component.ts` | Landing header brand. |

## 2. Remove repository identity and workflow files

- `.git/`: moved into a private backup outside this project. This removes the
  previous remote, local identity, authors, history, branches, hooks, and reflogs
  from the portfolio copy. Working files remain in place. Keep the backup private.
- `.gitmodules`: deleted. It referenced upstream template assets, which are
  already ordinary tracked files; the stale declaration is unnecessary.
- `.gitignore`: deleted as requested with the other Git files. Recreate a
  neutral exclusion policy using step 5 before initializing a public repository.
- `.github/workflows/`, `CODEOWNERS`, pull request templates, issue templates,
  and `.gitattributes`: none found in project sources.
- Dependency-owned GitHub files inside `node_modules` are third-party package
  contents, outside the publishable source set.
- Old `dist/` and `.angular/` output/cache directories are removed after checking
  the build, because generated copies and source maps can retain old identifiers.

## 3. Replace deployment settings and scrub sensitive data

| Modified or added file | Change |
| --- | --- |
| `src/environments/environment.ts` | Production reads shared public API configuration. |
| `src/environments/environment.development.ts` | Development reads the same API configuration. |
| `src/environments/app-settings.ts` (new) | Reads the API setting, removes trailing slashes, defaults to `/api`. |
| `public/app-config.js` (new) | Public placeholder, `window.__APP_CONFIG__.apiUrl`, default `/api`. |
| `public/favicon.svg` (new) | Local neutral A monogram. |
| `SANITIZATION.md` (new) | This inventory and publication procedure. |

The scan covered hidden project files, source, configuration, lockfile, SVG text,
and documentation. Checks included old brand and abbreviated names, known
contributor identifiers, URLs, emails, private network addresses, credential
assignments, private key headers, and common token signatures. No hardcoded
credentials or corporate email domains were found in the publishable source
after replacement; the remaining email is the example fallback. No project
`.env` or private key files were found. This pattern scan does not guarantee
the absence of every possible secret or establish the provenance of all assets.

Public dependency registry/funding URLs and Angular, TypeScript, PrimeNG,
PrimeFaces, Google Fonts, reCAPTCHA image, W3C, and Unsplash references remain.
They are third-party resources rather than employer infrastructure. Third-party
demo records and product/gallery images remain. No data was fetched from the
original backend during this work. API-supplied company names, emails, users, and
reports remain dynamic: use your own synthetic data with the replacement API.
The existing third-party notice in `LICENSE.md` is retained.

## 4. Configure a replacement backend

Edit `public/app-config.js`:

```js
window.__APP_CONFIG__ = {
    apiUrl: 'https://api.example.com/api'
};
```

Without a compatible backend, authentication and data screens cannot complete.
`/api` is a same-origin default; static hosting needs your own backend URL or an
API proxy. The existing `vercel.json` is a generic SPA rewrite, not an API proxy.
Angular does not automatically expose `.env` or `process.env` to the browser.
All browser configuration is public; keep server secrets on the backend.

## 5. Start a fresh public repository

Run these PowerShell commands from this project folder **before** `git add`.
They create a neutral exclusion policy; the original Git files are gone.

```powershell
@'
/node_modules/
/dist/
/.angular/
/out-tsc/
/coverage/
/tmp/
/.idea/
/.vscode/
/.vercel/
/.history/
.env
.env.*
!.env.example
*.local
*.log
*.pem
*.key
*.pfx
*.p12
*.zip
.DS_Store
Thumbs.db
'@ | Set-Content -LiteralPath .gitignore -Encoding utf8

git init --initial-branch=main
git add .
git diff --cached --stat
git diff --cached
```

Review the staged files. Do not include the private history backup, old build
artifacts, local environment files, or private business data. Then create a fresh
commit and connect your personal repository:

```powershell
git commit -m "Initial Aster ERP portfolio source"
git remote add origin https://github.com/YOUR_USERNAME/aster-erp.git
git push -u origin main
```

The replacement remote is a placeholder and has not been added or contacted.
No repository was created and nothing was published during this task.
Sanitization does not establish ownership or permission to publish the source.

## 6. Verification results

- Production build passed. It reports an initial-bundle warning: 2.16 MB versus
  the existing 1 MB warning budget; the 5 MB error threshold was not exceeded.
- Configuration checks passed for missing/blank settings, the default API path,
  custom URLs, trailing slash normalization, script loading order, the copied
  configuration/favicon, and the renamed build target.
- The 14 existing ChromeHeadless tests ran: 10 passed, 4 failed. The failures are
  missing test providers: `ActivatedRoute` in Signup and ReportsLayout,
  `MessageService` in GeneralLedger, and `Store` in SignIn. Tests also log a local
  API 404 because no replacement backend is running. Those test setups were not
  changed as part of this branding/configuration task.
- Final scans of publishable source and readable asset bytes found no original
  full/abbreviated company name, old deployment host, or known contributor handle.
- Unrelated existing user edits were checked against their original hashes and
  remain byte-for-byte unchanged.
- The clean source archive excludes Git history, dependencies, caches, generated
  builds, and local secrets. Recreate the exclusions in step 5 before staging it.

