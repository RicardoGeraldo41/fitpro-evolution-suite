
-- 1. Private schema for helper functions (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Recreate helper functions in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('DONO','ADMIN'))
$$;

CREATE OR REPLACE FUNCTION private.current_academia_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT academia_atual_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION private.has_role_na_academia(_user_id uuid, _academia_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND academia_id = _academia_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_staff_na_academia(_user_id uuid, _academia_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND academia_id = _academia_id AND role IN ('DONO','ADMIN'))
$$;

CREATE OR REPLACE FUNCTION private.pode_acessar_academia(_user_id uuid, _academia_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND academia_id = _academia_id)
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_academia_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role_na_academia(uuid, uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_staff_na_academia(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.pode_acessar_academia(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_academia_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role_na_academia(uuid, uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff_na_academia(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.pode_acessar_academia(uuid, uuid) TO authenticated, service_role;

-- 3. Rewire trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- 4. Drop and recreate all policies using private schema functions
-- Also fix cross-tenant leaks:
--   * aulas_read_all / produtos_read_all (drop; scoped policy already exists)
--   * profiles_self_read PERSONAL branch (scope to own alunos)

-- profiles
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_staff_insert ON public.profiles;

CREATE POLICY profiles_self_read ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR private.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.alunos a
      WHERE a.profile_id = public.profiles.id
        AND a.personal_id = auth.uid()
    )
  );

CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR private.is_staff(auth.uid()));

CREATE POLICY profiles_staff_insert ON public.profiles FOR INSERT
  WITH CHECK (private.is_staff(auth.uid()) OR id = auth.uid());

-- user_roles
DROP POLICY IF EXISTS user_roles_self_read ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;
DROP POLICY IF EXISTS "dono ve papeis da academia" ON public.user_roles;
DROP POLICY IF EXISTS "dono gerencia papeis" ON public.user_roles;

CREATE POLICY user_roles_self_read ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR private.is_staff(auth.uid()));
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "dono ve papeis da academia" ON public.user_roles FOR SELECT
  USING (private.has_role_na_academia(auth.uid(), academia_id, 'DONO'::public.app_role));
CREATE POLICY "dono gerencia papeis" ON public.user_roles FOR ALL
  USING (private.has_role_na_academia(auth.uid(), academia_id, 'DONO'::public.app_role))
  WITH CHECK (private.has_role_na_academia(auth.uid(), academia_id, 'DONO'::public.app_role));

-- academias
DROP POLICY IF EXISTS "ver academias do usuario" ON public.academias;
DROP POLICY IF EXISTS "dono atualiza propria academia" ON public.academias;
CREATE POLICY "ver academias do usuario" ON public.academias FOR SELECT
  USING (private.pode_acessar_academia(auth.uid(), id));
CREATE POLICY "dono atualiza propria academia" ON public.academias FOR UPDATE
  USING (private.has_role_na_academia(auth.uid(), id, 'DONO'::public.app_role))
  WITH CHECK (private.has_role_na_academia(auth.uid(), id, 'DONO'::public.app_role));

-- alunos
DROP POLICY IF EXISTS alunos_read ON public.alunos;
DROP POLICY IF EXISTS alunos_staff_write ON public.alunos;
DROP POLICY IF EXISTS "staff ve alunos da academia" ON public.alunos;
DROP POLICY IF EXISTS "staff gerencia alunos da academia" ON public.alunos;

CREATE POLICY alunos_read ON public.alunos FOR SELECT USING (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role) AND personal_id = auth.uid())
  OR (private.has_role(auth.uid(), 'ALUNO'::public.app_role) AND profile_id = auth.uid())
);
CREATE POLICY alunos_staff_write ON public.alunos FOR ALL
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff ve alunos da academia" ON public.alunos FOR SELECT USING (
  academia_id = private.current_academia_id()
  AND (private.is_staff_na_academia(auth.uid(), academia_id)
       OR private.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL'::public.app_role))
);
CREATE POLICY "staff gerencia alunos da academia" ON public.alunos FOR ALL
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));

-- aulas — drop cross-tenant read; keep scoped policies
DROP POLICY IF EXISTS aulas_read_all ON public.aulas;
DROP POLICY IF EXISTS aulas_staff_write ON public.aulas;
DROP POLICY IF EXISTS "membros da academia veem aulas" ON public.aulas;
DROP POLICY IF EXISTS "staff gerencia aulas" ON public.aulas;

CREATE POLICY aulas_staff_write ON public.aulas FOR ALL
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "membros da academia veem aulas" ON public.aulas FOR SELECT
  USING (academia_id = private.current_academia_id());
CREATE POLICY "staff gerencia aulas" ON public.aulas FOR ALL
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));

-- produtos — drop cross-tenant read
DROP POLICY IF EXISTS produtos_read_all ON public.produtos;
DROP POLICY IF EXISTS produtos_staff_write ON public.produtos;
DROP POLICY IF EXISTS "ver produtos da academia" ON public.produtos;
DROP POLICY IF EXISTS "staff gerencia produtos" ON public.produtos;

CREATE POLICY produtos_staff_write ON public.produtos FOR ALL
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "ver produtos da academia" ON public.produtos FOR SELECT
  USING (academia_id = private.current_academia_id());
CREATE POLICY "staff gerencia produtos" ON public.produtos FOR ALL
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));

