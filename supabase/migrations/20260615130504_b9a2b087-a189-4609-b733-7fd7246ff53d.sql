
-- =====================================================================
-- FitPro GYM2 — Schema completo
-- =====================================================================

-- Função utilitária: updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =====================================================================
-- ENUMs
-- =====================================================================
CREATE TYPE public.app_role AS ENUM ('DONO','ADMIN','PERSONAL','ALUNO');
CREATE TYPE public.status_financeiro AS ENUM ('ADIMPLENTE','INADIMPLENTE');
CREATE TYPE public.status_recorrencia AS ENUM ('PENDENTE','PAGO','ATRASADO','CANCELADO');

-- =====================================================================
-- PROFILES
-- =====================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- USER_ROLES + has_role (security definer)
-- =====================================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('DONO','ADMIN')
  )
$$;

-- Policies profiles
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'PERSONAL'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_staff_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_staff(auth.uid()));

-- Policies user_roles
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================================
-- Trigger: cria profile automaticamente em signup
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- ALUNOS
-- =====================================================================
CREATE TABLE public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome text NOT NULL,
  plano text NOT NULL DEFAULT 'Standard',
  valor_plano numeric(10,2) NOT NULL DEFAULT 0,
  status_financeiro public.status_financeiro NOT NULL DEFAULT 'ADIMPLENTE',
  hash_biometria_digital text,
  vetor_facial text,
  personal_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_alunos_updated BEFORE UPDATE ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "alunos_read" ON public.alunos FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND personal_id = auth.uid())
  OR (public.has_role(auth.uid(),'ALUNO') AND profile_id = auth.uid())
);
CREATE POLICY "alunos_staff_write" ON public.alunos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================================
-- PRODUTOS
-- =====================================================================
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  estoque_atual integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "produtos_read_all" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "produtos_staff_write" ON public.produtos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================================
-- VENDAS
-- =====================================================================
CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendas_read" ON public.vendas FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'ALUNO') AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY "vendas_staff_write" ON public.vendas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================================
-- RECORRENCIAS
-- =====================================================================
CREATE TABLE public.recorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  valor numeric(10,2) NOT NULL,
  status public.status_recorrencia NOT NULL DEFAULT 'PENDENTE',
  vencimento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorrencias TO authenticated;
GRANT ALL ON public.recorrencias TO service_role;
ALTER TABLE public.recorrencias ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_rec_updated BEFORE UPDATE ON public.recorrencias
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "rec_read" ON public.recorrencias FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'ALUNO') AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY "rec_staff_write" ON public.recorrencias FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================================
-- TREINOS
-- =====================================================================
CREATE TABLE public.treinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  exercicios jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinos TO authenticated;
GRANT ALL ON public.treinos TO service_role;
ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_treinos_updated BEFORE UPDATE ON public.treinos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "treinos_read" ON public.treinos FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (public.has_role(auth.uid(),'ALUNO') AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY "treinos_write" ON public.treinos FOR ALL TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
) WITH CHECK (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
);

-- =====================================================================
-- HISTORICO_CARGAS_TREINO
-- =====================================================================
CREATE TABLE public.historico_cargas_treino (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  exercicio_nome text NOT NULL,
  carga numeric(10,2) NOT NULL,
  reps_realizadas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_cargas_treino TO authenticated;
GRANT ALL ON public.historico_cargas_treino TO service_role;
ALTER TABLE public.historico_cargas_treino ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cargas_read" ON public.historico_cargas_treino FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (public.has_role(auth.uid(),'ALUNO') AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY "cargas_write" ON public.historico_cargas_treino FOR ALL TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (public.has_role(auth.uid(),'ALUNO') AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
) WITH CHECK (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (public.has_role(auth.uid(),'ALUNO') AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);

-- =====================================================================
-- AVALIACOES (antropométricas)
-- =====================================================================
CREATE TABLE public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  avaliador_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aval_read" ON public.avaliacoes FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (public.has_role(auth.uid(),'ALUNO') AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY "aval_write" ON public.avaliacoes FOR ALL TO authenticated USING (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
) WITH CHECK (
  public.is_staff(auth.uid())
  OR (public.has_role(auth.uid(),'PERSONAL') AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
);

-- =====================================================================
-- AULAS
-- =====================================================================
CREATE TABLE public.aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  horario text NOT NULL,
  professor text NOT NULL,
  vagas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aulas TO authenticated;
GRANT ALL ON public.aulas TO service_role;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aulas_updated BEFORE UPDATE ON public.aulas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "aulas_read_all" ON public.aulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "aulas_staff_write" ON public.aulas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================================
-- Seed inicial: aulas e produtos (dados públicos)
-- =====================================================================
INSERT INTO public.produtos (nome, preco, estoque_atual) VALUES
  ('Whey Protein 900g', 159.90, 24),
  ('Creatina 300g', 89.90, 40),
  ('Garrafa Shaker', 29.90, 80),
  ('Toalha Premium', 39.90, 15),
  ('Barra Proteica', 9.90, 120);

INSERT INTO public.aulas (nome, horario, professor, vagas) VALUES
  ('Spinning','06:00','Carla',15),
  ('Funcional HIIT','07:30','Bruno',12),
  ('Pilates','09:00','Renata',10),
  ('Boxe','18:30','Marcos',20),
  ('Yoga','20:00','Ana',18);
