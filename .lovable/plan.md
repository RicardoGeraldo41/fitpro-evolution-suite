
# Plano de Evolução — FitPro GYM2

Vou evoluir o ecossistema em 5 frentes, na ordem abaixo. Cada fase é independente e termina com o app funcional.

## Fase 1 — Multi-tenant por academia (fundação)

Sem isso, todo o resto fica preso a uma única unidade. É a mudança mais invasiva, então vem primeiro.

- Nova tabela `academias` (nome, cnpj, fuso, logo_url, plano_saas, status).
- Coluna `academia_id uuid not null` em: `alunos`, `produtos`, `vendas`, `recorrencias`, `treinos`, `historico_cargas_treino`, `avaliacoes`, `aulas`, `user_roles`.
- `profiles` ganha `academia_atual_id` (academia ativa quando o staff pertence a várias).
- Nova função `current_academia_id()` SECURITY DEFINER lendo de `profiles`.
- Todas as RLS reescritas: `academia_id = current_academia_id()` AND papel correspondente.
- `has_role` vira `has_role(_user_id, _academia_id, _role)`.
- Seed cria 1 academia demo "FitPro Matriz" e vincula as 4 contas demo.
- UI: switcher de academia no header (só para DONO multi-unidade).

## Fase 2 — IA via Lovable AI Gateway

Server functions usando `google/gemini-3-flash-preview` (sem secret manual).

- `gerarFichaTreinoIA({ aluno_id, objetivo, frequencia, restricoes })` → devolve JSON estruturado (divisão A/B/C, exercícios, séries, reps, cargas iniciais sugeridas) e grava em `treinos`.
- `analisarEvolucaoAluno({ aluno_id })` → cruza avaliações + cargas + frequência da catraca, devolve diagnóstico em texto + 3 recomendações ao personal.
- `sugerirRetencao({ academia_id })` → lista alunos em risco de churn (inadimplência + queda de frequência) com mensagem personalizada para WhatsApp/e-mail.
- UI: botão "✨ Gerar com IA" nas telas de Treino e Avaliação; widget "Alunos em risco" no Dashboard do DONO/ADMIN.

## Fase 3 — Dashboards avançados e relatórios

- Instalar `recharts` (já vem com shadcn) e renderizar dentro dos shells vanilla via portais React pontuais.
- Gráficos: faturamento mensal (12 meses), MRR de recorrência, ticket médio PDV, retenção 30/60/90 dias, top 10 alunos por frequência, evolução de cargas por aluno (linha), composição corporal (radar Pollock).
- Exportação CSV (client-side) e PDF (jsPDF) de: lista de inadimplentes, relatório financeiro do mês, ficha de treino do aluno, laudo antropométrico.
- Filtros: período, plano, status financeiro, academia (multi-tenant).

## Fase 4 — Notificações e e-mail transacional

Usa **Lovable Emails** (já integrado ao Cloud, sem provider externo).

- Setup do domínio de e-mail + infra de fila (`email_domain--setup_email_infra`).
- Templates React Email em `src/lib/email-templates/`:
  - `boas-vindas-aluno` (nova matrícula com credenciais provisórias)
  - `cobranca-vencida` (após recorrência marcar pendente)
  - `treino-atualizado` (personal salvou nova ficha)
  - `avaliacao-pronta` (laudo antropométrico disponível)
  - `recibo-pdv` (após fechar venda)
- Triggers: server functions disparam `enqueue_email` após cada evento.
- Página `/email/unsubscribe` brandizada com glassmorphism.

## Fase 5 — Pagamentos reais com Stripe (substituindo recorrência simulada)

- Rodar `recommend_payment_provider` → esperado Stripe (SaaS/serviços).
- Habilitar `enable_stripe_payments` (Stripe gerenciado pela Lovable, sem chave manual).
- Modelo: cada plano da academia vira um Price recorrente no Stripe; cada matrícula cria Customer + Subscription; PDV usa Checkout one-shot.
- Webhook `/api/public/hooks/stripe` (com verificação de assinatura HMAC) → atualiza `recorrencias.status` e dispara e-mail de recibo/cobrança.
- Painel "Tentar novamente" e link para portal do cliente Stripe.

## Bônus — Webhook de catraca real

Endpoint público `POST /api/public/hooks/catraca` que aceita payload `{ academia_id, biometria_id, dispositivo }` assinado com HMAC compartilhado (secret novo `CATRACA_WEBHOOK_SECRET`). Grava em `acessos_catraca`, valida status financeiro do aluno via `has_role`+RLS e devolve `{ liberar: true|false, motivo }`. O simulador atual passa a chamar esse webhook em vez de mockar localmente — assim o mesmo endpoint serve para hardware iDFace/Control iD real.

## Ordem de implementação sugerida

```text
1. Multi-tenant (migration grande + refactor RLS + UI switcher)
2. IA (3 server functions + 2 botões + 1 widget)
3. Dashboards (gráficos + exportações)
4. E-mails (infra + 5 templates + triggers)
5. Stripe (enable + migração da recorrência + webhook)
6. Webhook catraca (endpoint + refactor do simulador)
```

## Detalhes técnicos

- Todas as server functions privilegiadas usam `requireSupabaseAuth` + checagem de `has_role`/`is_staff`.
- IA via `createLovableAiGatewayProvider` (sem secret do usuário).
- Stripe e Catraca expostos só em `/api/public/hooks/*` com verificação de assinatura.
- Migrations sempre com `GRANT` + `ENABLE RLS` + `POLICY` na mesma transação.
- Tipos do Supabase regenerados após cada migration aprovada.

## O que NÃO está incluso

- WebAuthn/câmera real (você escolheu manter simulado fora a catraca).
- Apps mobile nativos.
- Marketing/newsletter (Lovable Emails só permite transacional).

Posso começar pela **Fase 1 (multi-tenant)** assim que aprovar — é uma migration grande e mexe em todas as RLS. Quer que eu execute as 5 fases em sequência sem parar para confirmação intermediária, ou pausamos a cada fase para você validar?
