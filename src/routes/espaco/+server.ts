import { redirect } from '@sveltejs/kit';
import { setActiveScope } from '$lib/server/active-scope';
import { resolveScope } from '$lib/server/scope';
import { str } from '$lib/server/validate';
import type { RequestHandler } from './$types';

/** Só aceita caminhos internos do próprio app. */
function safeNext(value: string): string {
	return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/';
}

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.user) redirect(303, '/entrar');
	const form = await request.formData();
	const scope = await resolveScope(locals.user.id, str(form, 'scope', 64));
	setActiveScope(cookies, scope.type === 'group' ? scope.groupId : 'eu');
	redirect(303, safeNext(str(form, 'next', 300)));
};
