# Financial workflows and accuracy boundaries

## Existing payment contract

The frontend uses POST /Voucher for creation, PUT /Voucher/{id} for updates,
DELETE /Voucher/{id} for deletion and POST /Voucher/{id}/reverse for reversal.
Number generation, list queries and printable reports retain their existing
service contracts. Real numbering/concurrency, accounting authorization,
posting, tax law and audit durability belong to the backend.

The sandbox implements a subset explicitly:
- Draft creation/update/deletion in the browser.
- Simulated submission without journal posting.
- Posted fixture inspection and single reversal via equal counter-entries.
- Print views, read-only approval preview and a synthetic audit record.
- Explicit rejection of unknown operations, external file storage and unsupported
  attempts to edit/delete posted or submitted vouchers.

No new live approval or posting rule is implied by the simulation.

## Monetary calculations

decimal.js now performs additive amounts and withholding gross-up calculations
before conversion to the unchanged numeric API DTO. This corrects a demonstrated
binary addition issue (0.1 + 0.2) without changing the formulas.

Existing gross-up model:
- Net amount is entered after withholding.
- Gross = Net / (1 - percentage / 100).
- Withheld tax = Gross - Net.
- The pre-existing voucher summary adds net + discount + tax (+ other charges
  where that summary input is used).

For example, net 950 at 5% gives gross 1000 and withholding 50. A discount of 20
makes the existing additive voucher summary 1020. This convention is preserved,
not presented as a general accounting standard.

Multiple withholding rows remain a business-rule question: summing individual
gross-ups differs from grossing up the combined rate. The existing header and
detail code do not universally agree in that case. No formula was silently
changed to choose one interpretation. Verify the intended treatment before using
a live tax workflow. Currency division retains the existing full-precision
conversion/display-rounding behavior; backend decimal validation is essential.

## Reports

General Ledger uses the backend's summary in live mode, shows 25 entries per
page, allows account/sub-ledger/date filtering and searches only the loaded page.
Canceled/stale responses no longer overwrite the latest view. Print uses the
browser's print flow; export/share/scheduling are not advertised as implemented.

The sandbox provides opening balance, movements, closing balance and running
balance from its own balanced journal. Trial Balance uses the same journal and
checks equality of total debit and credit closing balances. Search does not
change all-account totals. The synthetic Chart of Accounts is read-only.

No real backend was available for integration tests. Tests verify client
contracts and simulated accounting invariants, not production accounting
correctness, legal tax treatment or a production approval engine. Large-dataset
backend throughput and multi-user concurrency were not benchmarked.
