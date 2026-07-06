import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { calcularPollock3 } from "@/lib/fitpro/utils";

export const Route = createFileRoute("/_authenticated/avaliacao")({
  component: AvaliacaoPage,
});

type Aluno = { id: string; nome: string };
type Avaliacao = { id: string; created_at: string; dados: Record<string, number> };

function AvaliacaoPage() {
  const { session } = useSession();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoId, setAlunoId] = useState("");
  const [form, setForm] = useState({
    sexo: "M" as "M" | "F",
    idade: "",
    peso: "",
    altura: "",
    peitoral: "",
    abdominal: "",
    coxa: "",
  });
  const [resultado, setResultado] = useState<ReturnType<typeof calcularPollock3> | null>(null);
  const [historico, setHistorico] = useState<Avaliacao[]>([]);

  useEffect(() => {
    supabase.from("alunos").select("id,nome").order("nome").then(({ data }) => {
      const list = (data ?? []) as Aluno[];
      setAlunos(list);
      if (list[0] && !alunoId) setAlunoId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHist = useCallback(async () => {
    if (!alunoId) return;
    const { data } = await supabase
      .from("avaliacoes")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("created_at", { ascending: false });
    setHistorico((data ?? []) as Avaliacao[]);
  }, [alunoId]);

  useEffect(() => { loadHist(); }, [loadHist]);

  async function calcular() {
    const d = {
      sexo: form.sexo,
      idade: Number(form.idade),
      peso: Number(form.peso),
      altura: Number(form.altura),
      peitoral: Number(form.peitoral),
      abdominal: Number(form.abdominal),
      coxa: Number(form.coxa),
    };
    if (!d.idade || !d.peso || !d.peitoral) { toast.error("Preencha todos os campos"); return; }
    const r = calcularPollock3(d);
    setResultado(r);
    const { error } = await supabase.from("avaliacoes").insert({
      aluno_id: alunoId,
      dados: { ...d, ...r },
      avaliador_id: session?.user_id,
      academia_id: session?.academia_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Avaliação persistida");
    loadHist();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className="fp-view fp-glass">
      <h2>Avaliação Antropométrica — Protocolo Pollock 3 Dobras</h2>
      <div className="fp-aval-grid">
        <div className="fp-glass-inner">
          <label className="fp-label">Aluno</label>
          <select className="fp-select" value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <label className="fp-label">Sexo</label>
          <select className="fp-select" value={form.sexo} onChange={set("sexo")}>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
          <label className="fp-label">Idade</label>
          <input className="fp-input" type="number" value={form.idade} onChange={set("idade")} />
          <label className="fp-label">Peso (kg)</label>
          <input className="fp-input" type="number" step="0.1" value={form.peso} onChange={set("peso")} />
          <label className="fp-label">Altura (cm)</label>
          <input className="fp-input" type="number" value={form.altura} onChange={set("altura")} />
          <label className="fp-label">Dobra Peitoral (mm)</label>
          <input className="fp-input" type="number" step="0.1" value={form.peitoral} onChange={set("peitoral")} />
          <label className="fp-label">Dobra Abdominal (mm)</label>
          <input className="fp-input" type="number" step="0.1" value={form.abdominal} onChange={set("abdominal")} />
          <label className="fp-label">Dobra Coxa (mm)</label>
          <input className="fp-input" type="number" step="0.1" value={form.coxa} onChange={set("coxa")} />
          <button className="fp-btn fp-btn-primary" onClick={calcular} style={{ marginTop: 14 }}>
            Calcular & Persistir
          </button>
        </div>
        <div className="fp-glass-inner">
          <h3>Resultado</h3>
          <div className="fp-resultado">
            {resultado ? (
              <>
                <p><strong>{resultado.percentual_gordura}%</strong> — % Gordura Corporal</p>
                <p><strong>{resultado.densidade_corporal}</strong> — Densidade (g/cm³)</p>
                <p><strong>{resultado.massa_gorda} kg</strong> — Massa Gorda</p>
                <p><strong>{resultado.massa_magra} kg</strong> — Massa Magra</p>
                <p><strong>{resultado.imc}</strong> — IMC</p>
              </>
            ) : <p style={{ color: "var(--fp-muted)" }}>Preencha os dados e calcule.</p>}
          </div>
          <h3 style={{ marginTop: 16 }}>Histórico</h3>
          <ul className="fp-hist-list">
            {historico.map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleDateString()} • {a.dados.percentual_gordura}% gordura • {a.dados.massa_magra}kg magra
              </li>
            ))}
            {historico.length === 0 && <li style={{ color: "var(--fp-muted)" }}>Sem avaliações.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
