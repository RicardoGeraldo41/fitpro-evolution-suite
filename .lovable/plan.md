# O que precisa ser corrigido no FitPro

Situação atual: o sistema compila sem erros, não há falhas registradas na tela, o problema do cadastro da equipe já foi resolvido e todas as páginas já têm título e descrição. Faltam estes pontos:

## 1. Dados de teste no banco
- 3 academias "Academia Teste QA" criadas durante os testes, além das contas de teste da hierarquia (FitPro Matriz).
- Solução: remover as academias QA, os usuários e todos os dados ligados a elas. A FitPro Matriz fica, a não ser que você peça para remover também. Essa remoção não tem volta.

## 2. Alerta de segurança pendente
- Usuários logados conseguem executar diretamente funções internas privilegiadas (as que verificam papel e academia).
- Solução: manter a permissão só nas funções que as regras de acesso realmente usam, retirar das demais e rodar a varredura de segurança de novo.

## 3. Proteção do cadastro público
- O cadastro cria contas sem limite de tentativas, o que permite abuso por robôs.
- Solução: limitar as tentativas de cadastro por e-mail e por endereço de rede, mostrando uma mensagem clara quando o limite for atingido.

## 4. Mensalidades manuais
- As mensalidades só são geradas quando alguém clica em "Gerar mensalidades do mês".
- Solução: gerar as mensalidades automaticamente todo dia 1º, sem criar cobranças em dobro.

## Detalhes técnicos
- Item 1: exclusão pela API admin (auth.users) e depois linhas por academia_id.
- Item 2: revisar os GRANT EXECUTE em private.* e revogar onde não houver policy que use a função.
- Item 3: tabela `cadastro_tentativas` com janela de tempo, checada em `cadastrarPerfil`.
- Item 4: rota em /api/public/cron com segredo + pg_cron, upsert idempotente por (matricula, competência).
- Testes para o limite de cadastro e para a geração de mensalidades sem duplicar.
