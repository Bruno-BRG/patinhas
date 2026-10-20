<script lang="ts">
	import type { Transaction, Account, Category } from '$lib/types';
	import { formatBRL } from '$lib/money';
	import { formatDateBR } from '$lib/dates';
	import { buildCsv, downloadCsv } from '$lib/csv';

	type SortKey = 'date' | 'description' | 'category' | 'account' | 'amount';
	type SortDir = 'asc' | 'desc';
	type KindFilter = 'all' | 'income' | 'expense';

	let {
		rows,
		accounts = [],
		categories = [],
		onedit,
		ondelete,
		filename = 'lancamentos'
	}: {
		rows: Transaction[];
		accounts?: Account[];
		categories?: Category[];
		onedit: (t: Transaction) => void;
		ondelete: (t: Transaction) => void;
		filename?: string;
	} = $props();

	let query = $state('');
	let kind = $state<KindFilter>('all');
	let categoryId = $state('');
	let accountId = $state('');
	let from = $state('');
	let to = $state('');
	let sortKey = $state<SortKey>('date');
	let sortDir = $state<SortDir>('desc');

	const kindOptions: Array<{ value: KindFilter; label: string }> = [
		{ value: 'all', label: 'Todos' },
		{ value: 'income', label: 'Receitas' },
		{ value: 'expense', label: 'Despesas' }
	];

	const headers: Array<{ key: SortKey; label: string; className: string }> = [
		{ key: 'date', label: 'Data', className: 'col-date' },
		{ key: 'description', label: 'Descrição', className: 'col-desc' },
		{ key: 'category', label: 'Categoria', className: 'col-cat' },
		{ key: 'account', label: 'Conta', className: 'col-account' },
		{ key: 'amount', label: 'Valor', className: 'col-amount right' }
	];

	const defaultDir: Record<SortKey, SortDir> = {
		date: 'desc',
		amount: 'desc',
		description: 'asc',
		category: 'asc',
		account: 'asc'
	};

	function normalize(value: string): string {
		return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
	}

	const visibleRows = $derived.by(() => {
		const needle = normalize(query.trim());
		const entries: Array<{ row: Transaction; index: number; text: string }> = [];

		rows.forEach((row, index) => {
			if (kind !== 'all' && row.kind !== kind) return;
			if (categoryId && row.categoryId !== categoryId) return;
			if (accountId && row.accountId !== accountId) return;
			if (from && row.occurredOn < from) return;
			if (to && row.occurredOn > to) return;
			if (needle) {
				const haystack = normalize(
					row.description + ' ' + (row.categoryName ?? '') + ' ' + (row.accountName ?? '') + ' ' + (row.notes ?? '')
				);
				if (!haystack.includes(needle)) return;
			}
			entries.push({ row, index, text: '' });
		});

		for (const entry of entries) {
			if (sortKey === 'description') entry.text = normalize(entry.row.description);
			else if (sortKey === 'category') entry.text = normalize(entry.row.categoryName ?? '');
			else if (sortKey === 'account') entry.text = normalize(entry.row.accountName ?? '');
		}

		const factor = sortDir === 'asc' ? 1 : -1;
		entries.sort((a, b) => {
			let diff: number;
			if (sortKey === 'date') diff = a.row.occurredOn < b.row.occurredOn ? -1 : a.row.occurredOn > b.row.occurredOn ? 1 : 0;
			else if (sortKey === 'amount') diff = a.row.amountCents - b.row.amountCents;
			else diff = a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
			return diff !== 0 ? diff * factor : a.index - b.index;
		});

		return entries.map((entry) => entry.row);
	});

	let incomeCents = $derived(visibleRows.reduce((total, row) => (row.kind === 'income' && !row.transferId ? total + row.amountCents : total), 0));
	let expenseCents = $derived(visibleRows.reduce((total, row) => (row.kind === 'expense' && !row.transferId ? total + row.amountCents : total), 0));
	let balanceCents = $derived(incomeCents - expenseCents);

	function toggleSort(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortKey = key;
			sortDir = defaultDir[key];
		}
	}

	function clearFilters() {
		query = '';
		kind = 'all';
		categoryId = '';
		accountId = '';
		from = '';
		to = '';
	}

	function exportCsv() {
		downloadCsv(filename, buildCsv(visibleRows));
	}

	function onRowClick(event: MouseEvent, transaction: Transaction) {
		if (transaction.transferId || (event.target as Element).closest('button')) return;
		onedit(transaction);
	}

	function onRowKeydown(event: KeyboardEvent, transaction: Transaction) {
		if (transaction.transferId || event.key !== 'Enter' || event.target !== event.currentTarget) return;
		event.preventDefault();
		onedit(transaction);
	}
