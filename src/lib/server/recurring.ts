import type { D1PreparedStatement } from '@cloudflare/workers-types';
import { all, batch, run, statement } from './db';
import { checkReferences } from './finance';
import { scopeSql, type Scope } from './scope';
import { isIsoDate, str, UserError } from './validate';
import { parseMoney } from '$lib/money';
import { addMonths, DEFAULT_TIMEZONE, todayIso } from '$lib/dates';
import type { Kind } from '$lib/types';

/** Instruções por lote: cada lote é atômico e a geração é idempotente, então um lote interrompido não duplica nada. */
const WRITE_BATCH_SIZE = 50;

export type RecurringInput = {
	kind: Kind;
	amountCents: number;
	description: string;
	notes: string;
	startOn: string;
	endOn: string | null;
	categoryId: string | null;
	accountId: string | null;
};

export type RecurringRule = {
	id: string;
	kind: Kind;
	amountCents: number;
	description: string;
	dayOfMonth: number;
	startOn: string;
	endOn: string | null;
	categoryId: string | null;
	categoryName: string | null;
	categoryIcon: string | null;
	categoryColor: string | null;
	accountId: string | null;
	accountName: string | null;
	/** Próxima data em que um lançamento será criado. Null quando a recorrência já terminou. */
	nextOn: string | null;
};

type RuleRow = Omit<RecurringRule, 'nextOn'>;

type GenerationRow = {
	id: string;
	ownerId: string;
	groupId: string | null;
	accountId: string | null;
	categoryId: string | null;
	kind: Kind;
	amountCents: number;
	description: string;
	notes: string;
	dayOfMonth: number;
	startOn: string;
	endOn: string | null;
	lastGeneratedOn: string | null;
};

export function appToday(): string {
	return todayIso(process.env.APP_TIMEZONE ?? DEFAULT_TIMEZONE);
}

