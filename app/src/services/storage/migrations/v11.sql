-- Gimbo SQLite schema v11 (HE-21 — drop installment_loans)
-- Removes the installment_loans table (HE-16): the mark was deprecated in favor of the
-- LOAN generation engine (HE-19/HE-20) before it ever shipped to real user data.
-- Applied incrementally on top of v10.

DROP TABLE IF EXISTS installment_loans;

PRAGMA user_version = 11;
