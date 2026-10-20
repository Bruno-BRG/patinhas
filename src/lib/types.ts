export type Kind = 'income' | 'expense';

export type ScopeOption = {
	id: string; // 'eu' para o espaço pessoal, ou o id do grupo
	name: string;
	type: 'personal' | 'group';
	role: 'owner' | 'member' | null;
};

export type Category = {
	id: string;
	name: string;
	kind: Kind;
	color: string;
	icon: string;
	monthlyBudgetCents: number | null;
};

/** Quão rápido o dinheiro pode ser usado. */
export type Liquidity = 'immediate' | 'short' | 'invested';

export const LIQUIDITY_LABELS: Record<Liquidity, string> = {
	immediate: 'Disponível agora',
	short: 'Reserva',
	invested: 'Investido'
};

export const LIQUIDITY_HELP: Record<Liquidity, string> = {
	immediate: 'Conta corrente e carteira. Dinheiro que você usa no dia a dia.',
	short: 'Poupança e renda fixa com resgate rápido. Serve de reserva.',
	invested: 'Ações, fundos e outros investimentos. O resgate pode levar dias.'
};

/** Nível sugerido ao criar uma conta, conforme o tipo. O usuário pode trocar. */
export const DEFAULT_LIQUIDITY: Record<string, Liquidity> = {
	conta: 'immediate',
	cartao: 'immediate',
	carteira: 'immediate',
	poupanca: 'short',
	investimento: 'invested'
};

export type Account = {
	id: string;
	name: string;
	kind: string;
	color: string;
	liquidity: Liquidity;
	openingBalanceCents: number;
	balanceCents: number;
};

export type Transaction = {
	id: string;
	kind: Kind;
	amountCents: number;
	description: string;
	occurredOn: string; // YYYY-MM-DD
	notes: string;
	categoryId: string | null;
	categoryName: string | null;
	categoryColor: string | null;
	categoryIcon: string | null;
	accountId: string | null;
	accountName: string | null;
	createdByName: string;
	ownerId: string;
	/** Preenchido nas duas pontas de uma transferência entre contas. */
	transferId: string | null;
};

export const ACCOUNT_KINDS: Record<string, string> = {
	conta: 'Conta bancária',
	cartao: 'Cartão de crédito',
	carteira: 'Carteira',
	poupanca: 'Poupança',
	investimento: 'Investimento'
};
