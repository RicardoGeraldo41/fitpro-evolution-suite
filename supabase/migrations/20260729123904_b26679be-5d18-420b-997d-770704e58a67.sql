
-- ================= MEDIDAS CORPORAIS =================
CREATE TABLE public.medidas_corporais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  peso numeric,
  percentual_gordura numeric,
  cintura numeric, quadril numeric, braco numeric, coxa numeric,
  foto_frente text, foto_lado text, foto_costas text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medidas_corporais TO authenticated;
GRANT ALL ON public.medidas_corporais TO service_role;
ALTER TABLE public.medidas_corporais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medidas_read" ON public.medidas_corporais FOR SELECT TO authenticated
  USING (
    academia_id = private.current_academia_id() AND (
      private.is_staff_na_academia(auth.uid(), academia_id)
      OR aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid())
    )
  );
CREATE POLICY "medidas_write_staff" ON public.medidas_corporais FOR ALL TO authenticated
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE TRIGGER medidas_updated_at BEFORE UPDATE ON public.medidas_corporais
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ================= ALIMENTOS =================
CREATE TABLE public.alimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL,
  nome text NOT NULL,
  kcal numeric NOT NULL DEFAULT 0,
  proteinas numeric NOT NULL DEFAULT 0,
  carboidratos numeric NOT NULL DEFAULT 0,
  gorduras numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alimentos TO authenticated;
GRANT ALL ON public.alimentos TO service_role;
ALTER TABLE public.alimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alimentos_read" ON public.alimentos FOR SELECT TO authenticated
  USING (academia_id = private.current_academia_id());
CREATE POLICY "alimentos_write" ON public.alimentos FOR ALL TO authenticated
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));

-- ================= PLANOS ALIMENTARES =================
CREATE TABLE public.planos_alimentares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  refeicoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_alimentares TO authenticated;
GRANT ALL ON public.planos_alimentares TO service_role;
ALTER TABLE public.planos_alimentares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_read" ON public.planos_alimentares FOR SELECT TO authenticated
  USING (
    academia_id = private.current_academia_id() AND (
      private.is_staff_na_academia(auth.uid(), academia_id)
      OR aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid())
    )
  );
CREATE POLICY "planos_write_staff" ON public.planos_alimentares FOR ALL TO authenticated
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE TRIGGER planos_updated_at BEFORE UPDATE ON public.planos_alimentares
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ================= GAMIFICAÇÃO =================
CREATE TABLE public.conquistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  icone text,
  xp int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conquistas TO authenticated;
GRANT ALL ON public.conquistas TO service_role;
ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conquistas_read_all" ON public.conquistas FOR SELECT TO authenticated USING (true);

CREATE TABLE public.conquistas_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL,
  user_id uuid NOT NULL,
  conquista_id uuid NOT NULL REFERENCES public.conquistas(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, conquista_id)
);
GRANT SELECT, INSERT ON public.conquistas_usuario TO authenticated;
GRANT ALL ON public.conquistas_usuario TO service_role;
ALTER TABLE public.conquistas_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cu_read" ON public.conquistas_usuario FOR SELECT TO authenticated
  USING (academia_id = private.current_academia_id());
CREATE POLICY "cu_insert_self_or_staff" ON public.conquistas_usuario FOR INSERT TO authenticated
  WITH CHECK (
    academia_id = private.current_academia_id() AND (
      user_id = auth.uid() OR private.is_staff_na_academia(auth.uid(), academia_id)
    )
  );

