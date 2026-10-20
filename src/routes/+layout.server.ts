import { redirect } from '@sveltejs/kit';
import { activeScope } from '$lib/server/active-scope';
import { listAccounts, listCategories } from '$lib/server/finance';
import { countInvitesForEmail, listUserGroups } from '$lib/server/groups';
import { DEFAULT_TIMEZONE, todayIso } from '$lib/dates';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	const today = todayIso(process.env.APP_TIMEZONE ?? DEFAULT_TIMEZONE);

	if (!locals.user) {
		if (url.pathname !== '/entrar') {
			redirect(303, '/entrar?para=' + encodeURIComponent(url.pathname + url.search));
		}
		return {
			user: null,
			scope: { id: 'eu', name: 'Meu espaço', type: 'personal' as const, role: null },
			groups: [],
			accounts: [],
			categories: [],
			invites: 0,
			today
		};
	}

	const user = locals.user;
	const scope = await activeScope(user.id, cookies);
	const [groups, accounts, categories, invites] = await Promise.all([
		listUserGroups(user.id),
		listAccounts(scope),
		listCategories(scope),
		countInvitesForEmail(user.email)
	]);
	return {
		user,
		scope: {
			id: scope.type === 'group' ? scope.groupId : 'eu',
			name: scope.type === 'group' ? scope.groupName : 'Meu espaço',
			type: scope.type,
			role: scope.role
		},
		groups,
		accounts,
		categories,
		invites,
		today
	};
};
