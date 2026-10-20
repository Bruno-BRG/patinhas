<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import MonthlyBars from '$lib/components/charts/MonthlyBars.svelte';
	import CategoryDonut from '$lib/components/charts/CategoryDonut.svelte';
	import BalanceLine from '$lib/components/charts/BalanceLine.svelte';
	import BudgetBars from '$lib/components/charts/BudgetBars.svelte';
	import { firstName } from '$lib/format';
	import { formatBRL } from '$lib/money';
	import { LIQUIDITY_LABELS } from '$lib/types';
	import { addMonths, currentMonth, formatDateBR, monthLabel } from '$lib/dates';
	import { openTransaction } from '$lib/ui.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function capitalize(text: string): string {
		return text.charAt(0).toUpperCase() + text.slice(1);
	}

	const d = $derived(data.dashboard);
	const monthName = $derived(capitalize(monthLabel(data.month)));
	const previous = $derived(addMonths(data.month, -1));
	const following = $derived(addMonths(data.month, 1));
	const isCurrent = $derived(data.month === currentMonth());
	const net = $derived(d.totals.netCents);
	const balance = $derived(d.totals.balanceCents);
	const liquidityTotal = $derived(
		Math.abs(d.liquidity.immediateCents) + Math.abs(d.liquidity.shortCents) + Math.abs(d.liquidity.investedCents)
	);

	function share(value: number): number {
		return liquidityTotal > 0 ? (Math.abs(value) / liquidityTotal) * 100 : 0;
	}
</script>

<svelte:head>
	<title>Visão geral · Finanças</title>
</svelte:head>