CREATE TABLE public.pontos_xp (
  user_id uuid PRIMARY KEY,
  academia_id uuid NOT NULL,
  xp_total int NOT NULL DEFAULT 0,
  nivel int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pontos_xp TO authenticated;
GRANT ALL ON public.pontos_xp TO service_role;
ALTER TABLE public.pontos_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_read" ON public.pontos_xp FOR SELECT TO authenticated
  USING (academia_id = private.current_academia_id());

CREATE OR REPLACE FUNCTION private.tg_after_conquista()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp int;
BEGIN
  SELECT xp INTO v_xp FROM public.conquistas WHERE id = NEW.conquista_id;
  IF v_xp IS NULL THEN v_xp := 0; END IF;
  INSERT INTO public.pontos_xp (user_id, academia_id, xp_total, nivel, updated_at)
  VALUES (NEW.user_id, NEW.academia_id, v_xp, 1 + (v_xp / 100), now())
  ON CONFLICT (user_id) DO UPDATE
    SET xp_total = public.pontos_xp.xp_total + EXCLUDED.xp_total,
        nivel = 1 + ((public.pontos_xp.xp_total + EXCLUDED.xp_total) / 100),
        academia_id = EXCLUDED.academia_id,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER conquistas_usuario_ai
  AFTER INSERT ON public.conquistas_usuario
  FOR EACH ROW EXECUTE FUNCTION private.tg_after_conquista();

INSERT INTO public.conquistas (codigo, nome, descricao, icone, xp) VALUES
  ('primeiro_treino',   'Primeiro Treino',       'Registrou o primeiro treino no sistema.',            'flame',    20),
  ('semana_ativa',      'Semana Ativa',          'Treinou 5 dias em uma semana.',                       'calendar', 50),
  ('carga_pr',          'Novo Recorde de Carga', 'Superou o recorde pessoal em um exercício.',          'dumbbell', 40),
  ('mes_pontual',       'Mês Pontual',           'Ficou 30 dias sem inadimplência.',                    'shield',   60),
  ('primeira_avaliacao','Ciência do Corpo',      'Realizou a primeira avaliação antropométrica.',       'ruler',    30),
  ('nutricao_top',      'Nutrição em Dia',       'Seguiu o plano alimentar por 7 dias seguidos.',       'apple',    35),
  ('evolucao_registrada','Diário de Evolução',   'Cadastrou 3 medidas corporais.',                      'trending', 25),
  ('embaixador',        'Embaixador FitPro',     'Alcançou nível 10.',                                  'crown',    100)
ON CONFLICT (codigo) DO NOTHING;

-- ================= AUDITORIA =================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid,
  user_id uuid,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read_staff" ON public.audit_logs FOR SELECT TO authenticated
  USING (
    academia_id = private.current_academia_id() AND (
      private.has_role_na_academia(auth.uid(), academia_id, 'DONO'::public.app_role)
      OR private.has_role_na_academia(auth.uid(), academia_id, 'ADMIN'::public.app_role)
    )
  );

CREATE OR REPLACE FUNCTION private.tg_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_academia uuid;
  v_id uuid;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_payload := to_jsonb(OLD);
    v_id := (OLD).id;
    BEGIN v_academia := (OLD).academia_id; EXCEPTION WHEN OTHERS THEN v_academia := NULL; END;
  ELSE
    v_payload := to_jsonb(NEW);
    v_id := (NEW).id;
    BEGIN v_academia := (NEW).academia_id; EXCEPTION WHEN OTHERS THEN v_academia := NULL; END;
  END IF;

  INSERT INTO public.audit_logs (academia_id, user_id, acao, entidade, entidade_id, payload)
  VALUES (v_academia, auth.uid(), TG_OP, TG_TABLE_NAME, v_id, v_payload);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER audit_alunos       AFTER INSERT OR UPDATE OR DELETE ON public.alunos       FOR EACH ROW EXECUTE FUNCTION private.tg_audit();
CREATE TRIGGER audit_vendas       AFTER INSERT OR UPDATE OR DELETE ON public.vendas       FOR EACH ROW EXECUTE FUNCTION private.tg_audit();
CREATE TRIGGER audit_recorrencias AFTER INSERT OR UPDATE OR DELETE ON public.recorrencias FOR EACH ROW EXECUTE FUNCTION private.tg_audit();
CREATE TRIGGER audit_treinos      AFTER INSERT OR UPDATE OR DELETE ON public.treinos      FOR EACH ROW EXECUTE FUNCTION private.tg_audit();
