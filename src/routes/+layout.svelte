<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import { firstName, initials } from '$lib/format';
	import { closeTransaction, openTransaction, ui } from '$lib/ui.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const nav = [
		{ href: '/', label: 'Visão geral', icon: 'home' },
		{ href: '/lancamentos', label: 'Lançamentos', icon: 'table' },
		{ href: '/recorrentes', label: 'Recorrentes', icon: 'clock' },
		{ href: '/carteiras', label: 'Carteiras', icon: 'wallet' },
		{ href: '/categorias', label: 'Categorias', icon: 'tag' },
		{ href: '/grupos', label: 'Grupos', icon: 'users' }
	];

	const spaces = $derived([
		{ id: 'eu', name: 'Meu espaço', group: false },
		...data.groups.map((group) => ({ id: group.id, name: group.name, group: true }))
	]);

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<title>Finanças</title>
</svelte:head>

{#if data.user && data.scope}
	<div class="shell">
		<aside class="sidebar">
			<a class="brand" href="/">
				<span class="brand-text">
					<strong>Finanças</strong>
					<small>seu dinheiro, no seu ritmo</small>
				</span>
			</a>

			<nav class="nav" aria-label="Principal">
				{#each nav as item (item.href)}
					<a
						class="nav-item"
						class:active={isActive(item.href)}
						href={item.href}
						aria-current={isActive(item.href) ? 'page' : undefined}
					>
						<Icon name={item.icon} />
						<span>{item.label}</span>
						{#if item.href === '/grupos' && data.invites > 0}
							<span class="count" aria-label="{data.invites} convites pendentes">{data.invites}</span>
						{/if}
					</a>
				{/each}
			</nav>

			<div class="sidebar-foot">
				<div class="me">
					<span class="avatar">{initials(data.user.name)}</span>
					<div class="me-text">
						<strong>{firstName(data.user.name)}</strong>
						<small title={data.user.email}>{data.user.email}</small>
					</div>
				</div>
				<form method="POST" action="/sair">
					<button class="btn btn-ghost btn-sm logout" type="submit">
						<Icon name="logout" size={16} /> Sair
					</button>
				</form>
			</div>
		</aside>

		<div class="main">
			<header class="topbar">
				<form class="spaces" method="POST" action="/espaco" use:enhance>
					<input type="hidden" name="next" value={page.url.pathname + page.url.search} />
					<div class="segmented" role="group" aria-label="Espaço ativo">
						{#each spaces as space (space.id)}
							<button
								type="submit"
								name="scope"
								value={space.id}
								class:active={space.id === data.scope.id}
								aria-pressed={space.id === data.scope.id}
							>
								<Icon name={space.group ? 'users' : 'user'} size={15} />
								{space.name}
							</button>
						{/each}
					</div>
				</form>
				<button class="btn btn-primary new-tx" type="button" onclick={() => openTransaction()}>
					<Icon name="plus" size={17} />
					Novo lançamento
				</button>
			</header>

			<main class="content">
				{@render children()}
			</main>
		</div>

		<nav class="mobile-nav" aria-label="Principal">
			{#each nav as item (item.href)}
				<a href={item.href} class:active={isActive(item.href)}>
					<Icon name={item.icon} size={20} />
					<span>{item.label}</span>
				</a>
			{/each}
		</nav>

		<button class="fab" type="button" aria-label="Novo lançamento" onclick={() => openTransaction()}>
			<Icon name="plus" size={24} />
		</button>
	</div>

	{#if ui.txOpen}
		<Modal title={ui.txEditing ? 'Editar lançamento' : 'Novo lançamento'} onclose={closeTransaction}>
			<TransactionForm
				categories={data.categories}
				accounts={data.accounts}
				today={data.today}
				transaction={ui.txEditing}
				kind={ui.txKind}
				onsaved={closeTransaction}
				oncancel={closeTransaction}
			/>
		</Modal>
	{/if}
{:else}
	{@render children()}
{/if}

<style>
	.shell {
		min-height: 100dvh;
		display: grid;
		grid-template-columns: 264px minmax(0, 1fr);
	}

	.sidebar {
		position: sticky;
		top: 0;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.4rem 1rem 1.1rem;
		border-right: 1px solid var(--border);
		background: var(--bg);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.25rem 0.5rem;
	}

	.brand-text {
		display: grid;
		line-height: 1.2;
	}

	.brand-text strong {
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: -0.025em;
	}

	.brand-text small {
		color: var(--muted);
		font-size: 0.74rem;
	}

	.nav {
		display: grid;
		gap: 0.25rem;
	}

	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.72rem 0.8rem;
		color: var(--muted);
		font-weight: 600;
		font-size: 0.95rem;
		transition: background-color 0.12s ease, color 0.12s ease;
	}

	.nav-item:hover {
		color: var(--text);
		background: var(--surface);
	}

	.nav-item.active {
		color: var(--text);
		background: var(--surface);
	}

	.nav-item.active::before {
		content: '';
		position: absolute;
		left: -1rem;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--inverse);
	}

	.count {
		margin-left: auto;
		min-width: 1.35rem;
		height: 1.35rem;
		padding: 0 0.35rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--text);
		color: var(--bg);
		font-size: 0.72rem;
		font-weight: 800;
	}

	.sidebar-foot {
		margin-top: auto;
		display: grid;
		gap: 0.7rem;
		padding: 0.9rem;
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.me {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		min-width: 0;
	}

	.avatar {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.3rem;
		height: 2.3rem;
		border: 1px solid var(--border-strong);
		background: var(--surface-strong);
		color: var(--text);
		font-size: 0.8rem;
		font-weight: 800;
	}

	.me-text {
		display: grid;
		min-width: 0;
	}

	.me-text strong {
		font-size: 0.92rem;
	}

	.me-text small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--muted);
		font-size: 0.74rem;
	}

	.logout {
		width: 100%;
		justify-content: center;
	}

	.main {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem clamp(1rem, 2.6vw, 2.4rem);
		background: var(--bg);
		border-bottom: 1px solid var(--border);
	}

	.spaces {
		min-width: 0;
	}

	.new-tx {
		flex: none;
	}

	.content {
		display: grid;
		gap: 1.5rem;
		padding: clamp(1rem, 2.6vw, 2.4rem);
		min-width: 0;
	}

	.mobile-nav,
	.fab {
		display: none;
	}

	@media (max-width: 960px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
		}

		.sidebar {
			display: none;
		}

		.new-tx {
			display: none;
		}

		.topbar {
			padding-top: 0.75rem;
			padding-bottom: 0.75rem;
		}

		.content {
			padding-bottom: 7rem;
		}

		.mobile-nav {
			position: fixed;
			left: 0.75rem;
			right: 0.75rem;
			bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
			z-index: 30;
			display: grid;
			grid-auto-flow: column;
			grid-auto-columns: 4.9rem;
			overflow-x: auto;
			scrollbar-width: none;
			gap: 0.2rem;
			padding: 0.4rem;
			border: 1px solid var(--border-strong);
			background: var(--bg);
		}

		.mobile-nav a {
			display: grid;
			justify-items: center;
			gap: 0.2rem;
			padding: 0.5rem 0.2rem;
			color: var(--muted);
			font-size: 0.68rem;
			font-weight: 600;
		}

		.mobile-nav a span {
			white-space: nowrap;
			line-height: 1.1;
		}

		.mobile-nav a.active {
			color: var(--text);
			box-shadow: inset 0 2px 0 var(--text);
		}

		.fab {
			position: fixed;
			right: 1rem;
			bottom: calc(5.6rem + env(safe-area-inset-bottom, 0px));
			z-index: 31;
			display: grid;
			place-items: center;
			width: 3.4rem;
			height: 3.4rem;
			border: 0;
			border-radius: 999px;
			color: var(--ink-inverse);
			background: var(--inverse);
		}
	}
</style>
