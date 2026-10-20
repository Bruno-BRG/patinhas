<script lang="ts">
	import { formatBRL, formatBRLCompact } from '$lib/money';

	type BalancePoint = { label: string; value: number };

	let {
		points,
		height = 240
	}: {
		points: BalancePoint[];
		height?: number;
	} = $props();

	const PAD_TOP = 18;
	const PAD_BOTTOM = 6;

	let active = $state<number | null>(null);

	const count = $derived(points.length);
	const lowest = $derived(points.reduce((lo, point) => Math.min(lo, point.value), 0));
	const highest = $derived(points.reduce((hi, point) => Math.max(hi, point.value), 0));
	const span = $derived(Math.max(1, highest - lowest));
	const boundBottom = $derived(lowest < 0 ? lowest - span * 0.12 : 0);
	const boundTop = $derived(highest > 0 ? highest + span * 0.12 : 0);
	const plotH = $derived(Math.max(48, height - PAD_TOP - PAD_BOTTOM));
	const slot = $derived(count > 0 ? 1000 / count : 0);
	const crossesZero = $derived(lowest < 0 && highest > 0);

	const yOf = (value: number) => PAD_TOP + ((boundTop - value) / Math.max(1, boundTop - boundBottom)) * plotH;

	const dots = $derived(
		points.map((point, index) => ({
			index,
			label: point.label,
			value: point.value,
			x: (index + 0.5) * slot,
			y: yOf(point.value)
		}))
	);

	const ticks = $derived(
		[0, 1, 2, 3].map((step) => {
			const value = boundBottom + ((boundTop - boundBottom) * step) / 3;
			return { value, y: yOf(value) };
		})
	);

	const zeroY = $derived(yOf(0));
	const lastDot = $derived(count > 0 ? dots[count - 1] : null);
	const activeDot = $derived(active === null ? null : (dots[active] ?? null));
	const linePath = $derived(smooth(dots));
	const areaPath = $derived(
		count < 2
			? ''
			: linePath + ' L ' + dots[count - 1].x.toFixed(1) + ' ' + (PAD_TOP + plotH) + ' L ' + dots[0].x.toFixed(1) + ' ' + (PAD_TOP + plotH) + ' Z'
	);

	const summary = $derived(
		count === 0
			? 'Sem histórico ainda.'
			: 'Evolução do saldo em ' +
					count +
					' pontos: de ' +
					formatBRL(dots[0].value) +
					' em ' +
					dots[0].label +
					' para ' +
					formatBRL(dots[count - 1].value) +
					' em ' +
					dots[count - 1].label +
					'.'
	);

	function smooth(list: { x: number; y: number }[]) {
		if (list.length === 0) return '';
		let path = 'M ' + list[0].x.toFixed(1) + ' ' + list[0].y.toFixed(1);
		for (let i = 0; i < list.length - 1; i += 1) {
			const previous = list[i - 1] ?? list[i];
			const start = list[i];
			const end = list[i + 1];
			const next = list[i + 2] ?? end;
			const c1x = start.x + (end.x - previous.x) * 0.2;
			const c1y = start.y + (end.y - previous.y) * 0.2;
			const c2x = end.x - (next.x - start.x) * 0.2;
			const c2y = end.y - (next.y - start.y) * 0.2;
			path += ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ', ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ', ' + end.x.toFixed(1) + ' ' + end.y.toFixed(1);
		}
		return path;
	}

	function tipStyle(dot: { x: number; y: number }) {
		return (
			'--tx: ' +
			(dot.x / 10).toFixed(3) +
			'%; top: clamp(0.25rem, ' +
			(dot.y - 74).toFixed(0) +
			'px, calc(100% - 5rem)); left: clamp(var(--tip-pad), var(--tx), calc(100% - var(--tip-pad)))'
		);
	}
</script>

