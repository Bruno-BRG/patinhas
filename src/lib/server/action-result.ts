import { fail } from '@sveltejs/kit';
import { UserError } from './validate';

/** Erros previstos viram mensagem no formulário. Erros inesperados viram uma mensagem genérica e vão para o log. */
export function actionFailure(error: unknown) {
	if (error instanceof UserError) return fail(400, { error: error.message });
	console.error(error);
	return fail(500, { error: 'Algo inesperado aconteceu. Tente de novo em instantes.' });
}
