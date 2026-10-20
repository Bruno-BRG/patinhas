<script lang="ts">
	import { formatBRL } from '$lib/money';

	type Slice = { name: string; color: string; value: number; icon?: string };

	let { slices }: { slices: Slice[] } = $props();

	const MAX_SLICES = 6;
	const OTHERS_COLOR = '#6b6b6b';
	const RADIUS = 72;
	const STROKE = 26;
	const GAP = 3;
	const CIRC = 2 * Math.PI * RADIUS;

	let active = $state<number | null>(null);

	const total = $derived(slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0));
	const isEmpty = $derived(total <= 0);

	const rows = $derived.by(() => {
		const sorted = slices.filter((slice) => slice.value > 0).sort((a, b) => b.value - a.value);
		const head = sorted.slice(0, MAX_SLICES);
		const tail = sorted.slice(MAX_SLICES);
		const base: Slice[] = tail.length
			? [...head, { name: 'Outras', color: OTHERS_COLOR, value: tail.reduce((sum, slice) => sum + slice.value, 0) }]
			: head;
		const sum = base.reduce((acc, slice) => acc + slice.value, 0) || 1;
		const out = base.map((slice) => ({ ...slice, pct: Math.round((slice.value / sum) * 100) }));
		const drift = 100 - out.reduce((acc, slice) => acc + slice.pct, 0);
		if (out.length > 1 && drift !== 0) {
			let biggest = 0;
			for (let i = 1; i < out.length; i += 1) if (out[i].value > out[biggest].value) biggest = i;
			out[biggest] = { ...out[biggest], pct: out[biggest].pct + drift };
		}
		return out;
	});

	const arcs = $derived.by(() => {
		const sum = rows.reduce((acc, row) => acc + row.value, 0) || 1;
		let cursor = 0;
		return rows.map((row, index) => {
			const sweep = (row.value / sum) * CIRC;
			const arc = { ...row, index, length: Math.max(0.5, sweep - GAP), offset: cursor };
			cursor += sweep;
			return arc;
		});
	});

	const summary = $derived(
		isEmpty
			? 'Despesas por categoria: nenhuma despesa registrada neste mês.'
			: 'Despesas por categoria: total de ' + formatBRL(total) + ' distribuído em ' + rows.length + ' categorias.'
	);
</script>

{#if isEmpty}
	<p class="placeholder">Nenhuma despesa registrada neste mês.</p>
{:else}
	<div class="wrap">
		<div class="donut-wrap">
			<svg class="donut" viewBox="0 0 200 200" role="img" aria-label={summary}>
				<g transform="rotate(-90 100 100)">
					{#each arcs as arc (arc.index)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<circle
							class="arc"
							class:dim={active !== null && active !== arc.index}
							class:on={active === arc.index}
							cx="100"
							cy="100"
							r={RADIUS}
							fill="none"
							stroke={arc.color}
							stroke-width={STROKE}
							stroke-dasharray={arc.length.toFixed(2) + ' ' + (CIRC - arc.length).toFixed(2)}
							stroke-dashoffset={(-arc.offset).toFixed(2)}
							style="--i: {arc.index}; --circ: {CIRC.toFixed(2)}"
							onmouseenter={() => (active = arc.index)}
							onmouseleave={() => (active = null)}
						/>
					{/each}
				</g>
			</svg>
			<div class="center">
				<span class="center-label">Despesas</span>
				<strong class="center-value">{formatBRL(total)}</strong>
			</div>
		</div>

		<ul class="legend">
			{#each rows as row, index}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<li
					class="legend-row"
					class:on={active === index}
					class:dim={active !== null && active !== index}
					tabindex="0"
					onmouseenter={() => (active = index)}
					onmouseleave={() => (active = null)}
					onfocus={() => (active = index)}
					onblur={() => (active = null)}
				>
					<span class="swatch" style="background: {row.color}"></span>
					<span class="icon" aria-hidden="true">{row.icon ?? ''}</span>
					<span class="name">{row.name}</span>
					<span class="value">{formatBRL(row.value)}</span>
					<span class="pct">{row.pct}%</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.placeholder { margin: 0; display: grid; place-items: center; padding: 1.5rem 1rem; text-align: center; color: var(--muted); font-size: 0.88rem; }
	.wrap { display: grid; gap: 1.15rem; align-items: center; }
	.donut-wrap { position: relative; width: min(13rem, 100%); aspect-ratio: 1 / 1; margin: 0 auto; }
	.donut { display: block; width: 100%; height: 100%; }
	.center { position: absolute; inset: 0; display: grid; place-content: center; gap: 0.1rem; padding: 0 1.6rem; text-align: center; pointer-events: none; }
	.center-label { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
	.center-value { font-size: 0.98rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.arc { stroke-linecap: butt; animation: donut-draw 0.9s cubic-bezier(0.22, 0.9, 0.28, 1) both; animation-delay: calc(var(--i, 0) * 70ms); transition: opacity 0.2s ease, stroke-width 0.2s ease; }
	.arc.dim { opacity: 0.35; }
	.arc.on { stroke-width: 30; }
	.legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.15rem; }
	.legend-row { display: grid; grid-template-columns: 0.6rem 1.05rem minmax(0, 1fr) auto auto; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem; border-radius: 10px; outline: none; transition: background 0.15s ease, opacity 0.15s ease; }
	.legend-row.on { background: var(--surface-strong); }
	.legend-row.dim { opacity: 0.55; }
	.legend-row:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
	.swatch { width: 0.6rem; height: 0.6rem; border-radius: 999px; }
	.icon { font-size: 0.95rem; line-height: 1; text-align: center; }
	.name { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 0.86rem; }
	.value { font-size: 0.84rem; font-variant-numeric: tabular-nums; }
	.pct { min-width: 2.6rem; text-align: right; font-size: 0.78rem; color: var(--muted); font-variant-numeric: tabular-nums; }
	@keyframes donut-draw { from { stroke-dasharray: 0 var(--circ, 500); } }
		@media (prefers-reduced-motion: reduce) {
		.arc { animation: none; }
	}
</style>
