-- RLS policies invoke these helpers as the calling role, so EXECUTE is required.
-- They live in the private schema and are not exposed through the Data API.
GRANT EXECUTE ON FUNCTION
  private.current_academia_id(),
  private.pode_acessar_academia(uuid, uuid),
  private.is_staff(uuid),
  private.is_staff_na_academia(uuid, uuid),
  private.has_role(uuid, public.app_role),
  private.has_role_na_academia(uuid, uuid, public.app_role),
  private.e_aluno_do_personal(uuid, uuid),
  private.e_proprio_aluno(uuid, uuid)
TO authenticated;
