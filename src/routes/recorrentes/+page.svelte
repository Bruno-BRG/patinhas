<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { untrack } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { failureMessage } from '$lib/feedback';
	import { formatDateBR } from '$lib/dates';
	import { formatBRL } from '$lib/money';
	import type { Kind } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Rule = PageData['rules'][number];

	let kind = $state<Kind>('expense');
	let categoryId = $state('');
	let accountId = $state('');
	let amount = $state('');
	let description = $state('');
	let startOn = $state(untrack(() => data.today));
	let endOn = $state('');
	let saving = $state(false);
	let formError = $state('');
	let pendingDelete = $state<Rule | null>(null);
	let deleting = $state(false);
	let deleteError = $state('');

	const available = $derived(data.categories.filter((category) => category.kind === kind));
	const dayNumber = $derived(startOn.length === 10 ? Number(startOn.slice(8, 10)) : 0);
	const active = $derived(data.rules.filter((rule) => rule.nextOn !== null));
	const incomeMonthly = $derived(active.filter((rule) => rule.kind === 'income').reduce((sum, rule) => sum + rule.amountCents, 0));
	const expenseMonthly = $derived(active.filter((rule) => rule.kind === 'expense').reduce((sum, rule) => sum + rule.amountCents, 0));
	const netMonthly = $derived(incomeMonthly - expenseMonthly);

	function setKind(next: Kind) {
		kind = next;
		if (categoryId && !data.categories.some((category) => category.id === categoryId && category.kind === next)) {
			categoryId = '';
		}
	}

	function resetForm() {
		amount = '';
		description = '';
		categoryId = '';
		endOn = '';
		formError = '';
	}

	const createAction: SubmitFunction = () => {
		saving = true;
		formError = '';
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') {
				resetForm();
				await update();
			} else {
				formError = failureMessage(result);
			}
		};
	};

	const deleteAction: SubmitFunction = () => {
		deleting = true;
		deleteError = '';
		return async ({ result, update }) => {
			deleting = false;
			if (result.type === 'success') {
				pendingDelete = null;
				await update();
			} else {
				deleteError = failureMessage(result);
			}
		};
	};
</script>

<svelte:head>
	<title>Recorrentes · Finanças</title>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow">Contas que se repetem · {data.scope.name}</p>
		<h1 class="title">Recorrentes</h1>
		<p class="subtitle">Aluguel, salário, assinaturas. Cada lançamento entra sozinho no dia certo, todo mês.</p>
	</div>
</section>

<section class="kpis" aria-label="Resumo das recorrências">
	<article class="card kpi">
		<p class="eyebrow">Entradas fixas por mês</p>
		<strong class="num income">{formatBRL(incomeMonthly)}</strong>
	</article>
	<article class="card kpi">
		<p class="eyebrow">Saídas fixas por mês</p>
		<strong class="num expense">{formatBRL(expenseMonthly)}</strong>
	</article>
	<article class="card kpi">
		<p class="eyebrow">Sobra fixa por mês</p>
		<strong class="num" class:income={netMonthly >= 0} class:expense={netMonthly < 0}>{formatBRL(netMonthly)}</strong>
	</article>
</section>

