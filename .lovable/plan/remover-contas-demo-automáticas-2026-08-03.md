# Remover contas demo automáticas

Hoje, ao abrir a tela de acesso, o sistema cria sozinho 4 contas de demonstração (dono, admin, personal e aluno) com senhas fixas exibidas na própria tela. Isso sai.

## O que muda

- A tela de acesso deixa de criar qualquer conta automaticamente.
- O bloco com as credenciais demo visíveis na tela de login é removido.
- Todo acesso passa a nascer do cadastro manual: o Dono cria a unidade e sua conta; Personal e Aluno se cadastram escolhendo a academia; a equipe interna continua sendo criada pelo Dono em Configurações.

## Sobre as contas demo já existentes

Elas continuam funcionando (já estão no banco). Se quiser, removo essas 4 contas e os dados de demonstração vinculados num passo seguinte — me confirme, pois é irreversível.

## Detalhes técnicos

- `src/routes/auth.tsx`: remover o `useEffect` que chama `seedFitProDemoUsers`, o `useServerFn` correspondente, o import e o painel de credenciais demo.
- `src/lib/fitpro-seed.functions.ts`: excluir o arquivo (era um endpoint público de criação de usuários — sai também por segurança).
- Nenhuma alteração de schema.
