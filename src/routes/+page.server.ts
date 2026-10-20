import { activeScope } from '$lib/server/active-scope';
import { dashboard } from '$lib/server/finance';
import { requireUser } from '$lib/server/scope';
import { currentMonth, isMonth } from '$lib/dates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const user = requireUser(locals);
	const requested = url.searchParams.get('mes');
	const month = isMonth(requested) ? requested : currentMonth();
	return { month, dashboard: await dashboard(await activeScope(user.id, cookies), month) };
};
