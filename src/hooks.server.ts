import type { Handle } from '@sveltejs/kit/hooks';
import { getSessionUser, purgeExpiredSessions, SESSION_COOKIE } from '$lib/server/auth';
import { appToday, generateDueRecurring } from '$lib/server/recurring';

const SIX_HOURS = 6 * 60 * 60 * 1000;
let lastPurge = 0;

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? await getSessionUser(token) : null;

	if (event.locals.user) {
		try {
			await generateDueRecurring(event.locals.user.id, appToday());
		} catch (error) {
			console.error('Falha ao gerar lançamentos recorrentes', error);
		}
	}

	if (Date.now() - lastPurge > SIX_HOURS) {
		lastPurge = Date.now();
		await purgeExpiredSessions();
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'same-origin');
	return response;
};
