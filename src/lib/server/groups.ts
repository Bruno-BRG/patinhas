import { all, batch, get, run, statement } from './db';
import { seedDefaultStatements } from './defaults';
import { findUserByEmail, isValidEmail } from './auth';
import { UserError } from './validate';

export type Role = 'owner' | 'member';

export function listUserGroups(userId: string) {
	return all<{ id: string; name: string; role: Role }>(
		'SELECT g.id, g.name, m.role FROM group_members m JOIN groups g ON g.id = m.group_id WHERE m.user_id = ? ORDER BY g.name COLLATE NOCASE',
		userId
	);
}

export async function roleIn(userId: string, groupId: string): Promise<Role | null> {
	const row = await get<{ role: Role }>('SELECT role FROM group_members WHERE user_id = ? AND group_id = ?', userId, groupId);
	return row?.role ?? null;
}

async function requireRole(userId: string, groupId: string): Promise<Role> {
	const role = await roleIn(userId, groupId);
	if (!role) throw new UserError('Você não faz parte deste grupo.');
	return role;
}

async function requireOwner(userId: string, groupId: string) {
	if ((await requireRole(userId, groupId)) !== 'owner') throw new UserError('Só quem criou o grupo pode fazer isso.');
}

export type GroupDetails = {
	id: string;
	name: string;
	role: Role;
	members: { id: string; name: string; email: string; role: Role }[];
	invites: { id: string; email: string; invitedByName: string }[];
};

export async function listGroupDetails(userId: string): Promise<GroupDetails[]> {
	const groups = await listUserGroups(userId);
	return Promise.all(
		groups.map(async (group) => ({
			...group,
			members: await all<{ id: string; name: string; email: string; role: Role }>(
				"SELECT u.id, u.name, u.email, m.role FROM group_members m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, u.name COLLATE NOCASE",
				group.id
			),
			invites: await all<{ id: string; email: string; invitedByName: string }>(
				'SELECT i.id, i.email, u.name AS invitedByName FROM group_invites i JOIN users u ON u.id = i.invited_by WHERE i.group_id = ? ORDER BY i.created_at',
				group.id
			)
		}))
	);
}

export function listInvitesForEmail(email: string) {
	return all<{ id: string; groupId: string; groupName: string; invitedByName: string }>(
		'SELECT i.id, i.group_id AS groupId, g.name AS groupName, u.name AS invitedByName FROM group_invites i JOIN groups g ON g.id = i.group_id JOIN users u ON u.id = i.invited_by WHERE i.email = ? ORDER BY i.created_at DESC',
		email
	);
}

export async function countInvitesForEmail(email: string): Promise<number> {
	const row = await get<{ total: number }>('SELECT COUNT(*) AS total FROM group_invites WHERE email = ?', email);
	return row?.total ?? 0;
}

export async function createGroup(userId: string, name: string): Promise<string> {
	const id = crypto.randomUUID();
	await batch([
		statement('INSERT INTO groups (id, name, created_by) VALUES (?, ?, ?)', id, name, userId),
		statement("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')", id, userId),
		...seedDefaultStatements(userId, id)
	]);
	return id;
}

export async function renameGroup(userId: string, groupId: string, name: string): Promise<void> {
	await requireOwner(userId, groupId);
	await run('UPDATE groups SET name = ? WHERE id = ?', name, groupId);
}

export async function deleteGroup(userId: string, groupId: string): Promise<void> {
	await requireOwner(userId, groupId);
	await run('DELETE FROM groups WHERE id = ?', groupId);
}

export async function inviteToGroup(
	userId: string,
	userEmail: string,
	groupId: string,
	rawEmail: string
): Promise<{ registered: boolean }> {
	await requireRole(userId, groupId);
	const email = rawEmail.trim().toLowerCase();
	if (!isValidEmail(email)) throw new UserError('Informe um e-mail válido.');
	if (email === userEmail) throw new UserError('Esse é o seu próprio e-mail.');
	const invitedUser = await findUserByEmail(email);
	if (invitedUser && (await roleIn(invitedUser.id, groupId))) throw new UserError('Essa pessoa já faz parte do grupo.');
	const pending = await get<{ id: string }>('SELECT id FROM group_invites WHERE group_id = ? AND email = ?', groupId, email);
	if (pending) throw new UserError('Já existe um convite pendente para esse e-mail.');
	await run('INSERT INTO group_invites (id, group_id, email, invited_by) VALUES (?, ?, ?, ?)', crypto.randomUUID(), groupId, email, userId);
	return { registered: Boolean(invitedUser) };
}

export async function acceptInvite(userId: string, userEmail: string, inviteId: string): Promise<void> {
	const invite = await get<{ groupId: string }>(
		'SELECT group_id AS groupId FROM group_invites WHERE id = ? AND email = ?',
		inviteId,
		userEmail
	);
	if (!invite) throw new UserError('Esse convite não está mais disponível.');
	await batch([
		statement("INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')", invite.groupId, userId),
		statement('DELETE FROM group_invites WHERE id = ?', inviteId)
	]);
}

export async function declineInvite(userEmail: string, inviteId: string): Promise<void> {
	await run('DELETE FROM group_invites WHERE id = ? AND email = ?', inviteId, userEmail);
}

export async function cancelInvite(userId: string, groupId: string, inviteId: string): Promise<void> {
	const role = await requireRole(userId, groupId);
	const invite = await get<{ invitedBy: string }>(
		'SELECT invited_by AS invitedBy FROM group_invites WHERE id = ? AND group_id = ?',
		inviteId,
		groupId
	);
	if (!invite) throw new UserError('Convite não encontrado.');
	if (role !== 'owner' && invite.invitedBy !== userId) {
		throw new UserError('Só quem convidou ou o dono do grupo pode cancelar este convite.');
	}
	await run('DELETE FROM group_invites WHERE id = ?', inviteId);
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
	const role = await requireRole(userId, groupId);
	if (role === 'owner') {
		throw new UserError('Quem criou o grupo não pode sair. Exclua o grupo ou remova os outros membros.');
	}
	await run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', groupId, userId);
}

export async function removeMember(actorId: string, groupId: string, targetId: string): Promise<void> {
	await requireOwner(actorId, groupId);
	if (actorId === targetId) throw new UserError('Use "Sair do grupo" para deixar o grupo.');
	await run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', groupId, targetId);
}
