export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/** Data de hoje no fuso informado, no formato YYYY-MM-DD. */
export function todayIso(timeZone: string = DEFAULT_TIMEZONE): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function currentMonth(timeZone: string = DEFAULT_TIMEZONE): string {
	return todayIso(timeZone).slice(0, 7);
}

export function isMonth(value: string | null | undefined): value is string {
	return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(month: string, delta: number): string {
	const [year, monthNumber] = month.split('-').map(Number);
	const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
	return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
}

/** Intervalo [start, end) em datas ISO para um mês YYYY-MM. */
export function monthRange(month: string): { start: string; end: string } {
	return { start: month + '-01', end: addMonths(month, 1) + '-01' };
}

/** "outubro de 2026" */
export function monthLabel(month: string): string {
	const [year, monthNumber] = month.split('-').map(Number);
	return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

/** "out", "nov", ... */
export function monthShort(month: string): string {
	const [year, monthNumber] = month.split('-').map(Number);
	return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
		.format(new Date(Date.UTC(year, monthNumber - 1, 1)))
		.replace('.', '');
}

/** 2026-10-18 -> 18/10/2026 */
export function formatDateBR(iso: string): string {
	const [year, month, day] = iso.split('-');
	return day + '/' + month + '/' + year;
}
