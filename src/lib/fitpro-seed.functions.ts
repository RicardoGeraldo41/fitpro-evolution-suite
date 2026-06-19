import { createServerFn } from "@tanstack/react-start";

/**
 * Cria as 4 contas demo do FitPro GYM2 + alunos vinculados.
 * Idempotente: se já existirem perfis, não faz nada.
 * Público porque roda na primeira visita à tela de login (signup está desabilitado).
 */
export const seedFitProDemoUsers = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Idempotência: só semeia se a base estiver vazia
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return { seeded: false, reason: "already_seeded" };
    }

    const demoUsers = [
      {
        email: "dono@fitpro.local",
        password: "FitPro@Dono2026",
        nome: "Roberto Diretor",
        role: "DONO" as const,
      },
      {
        email: "admin@fitpro.local",
        password: "FitPro@Admin2026",
        nome: "Patrícia Recepção",
        role: "ADMIN" as const,
      },
      {
        email: "personal@fitpro.local",
        password: "FitPro@Personal2026",
        nome: "Diego Personal",
        role: "PERSONAL" as const,
      },
      {
        email: "aluno@fitpro.local",
        password: "FitPro@Aluno2026",
        nome: "Lucas Silva",
        role: "ALUNO" as const,
      },
    ];

    const ACADEMIA_DEMO_ID = "00000000-0000-0000-0000-00000000fa01";

    const created: Record<string, string> = {};
    for (const u of demoUsers) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nome: u.nome },
      });
      if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
      const uid = data.user!.id;
      created[u.role] = uid;

      await supabaseAdmin
        .from("profiles")
        .upsert({ id: uid, nome: u.nome, email: u.email, academia_atual_id: ACADEMIA_DEMO_ID });

      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: uid, role: u.role, academia_id: ACADEMIA_DEMO_ID });
    }

    const personalId = created.PERSONAL;
    const alunoProfileId = created.ALUNO;

    await supabaseAdmin.from("alunos").insert([
      {
        academia_id: ACADEMIA_DEMO_ID,
        profile_id: alunoProfileId,
        nome: "Lucas Silva",
        plano: "Black",
        valor_plano: 189.9,
        status_financeiro: "ADIMPLENTE",
        personal_id: personalId,
      },
      {
        academia_id: ACADEMIA_DEMO_ID,
        nome: "Marina Costa",
        plano: "Standard",
        valor_plano: 129.9,
        status_financeiro: "INADIMPLENTE",
        personal_id: personalId,
      },
      {
        academia_id: ACADEMIA_DEMO_ID,
        nome: "Rafael Lima",
        plano: "Black",
        valor_plano: 189.9,
        status_financeiro: "ADIMPLENTE",
        personal_id: personalId,
      },
    ]);

    const { data: lucas } = await supabaseAdmin
      .from("alunos")
      .select("id")
      .eq("profile_id", alunoProfileId)
      .maybeSingle();

    if (lucas) {
      await supabaseAdmin.from("treinos").insert({
        academia_id: ACADEMIA_DEMO_ID,
        aluno_id: lucas.id,
        exercicios: [
          { nome: "Supino Reto", series: 3, reps: "10-12", carga_sugerida: 60 },
          { nome: "Remada Curvada", series: 3, reps: "10-12", carga_sugerida: 50 },
          { nome: "Agachamento Livre", series: 4, reps: "8-10", carga_sugerida: 80 },
        ],
        created_by: personalId,
      });
    }

    return { seeded: true, accounts: demoUsers.map((u) => u.email) };
  },
);
