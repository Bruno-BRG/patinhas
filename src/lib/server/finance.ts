import { all, batch, get, run, statement } from './db';
import { scopeSql, type Scope } from './scope';
import { UserError } from './validate';
import { addMonths, monthRange, monthShort } from '$lib/dates';
import type { Account, Category, Kind, Liquidity } from '$lib/types';

export type TxInput = {
	kind: Kind;
	amountCents: number;
	description: string;
	occurredOn: string;
	notes: string;
	categoryId: string | null;
	accountId: string | null;
};

export type AccountInput = {
	id: string | null;
	name: string;
	kind: string;
	color: string;
	liquidity: Liquidity;
	openingBalanceCents: number;
};

export type CategoryInput = {
	id: string | null;
	name: string;
	kind: Kind;
	color: string;
	icon: string;
	monthlyBudgetCents: number | null;
};

export type TransferInput = {
	fromAccountId: string;
	toAccountId: string;
	amountCents: number;
	occurredOn: string;
	description: string;
};

export type TransactionRow = {
	id: string;
	kind: Kind;
	amountCents: number;
	description: string;
	occurredOn: string;
	notes: string;
	categoryId: string | null;
	categoryName: string | null;
	categoryColor: string | null;
	categoryIcon: string | null;
	accountId: string | null;
	accountName: string | null;
	createdByName: string;
	ownerId: string;
	transferId: string | null;
};

const groupOf = (scope: Scope) => (scope.type === 'group' ? scope.groupId : null);

export function listTransactions(scope: Scope, limit = 5000): Promise<TransactionRow[]> {
	const f = scopeSql(scope, 't');
	return all<TransactionRow>(
		[
			'SELECT t.id, t.kind, t.amount_cents AS amountCents, t.description, t.occurred_on AS occurredOn, t.notes,',
			"t.category_id AS categoryId, COALESCE(c.name, CASE WHEN t.transfer_id IS NOT NULL THEN 'Transferência' END) AS categoryName, c.color AS categoryColor, c.icon AS categoryIcon,",
			't.account_id AS accountId, a.name AS accountName, u.name AS createdByName, t.owner_id AS ownerId, t.transfer_id AS transferId',
			'FROM transactions t',
			'LEFT JOIN categories c ON c.id = t.category_id',
			'LEFT JOIN accounts a ON a.id = t.account_id',
			'JOIN users u ON u.id = t.owner_id',
			'WHERE ' + f.sql,
			'ORDER BY t.occurred_on DESC, t.created_at DESC',
			'LIMIT ?'
		].join(' '),
		...f.params,
		limit
	);
}

export function listAccounts(scope: Scope): Promise<Account[]> {
	const f = scopeSql(scope, 'a');
	return all<Account>(
		[
			'SELECT a.id, a.name, a.kind, a.color, a.liquidity, a.opening_balance_cents AS openingBalanceCents,',
			"a.opening_balance_cents + COALESCE(SUM(CASE WHEN t.kind = 'income' THEN t.amount_cents WHEN t.kind = 'expense' THEN -t.amount_cents ELSE 0 END), 0) AS balanceCents",
			'FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id',
			'WHERE ' + f.sql,
			'GROUP BY a.id ORDER BY a.name COLLATE NOCASE'
		].join(' '),
		...f.params
	);
}

export function listCategories(scope: Scope): Promise<Category[]> {
	const f = scopeSql(scope, 'c');
	return all<Category>(
		[
			'SELECT c.id, c.name, c.kind, c.color, c.icon, c.monthly_budget_cents AS monthlyBudgetCents',
			'FROM categories c WHERE ' + f.sql,
			'ORDER BY c.kind DESC, c.name COLLATE NOCASE'
		].join(' '),
		...f.params
	);
}

function categoryInScope(scope: Scope, id: string) {
	const f = scopeSql(scope, 'c');
	return get<{ kind: Kind }>('SELECT c.kind FROM categories c WHERE c.id = ? AND ' + f.sql, id, ...f.params);
}

function accountInScope(scope: Scope, id: string) {
	const f = scopeSql(scope, 'a');
	return get<{ id: string; name: string }>('SELECT a.id, a.name FROM accounts a WHERE a.id = ? AND ' + f.sql, id, ...f.params);
}

export async function checkReferences(scope: Scope, input: Pick<TxInput, 'kind' | 'categoryId' | 'accountId'>) {
	if (input.categoryId) {
		const category = await categoryInScope(scope, input.categoryId);
		if (!category) throw new UserError('A categoria escolhida não existe neste espaço.');
		if (category.kind !== input.kind) {
			const label = category.kind === 'income' ? 'receita' : 'despesa';
			throw new UserError('Essa categoria é de ' + label + '. Escolha outra ou troque o tipo do lançamento.');
		}
	}
	if (input.accountId && !(await accountInScope(scope, input.accountId))) {
		throw new UserError('A conta escolhida não existe neste espaço.');
	}
}

