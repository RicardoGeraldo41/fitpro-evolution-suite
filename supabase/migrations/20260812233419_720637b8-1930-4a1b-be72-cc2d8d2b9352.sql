-- 1) Itens de venda
CREATE TABLE IF NOT EXISTS public.venda_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL REFERENCES public.academias(id) ON DELETE CASCADE,
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  nome_produto text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric(12,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venda_itens_venda_idx ON public.venda_itens(venda_id);
CREATE INDEX IF NOT EXISTS venda_itens_academia_idx ON public.venda_itens(academia_id);

GRANT SELECT ON public.venda_itens TO authenticated;
GRANT ALL ON public.venda_itens TO service_role;

ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venda_itens_read_staff" ON public.venda_itens
  FOR SELECT TO authenticated
  USING (academia_id = private.current_academia_id()
         AND private.is_staff_na_academia(auth.uid(), academia_id));

-- 2) Estoque nunca negativo
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_estoque_nao_negativo;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_estoque_nao_negativo CHECK (estoque_atual >= 0);

-- 3) Operação transacional de venda
CREATE OR REPLACE FUNCTION public.finalizar_venda(
  p_itens jsonb,
  p_forma text DEFAULT 'DINHEIRO',
  p_aluno_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_academia uuid;
  v_venda_id uuid;
  v_total numeric(12,2) := 0;
  v_item record;
  v_prod record;
  v_subtotal numeric(12,2);
  v_items_json jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NAO_AUTENTICADO';
  END IF;

  IF p_forma IS NULL OR p_forma NOT IN ('DINHEIRO','PIX','DEBITO','CREDITO','BOLETO','CORTESIA') THEN
    RAISE EXCEPTION 'FORMA_PAGAMENTO_INVALIDA';
  END IF;

  v_academia := private.current_academia_id();
  IF v_academia IS NULL THEN
    RAISE EXCEPTION 'ACADEMIA_INVALIDA';
  END IF;

  IF NOT private.is_staff_na_academia(v_uid, v_academia) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO';
  END IF;

  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'CARRINHO_VAZIO';
  END IF;

  IF p_aluno_id IS NOT NULL THEN
    PERFORM 1 FROM public.alunos a WHERE a.id = p_aluno_id AND a.academia_id = v_academia;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ALUNO_INVALIDO';
    END IF;
  END IF;

  INSERT INTO public.vendas (aluno_id, items, total, created_by, academia_id)
  VALUES (p_aluno_id, '[]'::jsonb, 0, v_uid, v_academia)
  RETURNING id INTO v_venda_id;

  -- itens agregados por produto e ordenados (evita deadlock entre vendas concorrentes)
  FOR v_item IN
    SELECT (e->>'produto_id')::uuid AS produto_id,
           SUM((e->>'quantidade')::int) AS quantidade
    FROM jsonb_array_elements(p_itens) e
    GROUP BY 1
    ORDER BY 1
  LOOP
    IF v_item.produto_id IS NULL OR v_item.quantidade IS NULL OR v_item.quantidade <= 0 THEN
      RAISE EXCEPTION 'QUANTIDADE_INVALIDA';
    END IF;

    -- trava a linha do produto para concorrência
    SELECT p.id, p.nome, p.preco, p.estoque_atual
      INTO v_prod
      FROM public.produtos p
     WHERE p.id = v_item.produto_id
       AND p.academia_id = v_academia
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUTO_INVALIDO';
    END IF;

    IF v_prod.estoque_atual < v_item.quantidade THEN
      RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE:%', v_prod.nome;
    END IF;

    v_subtotal := ROUND(v_prod.preco::numeric * v_item.quantidade, 2);
    v_total := v_total + v_subtotal;

    UPDATE public.produtos
       SET estoque_atual = estoque_atual - v_item.quantidade
     WHERE id = v_prod.id;

    INSERT INTO public.venda_itens
      (academia_id, venda_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal)
    VALUES
      (v_academia, v_venda_id, v_prod.id, v_prod.nome, v_item.quantidade, v_prod.preco, v_subtotal);

    v_items_json := v_items_json || jsonb_build_object(
      'id', v_prod.id, 'nome', v_prod.nome, 'preco', v_prod.preco,
      'qtd', v_item.quantidade, 'subtotal', v_subtotal, 'meio_pagamento', p_forma
    );

    INSERT INTO public.audit_logs (academia_id, user_id, acao, entidade, entidade_id, payload)
    VALUES (v_academia, v_uid, 'VENDA_ITEM', 'venda_itens', v_venda_id,
            jsonb_build_object(
              'produto_id', v_prod.id, 'produto', v_prod.nome,
              'quantidade', v_item.quantidade, 'preco_unitario', v_prod.preco,
              'subtotal', v_subtotal, 'estoque_restante', v_prod.estoque_atual - v_item.quantidade,
              'forma', p_forma, 'ts', now()
            ));
  END LOOP;

  UPDATE public.vendas
     SET items = v_items_json, total = v_total
   WHERE id = v_venda_id;

  INSERT INTO public.audit_logs (academia_id, user_id, acao, entidade, entidade_id, payload)
  VALUES (v_academia, v_uid, 'VENDA_FINALIZADA', 'vendas', v_venda_id,
          jsonb_build_object('total', v_total, 'forma', p_forma, 'aluno_id', p_aluno_id,
                             'itens', v_items_json, 'ts', now()));

  RETURN jsonb_build_object('venda_id', v_venda_id, 'total', v_total, 'itens', v_items_json);
END;
$$;

REVOKE ALL ON FUNCTION public.finalizar_venda(jsonb, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_venda(jsonb, text, uuid) TO authenticated, service_role;