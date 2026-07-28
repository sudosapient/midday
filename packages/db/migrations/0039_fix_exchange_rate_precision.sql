-- Widen exchange_rates.rate from numeric(10,2) to numeric(20,10).
--
-- At scale 2 any rate below 0.005 collapses to 0.00, which silently breaks
-- every conversion out of a low-unit-value currency (USD->VND is ~0.0000395,
-- USD->IDR ~0.0000614). High-magnitude pairs such as USD->JPY (~157.2341)
-- were also being truncated to two decimals, introducing drift on every
-- converted amount.
--
-- Changing the scale requires a table rewrite and takes an ACCESS EXCLUSIVE
-- lock, but exchange_rates is a small reference table (one row per currency
-- pair), so this is fast. Existing rows keep their already-truncated values
-- and are corrected on the next rate refresh.
ALTER TABLE "exchange_rates"
  ALTER COLUMN "rate" TYPE numeric(20, 10);
