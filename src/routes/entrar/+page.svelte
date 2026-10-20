<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let mode = $state<'login' | 'register'>('login');
	let loading = $state(false);

	$effect(() => {
		if (form?.mode) mode = form.mode;
	});

	const emailValue = $derived(form?.email ?? '');
	const nameValue = $derived(form && form.mode === 'register' ? form.name : '');

	const busy = () => {
		loading = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			loading = false;
			await update();
		};
	};
</script>

<svelte:head>
	<title>Entrar · Finanças</title>
</svelte:head>

<div class="auth">
	<section class="pitch">
		<span class="mark"><Icon name="wallet" size={26} /></span>
		<h1>Suas finanças, <span class="gradient-text">num só lugar.</span></h1>
		<p>Registre receitas e despesas em segundos, veja os gráficos do mês e compartilhe tudo com quem divide as contas.</p>
		<ul>
			<li><Icon name="table" size={18} /> Planilha com filtros, ordenação e exportação para Excel</li>
			<li><Icon name="chart" size={18} /> Gráficos de despesas por categoria e evolução do saldo</li>
			<li><Icon name="users" size={18} /> Grupos para a família, com convites por e-mail</li>
		</ul>
	</section>

	<section class="card card-pad panel">
		<div class="segmented switch" role="tablist" aria-label="Como você quer entrar">
			<button type="button" role="tab" aria-selected={mode === 'login'} class:active={mode === 'login'} onclick={() => (mode = 'login')}>
				Entrar
			</button>
			<button type="button" role="tab" aria-selected={mode === 'register'} class:active={mode === 'register'} onclick={() => (mode = 'register')}>
				Criar conta
			</button>
		</div>

		{#if form?.error}
			<p class="form-error" role="alert">{form.error}</p>
		{/if}

		{#if mode === 'login'}
			<form class="form" method="POST" action="?/login" use:enhance={busy}>
				<input type="hidden" name="para" value={data.para} />
				<label class="field">
					<span class="label">E-mail</span>
					<input class="input" type="email" name="email" autocomplete="email" required value={emailValue} />
				</label>
				<label class="field">
					<span class="label">Senha</span>
					<input class="input" type="password" name="password" autocomplete="current-password" required />
				</label>
				<button class="btn btn-primary wide" type="submit" disabled={loading}>
					{loading ? 'Entrando…' : 'Entrar'}
				</button>
			</form>
		{:else}
			<form class="form" method="POST" action="?/register" use:enhance={busy}>
				<label class="field">
					<span class="label">Seu nome</span>
					<input class="input" name="name" autocomplete="name" maxlength="60" required value={nameValue} />
				</label>
				<label class="field">
					<span class="label">E-mail</span>
					<input class="input" type="email" name="email" autocomplete="email" required value={emailValue} />
				</label>
				<label class="field">
					<span class="label">Senha <span class="hint">mínimo de 8 caracteres</span></span>
					<input class="input" type="password" name="password" autocomplete="new-password" minlength="8" required />
				</label>
				<button class="btn btn-primary wide" type="submit" disabled={loading}>
					{loading ? 'Criando conta…' : 'Criar conta'}
				</button>
			</form>
		{/if}
	</section>
</div>

<style>
	.auth {
		min-height: 100dvh;
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(320px, 420px);
		align-items: center;
		gap: clamp(1.5rem, 5vw, 4rem);
		padding: clamp(1.25rem, 4vw, 3rem);
		max-width: 1100px;
		margin: 0 auto;
	}

	.pitch {
		display: grid;
		gap: 1rem;
	}

	.mark {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 16px;
		background: var(--inverse);
		color: var(--ink-inverse);
		box-shadow: var(--glow);
	}

	h1 {
		margin: 0.4rem 0 0;
		font-size: clamp(2rem, 4.5vw, 3.2rem);
		line-height: 1.05;
		letter-spacing: -0.035em;
	}

	.pitch p {
		margin: 0;
		max-width: 46ch;
		color: var(--muted);
		font-size: 1.05rem;
	}

	ul {
		display: grid;
		gap: 0.65rem;
		margin: 0.6rem 0 0;
		padding: 0;
		list-style: none;
		color: var(--text);
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	li :global(svg) {
		color: var(--accent-2);
	}

	.panel {
		display: grid;
		gap: 1.1rem;
	}

	.switch {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.switch button {
		justify-content: center;
	}

	.form {
		display: grid;
		gap: 0.9rem;
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
		font-weight: 500;
		opacity: 0.7;
	}

	.wide {
		width: 100%;
		height: 2.9rem;
		margin-top: 0.3rem;
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

	@media (max-width: 860px) {
		.auth {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
