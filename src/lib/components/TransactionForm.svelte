<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Icon from './Icon.svelte';
	import { failureMessage } from '$lib/feedback';
	import { centsToInput } from '$lib/money';
	import type { Account, Category, Kind, Transaction } from '$lib/types';

	let {
		categories,
		accounts,
		today,
		transaction = null,
		kind = 'expense',
		onsaved,
		oncancel
	}: {
		categories: Category[];
		accounts: Account[];
		today: string;
		transaction?: Transaction | null;
		kind?: Kind;
		onsaved: () => void;
		oncancel: () => void;
	} = $props();

	// O modal é remontado a cada abertura: estes valores iniciais valem para toda a edição.
	const initial = untrack(() => ({
		id: transaction?.id ?? null,
		kind: transaction?.kind ?? kind,
		amount: transaction ? centsToInput(transaction.amountCents) : '',
		description: transaction?.description ?? '',
		occurredOn: transaction?.occurredOn ?? today,
		categoryId: transaction?.categoryId ?? null,
		accountId: transaction?.accountId ?? '',
		notes: transaction?.notes ?? ''
	}));

	const editing = initial.id !== null;

	let currentKind = $state<Kind>(initial.kind);
	let amount = $state(initial.amount);
	let description = $state(initial.description);
	let occurredOn = $state(initial.occurredOn);
	let categoryId = $state<string | null>(initial.categoryId);
	let accountId = $state(initial.accountId);
	let notes = $state(initial.notes);
	let saving = $state(false);
	let error = $state('');

	const available = $derived(categories.filter((category) => category.kind === currentKind));

	function setKind(next: Kind) {
		currentKind = next;
		if (categoryId && !categories.some((category) => category.id === categoryId && category.kind === next)) {
			categoryId = null;
		}
	}

	function toggleCategory(id: string) {
		categoryId = categoryId === id ? null : id;
	}
</script>

<form
	class="tx-form"
	method="POST"
	action={editing ? '/lancamentos?/update' : '/lancamentos?/create'}
	use:enhance={() => {
		saving = true;
		error = '';
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') {
				await update({ reset: false });
				onsaved();
			} else if (result.type === 'failure') {
				error = failureMessage(result);
			} else {
				await update();
			}
		};
	}}
