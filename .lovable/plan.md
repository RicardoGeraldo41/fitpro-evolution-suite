
# Auditoria FitPro GYM2 — o que está bom, o que falta, o que implementar

## O que já está bom

- **Backend sólido no Lovable Cloud**: 11 tabelas com RLS + GRANTs corretos, funções `SECURITY DEFINER` (`has_role`, `is_staff`, `current_academia_id`, `has_role_na_academia`, `is_staff_na_academia`, `pode_acessar_academia`) — arquitetura de segurança sem escalonamento de privilégios.
- **Multi-tenant real (Fase 1 concluída)**: `academia_id` propagado em todas as tabelas de domínio + RLS reescrito por academia.
- **Auth com 4 perfis** (DONO/ADMIN/PERSONAL/ALUNO) + seed idempotente de contas demo.
- **9 módulos funcionais**: Dashboard, Alunos, Biometria/Catraca, PDV, Recorrência, Treino, Avaliação (Pollock 3/7), Histórico, Grade de aulas, Evolução.
- **Server functions com `requireSupabaseAuth`** + `attachSupabaseAuth` no `start.ts` (padrão TanStack correto).

## O que está faltando / frágil

**Arquitetura de UI**
- Todo o app é 1 arquivo de 896 linhas com JavaScript vanilla injetado via `useEffect` + `document.createElement("script")`. Impede code-splitting, hot reload real, testes, tipagem, acessibilidade e uso de shadcn/recharts.
- Sem rotas TanStack por módulo → URLs não são compartilháveis, sem deep-link, sem SSR de nada.
- Zero componentes React de verdade apesar de 40+ componentes shadcn disponíveis.

**Funcionalidades ausentes**
- **IA**: nenhum uso do Lovable AI Gateway (Fase 2 do plano original nunca entrou).
- **Dashboards**: só cards estáticos, sem gráficos (recharts não instalado apesar de shadcn/chart existir).
- **E-mails transacionais**: nada (boas-vindas, cobrança, recibo PDV, avaliação pronta).
- **Pagamentos reais**: recorrência é 100% simulada, sem Stripe.
- **Catraca real**: apenas mock local, sem webhook público assinado.
- **Notificações in-app**: sem toasts de eventos, sem central de notificações.
- **Upload de mídia**: sem foto de perfil do aluno, sem logo da academia, sem anexos de laudo (Storage buckets = 0).
- **Relatórios**: sem exportação CSV/PDF de inadimplentes, financeiro, ficha, laudo.
- **Auditoria**: sem `audit_log` de quem alterou o quê (crítico para academia com staff).
- **Agendamento de aulas**: grade existe mas sem reserva de vaga pelo aluno.
- **Check-in manual** (fallback quando catraca falha).
- **Metas e gamificação** do aluno (streak, PRs, badges).

**Qualidade & operação**
- Sem tratamento de erros global visível ao usuário (toasts).
- Sem loading skeletons.
- Sem paginação nas listas.
- Sem testes.
- Sem observabilidade (logs estruturados dos server fns).
- SEO/meta ainda usa defaults "Lovable App".

## Roadmap priorizado (recomendação)

Ordem por **impacto ÷ esforço**:

```text
1. Refatorar UI para React + rotas TanStack (destrava tudo abaixo)
2. IA no Lovable AI Gateway (ficha de treino, análise de evolução, retenção)
3. Dashboards com recharts + exportação CSV/PDF
4. Storage: foto do aluno + logo da academia + anexos de laudo
5. E-mails transacionais (Lovable Emails)
6. Pagamentos reais Stripe (built-in, sem chave manual)
7. Webhook de catraca assinado (HMAC) — substitui simulador
8. Auditoria + notificações in-app + agendamento de aulas
9. Gamificação (streak, PRs, badges) + app mobile do aluno
```

### Detalhes de cada frente

**1. Refatoração UI (fundação)** — dividir `index.tsx` em rotas TanStack sob `_authenticated/`:
- `/dashboard`, `/alunos`, `/alunos/$id`, `/treinos`, `/avaliacoes`, `/pdv`, `/recorrencia`, `/aulas`, `/catraca`, `/relatorios`, `/config`
- Componentes React usando shadcn (Table, Dialog, Form, Sonner para toasts, Skeleton).
- React Query em todos os fetchs, com invalidação.

**2. IA (Lovable AI Gateway, google/gemini-3-flash-preview)**:
- `gerarFichaTreinoIA({ aluno_id, objetivo, frequencia, restricoes })`
- `analisarEvolucaoAluno({ aluno_id })` cruza avaliações + cargas + frequência
- `sugerirRetencao({ academia_id })` detecta churn e gera mensagem WhatsApp/e-mail
- `resumirLaudoAntropometrico({ avaliacao_id })`

**3. Dashboards**: `recharts` + widgets de faturamento 12m, MRR, retenção 30/60/90, top-10 frequência, evolução de cargas (linha), Pollock (radar). Exportações CSV client-side + jsPDF.

**4. Storage**: buckets `alunos-fotos` (público), `academia-logos` (público), `avaliacoes-anexos` (privado com RLS).

**5. E-mails**: templates React Email — boas-vindas, cobrança vencida, treino atualizado, avaliação pronta, recibo PDV.

**6. Stripe built-in** (`enable_stripe_payments`, sem chave): 1 Price recorrente por plano, Customer+Subscription por matrícula, Checkout one-shot no PDV, webhook `/api/public/hooks/stripe` com HMAC.

**7. Webhook catraca**: `POST /api/public/hooks/catraca` com HMAC (`CATRACA_WEBHOOK_SECRET`), valida status financeiro via RLS, devolve `{ liberar, motivo }`. Serve iDFace/Control iD real.

**8. Auditoria + agendamento**: tabela `audit_log` genérica + `aula_reservas` com trigger de capacidade máxima.

**9. Gamificação**: `metas`, `conquistas`, `pr_cargas` + widget "sequência de X dias treinando" no app do aluno.

## Fora de escopo (por decisões anteriores)

- WebAuthn/câmera biométrica real (mantém simulado, exceto catraca).
- Apps mobile nativos (PWA sim, nativo não).
- Marketing/newsletter.

## Recomendação de próximo passo

Começar pela **frente 1 (refatoração UI para React + rotas)** — sem isso, cada nova feature vira mais 100 linhas de JS vanilla injetado, e as frentes 2/3 (IA + gráficos) precisam obrigatoriamente de componentes React de verdade.

Quer que eu execute a refatoração e já entregue junto a Fase 2 (IA) na sequência, ou prefere que eu escolha outra frente primeiro?
