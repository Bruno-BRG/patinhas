<script lang="ts">
	import { formatBRL } from '$lib/money';

	type BudgetItem = { name: string; icon?: string; color: string; spent: number; budget: number };

	let { items }: { items: BudgetItem[] } = $props();

	const rows = $derived(
		items
			.filter((item) => item.budget > 0)
			.map((item) => {
				const ratio = item.spent / item.budget;
				return {
					name: item.name,
					icon: item.icon,
					color: item.color,
					spent: item.spent,
					budget: item.budget,
					pct: Math.round(ratio * 100),
					width: Math.min(100, Math.max(0, ratio * 100)),
					over: item.spent > item.budget,
					overBy: item.spent - item.budget
				};
			})
	);
</script>

{#if rows.length === 0}
	<div class="placeholder">
		<p>Defina um orçamento mensal nas categorias para acompanhar aqui.</p>
		<a href="/categorias">Ir para categorias</a>
	</div>
{:else}
	<ul class="rows">
		{#each rows as row, index}
			<li class="row">
				<div class="head">
					<span class="icon" aria-hidden="true">{row.icon ?? ''}</span>
					<span class="name">{row.name}</span>
					<span class="caption">{formatBRL(row.spent)} de {formatBRL(row.budget)} · {row.pct}%</span>
				</div>
				<div class="track" aria-hidden="true">
					<div class="fill" class:over={row.over} style="--w: {row.width}%; --c: {row.color}; --d: {index * 60}ms"></div>
				</div>
				{#if row.over}
					<p class="alert">Estourou em {formatBRL(row.overBy)}</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.placeholder { display: grid; justify-items: center; gap: 0.6rem; padding: 2rem 1rem; text-align: center; color: var(--muted); font-size: 0.9rem; }
	.placeholder p { margin: 0; }
	.placeholder a { color: var(--accent-2); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
	.rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.05rem; }
	.row { display: grid; gap: 0.45rem; }
	.head { display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem 0.6rem; }
	.icon { font-size: 1rem; line-height: 1; }
	.name { font-weight: 650; }
	.caption { margin-left: auto; font-size: 0.78rem; color: var(--muted); font-variant-numeric: tabular-nums; }
	.track { height: 0.6rem; border-radius: 999px; background: var(--border); overflow: hidden; }
	.fill { height: 100%; width: var(--w, 0%); border-radius: inherit; background: var(--c, var(--accent)); animation: budget-grow 0.7s cubic-bezier(0.22, 0.9, 0.28, 1) both; animation-delay: var(--d, 0ms); }
	.fill.over { background: var(--expense); }
	.alert { margin: 0; font-size: 0.78rem; font-weight: 600; color: var(--expense); font-variant-numeric: tabular-nums; }
	@keyframes budget-grow { from { width: 0; } }
	@media (prefers-reduced-motion: reduce) {
		.fill { animation: none; }
	}
</style>
