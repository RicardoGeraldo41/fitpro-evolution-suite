
-- ============================================================
-- FASE 1: MULTI-TENANT POR ACADEMIA
-- ============================================================

-- 1) Tabela academias
CREATE TABLE public.academias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  fuso_horario text NOT NULL DEFAULT 'America/Sao_Paulo',
  logo_url text,
  plano_saas text NOT NULL DEFAULT 'STARTER',
  status text NOT NULL DEFAULT 'ATIVA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academias TO authenticated;
GRANT ALL ON public.academias TO service_role;
ALTER TABLE public.academias ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_academias_updated_at
BEFORE UPDATE ON public.academias
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) Seed academia demo
INSERT INTO public.academias (id, nome, cnpj, plano_saas)
VALUES ('00000000-0000-0000-0000-00000000fa01', 'FitPro Matriz', '00.000.000/0001-00', 'ENTERPRISE');

-- 3) profiles: academia_atual_id
ALTER TABLE public.profiles
  ADD COLUMN academia_atual_id uuid REFERENCES public.academias(id) ON DELETE SET NULL;

UPDATE public.profiles SET academia_atual_id = '00000000-0000-0000-0000-00000000fa01';

-- 4) Adicionar academia_id em todas as tabelas (backfill com academia demo)
ALTER TABLE public.alunos ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.alunos SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.alunos ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_alunos_academia ON public.alunos(academia_id);

ALTER TABLE public.produtos ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.produtos SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.produtos ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_produtos_academia ON public.produtos(academia_id);

ALTER TABLE public.vendas ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.vendas SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.vendas ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_vendas_academia ON public.vendas(academia_id);

ALTER TABLE public.recorrencias ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.recorrencias SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.recorrencias ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_recorrencias_academia ON public.recorrencias(academia_id);

ALTER TABLE public.treinos ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.treinos SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.treinos ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_treinos_academia ON public.treinos(academia_id);

ALTER TABLE public.historico_cargas_treino ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.historico_cargas_treino SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.historico_cargas_treino ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_hct_academia ON public.historico_cargas_treino(academia_id);

ALTER TABLE public.avaliacoes ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.avaliacoes SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.avaliacoes ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_avaliacoes_academia ON public.avaliacoes(academia_id);

ALTER TABLE public.aulas ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.aulas SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.aulas ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_aulas_academia ON public.aulas(academia_id);

ALTER TABLE public.user_roles ADD COLUMN academia_id uuid REFERENCES public.academias(id) ON DELETE CASCADE;
UPDATE public.user_roles SET academia_id = '00000000-0000-0000-0000-00000000fa01';
ALTER TABLE public.user_roles ALTER COLUMN academia_id SET NOT NULL;
CREATE INDEX idx_user_roles_academia ON public.user_roles(academia_id);

-- Recriar unique constraint do user_roles incluindo academia
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_role_academia_uniq UNIQUE (user_id, role, academia_id);

-- 5) Funções multi-tenant
CREATE OR REPLACE FUNCTION public.current_academia_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT academia_atual_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role_na_academia(_user_id uuid, _academia_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND academia_id = _academia_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff_na_academia(_user_id uuid, _academia_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND academia_id = _academia_id AND role IN ('DONO','ADMIN')
  )
$$;

CREATE OR REPLACE FUNCTION public.pode_acessar_academia(_user_id uuid, _academia_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND academia_id = _academia_id
  )
$$;

-- 6) Drop policies antigas e recriar escopadas por academia

-- academias
CREATE POLICY "ver academias do usuario" ON public.academias FOR SELECT TO authenticated
USING (public.pode_acessar_academia(auth.uid(), id));
CREATE POLICY "dono atualiza propria academia" ON public.academias FOR UPDATE TO authenticated
USING (public.has_role_na_academia(auth.uid(), id, 'DONO'))
WITH CHECK (public.has_role_na_academia(auth.uid(), id, 'DONO'));

-- alunos
DROP POLICY IF EXISTS "staff vê todos alunos" ON public.alunos;
DROP POLICY IF EXISTS "staff gerencia alunos" ON public.alunos;
DROP POLICY IF EXISTS "aluno vê próprio" ON public.alunos;
CREATE POLICY "staff ve alunos da academia" ON public.alunos FOR SELECT TO authenticated
USING (
  academia_id = public.current_academia_id()
  AND (
    public.is_staff_na_academia(auth.uid(), academia_id)
    OR public.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL')
  )
);
CREATE POLICY "staff gerencia alunos da academia" ON public.alunos FOR ALL TO authenticated
USING (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id))
WITH CHECK (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY "aluno ve proprio cadastro" ON public.alunos FOR SELECT TO authenticated
USING (profile_id = auth.uid());

-- produtos
DROP POLICY IF EXISTS "staff vê produtos" ON public.produtos;
DROP POLICY IF EXISTS "staff gerencia produtos" ON public.produtos;
CREATE POLICY "ver produtos da academia" ON public.produtos FOR SELECT TO authenticated
USING (academia_id = public.current_academia_id());
CREATE POLICY "staff gerencia produtos" ON public.produtos FOR ALL TO authenticated
USING (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id))
WITH CHECK (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id));

