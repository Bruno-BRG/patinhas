import { parseMoney } from '$lib/money';
import { ACCOUNT_KINDS, DEFAULT_LIQUIDITY, type Liquidity } from '$lib/types';
import { colorOr, isIsoDate, str, UserError } from './validate';
import type { AccountInput, CategoryInput, TransferInput, TxInput } from './finance';

const LIQUIDITIES: string[] = ['immediate', 'short', 'invested'];

export function parseTransactionForm(form: FormData): TxInput {
	const kind = str(form, 'kind');
	if (kind !== 'income' && kind !== 'expense') throw new UserError('Escolha se o lançamento é receita ou despesa.');
	const amountCents = parseMoney(str(form, 'amount'));
	if (amountCents === null || amountCents <= 0) throw new UserError('Informe um valor maior que zero. Exemplo: 49,90');
	const description = str(form, 'description', 120);
	if (!description) throw new UserError('Descreva o lançamento, por exemplo "Mercado".');
	const occurredOn = str(form, 'occurredOn');
	if (!isIsoDate(occurredOn)) throw new UserError('Informe uma data válida.');
	return {
		kind,
		amountCents,
		description,
		occurredOn,
		notes: str(form, 'notes', 500),
		categoryId: str(form, 'categoryId') || null,
		accountId: str(form, 'accountId') || null
	};
}

export function parseAccountForm(form: FormData): AccountInput {
	const name = str(form, 'name', 60);
	if (name.length < 2) throw new UserError('Dê um nome para a conta, com pelo menos 2 letras.');
	const kind = str(form, 'kind');
	if (!(kind in ACCOUNT_KINDS)) throw new UserError('Escolha o tipo da conta.');
	const openingBalanceCents = parseMoney(str(form, 'openingBalance') || '0', { allowNegative: true });
	if (openingBalanceCents === null) throw new UserError('Saldo inicial inválido. Exemplo: 1500,00 ou -350,00');
	const liquidityRaw = str(form, 'liquidity');
	const liquidity: Liquidity = LIQUIDITIES.includes(liquidityRaw) ? (liquidityRaw as Liquidity) : DEFAULT_LIQUIDITY[kind];
	return {
		id: str(form, 'id') || null,
		name,
		kind,
		color: colorOr(str(form, 'color')),
		liquidity,
		openingBalanceCents
	};
}

export function parseTransferForm(form: FormData): TransferInput {
	const fromAccountId = str(form, 'fromAccountId', 64);
	const toAccountId = str(form, 'toAccountId', 64);
	if (!fromAccountId || !toAccountId) throw new UserError('Escolha a conta de origem e a de destino.');
	if (fromAccountId === toAccountId) throw new UserError('Origem e destino precisam ser contas diferentes.');
	const amountCents = parseMoney(str(form, 'amount'));
	if (amountCents === null || amountCents <= 0) throw new UserError('Informe um valor maior que zero. Exemplo: 1000,00');
	const occurredOn = str(form, 'occurredOn');
	if (!isIsoDate(occurredOn)) throw new UserError('Informe uma data válida.');
	return {
		fromAccountId,
		toAccountId,
		amountCents,
		occurredOn,
		description: str(form, 'description', 120)
	};
}

export function parseCategoryForm(form: FormData): CategoryInput {
	const name = str(form, 'name', 40);
	if (name.length < 2) throw new UserError('Dê um nome para a categoria, com pelo menos 2 letras.');
	const kind = str(form, 'kind');
	if (kind !== 'income' && kind !== 'expense') throw new UserError('Escolha se a categoria é de receita ou despesa.');
	const budgetRaw = str(form, 'monthlyBudget');
	let monthlyBudgetCents: number | null = null;
	if (budgetRaw && kind === 'expense') {
		const budget = parseMoney(budgetRaw);
		if (budget === null || budget <= 0) throw new UserError('Orçamento inválido. Exemplo: 800,00');
		monthlyBudgetCents = budget;
	}
	return {
		id: str(form, 'id') || null,
		name,
		kind,
		color: colorOr(str(form, 'color')),
		icon: str(form, 'icon', 8) || '🏷️',
		monthlyBudgetCents
	};
}
