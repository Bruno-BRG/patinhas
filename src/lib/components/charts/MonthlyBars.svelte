<script lang="ts">
	import { formatBRL, formatBRLCompact } from '$lib/money';

	type SeriesPoint = { label: string; income: number; expense: number };

	let {
		series,
		height = 260
	}: {
		series: SeriesPoint[];
		height?: number;
	} = $props();

	const PAD_TOP = 16;
	const PAD_BOTTOM = 4;

	let active = $state<number | null>(null);

	const count = $derived(series.length);
	const peak = $derived(series.reduce((top, month) => Math.max(top, month.income, month.expense), 0));
	const isEmpty = $derived(count === 0 || peak === 0);
	const scaleMax = $derived(peak > 0 ? peak : 1);
	const plotH = $derived(Math.max(48, height - PAD_TOP - PAD_BOTTOM));
	const slot = $derived(count > 0 ? 1000 / count : 0);
	const barW = $derived(Math.min(34, Math.max(1.5, slot * 0.26)));
	const barGap = $derived(Math.max(1, barW * 0.34));

	const ticks = $derived(
		[0, 1, 2, 3].map((step) => {
			const value = (scaleMax * step) / 3;
			return { value, y: PAD_TOP + plotH - (value / scaleMax) * plotH };
		})
	);

	const bars = $derived(
		series.map((month, index) => {
			const center = (index + 0.5) * slot;
			const incomeHeight = (month.income / scaleMax) * plotH;
			const expenseHeight = (month.expense / scaleMax) * plotH;
			return {
				index,
				label: month.label,
				income: month.income,
				expense: month.expense,
				net: month.income - month.expense,
				incomeBar: { x: center - barGap / 2 - barW, y: PAD_TOP + plotH - incomeHeight, height: incomeHeight },
				expenseBar: { x: center + barGap / 2, y: PAD_TOP + plotH - expenseHeight, height: expenseHeight }
			};
		})
	);

	const activeBar = $derived(active === null ? null : (bars[active] ?? null));
	const totals = $derived(
		series.reduce((acc, month) => ({ income: acc.income + month.income, expense: acc.expense + month.expense }), { income: 0, expense: 0 })
	);
	const summary = $derived(
		isEmpty
			? 'Sem movimentações nos últimos meses.'
			: 'Receitas e despesas de ' +
					count +
					' meses: receitas de ' +
					formatBRL(totals.income) +
					' e despesas de ' +
					formatBRL(totals.expense) +
					'.'
	);

	const monthLabel = (month: { label: string; income: number; expense: number }) =>
		'Mês ' + month.label + ': receitas ' + formatBRL(month.income) + ', despesas ' + formatBRL(month.expense);

	function tipStyle(index: number) {
		const percent = (((index + 0.5) * 100) / count).toFixed(2);
		return '--tx: ' + percent + '%; left: clamp(var(--tip-pad), var(--tx), calc(100% - var(--tip-pad)))';
	}
</script>