-- vendas
DROP POLICY IF EXISTS "staff vê vendas" ON public.vendas;
DROP POLICY IF EXISTS "staff cria vendas" ON public.vendas;
CREATE POLICY "staff ve vendas da academia" ON public.vendas FOR SELECT TO authenticated
USING (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY "staff cria vendas" ON public.vendas FOR INSERT TO authenticated
WITH CHECK (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id));

-- recorrencias
DROP POLICY IF EXISTS "staff vê recorrências" ON public.recorrencias;
DROP POLICY IF EXISTS "staff gerencia recorrências" ON public.recorrencias;
CREATE POLICY "staff ve recorrencias" ON public.recorrencias FOR SELECT TO authenticated
USING (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY "staff gerencia recorrencias" ON public.recorrencias FOR ALL TO authenticated
USING (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id))
WITH CHECK (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id));

-- treinos
DROP POLICY IF EXISTS "personal e staff vê treinos" ON public.treinos;
DROP POLICY IF EXISTS "personal e staff gerencia treinos" ON public.treinos;
DROP POLICY IF EXISTS "aluno vê próprio treino" ON public.treinos;
CREATE POLICY "staff/personal ve treinos" ON public.treinos FOR SELECT TO authenticated
USING (
  academia_id = public.current_academia_id()
  AND (
    public.is_staff_na_academia(auth.uid(), academia_id)
    OR public.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL')
  )
);
CREATE POLICY "staff/personal gerencia treinos" ON public.treinos FOR ALL TO authenticated
USING (
  academia_id = public.current_academia_id()
  AND (
    public.is_staff_na_academia(auth.uid(), academia_id)
    OR public.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL')
  )
)
WITH CHECK (
  academia_id = public.current_academia_id()
  AND (
    public.is_staff_na_academia(auth.uid(), academia_id)
    OR public.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL')
  )
);
CREATE POLICY "aluno ve proprio treino" ON public.treinos FOR SELECT TO authenticated
USING (aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()));

-- historico_cargas_treino
DROP POLICY IF EXISTS "staff/personal vê histórico" ON public.historico_cargas_treino;
DROP POLICY IF EXISTS "aluno escreve próprio histórico" ON public.historico_cargas_treino;
CREATE POLICY "staff/personal ve historico" ON public.historico_cargas_treino FOR SELECT TO authenticated
USING (
  academia_id = public.current_academia_id()
  AND (
    public.is_staff_na_academia(auth.uid(), academia_id)
    OR public.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL')
  )
);
CREATE POLICY "aluno gerencia proprio historico" ON public.historico_cargas_treino FOR ALL TO authenticated
USING (aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
WITH CHECK (aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()));

-- avaliacoes
DROP POLICY IF EXISTS "staff/personal vê avaliações" ON public.avaliacoes;
DROP POLICY IF EXISTS "staff/personal cria avaliações" ON public.avaliacoes;
DROP POLICY IF EXISTS "aluno vê própria avaliação" ON public.avaliacoes;
CREATE POLICY "staff/personal ve avaliacoes" ON public.avaliacoes FOR SELECT TO authenticated
USING (
  academia_id = public.current_academia_id()
  AND (
    public.is_staff_na_academia(auth.uid(), academia_id)
    OR public.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL')
  )
);
CREATE POLICY "staff/personal cria avaliacoes" ON public.avaliacoes FOR INSERT TO authenticated
WITH CHECK (
  academia_id = public.current_academia_id()
  AND (
    public.is_staff_na_academia(auth.uid(), academia_id)
    OR public.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL')
  )
);
CREATE POLICY "aluno ve propria avaliacao" ON public.avaliacoes FOR SELECT TO authenticated
USING (aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()));

-- aulas
DROP POLICY IF EXISTS "todos veem aulas" ON public.aulas;
DROP POLICY IF EXISTS "staff gerencia aulas" ON public.aulas;
CREATE POLICY "membros da academia veem aulas" ON public.aulas FOR SELECT TO authenticated
USING (academia_id = public.current_academia_id());
CREATE POLICY "staff gerencia aulas" ON public.aulas FOR ALL TO authenticated
USING (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id))
WITH CHECK (academia_id = public.current_academia_id() AND public.is_staff_na_academia(auth.uid(), academia_id));

-- user_roles
DROP POLICY IF EXISTS "usuario vê próprios papéis" ON public.user_roles;
DROP POLICY IF EXISTS "dono gerencia papéis" ON public.user_roles;
CREATE POLICY "usuario ve proprios papeis" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "dono ve papeis da academia" ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role_na_academia(auth.uid(), academia_id, 'DONO'));
CREATE POLICY "dono gerencia papeis" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role_na_academia(auth.uid(), academia_id, 'DONO'))
WITH CHECK (public.has_role_na_academia(auth.uid(), academia_id, 'DONO'));

-- profiles: permitir update do academia_atual_id pelo próprio usuário (já existente: usuario gerencia próprio profile)
-- nada a fazer

-- 7) Atualizar handle_new_user para vincular academia padrão (sem academia: staff faz convite depois)
-- Mantemos handle_new_user atual (apenas cria profile).