function daysInMonth(month: string): number {
	const [year, monthNumber] = month.split('-').map(Number);
	return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

/** Data do lançamento dentro do mês YYYY-MM. Dia 31 em mês curto vira o último dia do mês. */
function occurrenceIn(month: string, dayOfMonth: number): string {
	const day = Math.min(dayOfMonth, daysInMonth(month));
	return month + '-' + String(day).padStart(2, '0');
}

/** Próxima data a partir de "from" (inclusive), ou null se a recorrência já terminou. */
export function nextOccurrence(rule: Pick<RecurringRule, 'startOn' | 'endOn' | 'dayOfMonth'>, from: string): string | null {
	const floor = from > rule.startOn ? from : rule.startOn;
	let month = floor.slice(0, 7);
	for (let step = 0; step < 3; step += 1) {
		const date = occurrenceIn(month, rule.dayOfMonth);
		if (date >= floor) return rule.endOn !== null && date > rule.endOn ? null : date;
		month = addMonths(month, 1);
	}
	return null;
}

/**
 * Cria os lançamentos de todas as recorrências visíveis ao usuário até hoje.
 * Cada recorrência guarda a última data gerada, então um lançamento apagado
 * manualmente não volta depois. Roda em toda requisição autenticada.
 */
export async function generateDueRecurring(userId: string, today: string): Promise<void> {
	const rules = await all<GenerationRow>(
		'SELECT r.id, r.owner_id AS ownerId, r.group_id AS groupId, r.account_id AS accountId, r.category_id AS categoryId, r.kind, r.amount_cents AS amountCents, r.description, r.notes, r.day_of_month AS dayOfMonth, r.start_on AS startOn, r.end_on AS endOn, r.last_generated_on AS lastGeneratedOn FROM recurring_rules r WHERE r.owner_id = ? OR r.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)',
		userId,
		userId
	);
	if (rules.length === 0) return;
	const todayMonth = today.slice(0, 7);
	const writes: D1PreparedStatement[] = [];
	for (const rule of rules) {
		let last = rule.lastGeneratedOn;
		if (rule.endOn !== null && last !== null && last >= rule.endOn) continue;
		let month = (last ?? rule.startOn).slice(0, 7);
		while (month <= todayMonth) {
			const date = occurrenceIn(month, rule.dayOfMonth);
			if (date > today) break;
			const inRange = date >= rule.startOn && (rule.endOn === null || date <= rule.endOn);
			if (inRange && (last === null || date > last)) {
				writes.push(
					statement(
						'INSERT OR IGNORE INTO transactions (id, owner_id, group_id, account_id, category_id, kind, amount_cents, description, occurred_on, notes, recurring_rule_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
						crypto.randomUUID(),
						rule.ownerId,
						rule.groupId,
						rule.accountId,
						rule.categoryId,
						rule.kind,
						rule.amountCents,
						rule.description,
						date,
						rule.notes,
						rule.id
					)
				);
				last = date;
			}
			month = addMonths(month, 1);
		}
		if (last !== rule.lastGeneratedOn) {
			writes.push(statement('UPDATE recurring_rules SET last_generated_on = ? WHERE id = ?', last, rule.id));
		}
	}
	for (let start = 0; start < writes.length; start += WRITE_BATCH_SIZE) {
		await batch(writes.slice(start, start + WRITE_BATCH_SIZE));
	}
}

export async function createRecurringRule(scope: Scope, userId: string, input: RecurringInput): Promise<void> {
	await checkReferences(scope, input);
	if (input.endOn !== null && input.endOn < input.startOn) {
		throw new UserError('A data final precisa ser igual ou posterior à data do primeiro lançamento.');
	}
	await run(
		'INSERT INTO recurring_rules (id, owner_id, group_id, account_id, category_id, kind, amount_cents, description, notes, day_of_month, start_on, end_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		crypto.randomUUID(),
		userId,
		scope.type === 'group' ? scope.groupId : null,
		input.accountId,
		input.categoryId,
		input.kind,
		input.amountCents,
		input.description,
		input.notes,
		Number(input.startOn.slice(8, 10)),
		input.startOn,
		input.endOn
	);
}

export async function listRecurringRules(scope: Scope, today: string): Promise<RecurringRule[]> {
	const f = scopeSql(scope, 'r');
	const rows = await all<RuleRow>(
		[
			'SELECT r.id, r.kind, r.amount_cents AS amountCents, r.description, r.day_of_month AS dayOfMonth, r.start_on AS startOn, r.end_on AS endOn,',
			'r.category_id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon, c.color AS categoryColor,',
			'r.account_id AS accountId, a.name AS accountName',
			'FROM recurring_rules r',
			'LEFT JOIN categories c ON c.id = r.category_id',
			'LEFT JOIN accounts a ON a.id = r.account_id',
			'WHERE ' + f.sql,
			'ORDER BY r.created_at DESC, r.id'
		].join(' '),
		...f.params
	);
	return rows.map((row) => ({ ...row, nextOn: nextOccurrence(row, today) }));
}

export async function deleteRecurringRule(scope: Scope, id: string): Promise<void> {
	const f = scopeSql(scope, '');
	const result = await run('DELETE FROM recurring_rules WHERE id = ? AND ' + f.sql, id, ...f.params);
	if (result.changes === 0) throw new UserError('Recorrência não encontrada.');
}

export function parseRecurringForm(form: FormData): RecurringInput {
	const kind = str(form, 'kind');
	if (kind !== 'income' && kind !== 'expense') throw new UserError('Escolha se é receita ou despesa.');
	const amountCents = parseMoney(str(form, 'amount'));
	if (amountCents === null || amountCents <= 0) throw new UserError('Informe um valor maior que zero. Exemplo: 49,90');
	const description = str(form, 'description', 120);
	if (!description) throw new UserError('Descreva a recorrência, por exemplo "Aluguel".');
	const startOn = str(form, 'startOn');
	if (!isIsoDate(startOn)) throw new UserError('Informe a data do primeiro lançamento.');
	const endOnRaw = str(form, 'endOn');
	if (endOnRaw && !isIsoDate(endOnRaw)) throw new UserError('A data final é inválida.');
	return {
		kind,
		amountCents,
		description,
		notes: '',
		startOn,
		endOn: endOnRaw || null,
		categoryId: str(form, 'categoryId') || null,
		accountId: str(form, 'accountId') || null
	};
}