>
	{#if editing}
		<input type="hidden" name="id" value={initial.id} />
	{/if}
	<input type="hidden" name="kind" value={currentKind} />
	<input type="hidden" name="categoryId" value={categoryId ?? ''} />

	<div class="kind-toggle" role="group" aria-label="Tipo de lançamento">
		<button type="button" class="is-expense" aria-pressed={currentKind === 'expense'} onclick={() => setKind('expense')}>
			<Icon name="down" size={16} /> Despesa
		</button>
		<button type="button" class="is-income" aria-pressed={currentKind === 'income'} onclick={() => setKind('income')}>
			<Icon name="up" size={16} /> Receita
		</button>
	</div>

	<label class="field">
		<span class="label">Valor</span>
		<span class="amount-box" class:is-income={currentKind === 'income'} class:is-expense={currentKind === 'expense'}>
			<span class="currency">R$</span>
			<input name="amount" inputmode="decimal" autocomplete="off" placeholder="0,00" bind:value={amount} required />
		</span>
	</label>

	<label class="field">
		<span class="label">Descrição</span>
		<input class="input" name="description" maxlength="120" placeholder="Ex.: Mercado da semana" autocomplete="off" bind:value={description} required />
	</label>

	<div class="field">
		<span class="label">Categoria</span>
		{#if available.length > 0}
			<div class="cat-grid">
				{#each available as category (category.id)}
					<button
						type="button"
						class="cat-chip"
						style:--cat={category.color}
						aria-pressed={categoryId === category.id}
						onclick={() => toggleCategory(category.id)}
					>
						<span class="cat-icon" aria-hidden="true">{category.icon}</span>
						{category.name}
					</button>
				{/each}
			</div>
		{:else}
			<p class="hint">
				Ainda não há categorias de {currentKind === 'income' ? 'receita' : 'despesa'}. Crie uma na página Categorias.
			</p>
		{/if}
	</div>

	<div class="row2">
		<label class="field">
			<span class="label">Data</span>
			<input class="input" type="date" name="occurredOn" bind:value={occurredOn} required />
		</label>
		<label class="field">
			<span class="label">Conta ou carteira</span>
			<select class="select" name="accountId" bind:value={accountId}>
				<option value="">Sem conta definida</option>
				{#each accounts as account (account.id)}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="field">
		<span class="label">Observação <span class="optional">(opcional)</span></span>
		<textarea class="textarea" name="notes" rows="2" maxlength="500" placeholder="Detalhes, parcelas, quem pagou…" bind:value={notes}></textarea>
	</label>

	{#if !editing}
		<label class="repeat">
			<input type="checkbox" name="repeat" />
			<span>
				<strong>Repetir todo mês</strong>
				<small>Cria uma recorrência que se repete no mesmo dia, até você excluí-la na página Recorrentes.</small>
			</span>
		</label>
	{/if}

	{#if error}
		<p class="form-error" role="alert">{error}</p>
	{/if}

	<div class="actions">
		<button type="button" class="btn btn-ghost" onclick={oncancel}>Cancelar</button>
		<button type="submit" class="btn btn-primary" disabled={saving}>
			{#if saving}Salvando…{:else if editing}Salvar alterações{:else}Adicionar lançamento{/if}
		</button>
	</div>
</form>

<style>
	.tx-form {
		display: grid;
		gap: 1.1rem;
	}

	.kind-toggle {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.35rem;
		padding: 0.3rem;
		border-radius: 16px;
		background: var(--bg);
		border: 1px solid var(--border);
	}

	.kind-toggle button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		height: 2.6rem;
		border: 0;
		border-radius: 12px;
		background: transparent;
		color: var(--muted);
		font-weight: 700;
		transition: background 0.2s, color 0.2s, box-shadow 0.2s;
	}

	.kind-toggle button[aria-pressed='true'].is-expense {
		background: var(--surface-strong);
		color: var(--expense);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.kind-toggle button[aria-pressed='true'].is-income {
		background: var(--surface-strong);
		color: var(--income);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.field {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.4rem;
	}

	.label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted);
	}

	.optional {
		font-weight: 500;
		opacity: 0.7;
	}

	.amount-box {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		height: 4.2rem;
		padding: 0 1.1rem;
		border-radius: 18px;
		border: 1px solid var(--border);
		background: var(--bg);
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.amount-box:focus-within {
		border-color: var(--text);
		box-shadow: 0 0 0 4px var(--surface-strong);
	}

	.currency {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--muted);
	}

	.amount-box input {
		width: 100%;
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		font-size: 2.1rem;
		font-weight: 750;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		outline: none;
	}

	.amount-box.is-income input {
		color: var(--income);
	}

	.amount-box.is-expense input {
		color: var(--expense);
	}

	.cat-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.cat-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 2.1rem;
		padding: 0 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text);
		font-size: 0.84rem;
		font-weight: 600;
		transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
	}

	.cat-chip:hover {
		border-color: color-mix(in srgb, var(--cat) 60%, transparent);
	}

	.cat-chip[aria-pressed='true'] {
		background: color-mix(in srgb, var(--cat) 22%, transparent);
		border-color: color-mix(in srgb, var(--cat) 70%, transparent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--cat) 18%, transparent);
	}

	.cat-icon {
		font-size: 0.95rem;
		line-height: 1;
	}

	.hint {
		margin: 0;
		color: var(--muted);
		font-size: 0.86rem;
	}

	.row2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.9rem;
	}

	.form-error {
		margin: 0;
		padding: 0.7rem 0.9rem;
		border-radius: 12px;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text);
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.3rem;
	}

	@media (max-width: 520px) {
		.row2 {
			grid-template-columns: 1fr;
		}
	}

	.repeat {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		padding: 0.8rem 0.9rem;
		border-radius: 14px;
		border: 1px solid var(--border);
		background: rgba(255, 255, 255, 0.02);
		cursor: pointer;
	}

	.repeat input {
		margin-top: 0.2rem;
		width: 1.05rem;
		height: 1.05rem;
		accent-color: var(--text);
	}

	.repeat span {
		display: grid;
		gap: 0.15rem;
		font-size: 0.9rem;
	}

	.repeat small {
		color: var(--muted);
		font-size: 0.78rem;
	}
</style>