<section class="layout">
	<form class="card card-pad form" method="POST" action="?/create" use:enhance={createAction}>
		<div>
			<p class="eyebrow">Nova recorrência</p>
			<h2>O que se repete?</h2>
		</div>

		<input type="hidden" name="kind" value={kind} />

		<div class="kind-toggle" role="group" aria-label="Tipo">
			<button type="button" class="is-expense" aria-pressed={kind === 'expense'} onclick={() => setKind('expense')}>
				<Icon name="down" size={16} /> Despesa
			</button>
			<button type="button" class="is-income" aria-pressed={kind === 'income'} onclick={() => setKind('income')}>
				<Icon name="up" size={16} /> Receita
			</button>
		</div>

		<label class="field">
			<span class="label">Valor mensal</span>
			<span class="amount-box" class:is-income={kind === 'income'} class:is-expense={kind === 'expense'}>
				<span class="currency">R$</span>
				<input name="amount" inputmode="decimal" autocomplete="off" placeholder="0,00" bind:value={amount} required />
			</span>
		</label>

		<label class="field">
			<span class="label">Descrição</span>
			<input class="input" name="description" maxlength="120" placeholder="Ex.: Aluguel, Netflix, Salário" autocomplete="off" bind:value={description} required />
		</label>

		<div class="row2">
			<label class="field">
				<span class="label">Categoria</span>
				<select class="select" name="categoryId" bind:value={categoryId}>
					<option value="">Sem categoria</option>
					{#each available as category (category.id)}
						<option value={category.id}>{category.icon} {category.name}</option>
					{/each}
				</select>
			</label>
			<label class="field">
				<span class="label">Conta ou carteira</span>
				<select class="select" name="accountId" bind:value={accountId}>
					<option value="">Sem conta</option>
					{#each data.accounts as account (account.id)}
						<option value={account.id}>{account.name}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="row2">
			<label class="field">
				<span class="label">Primeiro lançamento</span>
				<input class="input" type="date" name="startOn" bind:value={startOn} required />
			</label>
			<label class="field">
				<span class="label">Até <span class="optional">(opcional)</span></span>
				<input class="input" type="date" name="endOn" bind:value={endOn} />
			</label>
		</div>

		<p class="hint">
			{#if dayNumber > 0}Cai todo dia {dayNumber}.{/if}
			Em meses com menos dias (ex.: dia 31), usa o último dia do mês.
		</p>

		{#if formError}
			<p class="form-error" role="alert">{formError}</p>
		{/if}

		<button class="btn btn-primary wide" type="submit" disabled={saving}>
			{saving ? 'Salvando…' : 'Criar recorrência'}
		</button>
	</form>

	<section class="list-col">
		{#if data.rules.length === 0}
			<div class="card empty">
				<Icon name="clock" size={28} />
				<strong>Nenhuma recorrência ainda</strong>
				<p>Cadastre o aluguel, o salário ou uma assinatura. Ela aparece na planilha todo mês, sozinha.</p>
			</div>
		{:else}
			<ul class="rules">
				{#each data.rules as rule (rule.id)}
					<li class="card rule" class:ended={rule.nextOn === null} style:--cat={rule.categoryColor ?? (rule.kind === 'income' ? '#f5f5f5' : '#9a9a9a')}>
						<span class="bubble" aria-hidden="true">{rule.categoryIcon ?? (rule.kind === 'income' ? '↑' : '↓')}</span>
						<div class="rule-text">
							<strong>{rule.description}</strong>
							<small>
								Todo dia {rule.dayOfMonth}{rule.categoryName ? ' · ' + rule.categoryName : ''}{rule.accountName ? ' · ' + rule.accountName : ''}
							</small>
							<small class="next">
								{#if rule.nextOn}
									Próximo: {formatDateBR(rule.nextOn)}
								{:else}
									Encerrada{rule.endOn ? ' em ' + formatDateBR(rule.endOn) : ''}
								{/if}
							</small>
						</div>
						<span class="amount num" class:income={rule.kind === 'income'} class:expense={rule.kind === 'expense'}>
							{rule.kind === 'income' ? '+' : '−'} {formatBRL(rule.amountCents)}
							<small>por mês</small>
						</span>
						<button class="btn btn-ghost btn-sm btn-icon" type="button" aria-label="Excluir {rule.description}" onclick={() => (pendingDelete = rule)}>
							<Icon name="trash" size={15} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</section>

{#if pendingDelete}
	{@const target = pendingDelete}
	<Modal title="Excluir recorrência" onclose={() => (pendingDelete = null)}>
		<p class="muted">
			<strong class="strong">{target.description}</strong> deixa de ser criada a partir de agora.
			Os lançamentos que já foram criados continuam na planilha.
		</p>
		{#if deleteError}
			<p class="form-error" role="alert">{deleteError}</p>
		{/if}
		<form class="actions" method="POST" action="?/delete" use:enhance={deleteAction}>
			<input type="hidden" name="id" value={target.id} />
			<button type="button" class="btn btn-ghost" onclick={() => (pendingDelete = null)}>Cancelar</button>
			<button type="submit" class="btn btn-danger" disabled={deleting}>{deleting ? 'Excluindo…' : 'Excluir recorrência'}</button>
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

	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.kpi {
		display: grid;
		gap: 0.3rem;
		padding: 1.1rem 1.2rem;
	}

	.kpi p {
		margin: 0;
	}

	.kpi strong {
		font-size: 1.4rem;
		letter-spacing: -0.02em;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

	@media (min-width: 1000px) {
		.layout {
			grid-template-columns: minmax(330px, 400px) minmax(0, 1fr);
		}
	}

	.form {
		display: grid;
		gap: 1rem;
	}

	.form h2 {
		margin: 0.15rem 0 0;
		font-size: 1.2rem;
		letter-spacing: -0.02em;
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
		height: 2.5rem;
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
		min-width: 0;
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
		height: 3.8rem;
		padding: 0 1rem;
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
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--muted);
	}

	.amount-box input {
		width: 100%;
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		font-size: 1.9rem;
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

	.row2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
	}

	@media (max-width: 520px) {
		.row2 {
			grid-template-columns: 1fr;
		}
	}

	.hint {
		margin: 0;
		color: var(--muted);
		font-size: 0.82rem;
	}

	.wide {
		width: 100%;
		height: 2.8rem;
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

	.list-col {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}

	.rules {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.7rem;
	}

	.rule {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.9rem 1rem;
	}

	.rule.ended {
		opacity: 0.6;
	}

	.bubble {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--cat) 22%, transparent);
		font-size: 1.15rem;
	}

	.rule-text {
		display: grid;
		flex: 1;
		min-width: 0;
		gap: 0.1rem;
	}

	.rule-text strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rule-text small {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.rule-text .next {
		color: var(--text);
		opacity: 0.85;
	}

	.amount {
		font-weight: 750;
		white-space: nowrap;
		text-align: right;
	}

	.amount small {
		display: block;
		color: var(--muted);
		font-size: 0.7rem;
		font-weight: 600;
	}

	.empty {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
		padding: 2.5rem 1.25rem;
		text-align: center;
		color: var(--muted);
	}

	.empty strong {
		color: var(--text);
	}

	.empty p {
		margin: 0;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.4rem;
	}

	.strong {
		color: var(--text);
	}
</style>
