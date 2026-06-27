-- Gimbo SQLite schema v10 (HE-19 — LOAN generation engine)
-- Adds the fields the engine needs to materialize real Transactions over time for a
-- LOAN account: principal, planned installment amount/category, start date and the
-- account debited by every generated parcela. `loan_legacy` flags HE-04/HE-06 accounts
-- migrated without these fields (see schema.ts v11->v12) — the engine skips them.
-- Applied incrementally on top of v9.

ALTER TABLE accounts ADD COLUMN loan_principal REAL;             -- loanMetadata.principal
ALTER TABLE accounts ADD COLUMN loan_installment_amount REAL;    -- loanMetadata.installmentAmount
ALTER TABLE accounts ADD COLUMN loan_category_id TEXT;           -- loanMetadata.categoryId
ALTER TABLE accounts ADD COLUMN loan_start_date TEXT;             -- loanMetadata.startDate
ALTER TABLE accounts ADD COLUMN loan_payer_account_id TEXT;       -- loanMetadata.payerAccountId
ALTER TABLE accounts ADD COLUMN loan_legacy INTEGER;              -- loanMetadata.legacy (0/1)

PRAGMA user_version = 10;
