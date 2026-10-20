CREATE TABLE users (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE groups (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE group_members (
	group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
	joined_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_members_user ON group_members(user_id);

CREATE TABLE group_invites (
	id TEXT PRIMARY KEY,
	group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
	email TEXT NOT NULL,
	invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE (group_id, email)
);
CREATE INDEX group_invites_email ON group_invites(email);

CREATE TABLE accounts (
	id TEXT PRIMARY KEY,
	owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	kind TEXT NOT NULL,
	color TEXT NOT NULL,
	opening_balance_cents INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX accounts_scope ON accounts(group_id, owner_id);

CREATE TABLE categories (
	id TEXT PRIMARY KEY,
	owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
	color TEXT NOT NULL,
	icon TEXT NOT NULL DEFAULT '🏷️',
	monthly_budget_cents INTEGER,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX categories_scope ON categories(group_id, owner_id);

CREATE TABLE transactions (
	id TEXT PRIMARY KEY,
	owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
	account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
	category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
	kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
	amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
	description TEXT NOT NULL,
	occurred_on TEXT NOT NULL,
	notes TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX transactions_group_date ON transactions(group_id, occurred_on);
CREATE INDEX transactions_owner_date ON transactions(owner_id, occurred_on);
CREATE INDEX transactions_category ON transactions(category_id);
