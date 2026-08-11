-- 1) Helper hardening -------------------------------------------------------
CREATE OR REPLACE FUNCTION private.current_academia_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.academia_atual_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.academia_id = p.academia_atual_id
    )
$$;

CREATE OR REPLACE FUNCTION private.pode_acessar_academia(_user_id uuid, _academia_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _academia_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND academia_id = _academia_id
  )
$$;

CREATE OR REPLACE FUNCTION private.is_staff_na_academia(_user_id uuid, _academia_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _academia_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND academia_id = _academia_id AND role IN ('DONO','ADMIN')
  )
$$;

CREATE OR REPLACE FUNCTION private.has_role_na_academia(_user_id uuid, _academia_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _academia_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND academia_id = _academia_id AND role = _role
  )
$$;

-- aluno vinculado ao personal (mesma academia)
CREATE OR REPLACE FUNCTION private.e_aluno_do_personal(_user_id uuid, _aluno_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.alunos a
    WHERE a.id = _aluno_id AND a.personal_id = _user_id
      AND private.has_role_na_academia(_user_id, a.academia_id, 'PERSONAL')
  )
$$;

CREATE OR REPLACE FUNCTION private.e_proprio_aluno(_user_id uuid, _aluno_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = _aluno_id AND a.profile_id = _user_id)
$$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- 2) Remoção de policies globais cross-tenant --------------------------------
DROP POLICY IF EXISTS "alunos_read" ON public.alunos;
DROP POLICY IF EXISTS "alunos_staff_write" ON public.alunos;
DROP POLICY IF EXISTS "aulas_staff_write" ON public.aulas;
DROP POLICY IF EXISTS "produtos_staff_write" ON public.produtos;
DROP POLICY IF EXISTS "vendas_read" ON public.vendas;
DROP POLICY IF EXISTS "vendas_staff_write" ON public.vendas;
DROP POLICY IF EXISTS "rec_read" ON public.recorrencias;
DROP POLICY IF EXISTS "rec_staff_write" ON public.recorrencias;
DROP POLICY IF EXISTS "treinos_read" ON public.treinos;
DROP POLICY IF EXISTS "treinos_write" ON public.treinos;
DROP POLICY IF EXISTS "aval_read" ON public.avaliacoes;
DROP POLICY IF EXISTS "aval_write" ON public.avaliacoes;
DROP POLICY IF EXISTS "cargas_read" ON public.historico_cargas_treino;
DROP POLICY IF EXISTS "cargas_write" ON public.historico_cargas_treino;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_self_read" ON public.user_roles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_staff_insert" ON public.profiles;

-- 3) profiles ----------------------------------------------------------------
CREATE POLICY "profiles_read_tenant" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles alvo
    WHERE alvo.user_id = profiles.id
      AND private.is_staff_na_academia(auth.uid(), alvo.academia_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.alunos a
    WHERE a.profile_id = profiles.id AND a.personal_id = auth.uid()
      AND private.has_role_na_academia(auth.uid(), a.academia_id, 'PERSONAL')
  )
);

CREATE POLICY "profiles_update_tenant" ON public.profiles FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles alvo
    WHERE alvo.user_id = profiles.id AND private.is_staff_na_academia(auth.uid(), alvo.academia_id)
  )
)
WITH CHECK (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles alvo
    WHERE alvo.user_id = profiles.id AND private.is_staff_na_academia(auth.uid(), alvo.academia_id)
  )
);

CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- 4) user_roles --------------------------------------------------------------
CREATE POLICY "user_roles_staff_read" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.is_staff_na_academia(auth.uid(), academia_id));

-- 5) alunos ------------------------------------------------------------------
CREATE POLICY "alunos_personal_update" ON public.alunos FOR UPDATE TO authenticated
USING (private.e_aluno_do_personal(auth.uid(), id))
WITH CHECK (private.e_aluno_do_personal(auth.uid(), id));

-- 6) aulas / produtos / planos / alimentos / xp / conquistas_usuario: exigir vínculo
DROP POLICY IF EXISTS "membros da academia veem aulas" ON public.aulas;
CREATE POLICY "aulas_read_tenant" ON public.aulas FOR SELECT TO authenticated
USING (private.pode_acessar_academia(auth.uid(), academia_id));

