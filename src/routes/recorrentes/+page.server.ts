import { actionFailure } from '$lib/server/action-result';
import { activeScope } from '$lib/server/active-scope';
import { appToday, createRecurringRule, deleteRecurringRule, generateDueRecurring, listRecurringRules, parseRecurringForm } from '$lib/server/recurring';
import { requireUser } from '$lib/server/scope';
import { str } from '$lib/server/validate';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = requireUser(locals);
	return { rules: await listRecurringRules(await activeScope(user.id, cookies), appToday()) };
};

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		try {
			await createRecurringRule(await activeScope(user.id, cookies), user.id, parseRecurringForm(await request.formData()));
			await generateDueRecurring(user.id, appToday());
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	delete: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await deleteRecurringRule(await activeScope(user.id, cookies), str(form, 'id', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	}
};
