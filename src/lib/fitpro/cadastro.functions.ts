import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const codigoSchema = z
  .string()
  .trim()
  .min(6)
  .max(12)
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""));

const baseCadastro = {
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(8).max(72),
  telefone: z.string().trim().max(30).optional(),
  cpf: z.string().trim().max(20).optional(),
};

const cadastroAcademiaSchema = z.object({
  tipo: z.literal("ACADEMIA"),
  ...baseCadastro,
  academia_nome: z.string().trim().min(2).max(120),
  cidade: z.string().trim().min(2).max(80),
  estado: z.string().trim().min(2).max(2),
  cnpj: z.string().trim().max(25).optional(),
});

const cadastroMembroSchema = z.object({
  tipo: z.literal("MEMBRO"),
  ...baseCadastro,
  codigo_convite: codigoSchema,
});

const cadastroSchema = z.discriminatedUnion("tipo", [
  cadastroAcademiaSchema,
  cadastroMembroSchema,
]);

/** Valida um código de convite e devolve apenas o nome da academia correspondente. */
export const consultarConvite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ codigo: codigoSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ac } = await supabaseAdmin
      .from("academias")
      .select("nome,cidade,estado")
      .eq("codigo_convite", data.codigo)
      .eq("status", "ATIVA")
      .maybeSingle();
    if (!ac) return { encontrado: false as const };
    return {
      encontrado: true as const,
      nome: ac.nome,
      cidade: ac.cidade ?? null,
      estado: ac.estado ?? null,
    };
  });

/**
 * Cadastro na plataforma FitPro.
 * - tipo ACADEMIA: cria a academia (novo tenant) e o usuário como DONO.
 * - tipo MEMBRO: entra numa academia existente via código de convite, como ALUNO.
 */
export const cadastrarPerfil = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => cadastroSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    let academia_id: string;
    let academia_nome: string;
    let codigo_convite: string | null = null;
    const role: "DONO" | "ALUNO" = data.tipo === "ACADEMIA" ? "DONO" : "ALUNO";

    if (data.tipo === "ACADEMIA") {
      const { data: nova, error: acErr } = await supabaseAdmin
        .from("academias")
        .insert({
          nome: data.academia_nome,
          cidade: data.cidade,
          estado: data.estado.toUpperCase(),
          cnpj: data.cnpj || null,
          responsavel: data.nome,
          plano_saas: "PRO",
          status: "ATIVA",
        })
        .select("id,nome,codigo_convite")
        .single();
      if (acErr || !nova) throw new Error(acErr?.message ?? "Falha ao criar a academia.");
      academia_id = nova.id;
      academia_nome = nova.nome;
      codigo_convite = nova.codigo_convite;
    } else {
      const { data: ac } = await supabaseAdmin
        .from("academias")
        .select("id,nome")
        .eq("codigo_convite", data.codigo_convite)
        .eq("status", "ATIVA")
        .maybeSingle();
      if (!ac) throw new Error("Código de convite inválido. Peça o código à sua academia.");
      academia_id = ac.id;
      academia_nome = ac.nome;
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
      .upsert({ user_id: uid, role, academia_id }, { onConflict: "user_id,role,academia_id" });
    if (rErr) throw new Error(rErr.message);

    if (role === "ALUNO") {
      const { error: aErr } = await supabaseAdmin.from("alunos").insert({
        academia_id,
        profile_id: uid,
        nome: data.nome,
        plano: "A definir",
        valor_plano: 0,
        telefone: data.telefone || null,
        cpf: data.cpf || null,
      });
      if (aErr) throw new Error(aErr.message);
    }

    return { ok: true, user_id: uid, academia_nome, codigo_convite };
  });
