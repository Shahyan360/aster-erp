# Contributing

Use Node 24 and npm ci. Work on a focused branch and run typecheck, lint, scan,
unit tests, production dependency audit and a production build before proposing
a change.

Use fictional companies, names and transactions. Never commit employer files,
customer data, credentials, private keys, local environment settings, uploads or
database exports. Screenshots must show only the synthetic sandbox.

Keep demo behavior isolated from live API authentication and services. Unknown
demo requests must fail closed. Do not bypass route/session requirements to make
a screen easier to show.

Financial changes require a concrete failing case, a confirmed business rule
and focused tests. Keep DTOs compatible unless a backend migration is explicitly
coordinated. Do not quietly change tax, discount, posting or approval semantics.

Preserve existing license and copyright notices. Describe contributions and
implemented capabilities accurately; a frontend sandbox is not a production
accounting backend.
