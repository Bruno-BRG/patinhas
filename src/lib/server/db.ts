import { env } from 'cloudflare:workers';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

/**
 * Acesso ao banco D1 (SQLite gerenciado pelo Cloudflare).
 * O binding DB vem do wrangler.jsonc. As tabelas vêm das migrações em migrations/,
 * aplicadas com o wrangler (npm run db:migrate:local ou db:migrate:remote).
 */
export type Param = string | number | null;

function d1(): D1Database {
	return env.DB;
}

/** Instrução preparada, pronta para run() ou para um batch(). */
export function statement(sql: string, ...params: Param[]): D1PreparedStatement {
	return d1().prepare(sql).bind(...params);
}

export async function all<T>(sql: string, ...params: Param[]): Promise<T[]> {
	const { results } = await statement(sql, ...params).all<T>();
	return results;
}

export async function get<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
	const row = await statement(sql, ...params).first<T>();
	return row ?? undefined;
}

export async function run(sql: string, ...params: Param[]): Promise<{ changes: number }> {
	const result = await statement(sql, ...params).run();
	return { changes: result.meta.changes ?? 0 };
}

/** Executa várias instruções em uma única transação: ou todas gravam, ou nenhuma. Use quando não há leitura no meio. */
export async function batch(statements: D1PreparedStatement[]): Promise<void> {
	await d1().batch(statements);
}
