const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** Formata centavos inteiros como moeda brasileira, ex.: 123456 -> "R$ 1.234,56". */
export function formatBRL(cents: number): string {
	return currency.format(cents / 100);
}

/** Versão curta para eixos de gráficos, ex.: 1500000 -> "R$ 15 mil". */
export function formatBRLCompact(cents: number): string {
	return 'R$ ' + compact.format(cents / 100);
}

/** Converte centavos para o texto de um campo de valor, ex.: 1234 -> "12,34". */
export function centsToInput(cents: number): string {
	return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Lê um valor digitado em pt-BR ou en-US e devolve centavos.
 * Aceita "1.234,56", "1234,5", "1234.56", "1.234" e "R$ 10". Retorna null se for inválido.
 */
export function parseMoney(raw: string, options: { allowNegative?: boolean } = {}): number | null {
	let s = raw.trim().replace(/R\$/gi, '').replace(/\s/g, '');
	if (!s) return null;
	let negative = false;
	if (s.startsWith('-')) {
		if (!options.allowNegative) return null;
		negative = true;
		s = s.slice(1);
	}
	if (s.includes(',')) {
		s = s.replace(/\./g, '').replace(',', '.');
	} else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
		s = s.replace(/\./g, '');
	}
	if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
	const cents = Math.round(Number(s) * 100);
	if (!Number.isSafeInteger(cents)) return null;
	return negative ? -cents : cents;
}
