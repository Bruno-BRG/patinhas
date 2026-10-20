import { actionFailure } from '$lib/server/action-result';
import { activeScope } from '$lib/server/active-scope';
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from '$lib/server/finance';
import { parseTransactionForm } from '$lib/server/forms';
import { appToday, createRecurringRule, generateDueRecurring } from '$lib/server/recurring';
import { requireUser } from '$lib/server/scope';
import { str } from '$lib/server/validate';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = requireUser(locals);
	return { transactions: await listTransactions(await activeScope(user.id, cookies), 5000) };
};

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		try {
			const scope = await activeScope(user.id, cookies);
			const form = await request.formData();
			const input = parseTransactionForm(form);
			if (form.get('repeat') === 'on') {
				await createRecurringRule(scope, user.id, {
					kind: input.kind,
					amountCents: input.amountCents,
					description: input.description,
					notes: input.notes,
					startOn: input.occurredOn,
					endOn: null,
					categoryId: input.categoryId,
					accountId: input.accountId
				});
				await generateDueRecurring(user.id, appToday());
			} else {
				await createTransaction(scope, user.id, input);
			}
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	update: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await updateTransaction(await activeScope(user.id, cookies), str(form, 'id', 64), parseTransactionForm(form));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	},
	delete: async ({ request, locals, cookies }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		try {
			await deleteTransaction(await activeScope(user.id, cookies), str(form, 'id', 64));
			return { success: true };
		} catch (error) {
			return actionFailure(error);
		}
	}
};
