import type { ActionResult } from '$app/forms';

/** Mensagem legível para um formulário que não deu certo. */
export function failureMessage(result: ActionResult): string {
	if (result.type === 'failure') {
		const data = result.data as { error?: string } | undefined;
		if (data?.error) return data.error;
	}
	return 'Não foi possível concluir agora. Tente de novo.';
}
