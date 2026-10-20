import type { Cookies } from '@sveltejs/kit';
import { batch, get, run, statement } from './db';
import { seedDefaultStatements } from './defaults';

export const SESSION_COOKIE = 'financas_session';
const SESSION_DAYS = 30;
/** Limite de iterações do PBKDF2 no runtime do Cloudflare Workers. */
const PBKDF2_ITERATIONS = 100_000;

export type SessionUser = { id: string; name: string; email: string };
type UserRecord = SessionUser & { password_hash: string };
type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();

export function normalizeEmail(value: unknown): string {
	return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(email: string): boolean {
	return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toBase64(bytes: Bytes): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function fromBase64(value: string): Bytes {
	return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toBase64Url(bytes: Bytes): string {
	return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function derive(password: string, salt: Bytes, iterations: number): Promise<Bytes> {
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
	return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await derive(password, salt, PBKDF2_ITERATIONS);
	return ['pbkdf2-sha256', PBKDF2_ITERATIONS, toBase64(salt), toBase64(key)].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [scheme, iterationsRaw, saltB64, keyB64] = stored.split('$');
	const iterations = Number(iterationsRaw);
	if (scheme !== 'pbkdf2-sha256' || !Number.isInteger(iterations) || iterations < 1 || !saltB64 || !keyB64) return false;
	const expected = fromBase64(keyB64);
	const actual = await derive(password, fromBase64(saltB64), iterations);
	if (expected.length !== actual.length) return false;
	let difference = 0;
	for (let i = 0; i < expected.length; i += 1) difference |= expected[i] ^ actual[i];
	return difference === 0;
}

export function findUserByEmail(email: string): Promise<UserRecord | undefined> {
	return get<UserRecord>('SELECT id, name, email, password_hash FROM users WHERE email = ?', email);
}

/** Cria a conta e as categorias iniciais em uma única gravação atômica. */
export async function registerUser(name: string, email: string, password: string): Promise<SessionUser> {
	const id = crypto.randomUUID();
	const passwordHash = await hashPassword(password);
	await batch([
		statement('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)', id, name, email, passwordHash),
		...seedDefaultStatements(id, null)
	]);
	return { id, name, email };
}

const sha256 = async (value: string) => toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

export async function startSession(cookies: Cookies, userId: string) {
	const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
	const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
	await run('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', await sha256(token), userId, expiresAt);
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.COOKIE_SECURE === 'true',
		maxAge: Math.round((expiresAt - Date.now()) / 1000)
	});
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
	const row = await get<SessionUser & { expires_at: number }>(
		'SELECT u.id, u.name, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?',
		await sha256(token)
	);
	if (!row) return null;
	if (row.expires_at < Date.now()) {
		await run('DELETE FROM sessions WHERE id = ?', await sha256(token));
		return null;
	}
	return { id: row.id, name: row.name, email: row.email };
}

export async function endSession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await run('DELETE FROM sessions WHERE id = ?', await sha256(token));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function purgeExpiredSessions() {
	await run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
}
