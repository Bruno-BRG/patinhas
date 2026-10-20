import { fail, redirect } from '@sveltejs/kit';
import { findUserByEmail, isValidEmail, normalizeEmail, registerUser, startSession, verifyPassword } from '$lib/server/auth';
import { str } from '$lib/server/validate';
import type { Actions, PageServerLoad } from './$types';

/** Só aceita caminhos internos e nunca volta para a própria tela de entrada. */
function safeNext(value: unknown): string {
	if (typeof value !== 'string') return '/';
	if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || value.startsWith('/entrar')) return '/';
	return value;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const para = safeNext(url.searchParams.get('para'));
	if (locals.user) redirect(303, para);
	return { para };
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = normalizeEmail(form.get('email'));
		const password = String(form.get('password') ?? '');
		const user = await findUserByEmail(email);
		if (!user || !(await verifyPassword(password, user.password_hash))) {
			return fail(400, { mode: 'login' as const, email, error: 'E-mail ou senha não conferem.' });
		}
		await startSession(cookies, user.id);
		redirect(303, safeNext(str(form, 'para', 300)));
	},
	register: async ({ request, cookies }) => {
		const form = await request.formData();
		const name = str(form, 'name', 60);
		const email = normalizeEmail(form.get('email'));
		const password = String(form.get('password') ?? '');
		const base = { mode: 'register' as const, name, email };
		if (name.length < 2) return fail(400, { ...base, error: 'Informe seu nome, com pelo menos 2 letras.' });
		if (!isValidEmail(email)) return fail(400, { ...base, error: 'Informe um e-mail válido.' });
		if (password.length < 8) return fail(400, { ...base, error: 'A senha precisa ter pelo menos 8 caracteres.' });
		if (password.length > 200) return fail(400, { ...base, error: 'A senha está longa demais.' });
		if (await findUserByEmail(email)) {
			return fail(400, { ...base, error: 'Já existe uma conta com esse e-mail. Entre com a sua senha.' });
		}
		const user = await registerUser(name, email, password);
		await startSession(cookies, user.id);
		redirect(303, '/');
	}
};
