<script lang="ts">
	const PATHS: Record<string, string[]> = {
		home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
		table: ['M3 4h18v16H3z', 'M3 10h18', 'M3 15h18', 'M9 4v16'],
		wallet: ['M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11', 'M16 13h2'],
		tag: ['M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z', 'M7.5 7.5h.01'],
		users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
		user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
		logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
		plus: ['M12 5v14', 'M5 12h14'],
		edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
		trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
		search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-4.3-4.3'],
		download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
		'chevron-left': ['M15 18l-6-6 6-6'],
		'chevron-right': ['M9 18l6-6-6-6'],
		check: ['M20 6 9 17l-5-5'],
		x: ['M18 6 6 18', 'M6 6l12 12'],
		mail: ['M4 4h16v16H4z', 'M22 6l-10 7L2 6'],
		sparkles: ['M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z'],
		calendar: ['M3 4h18v18H3z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
		up: ['M12 19V5', 'M5 12l7-7 7 7'],
		down: ['M12 5v14', 'M19 12l-7 7-7-7'],
		crown: ['M3 8l4 4 5-7 5 7 4-4-2 11H5z'],
		layers: ['M12 2 2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
		target: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z', 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
		chart: ['M3 3v18h18', 'M7 15l4-4 3 3 5-6'],
		arrow: ['M5 12h14', 'M12 5l7 7-7 7'],
		clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
		menu: ['M3 6h18', 'M3 12h18', 'M3 18h18']
	};

	let { name, size = 18, strokeWidth = 2 }: { name: string; size?: number; strokeWidth?: number } = $props();
	const segments = $derived(PATHS[name] ?? []);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#each segments as d}
		<path {d} />
	{/each}
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
</style>
