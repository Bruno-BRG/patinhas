<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
	<title>Algo deu errado · Finanças</title>
</svelte:head>

<div class="error-wrap">
	<div class="card card-pad error-card">
		<span class="mark"><Icon name="sparkles" size={22} /></span>
		<p class="eyebrow">Erro {page.status}</p>
		<h1>Não foi possível abrir esta página</h1>
		<p class="muted">{page.error?.message ?? 'Tente de novo em instantes.'}</p>
		<a class="btn btn-primary" href="/">Voltar ao início</a>
	</div>
</div>

<style>
	.error-wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}

	.error-card {
		display: grid;
		justify-items: start;
		gap: 0.6rem;
		width: min(480px, 100%);
	}

	.mark {
		display: grid;
		place-items: center;
		width: 2.8rem;
		height: 2.8rem;
		border-radius: 14px;
		background: var(--inverse);
		color: var(--ink-inverse);
	}

	h1 {
		margin: 0.2rem 0 0;
		font-size: 1.4rem;
		letter-spacing: -0.02em;
	}
</style>
