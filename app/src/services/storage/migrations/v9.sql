-- Gimbo SQLite schema v9 (HE-16 — installment loan marks)
-- Adds the installment_loans table: opt-in annotations marking an installment series
-- (by installment.parentId) as a loan/financing. interestRate is deliberately not a
-- column here — it's derived/estimated from the series' real cash flow, never stored.
-- Applied incrementally on top of v8.

CREATE TABLE IF NOT EXISTS installment_loans (
  parent_id TEXT PRIMARY KEY, principal REAL NOT NULL, name TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

PRAGMA user_version = 9;
