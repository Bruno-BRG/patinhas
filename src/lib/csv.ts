import type { Transaction } from './types';
import { formatDateBR, todayIso } from './dates';

const HEADER = 'Data;Tipo;Descrição;Categoria;Conta;Valor;Observações;Registrado por';

/** Escapa um campo: aspas duplas quando há ";", aspas, CR ou LF (aspas internas dobradas). */
function escapeField(value: string): string {
	return /[";\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}

/** Valor sem símbolo de moeda e sem separador de milhar, ex.: 1234 -> "12,34". */
function formatAmount(cents: number): string {
	return (Math.abs(cents) / 100).toFixed(2).replace('.', ',');
}

/**
 * Gera o CSV dos lançamentos com separador ";" (Excel pt-BR), CRLF e BOM UTF-8.
 * Colunas: Data;Tipo;Descrição;Categoria;Conta;Valor;Observações;Registrado por.
 */
export function buildCsv(rows: Transaction[]): string {
	const lines: string[] = [HEADER];
	for (const row of rows) {
		lines.push(
			[
				formatDateBR(row.occurredOn),
				row.transferId ? 'Transferência' : row.kind === 'income' ? 'Receita' : 'Despesa',
				row.description,
				row.categoryName ?? '',
				row.accountName ?? '',
				formatAmount(row.amountCents),
				row.notes ?? '',
				row.createdByName ?? ''
			]
				.map(escapeField)
				.join(';')
		);
	}
	return '\uFEFF' + lines.join('\r\n');
}

/** Baixa o conteúdo como arquivo .csv no navegador (nome + data ISO de hoje). */
export function downloadCsv(filename: string, content: string): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename + '-' + todayIso() + '.csv';
	anchor.rel = 'noopener';
	anchor.style.display = 'none';
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
