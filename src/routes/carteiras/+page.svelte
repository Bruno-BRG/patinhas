<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { failureMessage } from '$lib/feedback';
	import { centsToInput, formatBRL } from '$lib/money';
	import { ACCOUNT_KINDS, DEFAULT_LIQUIDITY, LIQUIDITY_HELP, LIQUIDITY_LABELS, type Account, type Liquidity } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const COLORS = ['#8b5cf6', '#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#fb923c', '#fb7185', '#f472b6', '#c084fc', '#60a5fa', '#a3e635', '#94a3b8'];
	const KIND_ICON: Record<string, string> = {
		conta: 'wallet',
		cartao: 'layers',
		carteira: 'wallet',
		poupanca: 'target',
		investimento: 'up'
	};
	const LEVELS: Liquidity[] = ['immediate', 'short', 'invested'];

	type Draft = { id: string | null; name: string; kind: string; liquidity: Liquidity; color: string; opening: string };
	type TransferDraft = { from: string; to: string; amount: string; occurredOn: string; description: string };

	let draft = $state<Draft | null>(null);
	let transferDraft = $state<TransferDraft | null>(null);
	let pendingDelete = $state<Account | null>(null);
	let saving = $state(false);
	let deleting = $state(false);
	let transferring = $state(false);
	let error = $state('');

	const summary = $derived(data.summary);
	const sections = $derived(
		LEVELS.map((liquidity) => {
			const accounts = data.accounts.filter((account) => account.liquidity === liquidity);
			return { liquidity, accounts, subtotal: accounts.reduce((sum, account) => sum + account.balanceCents, 0) };
		}).filter((section) => section.accounts.length > 0)
	);
	const splitTotal = $derived(Math.abs(summary.immediateCents) + Math.abs(summary.shortCents) + Math.abs(summary.investedCents));

	function share(value: number): number {
		return splitTotal > 0 ? (Math.abs(value) / splitTotal) * 100 : 0;
	}

	function openNew() {
		draft = { id: null, name: '', kind: 'conta', liquidity: 'immediate', color: COLORS[1], opening: '' };
		error = '';
	}

	function openEdit(account: Account) {
		draft = {
			id: account.id,
			name: account.name,
			kind: account.kind,
			liquidity: account.liquidity,
			color: account.color,
			opening: centsToInput(account.openingBalanceCents)
		};
		error = '';
	}

	/** Trocar o tipo sugere o nível correspondente; o usuário pode mudar depois. */
	function setKind(kind: string) {
		if (!draft) return;
		draft.kind = kind;
		draft.liquidity = DEFAULT_LIQUIDITY[kind];
	}

	function pickColor(color: string) {
		if (draft) draft.color = color;
	}

	function openTransfer() {
		const [first, second] = data.accounts;
		transferDraft = {
			from: first?.id ?? '',
			to: second?.id ?? '',
			amount: '',
			occurredOn: data.today,
			description: ''
		};
		error = '';
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

	const transferAction: SubmitFunction = () => {
		transferring = true;
		error = '';
		return async ({ result, update }) => {
			transferring = false;
			if (result.type === 'success') {
				transferDraft = null;
				await update();
			} else {
				error = failureMessage(result);
			}
		};
	};
</script>

<svelte:head>
	<title>Carteiras · Finanças</title>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow">Onde o dinheiro está · {data.scope.name}</p>
		<h1 class="title">Carteiras</h1>
		<p class="subtitle">Separe o que está disponível do que está reservado ou investido. Transferências entre contas não viram receita nem despesa.</p>
	</div>
	<div class="head-actions">
		{#if data.accounts.length >= 2}
			<button class="btn" type="button" onclick={openTransfer}><Icon name="arrow" size={16} /> Transferir</button>
		{/if}
		<button class="btn btn-primary" type="button" onclick={openNew}><Icon name="plus" size={17} /> Nova conta</button>
	</div>
</section>

<section class="card card-pad summary">
	<div class="summary-top">
		<div>
			<p class="eyebrow">Patrimônio em contas</p>
			<strong class="num big" class:income={summary.totalCents >= 0} class:expense={summary.totalCents < 0}>{formatBRL(summary.totalCents)}</strong>
		</div>
		<span class="muted">{data.accounts.length} {data.accounts.length === 1 ? 'conta' : 'contas'}</span>
	</div>

	{#if splitTotal > 0}
		<div class="split" role="img" aria-label="Divisão do patrimônio entre disponível, reserva e investido">
			<span class="seg seg-immediate" style:width="{share(summary.immediateCents)}%"></span>
			<span class="seg seg-short" style:width="{share(summary.shortCents)}%"></span>
			<span class="seg seg-invested" style:width="{share(summary.investedCents)}%"></span>
		</div>
	{/if}

	<ul class="legend">
		<li>
			<span class="sw seg-immediate"></span>
			<div class="legend-text">
				<strong>{LIQUIDITY_LABELS.immediate}</strong>
				<small>{LIQUIDITY_HELP.immediate}</small>
			</div>
			<span class="num legend-value">{formatBRL(summary.immediateCents)}</span>
		</li>
		<li>
			<span class="sw seg-short"></span>
			<div class="legend-text">
				<strong>{LIQUIDITY_LABELS.short}</strong>
				<small>{LIQUIDITY_HELP.short}</small>
			</div>
			<span class="num legend-value">{formatBRL(summary.shortCents)}</span>
		</li>
		<li>
			<span class="sw seg-invested"></span>
			<div class="legend-text">
				<strong>{LIQUIDITY_LABELS.invested}</strong>
				<small>{LIQUIDITY_HELP.invested}</small>
			</div>
			<span class="num legend-value">{formatBRL(summary.investedCents)}</span>
		</li>
	</ul>

	{#if summary.unassignedCents !== 0}
		<p class="note">Inclui {formatBRL(summary.unassignedCents)} em lançamentos sem conta definida, somados em "Disponível agora".</p>
	{/if}
</section>

{#if data.accounts.length === 0}
	<div class="card empty">
		<Icon name="wallet" size={28} />
		<strong>Nenhuma conta cadastrada</strong>
		<p class="muted">Cadastre a conta corrente, a poupança ou o investimento para ver o saldo de cada uma.</p>
		<button class="btn btn-primary" type="button" onclick={openNew}>Cadastrar primeira conta</button>
	</div>
{:else}
	{#each sections as section (section.liquidity)}
		<section class="section">
			<header class="section-head">
				<div>
					<h2>{LIQUIDITY_LABELS[section.liquidity]}</h2>
					<p class="muted">{LIQUIDITY_HELP[section.liquidity]}</p>
				</div>
				<strong class="num section-total" class:expense={section.subtotal < 0}>{formatBRL(section.subtotal)}</strong>
			</header>

			<div class="grid">
				{#each section.accounts as account (account.id)}
					<article class="card account" style:--acc={account.color}>
						<div class="account-top">
							<span class="account-icon" aria-hidden="true">
								<Icon name={KIND_ICON[account.kind] ?? 'wallet'} size={18} />
							</span>
							<div class="account-title">
								<strong>{account.name}</strong>
								<small>{ACCOUNT_KINDS[account.kind] ?? account.kind}</small>
							</div>
							<div class="account-actions">
								<button class="btn btn-ghost btn-sm btn-icon" type="button" aria-label="Editar {account.name}" onclick={() => openEdit(account)}>
									<Icon name="edit" size={15} />
								</button>
								<button
									class="btn btn-ghost btn-sm btn-icon"
									type="button"
									aria-label="Excluir {account.name}"
									onclick={() => {
										pendingDelete = account;
										error = '';
									}}
								>
									<Icon name="trash" size={15} />
								</button>
							</div>
						</div>
						<p class="balance num" class:income={account.balanceCents >= 0} class:expense={account.balanceCents < 0}>
							{formatBRL(account.balanceCents)}
						</p>
						<small class="muted">Saldo inicial de {formatBRL(account.openingBalanceCents)}</small>
					</article>
				{/each}
			</div>
		</section>
	{/each}
{/if}

{#if draft}
	{@const current = draft}
	<Modal title={current.id ? 'Editar conta' : 'Nova conta'} onclose={() => (draft = null)}>
		<form class="form" method="POST" action="?/save" use:enhance={saveAction}>
			<input type="hidden" name="id" value={current.id ?? ''} />
			<input type="hidden" name="color" value={current.color} />

			<label class="field">
				<span class="label">Nome</span>
				<input class="input" name="name" maxlength="60" required placeholder="Ex.: Nubank, Tesouro Selic, Poupança" bind:value={current.name} />
			</label>

			<label class="field">
				<span class="label">Tipo</span>
				<select class="select" name="kind" value={current.kind} onchange={(event) => setKind(event.currentTarget.value)}>
					{#each Object.entries(ACCOUNT_KINDS) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</label>

			<label class="field">
				<span class="label">Quão rápido dá para usar</span>
				<select class="select" name="liquidity" bind:value={current.liquidity}>
					<option value="immediate">{LIQUIDITY_LABELS.immediate}</option>
					<option value="short">{LIQUIDITY_LABELS.short}</option>
					<option value="invested">{LIQUIDITY_LABELS.invested}</option>
				</select>
				<small class="hint">{LIQUIDITY_HELP[current.liquidity]}</small>
			</label>

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
							onclick={() => pickColor(swatch)}
						></button>
					{/each}
				</div>
			</div>

			<label class="field">
				<span class="label">Saldo inicial</span>
				<input class="input" name="openingBalance" inputmode="decimal" placeholder="0,00" bind:value={current.opening} />
				<small class="hint">Use valor negativo para dívidas, como um cartão com fatura em aberto.</small>
			</label>

			{#if error}
				<p class="form-error" role="alert">{error}</p>
			{/if}

			<div class="actions">
				<button type="button" class="btn btn-ghost" onclick={() => (draft = null)}>Cancelar</button>
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar conta'}</button>
			</div>
		</form>
	</Modal>
{/if}

{#if transferDraft}
	{@const t = transferDraft}
	<Modal title="Transferir entre contas" onclose={() => (transferDraft = null)}>
		<form class="form" method="POST" action="?/transfer" use:enhance={transferAction}>
			<p class="muted">
				Use para levar dinheiro da conta corrente até um investimento, por exemplo. A transferência muda o saldo das duas contas,
				mas não entra em receitas nem despesas.
			</p>

			<div class="row2">
				<label class="field">
					<span class="label">De</span>
					<select class="select" name="fromAccountId" bind:value={t.from}>
						{#each data.accounts as account (account.id)}
							<option value={account.id}>{account.name}</option>
						{/each}
					</select>
				</label>
				<label class="field">
					<span class="label">Para</span>
					<select class="select" name="toAccountId" bind:value={t.to}>
						{#each data.accounts as account (account.id)}
							<option value={account.id}>{account.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<label class="field">
				<span class="label">Valor</span>
				<input class="input" name="amount" inputmode="decimal" placeholder="0,00" required bind:value={t.amount} />
			</label>

			<div class="row2">
				<label class="field">
					<span class="label">Data</span>
					<input class="input" type="date" name="occurredOn" required bind:value={t.occurredOn} />
				</label>
				<label class="field">
					<span class="label">Descrição <span class="hint">(opcional)</span></span>
					<input class="input" name="description" maxlength="120" placeholder="Ex.: Aporte mensal" bind:value={t.description} />
				</label>
			</div>

			{#if error}
				<p class="form-error" role="alert">{error}</p>
			{/if}

			<div class="actions">
				<button type="button" class="btn btn-ghost" onclick={() => (transferDraft = null)}>Cancelar</button>
				<button type="submit" class="btn btn-primary" disabled={transferring}>{transferring ? 'Transferindo…' : 'Transferir'}</button>
			</div>
		</form>
	</Modal>
{/if}

{#if pendingDelete}
	{@const target = pendingDelete}
	<Modal title="Excluir conta" onclose={() => (pendingDelete = null)}>
		<p class="muted">
			A conta <strong class="strong">{target.name}</strong> será removida. Os lançamentos dela continuam na planilha, sem conta definida.
		</p>
		{#if error}
			<p class="form-error" role="alert">{error}</p>
		{/if}
		<form class="actions" method="POST" action="?/delete" use:enhance={deleteAction}>
			<input type="hidden" name="id" value={target.id} />
			<button type="button" class="btn btn-ghost" onclick={() => (pendingDelete = null)}>Cancelar</button>
			<button type="submit" class="btn btn-danger" disabled={deleting}>{deleting ? 'Excluindo…' : 'Excluir conta'}</button>
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

	.head-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.summary {
		display: grid;
		gap: 1.1rem;
	}

	.summary-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.big {
		display: block;
		margin-top: 0.2rem;
		font-size: 2rem;
		letter-spacing: -0.03em;
	}

	.split {
		display: flex;
		height: 0.9rem;
		border-radius: 999px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.05);
	}

	.seg {
		display: block;
		height: 100%;
		min-width: 0;
		transition: width 0.4s ease;
	}

	.seg-immediate {
		background: var(--income);
	}

	.seg-short {
		background: var(--accent-2);
	}

	.seg-invested {
		background: var(--accent);
	}

	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.7rem;
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.sw {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 999px;
		flex: none;
	}

	.legend-text {
		display: grid;
		flex: 1;
		min-width: 0;
	}

	.legend-text small {
		color: var(--muted);
		font-size: 0.78rem;
	}

	.legend-value {
		font-weight: 700;
		white-space: nowrap;
	}

	.note {
		margin: 0;
		color: var(--muted);
		font-size: 0.82rem;
	}

	.section {
		display: grid;
		gap: 0.8rem;
	}

	.section-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.section-head h2 {
		margin: 0;
		font-size: 1.15rem;
		letter-spacing: -0.02em;
	}

	.section-head p {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
	}

	.section-total {
		font-size: 1.15rem;
		white-space: nowrap;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
		gap: 1rem;
	}

	.account {
		position: relative;
		overflow: hidden;
		padding: 1.2rem 1.25rem 1.1rem;
		display: grid;
		gap: 0.5rem;
	}

	.account::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		background: var(--acc);
	}

	.account-top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.account-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 13px;
		background: color-mix(in srgb, var(--acc) 22%, transparent);
		color: var(--acc);
	}

	.account-title {
		display: grid;
		flex: 1;
		min-width: 0;
	}

	.account-title strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.account-title small {
		color: var(--muted);
		font-size: 0.78rem;
	}

	.account-actions {
		display: flex;
		gap: 0.2rem;
	}

	.balance {
		margin: 0.3rem 0 0;
		font-size: 1.55rem;
		font-weight: 750;
		letter-spacing: -0.03em;
	}

	.empty {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
	}

	.strong {
		color: var(--text);
	}

	.form {
		display: grid;
		gap: 0.95rem;
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
		color: var(--muted);
		font-size: 0.78rem;
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

	.swatch:hover {
		transform: scale(1.08);
	}

	.swatch[aria-pressed='true'] {
		border-color: #fff;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--sw) 45%, transparent);
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
