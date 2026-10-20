import type { Cookies } from '@sveltejs/kit';
import { resolveScope, type Scope } from './scope';

export const SCOPE_COOKIE = 'financas_espaco';

/** Espaço escolhido na barra lateral. Um grupo que o usuário já não integra cai no espaço pessoal. */
export function activeScope(userId: string, cookies: Cookies): Promise<Scope> {
	return resolveScope(userId, cookies.get(SCOPE_COOKIE));
}

export function setActiveScope(cookies: Cookies, scopeId: string) {
	cookies.set(SCOPE_COOKIE, scopeId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.COOKIE_SECURE === 'true',
		maxAge: 60 * 60 * 24 * 365
	});
}
