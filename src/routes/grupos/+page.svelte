<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import { failureMessage } from '$lib/feedback';
	import { initials } from '$lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let message = $state('');
	let error = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	function notify(text: string, isError = false) {
		message = isError ? '' : text;
		error = isError ? text : '';
		clearTimeout(timer);
		timer = setTimeout(() => {
			message = '';
			error = '';
		}, 4500);
	}

	/** Cria a ação de um formulário: mostra a mensagem e recarrega os dados. */
	function act(ok: string, confirmText?: string): SubmitFunction {
		return ({ cancel }) => {
			if (confirmText && !confirm(confirmText)) {
				cancel();
				return;
			}
			return async ({ result, update }) => {
				if (result.type === 'success') {
					notify(ok);
					await update();
				} else if (result.type === 'failure') {
					notify(failureMessage(result), true);
				} else {
					await update();
				}
			};
		};
	}
</script>

<svelte:head>
	<title>Grupos · Finanças</title>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow">Família e compartilhamento</p>
		<h1 class="title">Grupos</h1>
		<p class="subtitle">Compartilhe lançamentos, categorias e contas com quem divide as despesas.</p>
	</div>
</section>

{#if message}
	<p class="toast ok" role="status">{message}</p>
{/if}
{#if error}
	<p class="toast err" role="alert">{error}</p>
{/if}

<form class="card card-pad create" method="POST" action="?/create" use:enhance={act('Grupo criado! Ele já aparece na barra de espaços.')}>
	<div>
		<p class="eyebrow">Novo grupo</p>
		<h2>Compartilhe as contas com quem divide a casa</h2>
		<p class="muted">Crie um grupo para a família, a casa ou uma viagem. Quem entrar vê e edita os lançamentos do grupo.</p>
	</div>
	<div class="create-row">
		<input class="input" name="name" minlength="2" maxlength="40" placeholder="Ex.: Família Silva" required />
		<button class="btn btn-primary" type="submit"><Icon name="plus" size={17} /> Criar grupo</button>
	</div>
</form>

{#if data.invites.length > 0}
	<section class="card card-pad">
		<p class="eyebrow">Convites para você</p>
		<div class="invite-list">
			{#each data.invites as invite (invite.id)}
				<article class="invite-row">
					<span class="bubble">{initials(invite.groupName)}</span>
					<div class="grow">
						<strong>{invite.groupName}</strong>
						<small>{invite.invitedByName} convidou você</small>
					</div>
					<form method="POST" action="?/accept" use:enhance={act('Você entrou no grupo ' + invite.groupName + '.')}>
						<input type="hidden" name="inviteId" value={invite.id} />
						<button class="btn btn-primary btn-sm" type="submit">Aceitar</button>
					</form>
					<form method="POST" action="?/decline" use:enhance={act('Convite recusado.')}>
						<input type="hidden" name="inviteId" value={invite.id} />
						<button class="btn btn-ghost btn-sm" type="submit">Recusar</button>
					</form>
				</article>
			{/each}
		</div>
	</section>
{/if}

{#if data.groups.length === 0}
	<div class="card empty">
		<Icon name="users" size={28} />
		<strong>Você ainda não tem grupos</strong>
		<p class="muted">Crie um grupo acima para dividir despesas com a família ou com quem mora com você.</p>
	</div>
{:else}
	<section class="groups">
		{#each data.groups as group (group.id)}
			<article class="card card-pad group">
				<header class="group-head">
					<div>
						<p class="eyebrow">{group.role === 'owner' ? 'Você criou este grupo' : 'Você participa'}</p>
						<h2>{group.name}</h2>
					</div>
					<span class="chip">{group.members.length} {group.members.length === 1 ? 'pessoa' : 'pessoas'}</span>
				</header>

				<ul class="members">
					{#each group.members as member (member.id)}
						<li>
							<span class="avatar">{initials(member.name)}</span>
							<div class="grow">
								<strong>{member.name}{member.id === data.user?.id ? ' (você)' : ''}</strong>
								<small>{member.email}</small>
							</div>
							<span class="chip" class:owner={member.role === 'owner'}>{member.role === 'owner' ? 'Dono' : 'Membro'}</span>
							{#if group.role === 'owner' && member.role !== 'owner'}
								<form method="POST" action="?/remove" use:enhance={act('Membro removido do grupo.', 'Remover ' + member.name + ' deste grupo?')}>
									<input type="hidden" name="groupId" value={group.id} />
									<input type="hidden" name="userId" value={member.id} />
									<button class="btn btn-ghost btn-sm" type="submit">Remover</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>

				{#if group.invites.length > 0}
					<div class="pending">
						<p class="eyebrow">Convites pendentes</p>
						<ul>
							{#each group.invites as invite (invite.id)}
								<li>
									<span class="grow">{invite.email} <small class="muted">· convidado por {invite.invitedByName}</small></span>
									<form
										method="POST"
										action="?/cancelInvite"
										use:enhance={act('Convite cancelado.', 'Cancelar o convite para ' + invite.email + '?')}
									>
										<input type="hidden" name="groupId" value={group.id} />
										<input type="hidden" name="inviteId" value={invite.id} />
										<button class="btn btn-ghost btn-sm" type="submit">Cancelar</button>
									</form>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<form class="invite" method="POST" action="?/invite" use:enhance={act('Convite enviado. A pessoa verá o convite ao entrar com este e-mail.')}>
					<input type="hidden" name="groupId" value={group.id} />
					<input class="input" type="email" name="email" placeholder="E-mail de quem você quer convidar" required />
					<button class="btn btn-primary" type="submit"><Icon name="mail" size={16} /> Convidar</button>
				</form>

				<footer class="group-foot">
					{#if group.role === 'owner'}
						<form
							method="POST"
							action="?/delete"
							use:enhance={act('Grupo excluído.', 'Excluir o grupo ' + group.name + '? Os lançamentos dele também serão apagados.')}
						>
							<input type="hidden" name="groupId" value={group.id} />
							<button class="btn btn-danger btn-sm" type="submit"><Icon name="trash" size={14} /> Excluir grupo</button>
						</form>
					{:else}
						<form method="POST" action="?/leave" use:enhance={act('Você saiu do grupo.', 'Sair do grupo ' + group.name + '?')}>
							<input type="hidden" name="groupId" value={group.id} />
							<button class="btn btn-ghost btn-sm" type="submit">Sair do grupo</button>
						</form>
					{/if}
				</footer>
			</article>
		{/each}
	</section>
{/if}

<style>
	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.create {
		display: grid;
		gap: 1rem;
	}

	.create h2 {
		margin: 0.2rem 0 0.3rem;
		font-size: 1.2rem;
		letter-spacing: -0.02em;
	}

	.create p {
		margin: 0;
	}

	.create-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.create-row .input {
		flex: 1 1 240px;
	}

	.toast {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 14px;
		font-weight: 600;
		font-size: 0.92rem;
	}

	.toast.ok {
		background: var(--surface-strong);
		border: 1px solid var(--border-strong);
		color: var(--text);
	}

	.toast.err {
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text);
	}

	.invite-list {
		display: grid;
		gap: 0.6rem;
		margin-top: 0.8rem;
	}

	.invite-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem;
		border-radius: 16px;
		border: 1px solid var(--border);
		background: rgba(255, 255, 255, 0.02);
	}

	.invite-row form {
		display: contents;
	}

	.invite-row .grow {
		flex: 1;
		min-width: 0;
		display: grid;
	}

	.invite-row small,
	.members small {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.bubble,
	.avatar {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 13px;
		background: var(--inverse);
		color: var(--ink-inverse);
		font-size: 0.8rem;
		font-weight: 800;
	}

	.groups {
		display: grid;
		gap: 1rem;
	}

	.group {
		display: grid;
		gap: 1rem;
	}

	.group-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.group-head h2 {
		margin: 0.15rem 0 0;
		font-size: 1.25rem;
		letter-spacing: -0.02em;
	}

	.chip.owner {
		color: var(--text);
		border-color: var(--border-strong);
		background: var(--surface-strong);
	}

	.members,
	.pending ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.55rem;
	}

	.members li,
	.pending li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.7rem;
	}

	.members li > div {
		flex: 1;
		min-width: 0;
		display: grid;
	}

	.members strong {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pending {
		display: grid;
		gap: 0.5rem;
		padding-top: 0.2rem;
	}

	.pending li .grow {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.invite {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.invite .input {
		flex: 1 1 260px;
	}

	.group-foot {
		display: flex;
		justify-content: flex-end;
		padding-top: 0.2rem;
		border-top: 1px solid var(--border);
		margin-top: 0.2rem;
		padding-top: 0.9rem;
	}

	.empty {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
	}
</style>
