# Public portfolio release

Published 25 October 2026 after the owner confirmed publication rights and approved the reviewed release.

- Repository: https://github.com/Shahyan360/aster-erp
- Production demo: https://aster-erp.vercel.app
- Vercel project: aster-erp
- Public sandbox settings: ASTER_DEMO_MODE=true, ASTER_API_URL=/api

The repository begins with a sanitized adaptation snapshot. Original corporate history and private backups were not uploaded. PrimeTek attribution remains intact.

GitHub quality checks passed on the initial application release. Vercel builds the same source using Node 24, npm ci and npm run build, serving dist/aster-erp/browser. Publication verification found Angular’s default SPA fallback also served HTML for unknown API paths; explicit routing now rejects /api paths before serving static assets or SPA pages.

GitHub automatic deployment is not connected. Future source changes must be deployed explicitly through Vercel or after linking the repository in the dashboard.
