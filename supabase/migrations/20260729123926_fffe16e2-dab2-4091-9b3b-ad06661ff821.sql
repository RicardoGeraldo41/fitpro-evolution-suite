
CREATE POLICY "evolucao_read_staff_or_owner"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'evolucao-fotos' AND (
      private.is_staff_na_academia(auth.uid(), (split_part(name, '/', 1))::uuid)
      OR (split_part(name, '/', 2))::uuid IN (SELECT id FROM public.alunos WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "evolucao_write_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evolucao-fotos'
    AND private.is_staff_na_academia(auth.uid(), (split_part(name, '/', 1))::uuid)
  );

CREATE POLICY "evolucao_delete_staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'evolucao-fotos'
    AND private.is_staff_na_academia(auth.uid(), (split_part(name, '/', 1))::uuid)
  );
