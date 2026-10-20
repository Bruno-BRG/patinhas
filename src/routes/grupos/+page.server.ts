import { setActiveScope } from '$lib/server/active-scope';
import { actionFailure } from '$lib/server/action-result';
import {
	acceptInvite,
	cancelInvite,
	createGroup,
	declineInvite,
	deleteGroup,
	inviteToGroup,
	leaveGroup,
	listGroupDetails,
	listInvitesForEmail,
	removeMember,
	renameGroup
} from '$lib/server/groups';
import { requireUser } from '$lib/server/scope';
import { str, UserError } from '$lib/server/validate';
import type { Actions, PageServerLoad } from './$types';

function requestedName(form: FormData): string {
	const name = str(form, 'name', 40);
	if (name.length < 2) throw new UserError('Dê um nome ao grupo, com pelo menos 2 letras.');
	return name;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return {
		groups: await listGroupDetails(user.id),
		invites: await listInvitesForEmail(user.email)
	};
};

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		try {
			const id = await createGroup(user.id, requestedName(await request.formData()));
			setActiveScope(cookies, id);
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	rename: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await renameGroup(user.id, str(form, 'groupId', 64), requestedName(form));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	delete: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await deleteGroup(user.id, str(form, 'groupId', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	invite: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			const { registered } = await inviteToGroup(user.id, user.email, str(form, 'groupId', 64), str(form, 'email', 160));
			return { success: true, registered };
		} catch (error) {
			return actionFailure(error);
		}
	},
	accept: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await acceptInvite(user.id, user.email, str(form, 'inviteId', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	decline: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		await declineInvite(user.email, str(form, 'inviteId', 64));
		return { success: true };
	},
	cancelInvite: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await cancelInvite(user.id, str(form, 'groupId', 64), str(form, 'inviteId', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	leave: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await leaveGroup(user.id, str(form, 'groupId', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	remove: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await removeMember(user.id, str(form, 'groupId', 64), str(form, 'userId', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	}
};
