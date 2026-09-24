ALTER TABLE public.academias
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS codigo_convite text;

CREATE OR REPLACE FUNCTION public.gerar_codigo_convite()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidato text;
  i int;
BEGIN
  LOOP
    candidato := '';
    FOR i IN 1..8 LOOP
      candidato := candidato || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.academias WHERE codigo_convite = candidato);
  END LOOP;
  RETURN candidato;
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_codigo_convite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_codigo_convite() TO service_role;

UPDATE public.academias
SET codigo_convite = public.gerar_codigo_convite()
WHERE codigo_convite IS NULL;

ALTER TABLE public.academias
  ALTER COLUMN codigo_convite SET DEFAULT public.gerar_codigo_convite();

ALTER TABLE public.academias
  ALTER COLUMN codigo_convite SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS academias_codigo_convite_key
  ON public.academias (codigo_convite);
