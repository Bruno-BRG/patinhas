import { error, redirect } from '@sveltejs/kit';
import { get } from './db';

/**
 * O espaço ativo: "pessoal" (só o próprio usuário) ou um grupo do qual ele faz parte.
 * Cada lançamento, conta e categoria pertence a exatamente um espaço.
 */
export type Scope =
	| { type: 'personal'; userId: string; groupId: null; groupName: null; role: null }
	| { type: 'group'; userId: string; groupId: string; groupName: string; role: 'owner' | 'member' };

export const PERSONAL_ID = 'eu';

export function personalScope(userId: string): Scope {
	return { type: 'personal', userId, groupId: null, groupName: null, role: null };
}

function membership(userId: string, groupId: string) {
	return get<{ id: string; name: string; role: 'owner' | 'member' }>(
		'SELECT g.id, g.name, m.role FROM group_members m JOIN groups g ON g.id = m.group_id WHERE m.user_id = ? AND g.id = ?',
		userId,
		groupId
	);
}

/** Usado nas páginas: um id de grupo que o usuário não tem cai no espaço pessoal. */
export async function resolveScope(userId: string, raw: string | null | undefined): Promise<Scope> {
	if (!raw || raw === PERSONAL_ID) return personalScope(userId);
	const found = await membership(userId, raw);
	if (!found) return personalScope(userId);
	return { type: 'group', userId, groupId: found.id, groupName: found.name, role: found.role };
}

/** Usado nas ações de escrita: nunca grava em um grupo do qual o usuário não faz parte. */
export async function requireScope(userId: string, raw: string | null | undefined): Promise<Scope> {
	if (!raw || raw === PERSONAL_ID) return personalScope(userId);
	const found = await membership(userId, raw);
	if (!found) error(403, 'Você não faz parte deste grupo.');
	return { type: 'group', userId, groupId: found.id, groupName: found.name, role: found.role };
}

export function requireUser(locals: App.Locals) {
	if (!locals.user) redirect(303, '/entrar');
	return locals.user;
}

/** Restrição SQL para as linhas de uma tabela (com alias opcional) visíveis no espaço. */
export function scopeSql(scope: Scope, alias: string): { sql: string; params: string[] } {
	const prefix = alias ? alias + '.' : '';
	if (scope.type === 'group') return { sql: prefix + 'group_id = ?', params: [scope.groupId] };
	return { sql: prefix + 'group_id IS NULL AND ' + prefix + 'owner_id = ?', params: [scope.userId] };
}
