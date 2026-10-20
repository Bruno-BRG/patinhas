CREATE TABLE recurring_rules (
	id TEXT PRIMARY KEY,
	owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
	account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
	category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
	kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
	amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
	description TEXT NOT NULL,
	notes TEXT NOT NULL DEFAULT '',
	day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
	start_on TEXT NOT NULL,
	end_on TEXT,
	last_generated_on TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX recurring_rules_scope ON recurring_rules(group_id, owner_id);

ALTER TABLE transactions ADD COLUMN recurring_rule_id TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX transactions_recurring_once ON transactions(recurring_rule_id, occurred_on) WHERE recurring_rule_id IS NOT NULL;
