import type { D1PreparedStatement } from '@cloudflare/workers-types';
import { statement } from './db';

export const DEFAULT_CATEGORIES = [
	{ name: 'Salário', kind: 'income', color: '#34d399', icon: '💼' },
	{ name: 'Freelances', kind: 'income', color: '#22d3ee', icon: '🧑‍💻' },
	{ name: 'Investimentos', kind: 'income', color: '#a3e635', icon: '📈' },
	{ name: 'Outras receitas', kind: 'income', color: '#86efac', icon: '✨' },
	{ name: 'Moradia', kind: 'expense', color: '#fb7185', icon: '🏠' },
	{ name: 'Mercado', kind: 'expense', color: '#f59e0b', icon: '🛒' },
	{ name: 'Alimentação', kind: 'expense', color: '#f97316', icon: '🍽️' },
	{ name: 'Transporte', kind: 'expense', color: '#38bdf8', icon: '🚗' },
	{ name: 'Contas e assinaturas', kind: 'expense', color: '#60a5fa', icon: '🧾' },
	{ name: 'Saúde', kind: 'expense', color: '#a78bfa', icon: '💊' },
	{ name: 'Lazer', kind: 'expense', color: '#ec4899', icon: '🎉' },
	{ name: 'Educação', kind: 'expense', color: '#2dd4bf', icon: '📚' },
	{ name: 'Compras', kind: 'expense', color: '#c084fc', icon: '🛍️' },
	{ name: 'Outros', kind: 'expense', color: '#94a3b8', icon: '📦' }
];

/** Instruções que criam as categorias iniciais de um espaço. Devem entrar em um batch() junto da criação do dono. */
export function seedDefaultStatements(ownerId: string, groupId: string | null): D1PreparedStatement[] {
	return DEFAULT_CATEGORIES.map((category) =>
		statement(
			'INSERT INTO categories (id, owner_id, group_id, name, kind, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
			crypto.randomUUID(),
			ownerId,
			groupId,
			category.name,
			category.kind,
			category.color,
			category.icon
		)
	);
}