<section class="hero">
	<div>
		<p class="eyebrow">Visão geral · {data.scope.name}</p>
		<h1 class="title">Olá, {firstName(data.user?.name ?? '')}</h1>
		<p class="subtitle">Veja como foi {monthName.toLowerCase()} e o que ainda pode mudar.</p>
	</div>

	<nav class="month" aria-label="Escolher mês">
		<a class="btn btn-ghost btn-icon" href={'/?mes=' + previous} aria-label="Mês anterior">
			<Icon name="chevron-left" />
		</a>
		<span class="month-name">{monthName}</span>
		<a class="btn btn-ghost btn-icon" href={'/?mes=' + following} aria-label="Próximo mês">
			<Icon name="chevron-right" />
		</a>
		{#if !isCurrent}
			<a class="btn btn-sm" href="/">Hoje</a>
		{/if}
	</nav>
</section>

{#if d.recent.length === 0}
	<section class="card card-pad welcome">
		<div>
			<p class="eyebrow">Primeiros passos</p>
			<h2>Registre o seu primeiro lançamento</h2>
			<p class="muted">Adicione uma receita ou uma despesa. Em um minuto, os gráficos aparecem aqui.</p>
		</div>
		<button class="btn btn-primary" type="button" onclick={() => openTransaction()}>
			<Icon name="plus" size={17} /> Novo lançamento
		</button>
	</section>
{/if}

<section class="kpis" aria-label="Resumo do mês">
	<article class="card kpi">
		<div>
			<p class="eyebrow">Receitas</p>
			<strong class="num income">{formatBRL(d.totals.incomeCents)}</strong>
		</div>
	</article>
	<article class="card kpi">
		<div>
			<p class="eyebrow">Despesas</p>
			<strong class="num expense">{formatBRL(d.totals.expenseCents)}</strong>
		</div>
	</article>
	<article class="card kpi">
		<div>
			<p class="eyebrow">{net >= 0 ? 'Sobrou no mês' : 'Faltou no mês'}</p>
			<strong class="num" class:income={net >= 0} class:expense={net < 0}>{formatBRL(net)}</strong>
		</div>
	</article>
	<article class="card kpi">
		<div>
			<p class="eyebrow">Saldo acumulado</p>
			<strong class="num" class:income={balance >= 0} class:expense={balance < 0}>{formatBRL(balance)}</strong>
		</div>
	</article>
</section>

<section class="card card-pad liquidity" aria-label="Disponível, reserva e investido">
		<header class="liquidity-head">
			<div>
				<p class="eyebrow">Onde está o dinheiro</p>
				<h2>Disponível, reserva e investido</h2>
			</div>
			<a class="btn btn-ghost btn-sm" href="/carteiras">Ver contas</a>
		</header>

		{#if liquidityTotal > 0}
			<div class="split" role="img" aria-label="Divisão do patrimônio entre disponível, reserva e investido">
				<span class="seg seg-immediate" style:width="{share(d.liquidity.immediateCents)}%"></span>
				<span class="seg seg-short" style:width="{share(d.liquidity.shortCents)}%"></span>
				<span class="seg seg-invested" style:width="{share(d.liquidity.investedCents)}%"></span>
			</div>
		{/if}

		<div class="split-legend">
			<div class="split-item">
				<span class="sw seg-immediate"></span>
				<div>
					<small>{LIQUIDITY_LABELS.immediate}</small>
					<strong class="num" class:expense={d.liquidity.immediateCents < 0}>{formatBRL(d.liquidity.immediateCents)}</strong>
				</div>
			</div>
			<div class="split-item">
				<span class="sw seg-short"></span>
				<div>
					<small>{LIQUIDITY_LABELS.short}</small>
					<strong class="num">{formatBRL(d.liquidity.shortCents)}</strong>
				</div>
			</div>
			<div class="split-item">
				<span class="sw seg-invested"></span>
				<div>
					<small>{LIQUIDITY_LABELS.invested}</small>
					<strong class="num">{formatBRL(d.liquidity.investedCents)}</strong>
				</div>
			</div>
		</div>

		{#if d.liquidity.unassignedCents !== 0}
			<p class="note">Inclui {formatBRL(d.liquidity.unassignedCents)} em lançamentos sem conta definida, somados em "Disponível agora".</p>
		{/if}
	</section>

	<section class="charts">
	<article class="card card-pad span-7">
		<header class="card-head">
			<div>
				<p class="eyebrow">Últimos 6 meses</p>
				<h2>Receitas x despesas</h2>
			</div>
		</header>
		<MonthlyBars series={d.series} />
	</article>

	<article class="card card-pad span-5">
		<header class="card-head">
			<div>
				<p class="eyebrow">{monthName}</p>
				<h2>Para onde foi o dinheiro</h2>
			</div>
		</header>
		<CategoryDonut slices={d.slices} />
	</article>

	<article class="card card-pad span-7">
		<header class="card-head">
			<div>
				<p class="eyebrow">Acumulado</p>
				<h2>Evolução do saldo</h2>
			</div>
		</header>
		<BalanceLine points={d.balanceSeries} />
	</article>

	<article class="card card-pad span-5">
		<header class="card-head">
			<div>
				<p class="eyebrow">Metas</p>
				<h2>Orçamentos do mês</h2>
			</div>
		</header>
		<BudgetBars items={d.budgets} />
	</article>

	<article class="card card-pad span-12">
		<header class="card-head">
			<div>
				<p class="eyebrow">Atividade recente</p>
				<h2>Últimos lançamentos</h2>
			</div>
			<a class="btn btn-ghost btn-sm" href="/lancamentos">Ver planilha</a>
		</header>

		{#if d.recent.length > 0}
			<ul class="recent">
				{#each d.recent as item (item.id)}
					<li>
						<span
							class="recent-icon"
							style:--cat={item.categoryColor ?? (item.kind === 'income' ? '#f5f5f5' : '#9a9a9a')}
							aria-hidden="true"
						>
							{item.categoryIcon ?? (item.kind === 'income' ? '↑' : '↓')}
						</span>
						<div class="recent-text">
							<strong>{item.description}</strong>
							<small>
								{formatDateBR(item.occurredOn)} · {item.categoryName ?? 'Sem categoria'}{item.accountName ? ' · ' + item.accountName : ''}
							</small>
						</div>
						<span class="recent-amount num" class:income={item.kind === 'income'} class:expense={item.kind === 'expense'}>
							{item.kind === 'income' ? '+' : '−'} {formatBRL(item.amountCents)}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">Nenhum lançamento ainda.</p>
		{/if}
	</article>
</section>

<style>
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.month {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem;
		border: 1px solid var(--border);
		background: var(--bg);
	}

	.month-name {
		min-width: 11rem;
		text-align: center;
		font-family: var(--mono);
		font-size: 0.9rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.welcome {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.welcome h2 {
		margin: 0.2rem 0 0.3rem;
		font-size: 1.25rem;
		letter-spacing: -0.02em;
	}

	.welcome p {
		margin: 0;
	}

	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
		gap: 1rem;
	}

	.kpi {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 1.1rem 1.2rem;
	}

	.kpi strong {
		display: block;
		margin-top: 0.2rem;
		font-size: 1.35rem;
		letter-spacing: -0.02em;
	}

	.kpi p {
		margin: 0;
	}

	.charts {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}

	.card-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.card-head h2 {
		margin: 0.15rem 0 0;
		font-size: 1.1rem;
		letter-spacing: -0.02em;
	}

	.recent {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.2rem;
	}

	.recent li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.6rem 0.4rem;
		border-radius: 0;
		border-bottom: 1px solid var(--border);
		transition: background 0.12s;
	}

	.recent li:hover {
		background: var(--surface);
	}

	.recent-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 0;
		background: color-mix(in srgb, var(--cat) 22%, transparent);
		font-size: 1.05rem;
	}

	.recent-text {
		display: grid;
		flex: 1;
		min-width: 0;
	}

	.recent-text strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.95rem;
	}

	.recent-text small {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.recent-amount {
		font-weight: 700;
		white-space: nowrap;
	}

	@media (min-width: 1100px) {
		.charts {
			grid-template-columns: repeat(12, minmax(0, 1fr));
		}

		.span-7 {
			grid-column: span 7;
		}

		.span-5 {
			grid-column: span 5;
		}

		.span-12 {
			grid-column: span 12;
		}
	}

	.liquidity {
		display: grid;
		gap: 1rem;
	}

	.liquidity-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.liquidity-head h2 {
		margin: 0.15rem 0 0;
		font-size: 1.1rem;
		letter-spacing: -0.02em;
	}

	.split {
		display: flex;
		height: 0.9rem;
		border: 1px solid var(--border-strong);
		overflow: hidden;
		background: var(--bg);
	}

	.seg {
		display: block;
		height: 100%;
		min-width: 0;
		transition: width 0.4s ease;
	}

	.seg-immediate {
		background: var(--text);
	}

	.seg-short {
		background: var(--muted);
	}

	.seg-invested {
		background: var(--border-strong);
	}

	.split-legend {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 0.9rem;
	}

	.split-item {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.split-item small {
		display: block;
		color: var(--muted);
		font-size: 0.78rem;
	}

	.split-item strong {
		font-size: 1.1rem;
	}

	.sw {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 0;
		flex: none;
	}

	.note {
		margin: 0;
		color: var(--muted);
		font-size: 0.82rem;
	}
</style>
