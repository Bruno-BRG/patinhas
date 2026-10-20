ALTER TABLE accounts ADD COLUMN liquidity TEXT NOT NULL DEFAULT 'immediate' CHECK (liquidity IN ('immediate', 'short', 'invested'));
UPDATE accounts SET liquidity = 'short' WHERE kind = 'poupanca';
UPDATE accounts SET liquidity = 'invested' WHERE kind = 'investimento';
ALTER TABLE transactions ADD COLUMN transfer_id TEXT;
CREATE INDEX transactions_transfer ON transactions(transfer_id) WHERE transfer_id IS NOT NULL;
