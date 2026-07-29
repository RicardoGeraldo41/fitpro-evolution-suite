Plano dividido em 4 blocos entregáveis em sequência. Cada bloco encerra com o sistema funcional — nada fica pela metade.

## Bloco 1 — Refatoração UI legada → React puro
- Remover a injeção do `APP_JS` (vanilla) em `src/routes/index.tsx`. A rota `/` vira apenas landing pública + CTA de login.
- Consolidar layout autenticado em `src/routes/_authenticated/route.tsx` com `SidebarProvider` + `AppSidebar` (shadcn) já existente.
- Padronizar todas as telas em `_authenticated/*.tsx` com: `useSuspenseQuery` + `queryOptions`, formulários com `react-hook-form` + `zod`, toasts `sonner`.
- Deletar objetos globais `window.__fp` e helpers vanilla.

## Bloco 2 — Novos módulos de domínio
Migração SQL (com GRANT + RLS por academia):
- `medidas_corporais` (peso, %gordura, cintura, quadril, braço, coxa, foto_frente, foto_lado, foto_costas, data)
- `alimentos` (catálogo por academia: nome, kcal, prot, carb, gord por 100g)
- `planos_alimentares` + `refeicoes_plano` (nome, horário, itens jsonb com alimento_id/quantidade)
- Bucket privado `evolucao-fotos` com RLS por `academia_id/aluno_id`.
Telas novas:
- `/medidas` — histórico + gráfico (Recharts) + upload de fotos lado a lado.
- `/alimentacao` — CRUD de plano alimentar, cálculo automático de macros diários.

## Bloco 3 — Gamificação
Migração SQL:
- `conquistas` (código, nome, descrição, icone, xp)
- `conquistas_usuario` (user_id, conquista_id, unlocked_at)
- `pontos_xp` (user_id, xp_total, nivel) — trigger recalcula nível a cada insert em conquistas_usuario.
- Seeds: 8 conquistas iniciais (Primeiro Treino, 7 dias seguidos, PR de carga, etc).
Telas:
- `/ranking` — top 20 alunos da academia por XP.
- Widget de progresso/nível no `/dashboard` do aluno.

## Bloco 4 — Redesign Dark Premium + Auditoria
- Redesign do design system em `src/styles.css`: paleta OKLCH escura (base `oklch(0.14 0.02 270)`, primary violeta neon, accent rosa), superfícies glassmorphism via `--gradient-glass` e `--shadow-elegant`. Tokens semânticos, zero cor hardcoded.
- Sidebar, cards, botões e tabelas remapeados para os novos tokens.
- Migração `audit_logs` (user_id, academia_id, acao, entidade, entidade_id, payload jsonb, ip, created_at) + trigger genérico registrando INSERT/UPDATE/DELETE em `alunos`, `vendas`, `recorrencias`, `treinos`.
- Tela `/auditoria` (somente DONO/ADMIN) com filtros por data/usuário/ação.

## Detalhes técnicos
- Server functions em `src/lib/*.functions.ts` com `.middleware([requireSupabaseAuth])`; helpers privados em `*.server.ts`.
- Upload de fotos via `supabase.storage.from('evolucao-fotos').upload(...)` no client autenticado.
- Todos os SELECTs continuam filtrados por `private.current_academia_id()` (já em vigor).
- `audit_logs`: `service_role` full, `authenticated` só SELECT quando `is_staff_na_academia()`.

## Execução
Vou entregar Bloco 1 e Bloco 4 (design + auditoria) primeiro, depois Bloco 2 e Bloco 3. Cada bloco: migração SQL (aprovação sua) → código → verificação. Confirma que posso começar?
