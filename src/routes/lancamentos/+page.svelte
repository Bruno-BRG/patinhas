<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import LedgerTable from '$lib/components/ledger/LedgerTable.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { failureMessage } from '$lib/feedback';
	import { formatBRL } from '$lib/money';
	import { openTransaction } from '$lib/ui.svelte';
	import type { Transaction } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let pendingDelete = $state<Transaction | null>(null);
	let deleteError = $state('');
	let deleting = $state(false);

	const deleteAction: SubmitFunction = () => {
		deleting = true;
		deleteError = '';
		return async ({ result, update }) => {
			deleting = false;
			if (result.type === 'success') {
				pendingDelete = null;
				await update();
			} else {
				deleteError = failureMessage(result);
			}
		};
	};
</script>

<svelte:head>
	<title>Lançamentos · Finanças</title>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow">Planilha · {data.scope.name}</p>
		<h1 class="title">Lançamentos</h1>
		<p class="subtitle">Filtre, ordene e exporte tudo o que foi registrado. Clique numa linha para editar.</p>
	</div>
</section>

<LedgerTable
	rows={data.transactions}
	accounts={data.accounts}
	categories={data.categories}
	onedit={(t) => openTransaction({ transaction: t })}
	ondelete={(t) => {
		pendingDelete = t;
		deleteError = '';
	}}
	filename="lancamentos"
/>

{#if pendingDelete}
	{@const target = pendingDelete}
	<Modal title={target.transferId ? 'Excluir transferência' : 'Excluir lançamento'} onclose={() => (pendingDelete = null)}>
		<p class="muted">
			<strong class="strong">{target.description}</strong> · {formatBRL(target.amountCents)} · {target.occurredOn}.
			Essa ação não pode ser desfeita.
		</p>
		{#if target.transferId}
			<p class="muted transfer-note">Esta é uma transferência entre contas. Ao excluir, as duas pontas somem juntas: a saída e a entrada.</p>
		{/if}
		{#if deleteError}
			<p class="form-error" role="alert">{deleteError}</p>
		{/if}
		<form class="confirm" method="POST" action="?/delete" use:enhance={deleteAction}>
			<input type="hidden" name="id" value={target.id} />
			<button type="button" class="btn btn-ghost" onclick={() => (pendingDelete = null)}>Cancelar</button>
			<button type="submit" class="btn btn-danger" disabled={deleting}>
				{deleting ? 'Excluindo…' : target.transferId ? 'Excluir transferência' : 'Excluir lançamento'}
			</button>
		</form>
	</Modal>
{/if}

<style>
	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.strong {
		color: var(--text);
	}

	.confirm {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 1.1rem;
	}

	.form-error {
		margin: 0.9rem 0 0;
		padding: 0.7rem 0.9rem;
		border-radius: 12px;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text);
		font-size: 0.9rem;
	}
</style>