export async function createTransaction(scope: Scope, userId: string, input: TxInput): Promise<void> {
	await checkReferences(scope, input);
	await run(
		'INSERT INTO transactions (id, owner_id, group_id, account_id, category_id, kind, amount_cents, description, occurred_on, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		crypto.randomUUID(),
		userId,
		groupOf(scope),
		input.accountId,
		input.categoryId,
		input.kind,
		input.amountCents,
		input.description,
		input.occurredOn,
		input.notes
	);
}

/** Move dinheiro entre duas contas do mesmo espaço. Não conta como receita nem despesa. */
export async function createTransfer(scope: Scope, userId: string, input: TransferInput): Promise<void> {
	if (input.fromAccountId === input.toAccountId) throw new UserError('Origem e destino precisam ser contas diferentes.');
	const from = await accountInScope(scope, input.fromAccountId);
	const to = await accountInScope(scope, input.toAccountId);
	if (!from || !to) throw new UserError('Uma das contas não existe neste espaço.');
	const transferId = crypto.randomUUID();
	const group = groupOf(scope);
	const label = input.description || 'Transferência';
	await batch([
		statement(
			'INSERT INTO transactions (id, owner_id, group_id, account_id, category_id, kind, amount_cents, description, occurred_on, notes, transfer_id) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)',
			crypto.randomUUID(),
			userId,
			group,
			from.id,
			'expense',
			input.amountCents,
			label + ' (para ' + to.name + ')',
			input.occurredOn,
			'',
			transferId
		),
		statement(
			'INSERT INTO transactions (id, owner_id, group_id, account_id, category_id, kind, amount_cents, description, occurred_on, notes, transfer_id) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)',
			crypto.randomUUID(),
			userId,
			group,
			to.id,
			'income',
			input.amountCents,
			label + ' (de ' + from.name + ')',
			input.occurredOn,
			'',
			transferId
		)
	]);
}

export async function updateTransaction(scope: Scope, id: string, input: TxInput): Promise<void> {
	const f = scopeSql(scope, 't');
	const existing = await get<{ id: string; transferId: string | null }>(
		'SELECT t.id, t.transfer_id AS transferId FROM transactions t WHERE t.id = ? AND ' + f.sql,
		id,
		...f.params
	);
	if (!existing) throw new UserError('Lançamento não encontrado.');
	if (existing.transferId) {
		throw new UserError('Transferências não podem ser editadas aqui. Exclua e faça uma nova na página Carteiras.');
	}
	await checkReferences(scope, input);
	await run(
		"UPDATE transactions SET account_id = ?, category_id = ?, kind = ?, amount_cents = ?, description = ?, occurred_on = ?, notes = ?, updated_at = datetime('now') WHERE id = ?",
		input.accountId,
		input.categoryId,
		input.kind,
		input.amountCents,
		input.description,
		input.occurredOn,
		input.notes,
		id
	);
}

/** Apagar uma ponta de transferência apaga a outra também. */
export async function deleteTransaction(scope: Scope, id: string): Promise<void> {
	const f = scopeSql(scope, '');
	const result = await run(
		'DELETE FROM transactions WHERE ' + f.sql + ' AND (id = ? OR (transfer_id IS NOT NULL AND transfer_id = (SELECT x.transfer_id FROM transactions x WHERE x.id = ?)))',
		...f.params,
		id,
		id
	);
	if (result.changes === 0) throw new UserError('Lançamento não encontrado.');
}

export async function saveAccount(scope: Scope, userId: string, input: AccountInput): Promise<void> {
	const accountScope = scopeSql(scope, 'a');
	const nameTaken = await get<{ id: string }>(
		'SELECT a.id FROM accounts a WHERE lower(a.name) = lower(?) AND a.id <> ? AND ' + accountScope.sql,
		input.name,
		input.id ?? '',
		...accountScope.params
	);
	if (nameTaken) throw new UserError('Já existe uma conta com esse nome neste espaço.');
	if (input.id) {
		const f = scopeSql(scope, '');
		const result = await run(
			'UPDATE accounts SET name = ?, kind = ?, color = ?, liquidity = ?, opening_balance_cents = ? WHERE id = ? AND ' + f.sql,
			input.name,
			input.kind,
			input.color,
			input.liquidity,
			input.openingBalanceCents,
			input.id,
			...f.params
		);
		if (result.changes === 0) throw new UserError('Conta não encontrada.');
		return;
	}
	await run(
		'INSERT INTO accounts (id, owner_id, group_id, name, kind, color, liquidity, opening_balance_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		crypto.randomUUID(),
		userId,
		groupOf(scope),
		input.name,
		input.kind,
		input.color,
		input.liquidity,
		input.openingBalanceCents
	);
}

