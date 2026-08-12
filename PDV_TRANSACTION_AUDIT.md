# PDV_TRANSACTION_AUDIT — Integridade transacional de venda e estoque

Data: 2026-08-12 · Escopo: apenas vendas, itens de venda, produtos/estoque e auditoria da venda. Nenhuma alteração de design, rotas, RLS fora do fluxo ou autenticação.

## 1. Problema anterior

O fechamento de venda era feito pelo cliente em N+1 operações independentes:

1. um `UPDATE produtos SET estoque_atual = <valor lido no cliente> - qtd` por item (read-modify-write sem trava);
2. um `INSERT` em `vendas` com `total`, `preco` e `academia_id` vindos do navegador.

Consequências: estoque baixado sem venda (falha no insert final), venda sem baixa, lost update em concorrência, estoque negativo, preço/total forjáveis pelo cliente.

## 2. Arquitetura implementada

Uma única chamada por venda:

```text
PDV (React) → server function finalizarVenda (auth Supabase, valida contrato)
            → RPC public.finalizar_venda(jsonb, text, uuid)  [1 transação]
               ├─ authz: auth.uid() + private.current_academia_id() + private.is_staff_na_academia
               ├─ SELECT ... FOR UPDATE por produto (ordem crescente de id)
               ├─ preço, subtotal e total lidos/calculados no banco
               ├─ INSERT vendas → INSERT venda_itens → UPDATE produtos
               └─ INSERT audit_logs (por item + fechamento)
```

O cliente envia **somente** `produto_id`, `quantidade` e `forma`. Preço, total, `academia_id`, `created_by` e estoque disponível são resolvidos exclusivamente no servidor.

## 3. Arquivos alterados/criados

- `src/lib/fitpro/pdv.functions.ts` (novo) — `vendaSchema` (Zod), `finalizarVenda` (server fn com `requireSupabaseAuth`), `mapVendaError` (erros seguros).
- `src/routes/_authenticated/pdv.tsx` — `fecharVenda` agora faz uma única chamada; removidos os updates de estoque e o insert de venda no cliente. Sem mudança visual.
- `src/lib/fitpro/pdv.test.ts` (novo) — testes de contrato e de mensagens de erro.
- Migration de banco (nova, sem alterar migrations antigas).

## 4. Banco

**Tabela `public.venda_itens`** — `academia_id`, `venda_id`, `produto_id`, `nome_produto`, `quantidade`, `preco_unitario`, `subtotal`, `created_at`. RLS habilitada; leitura só para staff da própria academia (`private.current_academia_id()` + `private.is_staff_na_academia`). Sem grants de escrita para `authenticated` — só a função transacional grava.

**Constraints**

- `produtos_estoque_nao_negativo`: `CHECK (estoque_atual >= 0)` — rede de segurança final no banco.
- `venda_itens`: `quantidade > 0`, `preco_unitario >= 0`, `subtotal >= 0`; FKs para `academias`, `vendas` (cascade) e `produtos`.

**Função `public.finalizar_venda(p_itens jsonb, p_forma text, p_aluno_id uuid)`** — `SECURITY DEFINER`, `SET search_path = public`, `EXECUTE` revogado de `PUBLIC`/`anon` e concedido a `authenticated`/`service_role`. Erros semânticos: `NAO_AUTENTICADO`, `ACADEMIA_INVALIDA`, `SEM_PERMISSAO`, `CARRINHO_VAZIO`, `QUANTIDADE_INVALIDA`, `PRODUTO_INVALIDO`, `ALUNO_INVALIDO`, `FORMA_PAGAMENTO_INVALIDA`, `ESTOQUE_INSUFICIENTE:<produto>`.

## 5. Comportamento transacional e concorrência

- A função inteira roda em uma única transação implícita: qualquer `RAISE EXCEPTION` faz rollback de venda, itens, estoque e auditoria — estado tudo-ou-nada.
- Itens são agregados por produto e travados com `SELECT ... FOR UPDATE` em ordem crescente de `id`, o que serializa vendas concorrentes do mesmo produto e evita deadlock entre carrinhos com ordens diferentes.
- Cenário estoque=5, venda A (4) e venda B (3) concorrentes: a segunda transação espera a trava, relê o estoque já atualizado (1) e falha com `ESTOQUE_INSUFICIENTE`, com rollback completo. Resultado final: estoque = 1, nunca negativo.
- `CHECK (estoque_atual >= 0)` garante que mesmo uma escrita fora deste caminho não produza estoque negativo.

## 6. Auditoria

Por item: `acao = 'VENDA_ITEM'`, entidade `venda_itens`, payload com produto, quantidade, preço unitário, subtotal, estoque restante, forma e timestamp.
Por venda: `acao = 'VENDA_FINALIZADA'`, entidade `vendas`, payload com total, forma, aluno e itens. Ambos com `academia_id` e `user_id` resolvidos no servidor. O trigger `audit_vendas` pré-existente continua registrando o INSERT/UPDATE bruto.

## 7. Erros

O cliente recebe apenas mensagens de negócio traduzidas por `mapVendaError`; a mensagem crua do banco é logada no servidor. Nenhum stack trace, nome de constraint ou detalhe interno chega à UI.

## 8. Testes executados

`bunx vitest run src/lib/fitpro/pdv.test.ts` — 12 testes, todos passando:

1. venda simples; 2. múltiplos produtos; 3. carrinho vazio rejeitado; 4. quantidade zero/negativa rejeitada; 5. preço/total/`academia_id` do cliente descartados pelo contrato; 6. forma de pagamento inválida; 7–12. mensagens seguras para estoque insuficiente (com nome do produto), produto inexistente, sem permissão, academia inválida, violação de constraint e erro genérico sem vazamento.

Cobertura de banco verificada diretamente: chamada da função sem sessão autenticada é negada no nível de privilégio (`permission denied for function finalizar_venda`), confirmando o revoke de `PUBLIC`/`anon`. Os cenários de estoque insuficiente, produto inexistente, permissão, academia e concorrência são impostos pela própria função/constraints (não há harness de integração com Postgres neste projeto).

Validação: `tsgo --noEmit` OK (exit 0); build OK. Lint continua com erros de formatação `prettier/prettier` pré-existentes em arquivos de UI fora deste módulo — nenhuma limpeza global feita, por escopo.

## 9. Riscos residuais

- A função é `SECURITY DEFINER` e executável por `authenticated` (o linter sinaliza isso por padrão): é intencional — ela é o único caminho de venda e faz a própria autorização (`is_staff_na_academia`) antes de qualquer escrita.
- Vendas com muitos produtos mantêm travas de linha até o commit; sob altíssima concorrência no mesmo produto, isso vira fila (correto, porém com latência).
- `vendas.items` (jsonb) é mantido por compatibilidade com telas de relatório/auditoria; a fonte normalizada agora é `venda_itens`. Vendas antigas não têm itens normalizados.
- Estornos/cancelamento de venda com devolução ao estoque não fazem parte deste escopo.
