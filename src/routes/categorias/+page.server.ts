import { actionFailure } from '$lib/server/action-result';
import { activeScope } from '$lib/server/active-scope';
import { deleteCategory, saveCategory } from '$lib/server/finance';
import { parseCategoryForm } from '$lib/server/forms';
import { requireUser } from '$lib/server/scope';
import { str } from '$lib/server/validate';
import type { Actions } from './$types';

export const actions: Actions = {
	save: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		try {
			await saveCategory(await activeScope(user.id, cookies), user.id, parseCategoryForm(await request.formData()));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	delete: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await deleteCategory(await activeScope(user.id, cookies), str(form, 'id', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	}
};
