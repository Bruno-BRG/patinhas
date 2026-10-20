import { actionFailure } from '$lib/server/action-result';
import { activeScope } from '$lib/server/active-scope';
import { createTransfer, deleteAccount, liquiditySummary, saveAccount } from '$lib/server/finance';
import { parseAccountForm, parseTransferForm } from '$lib/server/forms';
import { requireUser } from '$lib/server/scope';
import { str } from '$lib/server/validate';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = requireUser(locals);
	return { summary: await liquiditySummary(await activeScope(user.id, cookies)) };
};

export const actions: Actions = {
	save: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		try {
			await saveAccount(await activeScope(user.id, cookies), user.id, parseAccountForm(await request.formData()));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	delete: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await deleteAccount(await activeScope(user.id, cookies), str(form, 'id', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	transfer: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		try {
			await createTransfer(await activeScope(user.id, cookies), user.id, parseTransferForm(await request.formData()));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	}
};
