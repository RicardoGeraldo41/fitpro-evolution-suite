# Próximas mudanças e implementações — FitPro GYM2

## Diagnóstico rápido do estado atual

O sistema já está operacional como SaaS multi-tenant: cadastro manual com hierarquia (DONO cria academia, ALUNO entra em academia existente), autenticação, RBAC, finanças, recorrência, PDV, biometria, treino, avaliação, alimentação, grade de aulas, fotos de evolução, ranking XP e auditoria. O tema azul corporativo/cyan neon está aplicado e o typecheck passa.

Foram encontrados, porém, pontos que precisam de correção ou evolução para ficar realmente pronto para produção comercial.

## 1. Correções críticas (fazer primeiro)

### 1.1 Bug de conflito de papel na equipe
`src/lib/fitpro/equipe.functions.ts` usa `onConflict: "user_id,role"`, mas a tabela `user_roles` tem constraint única em `(user_id, role, academia_id)`. Isso pode falhar ao criar/editar membros quando o mesmo usuário existe em outra academia. Deve ser corrigido para `onConflict: "user_id,role,academia_id"`.

### 1.2 Limpar contas demo antigas do banco
As contas demo (dono@fitpro.local, admin@fitpro.local, personal@fitpro.local, aluno@fitpro.local) e a academia fictícia vinculada ainda existem no banco. O front-end já deixou de criar novas contas automáticas, mas os dados antigos permanecem. Remover essas contas e registros vinculados (alunos, matrículas, recorrências, acessos) para não poluir relatórios e evitar acesso indevido com senhas conhecidas.

### 1.3 Metadados de SEO faltantes em várias rotas
Rotas protegidas como dashboard, biometria, PDV, recorrência, grade, treino, evolução, ranking, alimentação, medidas, auditoria e avaliação não definem `head()` com título/description/og/twitter. Cada rota de conteúdo precisa de metadados próprios.

### 1.4 Queries sem filtro explícito de academia
Várias telas (dashboard, alunos, relatórios) consultam tabelas inteiras confiando apenas na RLS. As políticas parecem corretas, mas adicionar `.eq("academia_id", session.academia_id)` melhora performance, reduz risco de vazamento e deixa o código mais autoexplicativo.

## 2. Melhorias funcionais para operação comercial

### 2.1 Landing page de marketing
A rota `/` apenas redireciona para `/auth` ou `/dashboard`. Criar uma landing page pública que apresente o FitPro GYM2, planos SaaS e call-to-action para cadastro de academia, com SEO e responsividade.

### 2.2 Onboarding do DONO
Quando um novo dono cria a academia, exibir um wizard de boas-vindas: cadastro de planos, convite de equipe, configuração de CNPJ/fuso e primeiro aluno. Hoje o dono cai direto em um dashboard vazio sem orientação.

### 2.3 Navegação mobile profissional
A topbar usa o texto `☰` cru e a sidebar não tem ícones. Substituir por ícones do Lucide, melhorar a gaveta mobile e adicionar labels mais claros para cada perfil (DONO/ADMIN/PERSONAL/ALUNO veem menus distintos).

### 2.4 Componentes reutilizáveis
Criar componentes padronizados para evitar repetição:
- `LoadingState` — spinner/placeholder nas telas.
- `EmptyState` — ilustração/mensagem para listas vazias.
- `DataTable` — tabela com busca, ordenação e paginação básica.
- `ConfirmDialog` — confirmação antes de ações destrutivas.

### 2.5 Melhorias no financeiro
- Geração automática de mensalidades recorrentes (hoje é manual clicando em "Gerar mensalidades do mês").
- Envio de lembrete de vencimento para alunos inadimplentes ou com mensalidade próxima.
- Dashboard financeiro com DRE simples: receita (mensalidades + PDV), inadimplência, ticket médio e comparativo mês a mês.

### 2.6 Melhorias no aluno
- Perfil do aluno consolidado: matrícula, medidas, avaliações, treino, aulas agendadas, acessos e plano alimentar em uma única tela.
- Alerta de aniversário na dashboard para DONO/ADMIN.
- Controle de trancamento/cancelamento com motivo e data.

### 2.7 Melhorias na grade de aulas
- Permitir reservas para datas futuras além da próxima ocorrência.
- Lista de espera quando a aula está lotada.
- Agendamento recorrente (toda terça, por exemplo).

### 2.8 Relatórios em PDF
Além dos CSVs, gerar relatórios em PDF (via biblioteca Worker-safe, como PDF-lib ou html2canvas simplificado) para financeiro, frequência e avaliações.

## 3. Arquitetura, segurança e performance

### 3.1 Migrar queries pesadas para server functions
Telas como relatórios, dashboard e frequência fazem múltiplas consultas diretas pelo cliente. Centralizar essas leituras em `createServerFn` protege melhor os dados, facilita testes e reduz round-trips.

### 3.2 Rate limiting no cadastro
`cadastrarPerfil` é um endpoint público que cria usuários no Auth. Adicionar proteção básica de rate-limit por IP/e-mail para evitar abuso.

### 3.3 Soft delete
Trocar exclusões físicas (aulas, alunos, planos) por soft delete com campo `deleted_at`, mantendo histórico e auditoria consistentes.

### 3.4 Testes automatizados de fluxo crítico
Criar testes com Playwright para: cadastro de academia → login → cadastro de plano → matrícula → geração de mensalidade → pagamento → liberação na catraca.

## 4. Design e experiência

### 4.1 Tema claro/escuro
Hoje o sistema é sempre dark. Adicionar um toggle de tema claro/escuro persistido em `localStorage` e via classe no `<html>`.

### 4.2 Tipografia e hierarquia
Padronizar tamanhos de título, espaçamentos e estados de hover em todas as telas. Melhorar a legibilidade em tabelas longas.

### 4.3 Empty states e feedback
Substituir mensagens genéricas como "Nenhum aluno encontrado" por ilustrações/ícones e CTA (ex.: "Cadastrar primeiro aluno").

## Ordem de execução recomendada

1. Corrigir bug de `onConflict` em `equipe.functions.ts`.
2. Limpar contas demo e academia fictícia do banco (com confirmação do usuário, pois é irreversível).
3. Adicionar `head()` SEO em todas as rotas protegidas.
4. Adicionar filtros de `academia_id` nas queries principais.
5. Criar componentes reutilizáveis (Loading, Empty, Table, Confirm).
6. Refatorar dashboard e relatórios para server functions.
7. Construir landing page pública.
8. Implementar onboarding do DONO.
9. Evoluir financeiro, aluno e grade conforme prioridade comercial.
10. Adicionar testes de fluxo crítico.

## Decisão necessária

As contas demo antigas ainda estão no banco. **Deseja que eu remova permanentemente as 4 contas demo e a academia fictícia vinculada?** Essa ação é irreversível e excluirá também os alunos, matrículas, recorrências e acessos gerados por elas.