export async function deleteAccount(scope: Scope, id: string): Promise<void> {
	if (!(await accountInScope(scope, id))) throw new UserError('Conta não encontrada.');
	const linked = await get<{ total: number }>(
		'SELECT COUNT(*) AS total FROM transactions WHERE account_id = ? AND transfer_id IS NOT NULL',
		id
	);
	if ((linked?.total ?? 0) > 0) {
		throw new UserError('Esta conta tem transferências. Exclua essas transferências na planilha antes de apagar a conta.');
	}
	const f = scopeSql(scope, '');
	const result = await run('DELETE FROM accounts WHERE id = ? AND ' + f.sql, id, ...f.params);
	if (result.changes === 0) throw new UserError('Conta não encontrada.');
}

export async function saveCategory(scope: Scope, userId: string, input: CategoryInput): Promise<void> {
	const categoryScope = scopeSql(scope, 'c');
	const nameTaken = await get<{ id: string }>(
		'SELECT c.id FROM categories c WHERE lower(c.name) = lower(?) AND c.id <> ? AND ' + categoryScope.sql,
		input.name,
		input.id ?? '',
		...categoryScope.params
	);
	if (nameTaken) throw new UserError('Já existe uma categoria com esse nome neste espaço.');
	if (input.id) {
		const f = scopeSql(scope, '');
		const current = await get<{ kind: Kind }>('SELECT kind FROM categories WHERE id = ? AND ' + f.sql, input.id, ...f.params);
		if (!current) throw new UserError('Categoria não encontrada.');
		if (current.kind !== input.kind) {
			const mismatched = await get<{ total: number }>(
				'SELECT COUNT(*) AS total FROM transactions WHERE category_id = ? AND kind <> ?',
				input.id,
				input.kind
			);
			if ((mismatched?.total ?? 0) > 0) {
				throw new UserError('Esta categoria já tem lançamentos do outro tipo. Crie uma nova categoria em vez de trocar o tipo.');
			}
		}
		await run(
			'UPDATE categories SET name = ?, kind = ?, color = ?, icon = ?, monthly_budget_cents = ? WHERE id = ? AND ' + f.sql,
			input.name,
			input.kind,
			input.color,
			input.icon,
			input.monthlyBudgetCents,
			input.id,
			...f.params
		);
		return;
	}
	await run(
		'INSERT INTO categories (id, owner_id, group_id, name, kind, color, icon, monthly_budget_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		crypto.randomUUID(),
		userId,
		groupOf(scope),
		input.name,
		input.kind,
		input.color,
		input.icon,
		input.monthlyBudgetCents
	);
}

export async function deleteCategory(scope: Scope, id: string): Promise<void> {
	const f = scopeSql(scope, '');
	const result = await run('DELETE FROM categories WHERE id = ? AND ' + f.sql, id, ...f.params);
	if (result.changes === 0) throw new UserError('Categoria não encontrada.');
}

async function openingTotal(scope: Scope): Promise<number> {
	const f = scopeSql(scope, 'a');
	const row = await get<{ total: number }>(
		'SELECT COALESCE(SUM(a.opening_balance_cents), 0) AS total FROM accounts a WHERE ' + f.sql,
		...f.params
	);
	return row?.total ?? 0;
}

/**
 * Divide o patrimônio em contas entre disponível, reserva e investido.
 * Lançamentos sem conta entram em "disponível", então a soma sempre bate com o total.
 */
export async function liquiditySummary(scope: Scope) {
	const f = scopeSql(scope, 't');
	const accounts = await listAccounts(scope);
	const allNet =
		(
			await get<{ net: number }>(
				"SELECT COALESCE(SUM(CASE WHEN t.kind = 'income' THEN t.amount_cents ELSE -t.amount_cents END), 0) AS net FROM transactions t WHERE " + f.sql,
				...f.params
			)
		)?.net ?? 0;
	const accountNet = accounts.reduce((sum, account) => sum + (account.balanceCents - account.openingBalanceCents), 0);
	const unassignedCents = allNet - accountNet;
	const sumBy = (liquidity: Liquidity) =>
		accounts.filter((account) => account.liquidity === liquidity).reduce((sum, account) => sum + account.balanceCents, 0);
	return {
		immediateCents: sumBy('immediate') + unassignedCents,
		shortCents: sumBy('short'),
		investedCents: sumBy('invested'),
		unassignedCents,
		totalCents: accounts.reduce((sum, account) => sum + account.balanceCents, 0) + unassignedCents
	};
}

