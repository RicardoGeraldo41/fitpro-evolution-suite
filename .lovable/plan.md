## O que já está pronto

Verifiquei o código e o banco: RBAC (DONO/ADMIN/PERSONAL/ALUNO) com RLS por academia, multi-tenant, alunos, PDV, recorrência, treino, avaliação, medidas + fotos, plano alimentar, gamificação (XP/conquistas/ranking), auditoria e IA. A base é sólida.

## O que ainda falta para uso real

**1. Check-in / catraca é só simulação (crítico)**
Em `biometria.tsx` a digital é um hash aleatório, o facial é um vetor fake e a catraca só imprime um log — não existe tabela de acessos. Uma academia precisa de histórico de entradas, quem entrou, quando, e bloqueio de inadimplente registrado.
- Criar tabela `acessos` (aluno, tipo de entrada, permitido, motivo, timestamp).
- Tela de recepção "modo catraca" com busca por nome/CPF e registro real do acesso.
- Endpoint público assinado (HMAC) em `/api/public/catraca` para hardware físico integrar depois.

**2. Aulas: agendar não agenda nada**
Em `grade.tsx` o botão "Agendar" só mostra um toast. Falta tabela `agendamentos`, controle de vagas restantes, cancelamento, lista de presença e visão do aluno "minhas aulas". A grade também não tem dia da semana, só um texto de horário.

**3. Financeiro não fecha o ciclo**
`recorrencias` guarda status, mas não há: registro de pagamentos efetivos (histórico), baixa manual com forma de pagamento, geração automática das mensalidades do mês, marcação automática de ATRASADO por vencimento, nem sincronização do `status_financeiro` do aluno (que hoje é manual e é justamente o que libera a catraca). Também não há recibo/comprovante nem fechamento de caixa do PDV.

**4. Ciclo de vida do aluno**
Não existe matrícula/contrato com data de início, fim e renovação; nem plano cadastrável (hoje `plano` e `valor_plano` são texto livre digitado a cada aluno); nem status ATIVO/TRANCADO/CANCELADO; nem dados básicos reais (CPF, telefone, nascimento, endereço, contato de emergência, PAR-Q). Sem isso não dá para operar recepção.

**5. Onboarding e contas**
Signup público está desligado e as 4 contas demo são criadas automaticamente com senhas fixas visíveis na tela de login — ok para demo, inaceitável em produção. Falta: cadastro da academia (dono cria sua unidade), convite/criação de usuários pela equipe, vínculo do aluno ao login dele, recuperação de senha (`/reset-password` não existe) e remoção do bloco de contas demo.

**6. Comunicação**
Nada de e-mail/WhatsApp: cobrança de vencimento, boas-vindas, aviso de treino novo, aniversário, aluno sumido há X dias. É o principal motor de retenção e hoje é zero.

**7. Relatórios e operação**
Dashboard tem faturamento, mas falta: frequência por período, inadimplência detalhada, alunos em risco de evasão (com base em acessos reais), ticket médio, exportação CSV/PDF, e filtro por período.

**8. Mobile e UX de recepção**
As telas usam grids fixos e tabelas largas; no celular do aluno e no tablet da recepção isso quebra. Falta layout responsivo e um modo recepção simplificado.

**9. Robustez**
Sem estados de carregando/erro/vazio consistentes, sem paginação (as listas carregam tudo), `prompt()` usado para criar plano alimentar, sem validação Zod nos formulários, sem confirmação em exclusões.

## Sugestão de ordem

1. Check-in real + acessos + status financeiro automático (destrava o uso diário)
2. Ciclo de vida do aluno: planos, matrícula, dados cadastrais, status
3. Financeiro: pagamentos, baixa, geração mensal, inadimplência automática
4. Agendamento de aulas com vagas e presença
5. Onboarding real (criar academia, convidar equipe, reset de senha, tirar demo)
6. Comunicação automática + relatórios + responsividade

## Detalhes técnicos

Novas tabelas: `acessos`, `agendamentos`, `pagamentos`, `planos`, `matriculas`; colunas extras em `alunos` (cpf, telefone, nascimento, status, contato emergência) e em `aulas` (dia_semana, duração, capacidade). Todas com GRANT + RLS por `academia_id`, seguindo o padrão já usado. Job diário (pg_cron) para marcar atrasados e sincronizar `status_financeiro`. E-mails via função de servidor. Endpoint de catraca sob `/api/public/*` com verificação HMAC.

Me diga por onde começar — recomendo o item 1 primeiro, pois é o que impede a academia de usar o sistema na portaria hoje.