-- vendas
DROP POLICY IF EXISTS vendas_read ON public.vendas;
DROP POLICY IF EXISTS vendas_staff_write ON public.vendas;
DROP POLICY IF EXISTS "staff ve vendas da academia" ON public.vendas;
DROP POLICY IF EXISTS "staff cria vendas" ON public.vendas;

CREATE POLICY vendas_read ON public.vendas FOR SELECT USING (private.is_staff(auth.uid()));
CREATE POLICY vendas_staff_write ON public.vendas FOR ALL
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff ve vendas da academia" ON public.vendas FOR SELECT
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY "staff cria vendas" ON public.vendas FOR INSERT
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));

-- recorrencias
DROP POLICY IF EXISTS rec_read ON public.recorrencias;
DROP POLICY IF EXISTS rec_staff_write ON public.recorrencias;
DROP POLICY IF EXISTS "staff ve recorrencias" ON public.recorrencias;
DROP POLICY IF EXISTS "staff gerencia recorrencias" ON public.recorrencias;

CREATE POLICY rec_read ON public.recorrencias FOR SELECT USING (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'ALUNO'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY rec_staff_write ON public.recorrencias FOR ALL
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff ve recorrencias" ON public.recorrencias FOR SELECT
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY "staff gerencia recorrencias" ON public.recorrencias FOR ALL
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));

-- treinos
DROP POLICY IF EXISTS treinos_read ON public.treinos;
DROP POLICY IF EXISTS treinos_write ON public.treinos;
DROP POLICY IF EXISTS "staff/personal ve treinos" ON public.treinos;
DROP POLICY IF EXISTS "staff/personal gerencia treinos" ON public.treinos;

CREATE POLICY treinos_read ON public.treinos FOR SELECT USING (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (private.has_role(auth.uid(), 'ALUNO'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY treinos_write ON public.treinos FOR ALL USING (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
) WITH CHECK (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
);
CREATE POLICY "staff/personal ve treinos" ON public.treinos FOR SELECT USING (
  academia_id = private.current_academia_id()
  AND (private.is_staff_na_academia(auth.uid(), academia_id)
       OR private.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL'::public.app_role))
);
CREATE POLICY "staff/personal gerencia treinos" ON public.treinos FOR ALL
  USING (academia_id = private.current_academia_id()
    AND (private.is_staff_na_academia(auth.uid(), academia_id)
         OR private.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL'::public.app_role)))
  WITH CHECK (academia_id = private.current_academia_id()
    AND (private.is_staff_na_academia(auth.uid(), academia_id)
         OR private.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL'::public.app_role)));

-- historico_cargas_treino
DROP POLICY IF EXISTS cargas_read ON public.historico_cargas_treino;
DROP POLICY IF EXISTS cargas_write ON public.historico_cargas_treino;
DROP POLICY IF EXISTS "staff/personal ve historico" ON public.historico_cargas_treino;

CREATE POLICY cargas_read ON public.historico_cargas_treino FOR SELECT USING (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (private.has_role(auth.uid(), 'ALUNO'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY cargas_write ON public.historico_cargas_treino FOR ALL USING (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (private.has_role(auth.uid(), 'ALUNO'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
) WITH CHECK (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (private.has_role(auth.uid(), 'ALUNO'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY "staff/personal ve historico" ON public.historico_cargas_treino FOR SELECT USING (
  academia_id = private.current_academia_id()
  AND (private.is_staff_na_academia(auth.uid(), academia_id)
       OR private.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL'::public.app_role))
);

-- avaliacoes
DROP POLICY IF EXISTS aval_read ON public.avaliacoes;
DROP POLICY IF EXISTS aval_write ON public.avaliacoes;
DROP POLICY IF EXISTS "staff/personal ve avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "staff/personal cria avaliacoes" ON public.avaliacoes;

CREATE POLICY aval_read ON public.avaliacoes FOR SELECT USING (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
  OR (private.has_role(auth.uid(), 'ALUNO'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid()))
);
CREATE POLICY aval_write ON public.avaliacoes FOR ALL USING (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
) WITH CHECK (
  private.is_staff(auth.uid())
  OR (private.has_role(auth.uid(), 'PERSONAL'::public.app_role)
      AND aluno_id IN (SELECT id FROM public.alunos WHERE personal_id = auth.uid()))
);
CREATE POLICY "staff/personal ve avaliacoes" ON public.avaliacoes FOR SELECT USING (
  academia_id = private.current_academia_id()
  AND (private.is_staff_na_academia(auth.uid(), academia_id)
       OR private.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL'::public.app_role))
);
CREATE POLICY "staff/personal cria avaliacoes" ON public.avaliacoes FOR INSERT
  WITH CHECK (academia_id = private.current_academia_id()
    AND (private.is_staff_na_academia(auth.uid(), academia_id)
         OR private.has_role_na_academia(auth.uid(), academia_id, 'PERSONAL'::public.app_role)));

-- 5. Drop old public helper functions
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);
DROP FUNCTION IF EXISTS public.current_academia_id();
DROP FUNCTION IF EXISTS public.has_role_na_academia(uuid, uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff_na_academia(uuid, uuid);
DROP FUNCTION IF EXISTS public.pode_acessar_academia(uuid, uuid);
DROP FUNCTION IF EXISTS public.handle_new_user();
