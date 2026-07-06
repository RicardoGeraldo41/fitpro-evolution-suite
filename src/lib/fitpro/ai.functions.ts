import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(system: string, user: string, jsonSchema?: object) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (jsonSchema) {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Limite de IA atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no Lovable Cloud.");
    throw new Error(`IA falhou (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

/* --------------------- 1) Gerar ficha de treino --------------------- */

export const gerarFichaTreinoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      aluno_id: string;
      objetivo: string;
      frequencia: number;
      restricoes?: string;
      persistir?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: aluno } = await supabase
      .from("alunos")
      .select("nome,plano,academia_id")
      .eq("id", data.aluno_id)
      .maybeSingle();
    if (!aluno) throw new Error("Aluno não encontrado ou sem acesso.");

    const system =
      "Você é um personal trainer sênior, certificado CREF. Devolva SEMPRE JSON válido, sem markdown, sem comentários. " +
      "Formato exigido: { \"exercicios\": [ { \"nome\": string, \"series\": number, \"reps\": string, \"carga_sugerida\": number } ] }. " +
      "Escolha entre 5 e 8 exercícios variando grupos musculares. carga_sugerida em kg realista para iniciante/intermediário.";
    const user =
      `Aluno: ${aluno.nome}\nObjetivo: ${data.objetivo}\nFrequência semanal: ${data.frequencia}x\nRestrições: ${data.restricoes ?? "nenhuma"}`;

    const raw = await callAI(system, user, {});
    let parsed: { exercicios: { nome: string; series: number; reps: string; carga_sugerida: number }[] };
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      throw new Error("IA devolveu formato inválido. Tente novamente.");
    }
    if (!Array.isArray(parsed.exercicios) || parsed.exercicios.length === 0) {
      throw new Error("IA não gerou exercícios.");
    }

    if (data.persistir) {
      await supabase.from("treinos").insert({
        aluno_id: data.aluno_id,
        exercicios: parsed.exercicios,
        created_by: userId,
        academia_id: aluno.academia_id,
      });
    }
    return parsed;
  });

/* --------------------- 2) Analisar evolução --------------------- */

export const analisarEvolucaoAluno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { aluno_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: aluno }, { data: avals }, { data: hist }] = await Promise.all([
      supabase.from("alunos").select("nome,plano,status_financeiro").eq("id", data.aluno_id).maybeSingle(),
      supabase.from("avaliacoes").select("created_at,dados").eq("aluno_id", data.aluno_id).order("created_at", { ascending: false }).limit(6),
      supabase.from("historico_cargas_treino").select("created_at,exercicio_nome,carga,reps_realizadas").eq("aluno_id", data.aluno_id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (!aluno) throw new Error("Aluno não encontrado.");

    const system =
      "Você é um coach de treinamento resistido. Analise os dados objetivamente e devolva DIAGNÓSTICO EM 2 PARÁGRAFOS + 3 recomendações práticas numeradas. " +
      "Fale em português BR, tom direto e profissional. Sem markdown pesado.";
    const user =
      `Aluno: ${aluno.nome} (${aluno.plano}, ${aluno.status_financeiro}).\n` +
      `Avaliações (${avals?.length ?? 0}): ${JSON.stringify(avals ?? [])}\n` +
      `Últimas séries (${hist?.length ?? 0}): ${JSON.stringify((hist ?? []).slice(0, 30))}`;
    const texto = await callAI(system, user);
    return { texto };
  });

/* --------------------- 3) Sugerir retenção --------------------- */

export const sugerirRetencao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: inad } = await supabase
      .from("alunos")
      .select("id,nome,plano,status_financeiro")
      .eq("status_financeiro", "INADIMPLENTE")
      .limit(20);

    if (!inad || inad.length === 0) return { alunos: [] as { id: string; nome: string; mensagem: string }[] };

    const system =
      "Você é um gerente de retenção de academia. Para cada aluno, escreva UMA mensagem curta, calorosa e personalizada (max 240 caracteres) para WhatsApp, oferecendo negociação. " +
      "Devolva SEMPRE JSON: { \"resultados\": [ { \"id\": string, \"mensagem\": string } ] }";
    const user = "Alunos em risco:\n" + JSON.stringify(inad);

    const raw = await callAI(system, user, {});
    let parsed: { resultados: { id: string; mensagem: string }[] };
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { resultados: inad.map((a) => ({ id: a.id, mensagem: `Olá ${a.nome}, sentimos sua falta! Podemos conversar sobre sua mensalidade?` })) };
    }
    const map = new Map(parsed.resultados.map((r) => [r.id, r.mensagem]));
    return {
      alunos: inad.map((a) => ({
        id: a.id,
        nome: a.nome,
        mensagem: map.get(a.id) ?? `Olá ${a.nome}, podemos conversar?`,
      })),
    };
  });
