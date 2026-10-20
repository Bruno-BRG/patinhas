/** Erro esperado causado por dados inválidos. As ações mostram a mensagem ao usuário. */
export class UserError extends Error {}

export function str(form: FormData, key: string, max = 200): string {
	const value = form.get(key);
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function isIsoDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
}

export function colorOr(value: string, fallback = '#8b5cf6'): string {
	return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}
