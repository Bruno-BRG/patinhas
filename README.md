# Finanças

Controle de receitas e despesas, pessoais e compartilhadas. Feito com SvelteKit 3, Svelte 5 e Cloudflare D1 (SQLite gerenciado), pronto para rodar no Cloudflare Pages.

## Funcionalidades

- Visão geral: resumo do mês, receitas x despesas dos últimos 6 meses, despesas por categoria, evolução do saldo e orçamentos.
- Lançamentos em planilha: busca, filtros, ordenação, edição, exclusão e exportação para CSV.
- Recorrentes: aluguel, salário e assinaturas viram lançamentos sozinhos no dia certo.
- Carteiras: bancos, cartões e carteiras, com saldo inicial, saldo calculado e transferências entre contas.
- Categorias: cor, ícone e orçamento mensal opcional.
- Grupos: a família ou a casa compartilha lançamentos, categorias e carteiras. Os convites são feitos por e-mail.
- Espaços: a barra no topo alterna entre o seu espaço pessoal e os grupos dos quais você participa.

## Rodar localmente

```bash
npm install
npm run db:migrate:local
npm run dev
```

Abra o endereço mostrado no terminal e crie sua conta. Para testar como no Cloudflare Pages (com o runtime do Workers):

```bash
npm run preview
```

## Publicar no Cloudflare Pages

1. **Crie o banco D1** (uma vez):

   ```bash
   npx wrangler d1 create financas
   ```

   Copie o `database_id` que aparece no terminal e cole em `wrangler.jsonc`, no campo `database_id`.

2. **Aplique as migrações no banco remoto:**

   ```bash
   npm run db:migrate:remote
   ```

3. **Conecte o repositório no Pages:** Workers & Pages → Create → Pages → Connect to Git → escolha este repositório. Use estas configurações de build:

   | Campo | Valor |
   | --- | --- |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `.svelte-kit/cloudflare` |
   | Variável `NODE_VERSION` | `24` |

4. **Confira o binding do D1** em Settings → Bindings. Deve existir um binding com nome `DB` apontando para o banco `financas`. Se o `wrangler.jsonc` já tiver o `database_id` correto, o Pages usa esse binding automaticamente.

5. **Variáveis opcionais** em Settings → Variables and Secrets:

   | Variável | Padrão | Uso |
   | --- | --- | --- |
   | `COOKIE_SECURE` | `false` | Use `true` no Pages (HTTPS). |
   | `APP_TIMEZONE` | `America/Sao_Paulo` | Fuso usado para escolher o mês atual e gerar recorrências. |

Depois do primeiro deploy, cada push para a branch principal publica uma nova versão.

## Segurança

- Qualquer pessoa com acesso ao endereço pode criar uma conta. Para uso privado, deixe o link restrito ou acrescente uma camada de acesso na frente do Pages (por exemplo, Cloudflare Access).
- Não há limite de tentativas de login nesta versão.
- As senhas são guardadas com PBKDF2-SHA256 (100 mil iterações).

## Estrutura

- `migrations/`: esquema do banco D1, aplicado pelo wrangler em ordem. Nunca edite uma migração já aplicada; crie uma nova.
- `src/lib/server/`: acesso ao banco (`db.ts`), autenticação, espaços, lançamentos, grupos e recorrências.
- `src/hooks.server.ts`: liga o binding `DB` a cada requisição e gera as recorrências vencidas.

## Dados de uma instalação anterior

A versão anterior guardava os dados em um arquivo SQLite local (`data/financas.db`). Esse arquivo não é migrado automaticamente para o D1. As senhas também mudaram de formato, então as contas precisam ser criadas de novo no novo banco.
