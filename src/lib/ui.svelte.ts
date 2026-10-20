import type { Kind, Transaction } from './types';

/** Estado global de interface compartilhado entre o layout e as páginas. */
export const ui = $state({
	txOpen: false,
	txKind: 'expense' as Kind,
	txEditing: null as Transaction | null
});

export function openTransaction(options: { kind?: Kind; transaction?: Transaction | null } = {}) {
	ui.txEditing = options.transaction ?? null;
	ui.txKind = options.transaction?.kind ?? options.kind ?? 'expense';
	ui.txOpen = true;
}

export function closeTransaction() {
	ui.txOpen = false;
	ui.txEditing = null;
}
