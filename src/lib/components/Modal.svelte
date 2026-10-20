<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		title,
		onclose,
		children,
		width = 'min(560px, 100%)'
	}: {
		title: string;
		onclose: () => void;
		children: Snippet;
		width?: string;
	} = $props();

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
	}

	function onBackdrop(event: MouseEvent) {
		if (event.target === event.currentTarget) onclose();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" role="presentation" onmousedown={onBackdrop}>
	<div class="modal" role="dialog" aria-modal="true" aria-label={title} style:width>
		<header class="head">
			<h2>{title}</h2>
			<button class="btn btn-ghost btn-sm btn-icon" type="button" aria-label="Fechar" onclick={onclose}>
				<Icon name="x" size={16} />
			</button>
		</header>
		{@render children()}
	</div>
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.1rem;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 720;
		letter-spacing: -0.015em;
	}
</style>
