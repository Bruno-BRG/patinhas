<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { failureMessage } from '$lib/feedback';
	import { centsToInput, formatBRL } from '$lib/money';
	import type { Category, Kind } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const COLORS = ['#34d399', '#22d3ee', '#a3e635', '#8b5cf6', '#6366f1', '#f472b6', '#fb7185', '#f59e0b', '#fb923c', '#60a5fa', '#c084fc', '#94a3b8'];
	const ICONS = ['🏷️', '🛒', '🍽️', '🏠', '🚗', '💊', '🎉', '📚', '💼', '📈', '🧾', '✈️', '🐶', '👶', '💡', '🎁', '☕', '🎮', '💰', '🛠️'];

	type Draft = { id: string | null; name: string; kind: Kind; color: string; icon: string; budget: string };

	let draft = $state<Draft | null>(null);
	let pendingDelete = $state<Category | null>(null);
	let saving = $state(false);
	let deleting = $state(false);
	let error = $state('');

	const incomes = $derived(data.categories.filter((category) => category.kind === 'income'));
	const expenses = $derived(data.categories.filter((category) => category.kind === 'expense'));

	function openNew(kind: Kind) {
		draft = { id: null, name: '', kind, color: COLORS[0], icon: '🏷️', budget: '' };
		error = '';
	}

	function openEdit(category: Category) {
		draft = {
			id: category.id,
			name: category.name,
			kind: category.kind,
			color: category.color,
			icon: category.icon,
			budget: category.monthlyBudgetCents ? centsToInput(category.monthlyBudgetCents) : ''
		};
		error = '';
	}

	function setKind(kind: Kind) {
		if (draft) draft.kind = kind;
	}

	function setColor(color: string) {
		if (draft) draft.color = color;
	}

	function setIcon(icon: string) {
		if (draft) draft.icon = icon;
	}

	const saveAction: SubmitFunction = () => {
		saving = true;
		error = '';
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') {
				draft = null;
				await update();
			} else {
				error = failureMessage(result);
			}
		};
	};

	const deleteAction: SubmitFunction = () => {
		deleting = true;
		error = '';
		return async ({ result, update }) => {
			deleting = false;
			if (result.type === 'success') {
				pendingDelete = null;
				await update();
			} else {
				error = failureMessage(result);
			}
		};
	};
</script>

<svelte:head>
	<title>Categorias · Finanças</title>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow">Classificação · {data.scope.name}</p>
		<h1 class="title">Categorias</h1>
		<p class="subtitle">Organize os lançamentos e defina um orçamento mensal para as despesas que mais pesam.</p>
	</div>
</section>