<div class="chart">
	<div class="legend">
		<span><i class="dot dot-income"></i>Receitas</span>
		<span><i class="dot dot-expense"></i>Despesas</span>
	</div>

	{#if isEmpty}
		<p class="placeholder" style="min-height: {Math.max(120, height - 40)}px">
			Ainda não há movimentações nos últimos meses.
		</p>
	{:else}
		<div class="body">
			<div class="y-axis" style="height: {plotH}px">
				{#each ticks as tick}<span class="ytick" style="top: {tick.y.toFixed(1)}px">{formatBRLCompact(tick.value)}</span>{/each}
			</div>

			<div class="plot" style="height: {plotH}px">
				<svg viewBox="0 0 1000 {plotH}" width="100%" height={plotH} preserveAspectRatio="none" role="img" aria-label={summary}>
					<defs>
						<linearGradient id="mbIncome" x1="0" y1="0" x2="0" y2="1">
							<stop class="stop income-top" offset="0%" />
							<stop class="stop income-base" offset="100%" />
						</linearGradient>
						<linearGradient id="mbExpense" x1="0" y1="0" x2="0" y2="1">
							<stop class="stop expense-top" offset="0%" />
							<stop class="stop expense-base" offset="100%" />
						</linearGradient>
					</defs>

					{#each ticks as tick}
						<line class="gridline" class:baseline={tick.value === 0} x1="0" x2="1000" y1={tick.y} y2={tick.y} vector-effect="non-scaling-stroke" />
					{/each}

					{#each bars as month (month.index)}
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<g
							class="month"
							class:dim={active !== null && active !== month.index}
							tabindex="0"
							role="group"
							aria-label={monthLabel(month)}
							onmouseenter={() => (active = month.index)}
							onmouseleave={() => (active = null)}
							onfocusin={() => (active = month.index)}
							onfocusout={() => (active = null)}
						>
							<rect class="bar" x={month.incomeBar.x} y={month.incomeBar.y} width={barW} height={month.incomeBar.height} rx={barW * 0.12} fill="url(#mbIncome)" style="--d: {month.index * 55}ms" />
							<rect class="bar" x={month.expenseBar.x} y={month.expenseBar.y} width={barW} height={month.expenseBar.height} rx={barW * 0.12} fill="url(#mbExpense)" style="--d: {month.index * 55 + 45}ms" />
							<rect class="hit" x={month.index * slot} y="0" width={slot} height={plotH} fill="none" pointer-events="all" />
						</g>
					{/each}
				</svg>

				{#if activeBar}
					<div class="tip" style={tipStyle(activeBar.index)}>
						<p class="tip-label">{activeBar.label}</p>
						<p class="tip-row"><span>Receitas</span><span class="tip-value pos">{formatBRL(activeBar.income)}</span></p>
						<p class="tip-row"><span>Despesas</span><span class="tip-value neg">{formatBRL(activeBar.expense)}</span></p>
						<p class="tip-row">
							<span>Saldo</span>
							<span class="tip-value" class:pos={activeBar.net >= 0} class:neg={activeBar.net < 0}>{formatBRL(activeBar.net)}</span>
						</p>
					</div>
				{/if}
			</div>

			<div class="x-axis" style="grid-template-columns: repeat({count}, minmax(0, 1fr))">
				{#each bars as month (month.index)}<span class="xlabel">{month.label}</span>{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.chart { width: 100%; }
	.legend { display: flex; flex-wrap: wrap; gap: 0.9rem; margin-bottom: 0.6rem; font-size: 0.8rem; font-weight: 600; color: var(--muted); }
	.legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
	.dot { display: block; width: 0.55rem; height: 0.55rem; border-radius: 999px; }
	.dot-income { background: var(--income); }
	.dot-expense { background: var(--expense); }
	.placeholder { margin: 0; display: grid; place-items: center; padding: 1rem; text-align: center; color: var(--muted); font-size: 0.88rem; }
	.body { --gutter: 4.1rem; display: grid; grid-template-columns: var(--gutter) minmax(0, 1fr); }
	.y-axis { grid-column: 1; grid-row: 1; position: relative; }
	.ytick { position: absolute; right: 0.55rem; transform: translateY(-50%); font-size: 0.66rem; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
	.plot { grid-column: 2; grid-row: 1; position: relative; }
	.x-axis { grid-column: 2; grid-row: 2; display: grid; margin-top: 0.45rem; }
	.xlabel { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-align: center; font-size: 0.68rem; color: var(--muted); }
	.gridline { stroke: var(--border); stroke-width: 1; }
	.gridline.baseline { stroke: var(--border-strong); }
	.month { outline: none; transition: opacity 0.18s ease; }
	.month.dim { opacity: 0.45; }
	.month:focus-visible .bar { filter: brightness(1.2); }
	.stop.income-top { stop-color: var(--income); stop-opacity: 1; }
	.stop.income-base { stop-color: var(--income); stop-opacity: 1; }
	.stop.expense-top { stop-color: var(--expense); stop-opacity: 1; }
	.stop.expense-base { stop-color: var(--expense); stop-opacity: 1; }
	.bar { transform-box: fill-box; transform-origin: bottom; animation: bar-grow 0.55s cubic-bezier(0.22, 0.9, 0.28, 1) both; animation-delay: var(--d, 0ms); }
	.tip { --tip-pad: 6.6rem; position: absolute; top: 3px; width: 11rem; padding: 0.5rem 0.65rem; border-radius: 0; border: 1px solid var(--border-strong); background: color-mix(in srgb, var(--surface-solid) 94%, transparent); box-shadow: var(--shadow); pointer-events: none; font-size: 0.74rem; animation: tip-in 0.14s ease-out both; }
	.tip-label { margin: 0; font-weight: 700; color: var(--text); }
	.tip-row { margin: 0.3rem 0 0; display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; color: var(--muted); }
	.tip-value { font-weight: 650; color: var(--text); font-variant-numeric: tabular-nums; }
	.pos { color: var(--income); }
	.neg { color: var(--expense); }
	@keyframes bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
	@keyframes tip-in { from { opacity: 0; transform: translate(-50%, -4px); } to { opacity: 1; transform: translate(-50%, 0); } }
	@media (max-width: 560px) {
		.body { --gutter: 3.4rem; }
		.ytick { right: 0.4rem; font-size: 0.6rem; }
		.xlabel { font-size: 0.62rem; }
		.tip { --tip-pad: 5.5rem; width: 9.6rem; font-size: 0.7rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.bar, .tip { animation: none; }
	}
</style>