export type Dashboard = Awaited<ReturnType<typeof dashboard>>;

/** Tudo que a visão geral precisa para um mês e um espaço. Valores em centavos. */
export async function dashboard(scope: Scope, month: string) {
	const f = scopeSql(scope, 't');
	const fc = scopeSql(scope, 'c');
	const { start, end } = monthRange(month);
	const months = [-5, -4, -3, -2, -1, 0].map((delta) => addMonths(month, delta));
	const windowStart = monthRange(months[0]).start;

	// Transferências ficam fora de receitas e despesas (transfer_id IS NULL).
	const monthly = await all<{ month: string; kind: Kind; total: number }>(
		[
			'SELECT substr(t.occurred_on, 1, 7) AS month, t.kind AS kind, SUM(t.amount_cents) AS total',
			'FROM transactions t WHERE ' + f.sql + ' AND t.transfer_id IS NULL AND t.occurred_on >= ? AND t.occurred_on < ?',
			'GROUP BY month, t.kind'
		].join(' '),
		...f.params,
		windowStart,
		end
	);
	const sumFor = (rows: typeof monthly, m: string, kind: Kind) =>
		rows.find((row) => row.month === m && row.kind === kind)?.total ?? 0;

	const series = months.map((m) => ({
		month: m,
		label: monthShort(m),
		income: sumFor(monthly, m, 'income'),
		expense: sumFor(monthly, m, 'expense')
	}));

	// Para o saldo, transferências contam: elas mudam o saldo de cada conta.
	const netByMonth = await all<{ month: string; net: number }>(
		[
			"SELECT substr(t.occurred_on, 1, 7) AS month, SUM(CASE WHEN t.kind = 'income' THEN t.amount_cents ELSE -t.amount_cents END) AS net",
			'FROM transactions t WHERE ' + f.sql + ' AND t.occurred_on < ? GROUP BY month'
		].join(' '),
		...f.params,
		end
	);
	const opening = await openingTotal(scope);
	const beforeWindow = netByMonth.filter((row) => row.month < months[0]).reduce((sum, row) => sum + row.net, 0);
	let running = opening + beforeWindow;
	const balanceSeries = months.map((m) => {
		running += netByMonth.filter((row) => row.month === m).reduce((sum, row) => sum + row.net, 0);
		return { label: monthShort(m), value: running };
	});

	const allNet =
		(
			await get<{ net: number }>(
				"SELECT COALESCE(SUM(CASE WHEN t.kind = 'income' THEN t.amount_cents ELSE -t.amount_cents END), 0) AS net FROM transactions t WHERE " + f.sql,
				...f.params
			)
		)?.net ?? 0;

	const slices = (
		await all<{ name: string | null; color: string | null; icon: string | null; total: number }>(
			[
				'SELECT c.name AS name, c.color AS color, c.icon AS icon, SUM(t.amount_cents) AS total',
				'FROM transactions t LEFT JOIN categories c ON c.id = t.category_id',
				"WHERE " + f.sql + " AND t.kind = 'expense' AND t.transfer_id IS NULL AND t.occurred_on >= ? AND t.occurred_on < ?",
				'GROUP BY t.category_id ORDER BY total DESC'
			].join(' '),
			...f.params,
			start,
			end
		)
	).map((row) => ({
		name: row.name ?? 'Sem categoria',
		color: row.color ?? '#6b6b6b',
		icon: row.icon ?? '',
		value: row.total
	}));

	const budgets = await all<{ name: string; icon: string; color: string; budget: number; spent: number }>(
		[
			'SELECT c.name AS name, c.icon AS icon, c.color AS color, c.monthly_budget_cents AS budget,',
			"COALESCE((SELECT SUM(t.amount_cents) FROM transactions t WHERE t.category_id = c.id AND t.kind = 'expense' AND t.transfer_id IS NULL AND t.occurred_on >= ? AND t.occurred_on < ?), 0) AS spent",
			"FROM categories c WHERE c.kind = 'expense' AND c.monthly_budget_cents IS NOT NULL AND " + fc.sql,
			'ORDER BY c.name COLLATE NOCASE'
		].join(' '),
		start,
		end,
		...fc.params
	);

	const incomeCents = sumFor(monthly, month, 'income');
	const expenseCents = sumFor(monthly, month, 'expense');

	return {
		month,
		totals: {
			incomeCents,
			expenseCents,
			netCents: incomeCents - expenseCents,
			balanceCents: opening + allNet
		},
		liquidity: await liquiditySummary(scope),
		series,
		balanceSeries,
		slices,
		budgets,
		recent: await listTransactions(scope, 6)
	};
}