DROP POLICY IF EXISTS "ver produtos da academia" ON public.produtos;
CREATE POLICY "produtos_read_tenant" ON public.produtos FOR SELECT TO authenticated
USING (private.pode_acessar_academia(auth.uid(), academia_id));

DROP POLICY IF EXISTS "planos_read" ON public.planos;
CREATE POLICY "planos_read_tenant" ON public.planos FOR SELECT TO authenticated
USING (private.pode_acessar_academia(auth.uid(), academia_id));

DROP POLICY IF EXISTS "alimentos_read" ON public.alimentos;
CREATE POLICY "alimentos_read_tenant" ON public.alimentos FOR SELECT TO authenticated
USING (private.pode_acessar_academia(auth.uid(), academia_id));

DROP POLICY IF EXISTS "xp_read" ON public.pontos_xp;
CREATE POLICY "xp_read_tenant" ON public.pontos_xp FOR SELECT TO authenticated
USING (private.pode_acessar_academia(auth.uid(), academia_id));

DROP POLICY IF EXISTS "cu_read" ON public.conquistas_usuario;
CREATE POLICY "cu_read_tenant" ON public.conquistas_usuario FOR SELECT TO authenticated
USING (private.pode_acessar_academia(auth.uid(), academia_id));

DROP POLICY IF EXISTS "cu_insert_self_or_staff" ON public.conquistas_usuario;
CREATE POLICY "cu_insert_tenant" ON public.conquistas_usuario FOR INSERT TO authenticated
WITH CHECK (
  private.pode_acessar_academia(auth.uid(), academia_id)
  AND (user_id = auth.uid() OR private.is_staff_na_academia(auth.uid(), academia_id))
);

-- 7) recorrencias: aluno vê as próprias --------------------------------------
CREATE POLICY "rec_self_read" ON public.recorrencias FOR SELECT TO authenticated
USING (private.e_proprio_aluno(auth.uid(), aluno_id));

-- 8) treinos / avaliacoes / historico: personal só dos seus alunos (escrita)
CREATE POLICY "treinos_personal_alunos" ON public.treinos FOR ALL TO authenticated
USING (private.e_aluno_do_personal(auth.uid(), aluno_id))
WITH CHECK (private.e_aluno_do_personal(auth.uid(), aluno_id) AND private.pode_acessar_academia(auth.uid(), academia_id));

CREATE POLICY "aval_personal_alunos" ON public.avaliacoes FOR ALL TO authenticated
USING (private.e_aluno_do_personal(auth.uid(), aluno_id))
WITH CHECK (private.e_aluno_do_personal(auth.uid(), aluno_id) AND private.pode_acessar_academia(auth.uid(), academia_id));

CREATE POLICY "cargas_staff_write" ON public.historico_cargas_treino FOR ALL TO authenticated
USING (
  private.pode_acessar_academia(auth.uid(), academia_id)
  AND (private.is_staff_na_academia(auth.uid(), academia_id) OR private.e_aluno_do_personal(auth.uid(), aluno_id))
)
WITH CHECK (
  private.pode_acessar_academia(auth.uid(), academia_id)
  AND (private.is_staff_na_academia(auth.uid(), academia_id) OR private.e_aluno_do_personal(auth.uid(), aluno_id))
);

-- 9) medidas: aluno pode inserir/atualizar as próprias na sua academia
CREATE POLICY "medidas_self_write" ON public.medidas_corporais FOR ALL TO authenticated
USING (private.e_proprio_aluno(auth.uid(), aluno_id))
WITH CHECK (private.e_proprio_aluno(auth.uid(), aluno_id));

-- 10) acessos: staff da academia (sem depender de academia_atual_id)
DROP POLICY IF EXISTS "acessos_staff_read" ON public.acessos;
CREATE POLICY "acessos_staff_read" ON public.acessos FOR SELECT TO authenticated
USING (private.is_staff_na_academia(auth.uid(), academia_id));

DROP POLICY IF EXISTS "acessos_staff_insert" ON public.acessos;
CREATE POLICY "acessos_staff_insert" ON public.acessos FOR INSERT TO authenticated
WITH CHECK (private.is_staff_na_academia(auth.uid(), academia_id));
