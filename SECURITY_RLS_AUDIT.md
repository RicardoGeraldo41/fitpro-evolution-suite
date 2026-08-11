# SECURITY_RLS_AUDIT — Isolamento Multi-Tenant (Studio Xtreme Workout / FitPro Evolution Suite)

Data: 2026-08-11 · Escopo: apenas RLS, funções `private.*` e autorização. Nenhuma alteração de UI, rotas ou regras de negócio.

## 1. Vulnerabilidades encontradas

| # | Gravidade | Descrição |
|---|-----------|-----------|
| 1 | Crítica | Policies legadas globais usando `private.is_staff(auth.uid())` / `private.has_role(auth.uid(), ...)` **sem validar `academia_id`** em: `alunos`, `aulas`, `produtos`, `vendas`, `recorrencias`, `treinos`, `avaliacoes`, `historico_cargas_treino`, `profiles`, `user_roles`. Como policies são OR-adas, qualquer DONO/ADMIN de qualquer academia lia e escrevia dados de **todas** as academias. |
| 2 | Crítica | `private.current_academia_id()` retornava `profiles.academia_atual_id` sem verificar vínculo. Como o usuário pode atualizar o próprio profile, bastava apontar `academia_atual_id` para outra academia para ler tabelas cujo único filtro era `academia_id = private.current_academia_id()` (`aulas`, `produtos`, `planos`, `alimentos`, `pontos_xp`, `conquistas_usuario`). |
| 3 | Alta | `profiles_self_read` / `profiles_self_update` permitiam que staff de qualquer academia lesse e alterasse o perfil (PII: nome, e-mail) de qualquer usuário da plataforma. |
| 4 | Alta | `user_roles_admin_manage` permitia que staff de qualquer academia criasse/removesse papéis em qualquer academia (escalada de privilégio cross-tenant). |
| 5 | Média | `profiles_staff_insert` permitia inserir perfis arbitrários. Agora apenas o próprio (`id = auth.uid()`); criação por gestor continua via server function com service role. |
| 6 | Média | Policies com `TO public` (inclui `anon`) em várias tabelas; recriadas com `TO authenticated`. |

## 2. Funções auditadas e corrigidas (schema `private`)

- `current_academia_id()` — agora só retorna `academia_atual_id` se existir `user_roles` do usuário naquela academia; caso contrário `NULL`.
- `pode_acessar_academia(uid, academia)` — endurecida contra `NULL` (evita `NULL = NULL` implícito em comparações permissivas).
- `is_staff_na_academia(uid, academia)` — endurecida contra `NULL`; DONO/ADMIN naquela academia.
- `has_role_na_academia(uid, academia, role)` — endurecida contra `NULL`.
- `is_staff(uid)` / `has_role(uid, role)` — mantidas (globais por natureza), mas **não são mais usadas em nenhuma policy**. Verificado: `pg_policies` não contém mais referência a elas.
- Novas: `e_aluno_do_personal(uid, aluno_id)` (aluno vinculado ao personal, com papel PERSONAL na academia do aluno) e `e_proprio_aluno(uid, aluno_id)`.
- `REVOKE EXECUTE` de `PUBLIC`/`anon`/`authenticated` em todas as funções do schema `private`.

## 3. Regras finais por role

- **DONO** — dados apenas das academias onde possui `user_roles.role = 'DONO'`; único que gerencia `user_roles` da própria academia; atualiza a própria academia.
- **ADMIN** — leitura/escrita operacional apenas na academia onde possui o papel.
- **PERSONAL** — leitura da academia onde possui o papel (alunos, aulas, treinos, avaliações, histórico); escrita restrita aos alunos com `personal_id = auth.uid()`.
- **ALUNO** — apenas os próprios registros: cadastro (`alunos.profile_id`), treinos, avaliações, medidas, histórico de cargas, recorrências, pagamentos, matrículas, acessos, agendamentos e plano alimentar, todos resolvidos por `aluno_id → alunos.profile_id = auth.uid()`.
- **anon** — sem acesso a nenhuma tabela multi-tenant.

## 4. Tabelas protegidas (todas com RLS habilitada e tenant validado)

`profiles`, `user_roles`, `academias`, `alunos`, `produtos`, `vendas`, `recorrencias`, `treinos`, `historico_cargas_treino`, `avaliacoes`, `aulas`, `planos`, `matriculas`, `pagamentos`, `acessos`, `agendamentos`, `medidas_corporais`, `alimentos`, `planos_alimentares`, `conquistas_usuario`, `pontos_xp`, `audit_logs`.

`conquistas` é catálogo global somente leitura (sem dados de tenant) — leitura liberada a usuários autenticados por decisão de produto.

## 5. Verificação

- Consulta a `pg_policies` filtrando `is_staff(` e `has_role(auth` no schema `public`: **0 linhas** (nenhuma policy cross-tenant remanescente).
- Linter de segurança do banco: **nenhum problema encontrado**.

## 6. Riscos residuais

- `acessos.aluno_id`, `agendamentos.aluno_id` etc. dependem de o app enviar IDs coerentes; a RLS bloqueia o cruzamento, mas `academia_id` continua sendo enviado pelo cliente em inserts — sempre validado contra `user_roles` no `WITH CHECK`, nunca aceito sozinho.
- Server functions que usam `service_role` (`equipe.functions.ts`) ignoram RLS por design; a autorização é feita em código (`contextoGestor`) exigindo DONO/ADMIN na academia. Recomenda-se manter esse gate em qualquer nova função admin.
- Usuários com papéis em múltiplas academias veem dados de todas elas (comportamento desejado), determinados por `academia_atual_id` já validado.
- Storage (`evolucao-fotos`): policies do bucket não fizeram parte deste escopo.

## 7. Resultado de typecheck / lint / build

- **Typecheck (`tsgo --noEmit`)**: OK — exit 0, nenhum erro.
- **Build (`bun run build`)**: OK — exit 0, build gerado com sucesso.
- **Lint (`bun run lint`)**: exit 1 — 1533 erros, **todos** da regra `prettier/prettier` (formatação) e **pré-existentes** em arquivos de UI não tocados nesta tarefa. Nenhum erro de lint originado por esta alteração (a migration não modificou código TypeScript). Correção de formatação ficou fora de escopo por exigir alterar arquivos de UI.