<section class="columns">
	<article class="card card-pad">
		<header class="col-head">
			<div>
				<p class="eyebrow">Entradas</p>
				<h2>Receitas</h2>
			</div>
			<button class="btn btn-sm" type="button" onclick={() => openNew('income')}>
				<Icon name="plus" size={15} /> Nova
			</button>
		</header>
		{#if incomes.length === 0}
			<p class="muted empty-line">Nenhuma categoria de receita ainda.</p>
		{:else}
			<ul class="list">
				{#each incomes as category (category.id)}
					<li class="item" style:--cat={category.color}>
						<span class="bubble" aria-hidden="true">{category.icon}</span>
						<div class="item-text">
							<strong>{category.name}</strong>
							<small>Receita</small>
						</div>
						<div class="item-actions">
							<button class="btn btn-ghost btn-sm btn-icon" type="button" aria-label="Editar {category.name}" onclick={() => openEdit(category)}>
								<Icon name="edit" size={15} />
							</button>
							<button
								class="btn btn-ghost btn-sm btn-icon"
								type="button"
								aria-label="Excluir {category.name}"
								onclick={() => {
									pendingDelete = category;
									error = '';
								}}
							>
								<Icon name="trash" size={15} />
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</article>

	<article class="card card-pad">
		<header class="col-head">
			<div>
				<p class="eyebrow">Saídas</p>
				<h2>Despesas</h2>
			</div>
			<button class="btn btn-sm" type="button" onclick={() => openNew('expense')}>
				<Icon name="plus" size={15} /> Nova
			</button>
		</header>
		{#if expenses.length === 0}
			<p class="muted empty-line">Nenhuma categoria de despesa ainda.</p>
		{:else}
			<ul class="list">
				{#each expenses as category (category.id)}
					<li class="item" style:--cat={category.color}>
						<span class="bubble" aria-hidden="true">{category.icon}</span>
						<div class="item-text">
							<strong>{category.name}</strong>
							<small>
								{#if category.monthlyBudgetCents}
									Orçamento de {formatBRL(category.monthlyBudgetCents)} por mês
								{:else}
									Sem orçamento definido
								{/if}
							</small>
						</div>
						<div class="item-actions">
							<button class="btn btn-ghost btn-sm btn-icon" type="button" aria-label="Editar {category.name}" onclick={() => openEdit(category)}>
								<Icon name="edit" size={15} />
							</button>
							<button
								class="btn btn-ghost btn-sm btn-icon"
								type="button"
								aria-label="Excluir {category.name}"
								onclick={() => {
									pendingDelete = category;
									error = '';
								}}
							>
								<Icon name="trash" size={15} />
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</article>
</section>

{#if draft}
	{@const current = draft}
	<Modal title={current.id ? 'Editar categoria' : 'Nova categoria'} onclose={() => (draft = null)}>
		<form class="form" method="POST" action="?/save" use:enhance={saveAction}>
			<input type="hidden" name="id" value={current.id ?? ''} />
			<input type="hidden" name="kind" value={current.kind} />
			<input type="hidden" name="color" value={current.color} />
			<input type="hidden" name="icon" value={current.icon} />

			<div class="segmented kind" role="group" aria-label="Tipo da categoria">
				<button type="button" aria-pressed={current.kind === 'income'} class:active={current.kind === 'income'} onclick={() => setKind('income')}>
					Receita
				</button>
				<button type="button" aria-pressed={current.kind === 'expense'} class:active={current.kind === 'expense'} onclick={() => setKind('expense')}>
					Despesa
				</button>
			</div>

			<label class="field">
				<span class="label">Nome</span>
				<input class="input" name="name" maxlength="40" required placeholder="Ex.: Academia" bind:value={current.name} />
			</label>

			<div class="field">
				<span class="label">Ícone</span>
				<div class="icons">
					{#each ICONS as icon (icon)}
						<button
							type="button"
							class="icon-pick"
							aria-label={'Ícone ' + icon}
							aria-pressed={current.icon === icon}
							onclick={() => setIcon(icon)}
						>
							{icon}
						</button>
					{/each}
				</div>
			</div>

			<div class="field">
				<span class="label">Cor</span>
				<div class="swatches">
					{#each COLORS as swatch (swatch)}
						<button
							type="button"
							class="swatch"
							style:--sw={swatch}
							aria-label={'Cor ' + swatch}
							aria-pressed={current.color === swatch}
							onclick={() => setColor(swatch)}
						></button>
					{/each}
				</div>
			</div>

			{#if current.kind === 'expense'}
				<label class="field">
					<span class="label">Orçamento mensal <span class="hint">(opcional)</span></span>
					<input class="input" name="monthlyBudget" inputmode="decimal" placeholder="Ex.: 800,00" bind:value={current.budget} />
				</label>
			{/if}

			{#if error}
				<p class="form-error" role="alert">{error}</p>
			{/if}

			<div class="actions">
				<button type="button" class="btn btn-ghost" onclick={() => (draft = null)}>Cancelar</button>
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar categoria'}</button>
			</div>
		</form>
	</Modal>
{/if}

{#if pendingDelete}
	{@const target = pendingDelete}
	<Modal title="Excluir categoria" onclose={() => (pendingDelete = null)}>
		<p class="muted">
			A categoria <strong class="strong">{target.name}</strong> será removida. Os lançamentos dela continuam na planilha, sem categoria.
		</p>
		{#if error}
			<p class="form-error" role="alert">{error}</p>
		{/if}
		<form class="actions" method="POST" action="?/delete" use:enhance={deleteAction}>
			<input type="hidden" name="id" value={target.id} />
			<button type="button" class="btn btn-ghost" onclick={() => (pendingDelete = null)}>Cancelar</button>
			<button type="submit" class="btn btn-danger" disabled={deleting}>{deleting ? 'Excluindo…' : 'Excluir categoria'}</button>
		</form>
	</Modal>
{/if}

<style>
	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}

	@media (min-width: 900px) {
		.columns {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.col-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.9rem;
	}

	.col-head h2 {
		margin: 0.15rem 0 0;
		font-size: 1.1rem;
		letter-spacing: -0.02em;
	}

	.empty-line {
		margin: 0.5rem 0 0;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.55rem 0.5rem;
		border-radius: 15px;
		transition: background 0.15s;
	}

	.item:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.bubble {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 13px;
		background: color-mix(in srgb, var(--cat) 22%, transparent);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cat) 40%, transparent);
		font-size: 1.1rem;
	}

	.item-text {
		display: grid;
		flex: 1;
		min-width: 0;
	}

	.item-text small {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.item-actions {
		display: flex;
		gap: 0.15rem;
	}

	.form {
		display: grid;
		gap: 0.95rem;
	}

	.kind {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.kind button {
		justify-content: center;
	}

	.field {
		display: grid;
		gap: 0.4rem;
	}

	.label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted);
	}

	.hint {
		font-weight: 500;
		opacity: 0.7;
	}

	.icons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.icon-pick {
		width: 2.3rem;
		height: 2.3rem;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: rgba(255, 255, 255, 0.03);
		font-size: 1.05rem;
		transition: transform 0.12s, background 0.15s, border-color 0.15s;
	}

	.icon-pick:hover {
		transform: translateY(-1px);
	}

	.icon-pick[aria-pressed='true'] {
		background: var(--surface-strong);
		border-color: var(--text);
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.swatch {
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 999px;
		border: 2px solid transparent;
		background: var(--sw);
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
		transition: transform 0.15s;
	}

	.swatch[aria-pressed='true'] {
		border-color: #fff;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--sw) 45%, transparent);
	}

	.strong {
		color: var(--text);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.4rem;
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
</style>
