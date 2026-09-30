-- Restore Data API privileges (RLS remains the authorization layer)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.alunos, public.aulas, public.agendamentos, public.alimentos,
  public.avaliacoes, public.historico_cargas_treino, public.matriculas,
  public.medidas_corporais, public.pagamentos, public.planos,
  public.planos_alimentares, public.produtos, public.recorrencias,
  public.treinos, public.user_roles
TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.academias TO authenticated;
GRANT SELECT, INSERT ON public.acessos, public.conquistas_usuario, public.vendas TO authenticated;
GRANT SELECT ON public.audit_logs, public.conquistas, public.pontos_xp, public.venda_itens TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
