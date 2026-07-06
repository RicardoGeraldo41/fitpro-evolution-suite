import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { gerarFichaTreinoIA } from "@/lib/fitpro/ai.functions";

export const Route = createFileRoute("/_authenticated/alunos")({
  component: AlunosPage,
});

type Aluno = {
  id: string;
  nome: string;
  plano: string;
  status_financeiro: string;
  valor_plano: number | null;
  hash_biometria_digital: string | null;
};

function AlunosPage() {
  const { session } = useSession();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiFor, setAiFor] = useState<Aluno | null>(null);
  const isAdmin = session?.role === "DONO" || session?.role === "ADMIN";
  const canPersonal = isAdmin || session?.role === "PERSONAL";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("alunos").select("*").order("nome");
    setAlunos((data ?? []) as Aluno[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(a: Aluno) {
    const next = a.status_financeiro === "ADIMPLENTE" ? "INADIMPLENTE" : "ADIMPLENTE";
    const { error } = await supabase.from("alunos").update({ status_financeiro: next }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status atualizado");
    load();
  }

  async function novoAluno() {
    const nome = prompt("Nome do aluno:");
    if (!nome || !session) return;
    const { error } = await supabase.from("alunos").insert({
      nome,
      plano: "Standard",
      valor_plano: 129.9,
      status_financeiro: "ADIMPLENTE",
      academia_id: session.academia_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Matrícula criada");
    load();
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Matrículas & Alunos</h2>
        {isAdmin && (
          <button className="fp-btn fp-btn-primary" onClick={novoAluno}>
            + Nova Matrícula
          </button>
        )}
      </header>
      <div className="fp-table-wrap">
        <table className="fp-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Plano</th>
              <th>Status Financeiro</th>
              <th>Biometria</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>Carregando...</td></tr>
            )}
            {!loading && alunos.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>Sem alunos.</td></tr>
            )}
            {alunos.map((a) => (
              <tr key={a.id}>
                <td>{a.nome}</td>
                <td>{a.plano}</td>
                <td>
                  <span className={"fp-badge " + (a.status_financeiro === "ADIMPLENTE" ? "ok" : "bad")}>
                    {a.status_financeiro}
                  </span>
                </td>
                <td>{a.hash_biometria_digital ? "✓ Cadastrada" : "—"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  {isAdmin && (
                    <button className="fp-btn fp-btn-ghost" onClick={() => toggleStatus(a)}>
                      Alternar Status
                    </button>
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
    </section>
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