<div class="chart">
	{#if count === 0}
		<p class="placeholder" style="min-height: {Math.max(120, height - 40)}px">Sem histórico ainda.</p>
	{:else}
		<div class="body">
			<div class="y-axis" style="height: {plotH}px">
				{#each ticks as tick}<span class="ytick" style="top: {tick.y.toFixed(1)}px">{formatBRLCompact(tick.value)}</span>{/each}
			</div>

			<div class="plot" style="height: {plotH}px">
				<svg viewBox="0 0 1000 {plotH}" width="100%" height={plotH} preserveAspectRatio="none" role="img" aria-label={summary}>
					<defs>
						<linearGradient id="blArea" x1="0" y1="0" x2="0" y2="1">
							<stop class="stop area-top" offset="0%" />
							<stop class="stop area-base" offset="100%" />
						</linearGradient>
					</defs>

					{#each ticks as tick}
						<line class="gridline" x1="0" x2="1000" y1={tick.y} y2={tick.y} vector-effect="non-scaling-stroke" />
					{/each}
					{#if crossesZero}
						<line class="zero" x1="0" x2="1000" y1={zeroY} y2={zeroY} vector-effect="non-scaling-stroke" />
					{/if}
					{#if areaPath}
						<path class="area" d={areaPath} fill="url(#blArea)" />
					{/if}
					<path class="line" d={linePath} pathLength="100" vector-effect="non-scaling-stroke" />
				</svg>

				{#each dots as dot (dot.index)}
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<span
						class="dot"
						class:last={dot.index === count - 1}
						class:on={active === dot.index}
						style="left: {(dot.x / 10).toFixed(3)}%; top: {dot.y.toFixed(1)}px"
						tabindex="0"
						role="img"
						aria-label={dot.label + ': ' + formatBRL(dot.value)}
						onmouseenter={() => (active = dot.index)}
						onmouseleave={() => (active = null)}
						onfocus={() => (active = dot.index)}
						onblur={() => (active = null)}
					></span>
				{/each}

				{#if lastDot}
					<span class="last-value" style="left: {(lastDot.x / 10).toFixed(3)}%; top: {lastDot.y.toFixed(1)}px">{formatBRL(lastDot.value)}</span>
				{/if}

				{#if activeDot}
					<div class="tip" style={tipStyle(activeDot)}>
						<p class="tip-label">{activeDot.label}</p>
						<p class="tip-row">
							<span>Saldo</span>
							<span class="tip-value" class:neg={activeDot.value < 0}>{formatBRL(activeDot.value)}</span>
						</p>
					</div>
				{/if}
			</div>

			<div class="x-axis" style="grid-template-columns: repeat({count}, minmax(0, 1fr))">
				{#each dots as dot (dot.index)}<span class="xlabel">{dot.label}</span>{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.chart { width: 100%; }
	.placeholder { margin: 0; display: grid; place-items: center; padding: 1rem; text-align: center; color: var(--muted); font-size: 0.88rem; }
	.body { --gutter: 4.1rem; display: grid; grid-template-columns: var(--gutter) minmax(0, 1fr); }
	.y-axis { grid-column: 1; grid-row: 1; position: relative; }
	.ytick { position: absolute; right: 0.55rem; transform: translateY(-50%); font-size: 0.66rem; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
	.plot { grid-column: 2; grid-row: 1; position: relative; }
	.x-axis { grid-column: 2; grid-row: 2; display: grid; margin-top: 0.45rem; }
	.xlabel { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-align: center; font-size: 0.68rem; color: var(--muted); }
	.gridline { stroke: var(--border); stroke-width: 1; }
	.zero { stroke: var(--border-strong); stroke-width: 1.4; stroke-dasharray: 5 5; }
	.stop.area-top { stop-color: var(--text); stop-opacity: 0.12; }
	.stop.area-base { stop-color: var(--accent); stop-opacity: 0; }
	.area { stroke: none; animation: area-in 0.9s ease-out both; }
	.line { fill: none; stroke: var(--text); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; animation: line-draw 1s ease-out both; }
	.dot { position: absolute; display: grid; place-items: center; width: 1.5rem; height: 1.5rem; margin: -0.75rem 0 0 -0.75rem; border-radius: 999px; outline: none; }
	.dot::before { content: ''; width: 0.45rem; height: 0.45rem; border-radius: 999px; background: var(--text); box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--bg) 80%, transparent); transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease; }
	.dot.on::before { transform: scale(1.4); }
	.dot:focus-visible::before { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 40%, transparent); }
	.dot.last::before { width: 0.7rem; height: 0.7rem; background: var(--accent-2); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-2) 22%, transparent); }
	.last-value { position: absolute; transform: translate(-100%, -50%); padding-right: 0.85rem; font-size: 0.78rem; font-weight: 700; color: var(--accent-2); font-variant-numeric: tabular-nums; white-space: nowrap; pointer-events: none; }
	.tip { --tip-pad: 6.6rem; position: absolute; width: 11rem; padding: 0.5rem 0.65rem; border-radius: 0; border: 1px solid var(--border-strong); background: color-mix(in srgb, var(--surface-solid) 94%, transparent); box-shadow: var(--shadow); pointer-events: none; font-size: 0.74rem; animation: tip-in 0.14s ease-out both; }
	.tip-label { margin: 0; font-weight: 700; color: var(--text); }
	.tip-row { margin: 0.3rem 0 0; display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; color: var(--muted); }
	.tip-value { font-weight: 650; color: var(--text); font-variant-numeric: tabular-nums; }
	.neg { color: var(--expense); }
	@keyframes area-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes line-draw { from { stroke-dasharray: 0 100; } to { stroke-dasharray: 100 0; } }
	@keyframes tip-in { from { opacity: 0; transform: translate(-50%, -4px); } to { opacity: 1; transform: translate(-50%, 0); } }
	@media (max-width: 560px) {
		.body { --gutter: 3.4rem; }
		.ytick { right: 0.4rem; font-size: 0.6rem; }
		.xlabel { font-size: 0.62rem; }
		.last-value { font-size: 0.72rem; padding-right: 0.65rem; }
		.tip { --tip-pad: 5.5rem; width: 9.6rem; font-size: 0.7rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.area, .line, .tip { animation: none; }
	}
</style>
