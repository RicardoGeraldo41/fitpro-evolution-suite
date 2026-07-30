
-- ENUMS
DO $$ BEGIN CREATE TYPE public.status_matricula AS ENUM ('ATIVA','TRANCADA','CANCELADA','VENCIDA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.status_aluno AS ENUM ('ATIVO','TRANCADO','CANCELADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.metodo_acesso AS ENUM ('DIGITAL','FACIAL','MANUAL','QRCODE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.forma_pagamento AS ENUM ('DINHEIRO','PIX','DEBITO','CREDITO','BOLETO','CORTESIA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.status_agendamento AS ENUM ('CONFIRMADO','CANCELADO','PRESENTE','FALTA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ALUNOS: dados cadastrais reais
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_fone text,
  ADD COLUMN IF NOT EXISTS observacoes_saude text,
  ADD COLUMN IF NOT EXISTS data_matricula date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status public.status_aluno NOT NULL DEFAULT 'ATIVO';

-- AULAS: grade real
ALTER TABLE public.aulas
  ADD COLUMN IF NOT EXISTS dia_semana smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duracao_min integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS capacidade integer NOT NULL DEFAULT 20;

-- PLANOS
CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL REFERENCES public.academias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  duracao_meses integer NOT NULL DEFAULT 1,
  inclui_aulas boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY planos_read ON public.planos FOR SELECT TO authenticated
  USING (academia_id = private.current_academia_id());
CREATE POLICY planos_write ON public.planos FOR ALL TO authenticated
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE TRIGGER planos_updated_at BEFORE UPDATE ON public.planos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- MATRICULAS
CREATE TABLE IF NOT EXISTS public.matriculas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL REFERENCES public.academias(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  dia_vencimento smallint NOT NULL DEFAULT 10,
  status public.status_matricula NOT NULL DEFAULT 'ATIVA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matriculas TO authenticated;
GRANT ALL ON public.matriculas TO service_role;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY matriculas_staff ON public.matriculas FOR ALL TO authenticated
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY matriculas_self_read ON public.matriculas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = matriculas.aluno_id AND a.profile_id = auth.uid()));
CREATE TRIGGER matriculas_updated_at BEFORE UPDATE ON public.matriculas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PAGAMENTOS
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL REFERENCES public.academias(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  recorrencia_id uuid REFERENCES public.recorrencias(id) ON DELETE SET NULL,
  valor numeric NOT NULL,
  forma public.forma_pagamento NOT NULL DEFAULT 'PIX',
  pago_em timestamptz NOT NULL DEFAULT now(),
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY pagamentos_staff ON public.pagamentos FOR ALL TO authenticated
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY pagamentos_self_read ON public.pagamentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = pagamentos.aluno_id AND a.profile_id = auth.uid()));

-- ACESSOS (catraca / recepcao)
CREATE TABLE IF NOT EXISTS public.acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL REFERENCES public.academias(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  metodo public.metodo_acesso NOT NULL DEFAULT 'MANUAL',
  permitido boolean NOT NULL,
  motivo text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS acessos_academia_data_idx ON public.acessos (academia_id, created_at DESC);
CREATE INDEX IF NOT EXISTS acessos_aluno_idx ON public.acessos (aluno_id, created_at DESC);
GRANT SELECT, INSERT ON public.acessos TO authenticated;
GRANT ALL ON public.acessos TO service_role;
ALTER TABLE public.acessos ENABLE ROW LEVEL SECURITY;
CREATE POLICY acessos_staff_read ON public.acessos FOR SELECT TO authenticated
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY acessos_self_read ON public.acessos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = acessos.aluno_id AND a.profile_id = auth.uid()));
CREATE POLICY acessos_staff_insert ON public.acessos FOR INSERT TO authenticated
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));

-- AGENDAMENTOS DE AULAS
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL REFERENCES public.academias(id) ON DELETE CASCADE,
  aula_id uuid NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data date NOT NULL,
  status public.status_agendamento NOT NULL DEFAULT 'CONFIRMADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aula_id, aluno_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY agendamentos_staff ON public.agendamentos FOR ALL TO authenticated
  USING (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id))
  WITH CHECK (academia_id = private.current_academia_id() AND private.is_staff_na_academia(auth.uid(), academia_id));
CREATE POLICY agendamentos_self ON public.agendamentos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = agendamentos.aluno_id AND a.profile_id = auth.uid()))
  WITH CHECK (academia_id = private.current_academia_id() AND EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = agendamentos.aluno_id AND a.profile_id = auth.uid()));
CREATE TRIGGER agendamentos_updated_at BEFORE UPDATE ON public.agendamentos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Limite de vagas por aula/data
CREATE OR REPLACE FUNCTION private.tg_check_vagas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap integer; usados integer;
BEGIN
  IF NEW.status <> 'CONFIRMADO' THEN RETURN NEW; END IF;
  SELECT capacidade INTO cap FROM public.aulas WHERE id = NEW.aula_id;
  SELECT count(*) INTO usados FROM public.agendamentos
    WHERE aula_id = NEW.aula_id AND data = NEW.data AND status = 'CONFIRMADO' AND id <> NEW.id;
  IF cap IS NOT NULL AND usados >= cap THEN
    RAISE EXCEPTION 'Aula lotada: nao ha vagas disponiveis';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION private.tg_check_vagas() FROM PUBLIC;
CREATE TRIGGER agendamentos_check_vagas BEFORE INSERT OR UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION private.tg_check_vagas();

-- Sincroniza status financeiro do aluno
CREATE OR REPLACE FUNCTION private.sync_status_financeiro(_aluno_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inad boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.recorrencias r
    WHERE r.aluno_id = _aluno_id
      AND r.status IN ('PENDENTE','ATRASADO')
      AND r.vencimento IS NOT NULL
      AND r.vencimento < CURRENT_DATE
  ) INTO inad;
  UPDATE public.alunos SET status_financeiro = CASE WHEN inad THEN 'INADIMPLENTE'::status_financeiro ELSE 'ADIMPLENTE'::status_financeiro END
  WHERE id = _aluno_id;
END $$;
REVOKE EXECUTE ON FUNCTION private.sync_status_financeiro(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.tg_pagamento_baixa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.recorrencia_id IS NOT NULL THEN
    UPDATE public.recorrencias SET status = 'PAGO' WHERE id = NEW.recorrencia_id;
  END IF;
  PERFORM private.sync_status_financeiro(NEW.aluno_id);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION private.tg_pagamento_baixa() FROM PUBLIC;
CREATE TRIGGER pagamentos_baixa AFTER INSERT ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION private.tg_pagamento_baixa();

CREATE OR REPLACE FUNCTION private.tg_recorrencia_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM private.sync_status_financeiro(NEW.aluno_id);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION private.tg_recorrencia_sync() FROM PUBLIC;
CREATE TRIGGER recorrencias_sync_status AFTER INSERT OR UPDATE ON public.recorrencias
  FOR EACH ROW EXECUTE FUNCTION private.tg_recorrencia_sync();
