import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const cadastroSchema = z
  .object({
    nome: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    senha: z.string().min(8).max(72),
    role: z.enum(["DONO", "PERSONAL", "ALUNO"]),
    academia_id: z.string().uuid().optional(),
    academia_nome: z.string().trim().min(2).max(120).optional(),
    telefone: z.string().trim().max(30).optional(),
    cpf: z.string().trim().max(20).optional(),
  })
  .refine((d) => (d.role === "DONO" ? !!d.academia_nome : !!d.academia_id), {
    message: "Selecione a academia (ou informe o nome da nova unidade).",
  });

/** Lista pública de academias ativas — usada na tela de cadastro. */
export const listarAcademiasPublicas = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("academias")
    .select("id,nome")
    .eq("status", "ATIVA")
    .order("nome");
  if (error) return [] as { id: string; nome: string }[];
  return (data ?? []) as { id: string; nome: string }[];
});

/** Auto-cadastro de perfil com hierarquia (DONO abre unidade, PERSONAL/ALUNO entram em uma existente). */
export const cadastrarPerfil = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => cadastroSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    let academia_id = data.academia_id ?? null;
    if (data.role === "DONO") {
      const { data: nova, error: acErr } = await supabaseAdmin
        .from("academias")
        .insert({ nome: data.academia_nome!, plano_saas: "PRO", status: "ATIVA" })
        .select("id")
        .single();
      if (acErr || !nova) throw new Error(acErr?.message ?? "Falha ao criar a academia.");
      academia_id = nova.id;
    } else {
      const { data: ac } = await supabaseAdmin
        .from("academias")
        .select("id")
        .eq("id", academia_id!)
        .maybeSingle();
      if (!ac) throw new Error("Academia inválida.");
    }

    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (authErr || !created?.user) {
      const msg = authErr?.message ?? "Falha ao criar conta.";
      throw new Error(
        /already|registered|exists/i.test(msg)
          ? "Este e-mail já possui cadastro. Use a aba Entrar."
          : msg,
      );
    }
    const uid = created.user.id;

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: uid, nome: data.nome, email, academia_atual_id: academia_id });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: uid, role: data.role, academia_id: academia_id! },
        { onConflict: "user_id,role,academia_id" },
      );
    if (rErr) throw new Error(rErr.message);

    if (data.role === "ALUNO") {
      const { error: aErr } = await supabaseAdmin.from("alunos").insert({
        academia_id: academia_id!,
        profile_id: uid,
        nome: data.nome,
        plano: "A definir",
        valor_plano: 0,
        telefone: data.telefone || null,
        cpf: data.cpf || null,
      });
      if (aErr) throw new Error(aErr.message);
    }

    return { ok: true, user_id: uid };
  });