</script>

<div class="ledger">
	<div class="toolbar">
		<input class="input search" type="search" bind:value={query} aria-label="Buscar lançamentos" placeholder="Buscar descrição, categoria, conta ou observação" />

		<div class="field kind-field">
			<span class="label">Tipo</span>
			<div class="segmented" role="group" aria-label="Filtrar por tipo">
				{#each kindOptions as option (option.value)}
					<button type="button" class:active={kind === option.value} aria-pressed={kind === option.value} onclick={() => (kind = option.value)}>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		<label class="field">
			<span class="label">Categoria</span>
			<select class="select" bind:value={categoryId}>
				<option value="">Todas as categorias</option>
				{#each categories as category (category.id)}
					<option value={category.id}>{category.name}</option>
				{/each}
			</select>
		</label>

		<label class="field">
			<span class="label">Conta</span>
			<select class="select" bind:value={accountId}>
				<option value="">Todas as contas</option>
				{#each accounts as account (account.id)}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
		</label>

		<label class="field">
			<span class="label">De</span>
			<input class="input" type="date" bind:value={from} />
		</label>

		<label class="field">
			<span class="label">Até</span>
			<input class="input" type="date" bind:value={to} />
		</label>

		<div class="toolbar-buttons">
			<button type="button" class="btn btn-ghost" onclick={clearFilters}>Limpar filtros</button>
			<button type="button" class="btn" onclick={exportCsv}>Exportar CSV</button>
		</div>
	</div>

	{#if rows.length === 0}
		<div class="empty">
			<strong>Nenhum lançamento ainda</strong>
			<span>Use o botão Novo lançamento para registrar sua primeira receita ou despesa.</span>
		</div>
	{:else}
		<p class="count muted">{visibleRows.length} {visibleRows.length === 1 ? 'lançamento' : 'lançamentos'}</p>

		{#if visibleRows.length === 0}
			<div class="empty">
				<strong>Nenhum resultado</strong>
				<span>Ajuste os filtros para ver outros lançamentos.</span>
			</div>
		{:else}
			<div class="sheet-wrap">
				<table class="sheet">
					<thead>
						<tr>
							{#each headers as header (header.key)}
								<th scope="col" class={header.className} aria-sort={sortKey === header.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
									<button type="button" class="th-btn" class:active={sortKey === header.key} onclick={() => toggleSort(header.key)}>
										<span>{header.label}</span>
										<span class="sort-arrow" class:on={sortKey === header.key} aria-hidden="true">{sortKey === header.key && sortDir === 'asc' ? '▲' : '▼'}</span>
									</button>
								</th>
							{/each}
							<th scope="col" class="col-actions" aria-label="Ações">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each visibleRows as transaction (transaction.id)}
							<tr tabindex="0" onclick={(event) => onRowClick(event, transaction)} onkeydown={(event) => onRowKeydown(event, transaction)}>
								<td class="col-date nowrap muted">{formatDateBR(transaction.occurredOn)}</td>
								<td class="col-desc">
									<span class="desc" title={transaction.description}>{transaction.description}</span>
									{#if transaction.notes}
										<span class="notes muted" title={transaction.notes}>{transaction.notes}</span>
									{/if}
								</td>
								<td class="col-cat">
									{#if transaction.categoryName}
										<span class="chip">
											{#if transaction.categoryColor}<span class="dot" style:background={transaction.categoryColor}></span>{/if}
											{#if transaction.categoryIcon}<span class="chip-icon">{transaction.categoryIcon}</span>{/if}
											<span class="chip-name">{transaction.categoryName}</span>
										</span>
									{:else}
										<span class="muted">Sem categoria</span>
									{/if}
								</td>
								<td class="col-account">
									{#if transaction.accountName}
										{transaction.accountName}
									{:else}
										<span class="muted">—</span>
									{/if}
								</td>
								<td class="col-amount right">
									<span class={transaction.kind === 'income' ? 'income num' : 'expense num'}>
										{transaction.kind === 'income' ? '+' : '−'} {formatBRL(Math.abs(transaction.amountCents))}
									</span>
								</td>
								<td class="col-actions">
									<div class="row-actions">
										{#if !transaction.transferId}
										<button type="button" class="btn btn-ghost btn-sm btn-icon" aria-label="Editar lançamento" onclick={() => onedit(transaction)}>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d="M12 20h9" />
												<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
											</svg>
										</button>
										{/if}
										<button type="button" class="btn btn-ghost btn-sm btn-icon" aria-label="Excluir lançamento" onclick={() => ondelete(transaction)}>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d="M3 6h18" />
												<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
												<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
												<path d="M10 11v6" />
												<path d="M14 11v6" />
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="6">
								<div class="totals">
									<span class="total">Receitas <strong class="income num">{formatBRL(incomeCents)}</strong></span>
									<span class="total">Despesas <strong class="expense num">{formatBRL(expenseCents)}</strong></span>
									<span class="total">Saldo <strong class={balanceCents < 0 ? 'expense num' : 'income num'}>{formatBRL(balanceCents)}</strong></span>
								</div>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
	{/if}
</div>

<style>
	.ledger { display: flex; flex-direction: column; gap: 0.9rem; }

	.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 0.75rem;
}

.toolbar > * {
	flex: 1 1 160px;
	min-width: 0;
	max-width: 240px;
}

.toolbar > .search {
	flex: 2 1 260px;
	max-width: none;
}

.toolbar > .kind-field {
	flex: 1.4 1 260px;
	max-width: none;
}

.toolbar > .toolbar-buttons {
	flex: 0 0 auto;
	max-width: none;
	margin-left: auto;
}

	.toolbar-buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.toolbar-buttons .btn { flex: 1 1 auto; }
	.count { margin: 0; font-size: 0.85rem; }
	.col-date { min-width: 104px; }
	.col-desc { min-width: 240px; }
	.col-cat { min-width: 160px; }
	.col-account { min-width: 140px; }
	.col-amount { min-width: 130px; }
	.col-actions { width: 1%; white-space: nowrap; }

	.th-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
	}

	.th-btn:hover,
	.th-btn.active { color: var(--text); }

	.sort-arrow { font-size: 0.6rem; line-height: 1; opacity: 0; transition: opacity 0.15s; }
	.sort-arrow.on { opacity: 0.85; color: var(--accent-2); }
	.nowrap { white-space: nowrap; }

	.desc,
	.notes {
		display: block;
		max-width: 280px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.desc { font-weight: 600; }
	.notes { font-size: 0.78rem; }
	.chip-icon { font-size: 0.9rem; line-height: 1; }
	.chip-name { overflow: hidden; text-overflow: ellipsis; }
	.row-actions { display: flex; justify-content: flex-end; gap: 0.25rem; }

	.totals {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.5rem 1.25rem;
	}

	.total { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.88rem; }
	.total strong { font-weight: 750; }

	tbody tr:focus-visible {
		outline: 2px solid var(--accent-2);
		outline-offset: -2px;
	}
</style>
