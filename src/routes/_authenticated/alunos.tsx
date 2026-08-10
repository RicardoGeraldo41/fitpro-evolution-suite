import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { gerarFichaTreinoIA } from "@/lib/fitpro/ai.functions";

export const Route = createFileRoute("/_authenticated/alunos")({
  head: () => ({
    meta: [
      { title: "Alunos & Cadastro — Studio Xtreme Workout" },
      { name: "description", content: "Cadastro completo de alunos da academia: contato, saúde, situação da matrícula e ficha de treino." },
      { property: "og:title", content: "Alunos & Cadastro — Studio Xtreme Workout" },
      { property: "og:description", content: "Gerencie a base de alunos com dados cadastrais, saúde e situação financeira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlunosPage,
});

type Aluno = {
  id: string;
  nome: string;
  plano: string;
  status: string;
  status_financeiro: string;
  valor_plano: number | null;
  hash_biometria_digital: string | null;
  cpf: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_fone: string | null;
  observacoes_saude: string | null;
};

const alunoSchema = z.object({
  nome: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres").max(120),
  cpf: z.string().trim().max(14).optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  endereco: z.string().trim().max(200).optional().or(z.literal("")),
  contato_emergencia_nome: z.string().trim().max(120).optional().or(z.literal("")),
  contato_emergencia_fone: z.string().trim().max(20).optional().or(z.literal("")),
  observacoes_saude: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormState = z.infer<typeof alunoSchema>;

const FORM_VAZIO: FormState = {
  nome: "",
  cpf: "",
  telefone: "",
  data_nascimento: "",
  endereco: "",
  contato_emergencia_nome: "",
  contato_emergencia_fone: "",
  observacoes_saude: "",
};

function AlunosPage() {
  const { session } = useSession();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [aiFor, setAiFor] = useState<Aluno | null>(null);
  const [editando, setEditando] = useState<Aluno | null>(null);
  const [criando, setCriando] = useState(false);
  const isAdmin = session?.role === "DONO" || session?.role === "ADMIN";
  const canPersonal = isAdmin || session?.role === "PERSONAL";

  const load = useCallback(async () => {
    if (!session?.academia_id) return;
    setLoading(true);
    const { data, error } = await supabase.from("alunos").select("*").eq("academia_id", session.academia_id).order("nome");
    if (error) toast.error(error.message);
    setAlunos((data ?? []) as Aluno[]);
    setLoading(false);
  }, [session?.academia_id]);

  useEffect(() => { load(); }, [load]);

  const filtrados = alunos.filter((a) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return a.nome.toLowerCase().includes(q) || (a.cpf ?? "").includes(q) || (a.telefone ?? "").includes(q);
  });

  async function salvar(form: FormState, alvo: Aluno | null) {
    if (!session) return;
    const parsed = alunoSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const payload = {
      nome: parsed.data.nome,
      cpf: parsed.data.cpf || null,
      telefone: parsed.data.telefone || null,
      data_nascimento: parsed.data.data_nascimento || null,
      endereco: parsed.data.endereco || null,
      contato_emergencia_nome: parsed.data.contato_emergencia_nome || null,
      contato_emergencia_fone: parsed.data.contato_emergencia_fone || null,
      observacoes_saude: parsed.data.observacoes_saude || null,
    };
    const { error } = alvo
      ? await supabase.from("alunos").update(payload).eq("id", alvo.id)
      : await supabase.from("alunos").insert({
          ...payload,
          plano: "Sem plano",
          valor_plano: 0,
          status_financeiro: "ADIMPLENTE" as const,
          academia_id: session.academia_id,
        });
    if (error) { toast.error(error.message); return; }
    toast.success(alvo ? "Cadastro atualizado" : "Aluno cadastrado — vincule um plano em Planos & Matrículas");
    setEditando(null);
    setCriando(false);
    load();
  }

  async function mudarSituacao(a: Aluno, status: "ATIVO" | "TRANCADO" | "CANCELADO") {
    const { error } = await supabase.from("alunos").update({ status }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Situação atualizada");
    load();
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Alunos & Cadastro</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="fp-input" style={{ maxWidth: 240 }} placeholder="Buscar nome, CPF ou telefone"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
          {isAdmin && (
            <button className="fp-btn fp-btn-primary" onClick={() => setCriando(true)}>+ Novo Aluno</button>
          )}
        </div>
      </header>
      <div className="fp-table-wrap">
        <table className="fp-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Plano</th>
              <th>Situação</th>
              <th>Financeiro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 20 }}>Carregando...</td></tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>Nenhum aluno encontrado.</td></tr>
            )}
            {filtrados.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.nome}
                  <br />
                  <span style={{ fontSize: 11, color: "var(--fp-muted)" }}>{a.cpf ?? "sem CPF"}</span>
                </td>
                <td style={{ fontSize: 12 }}>{a.telefone ?? "—"}</td>
                <td>{a.plano}</td>
                <td>
                  <span className={"fp-badge " + (a.status === "ATIVO" ? "ok" : a.status === "CANCELADO" ? "bad" : "warn")}>
                    {a.status}
                  </span>
                </td>
                <td>
                  <span className={"fp-badge " + (a.status_financeiro === "ADIMPLENTE" ? "ok" : "bad")}>
                    {a.status_financeiro}
                  </span>
                </td>
                <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {isAdmin && (
                    <>
                      <button className="fp-btn fp-btn-ghost" onClick={() => setEditando(a)}>Editar</button>
                      {a.status === "ATIVO" ? (
                        <button className="fp-btn fp-btn-ghost" onClick={() => mudarSituacao(a, "TRANCADO")}>Trancar</button>
                      ) : (
                        <button className="fp-btn fp-btn-ghost" onClick={() => mudarSituacao(a, "ATIVO")}>Reativar</button>
                      )}
                    </>
                  )}
                  {canPersonal && (
                    <button className="fp-btn fp-btn-ghost" onClick={() => setAiFor(a)} title="Gerar ficha com IA">
                      ✨ IA Treino
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aiFor && <IATreinoModal aluno={aiFor} onClose={() => setAiFor(null)} />}
      {(criando || editando) && (
        <AlunoModal
          aluno={editando}
          onClose={() => { setCriando(false); setEditando(null); }}
          onSave={(f) => salvar(f, editando)}
        />
      )}
    </section>
  );
}

function AlunoModal({
  aluno,
  onClose,
  onSave,
}: {
  aluno: Aluno | null;
  onClose: () => void;
  onSave: (form: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(
    aluno
      ? {
          nome: aluno.nome,
          cpf: aluno.cpf ?? "",
          telefone: aluno.telefone ?? "",
          data_nascimento: aluno.data_nascimento ?? "",
          endereco: aluno.endereco ?? "",
          contato_emergencia_nome: aluno.contato_emergencia_nome ?? "",
          contato_emergencia_fone: aluno.contato_emergencia_fone ?? "",
          observacoes_saude: aluno.observacoes_saude ?? "",
        }
      : FORM_VAZIO
  );
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="fp-timer-overlay" onClick={onClose}>
      <div className="fp-glass" style={{ maxWidth: 620, width: "92%", padding: 24, maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>{aluno ? "Editar aluno" : "Novo aluno"}</h3>
        <label className="fp-label">Nome completo *</label>
        <input className="fp-input" value={form.nome} onChange={set("nome")} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label className="fp-label">CPF</label>
            <input className="fp-input" value={form.cpf} onChange={set("cpf")} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="fp-label">Telefone</label>
            <input className="fp-input" value={form.telefone} onChange={set("telefone")} placeholder="(00) 00000-0000" />
          </div>
        </div>
        <label className="fp-label">Data de nascimento</label>
        <input className="fp-input" type="date" value={form.data_nascimento} onChange={set("data_nascimento")} />
        <label className="fp-label">Endereço</label>
        <input className="fp-input" value={form.endereco} onChange={set("endereco")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label className="fp-label">Contato de emergência</label>
            <input className="fp-input" value={form.contato_emergencia_nome} onChange={set("contato_emergencia_nome")} />
          </div>
          <div>
            <label className="fp-label">Telefone de emergência</label>
            <input className="fp-input" value={form.contato_emergencia_fone} onChange={set("contato_emergencia_fone")} />
          </div>
        </div>
        <label className="fp-label">Observações de saúde (PAR-Q)</label>
        <textarea className="fp-input" rows={3} value={form.observacoes_saude} onChange={set("observacoes_saude")}
          placeholder="Lesões, condições cardíacas, medicações, restrições..." />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="fp-btn fp-btn-primary" onClick={() => onSave(form)}>Salvar</button>
          <button className="fp-btn fp-btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}


function IATreinoModal({ aluno, onClose }: { aluno: Aluno; onClose: () => void }) {
  const gerarFn = useServerFn(gerarFichaTreinoIA);
  const [objetivo, setObjetivo] = useState("Hipertrofia");
  const [frequencia, setFrequencia] = useState(3);
  const [restricoes, setRestricoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ exercicios: { nome: string; series: number; reps: string; carga_sugerida: number }[] } | null>(null);

  async function gerar(persistir: boolean) {
    setLoading(true);
    try {
      const r = await gerarFn({ data: { aluno_id: aluno.id, objetivo, frequencia, restricoes, persistir } });
      setResult(r);
      if (persistir) toast.success("Ficha gerada e salva no perfil do aluno");
      else toast.success("Ficha gerada — revise antes de salvar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fp-timer-overlay" onClick={onClose}>
      <div className="fp-glass" style={{ maxWidth: 640, width: "90%", padding: 24, maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>✨ Gerar ficha de treino com IA — {aluno.nome}</h3>
        {!result && (
          <>
            <label className="fp-label">Objetivo</label>
            <select className="fp-select" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
              <option>Hipertrofia</option>
              <option>Emagrecimento</option>
              <option>Força</option>
              <option>Condicionamento</option>
              <option>Reabilitação leve</option>
            </select>
            <label className="fp-label">Frequência semanal</label>
            <input className="fp-input" type="number" min={1} max={7} value={frequencia}
              onChange={(e) => setFrequencia(Number(e.target.value))} />
            <label className="fp-label">Restrições</label>
            <input className="fp-input" value={restricoes} placeholder="ex: dor lombar leve, joelho direito"
              onChange={(e) => setRestricoes(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="fp-btn fp-btn-primary" onClick={() => gerar(false)} disabled={loading}>
                {loading ? "Gerando..." : "Gerar (preview)"}
              </button>
              <button className="fp-btn fp-btn-secondary" onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}
        {result && (
          <>
            <ul className="fp-hist-list">
              {result.exercicios.map((ex, i) => (
                <li key={i}><strong>{ex.nome}</strong> — {ex.series}× {ex.reps} • {ex.carga_sugerida}kg</li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="fp-btn fp-btn-primary" onClick={() => gerar(true)} disabled={loading}>
                {loading ? "Salvando..." : "Salvar no perfil do aluno"}
              </button>
              <button className="fp-btn fp-btn-secondary" onClick={() => setResult(null)}>Refazer</button>
              <button className="fp-btn fp-btn-ghost" onClick={onClose}>Fechar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
