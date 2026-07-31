import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const criarSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(8).max(72),
  role: z.enum(["ADMIN", "PERSONAL", "ALUNO"]),
});

const alterarSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["ADMIN", "PERSONAL", "ALUNO"]),
});

async function contextoGestor(supabase: any, userId: string) {
  const { data: perfil } = await supabase
    .from("profiles")
    .select("academia_atual_id")
    .eq("id", userId)
    .maybeSingle();
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role,academia_id")
    .eq("user_id", userId);
  const academia_id: string | null =
    perfil?.academia_atual_id ?? roles?.[0]?.academia_id ?? null;
  const gestor = (roles ?? []).some(
    (r: { role: string; academia_id: string }) =>
      (r.role === "DONO" || r.role === "ADMIN") && r.academia_id === academia_id,
  );
  if (!academia_id || !gestor) throw new Error("Acesso negado: somente DONO/ADMIN.");
  return academia_id as string;
}

export const criarMembroEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => criarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const academia_id = await contextoGestor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (authErr || !created?.user) throw new Error(authErr?.message ?? "Falha ao criar usuário");
    const uid = created.user.id;

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: uid, nome: data.nome, email: data.email, academia_atual_id: academia_id });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: uid, role: data.role, academia_id }, { onConflict: "user_id,role" });
    if (rErr) throw new Error(rErr.message);

    if (data.role === "ALUNO") {
      const { error: aErr } = await supabaseAdmin.from("alunos").insert({
        academia_id,
        profile_id: uid,
        nome: data.nome,
        plano: "A definir",
        valor_plano: 0,
      });
      if (aErr) throw new Error(aErr.message);
    }

    return { user_id: uid };
  });

export const alterarPapelMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => alterarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const academia_id = await contextoGestor(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Não é possível alterar o próprio papel.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: alvo } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id)
      .eq("academia_id", academia_id);
    if (!alvo || alvo.length === 0) throw new Error("Membro não pertence a esta academia.");
    if (alvo.some((r) => r.role === "DONO")) throw new Error("Não é possível alterar o DONO.");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("academia_id", academia_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role, academia_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerMembroEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const academia_id = await contextoGestor(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Não é possível remover a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: alvo } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id)
      .eq("academia_id", academia_id);
    if (!alvo || alvo.length === 0) throw new Error("Membro não pertence a esta academia.");
    if (alvo.some((r) => r.role === "DONO")) throw new Error("Não é possível remover o DONO.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("academia_id", academia_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
