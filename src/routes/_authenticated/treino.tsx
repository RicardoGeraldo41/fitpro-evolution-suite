import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/_authenticated/treino")({
  head: () => ({
    meta: [
      { title: "Modo Em Treino — FitPro" },
      { name: "description", content: "Workout tracker imersivo com controle de séries, carga e descanso entre exercícios." },
      { property: "og:title", content: "Modo Em Treino — FitPro" },
      { property: "og:description", content: "Acompanhe sua ficha de treino, registre cargas e séries com timer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TreinoPage,
});

type Exercicio = { nome: string; series: number; reps: string; carga_sugerida: number };
type Treino = { id: string; aluno_id: string; exercicios: Exercicio[] };

function TreinoPage() {
  const { session } = useSession();
  const [treino, setTreino] = useState<Treino | null>(null);
  const [unlocked, setUnlocked] = useState(0);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!session?.aluno_id) return;
    const { data } = await supabase.from("treinos").select("*").eq("aluno_id", session.aluno_id).maybeSingle();
    setTreino(data as Treino | null);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (timer == null) return;
    if (timer <= 0) { setTimer(null); return; }
    const id = setTimeout(() => setTimer((t) => (t ?? 0) - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  async function finalizarSerie(idxEx: number, s: number, kg: number, reps: string, ex: Exercicio) {
    if (!reps) { toast.error("Informe as repetições"); return; }
    if (!session?.aluno_id) return;
    await supabase.from("historico_cargas_treino").insert({
      aluno_id: session.aluno_id,
      exercicio_nome: ex.nome + " (série " + s + ")",
      carga: kg,
      reps_realizadas: reps,
      academia_id: session.academia_id,
    });
    const key = idxEx + ":" + s;
    setDoneKeys((prev) => new Set(prev).add(key));
    setTimer(60);
    // Se todas séries do exercício atual estão feitas, libera próximo
    const nextDone = new Set(doneKeys).add(key);
    const allDone = Array.from({ length: ex.series }, (_, i) => idxEx + ":" + (i + 1)).every((k) => nextDone.has(k));
    if (allDone && idxEx === unlocked) setUnlocked(unlocked + 1);
  }

  if (!session?.aluno_id) {
    return <section className="fp-view fp-glass"><h2>Modo Em Treino</h2><p>Sem aluno vinculado a esta conta.</p></section>;
  }
  if (!treino) {
    return <section className="fp-view fp-glass"><h2>Modo Em Treino</h2><p>Sem treino atribuído.</p></section>;
  }

  return (
    <section className="fp-view fp-glass">
      <h2>Modo Em Treino</h2>
      <div className="fp-treino-wrap">
        {treino.exercicios.map((ex, idx) => (
          <ExercicioBox
            key={idx}
            idx={idx}
            ex={ex}
            locked={idx > unlocked}
            doneKeys={doneKeys}
            onDone={(s, kg, reps) => finalizarSerie(idx, s, kg, reps, ex)}
          />
        ))}
      </div>
      {timer != null && (
        <div className="fp-timer-overlay">
          <div className="fp-timer-circle">{timer}</div>
          <p>Descanso entre séries</p>
          <button className="fp-btn fp-btn-secondary" onClick={() => setTimer(null)}>Pular</button>
        </div>
      )}
    </section>
  );
}

function ExercicioBox({
  idx, ex, locked, doneKeys, onDone,
}: {
  idx: number;
  ex: Exercicio;
  locked: boolean;
  doneKeys: Set<string>;
  onDone: (s: number, kg: number, reps: string) => void;
}) {
  const [rows, setRows] = useState(
    Array.from({ length: ex.series }, () => ({ kg: String(ex.carga_sugerida), reps: "" }))
  );

  return (
    <div className={"fp-exercicio" + (locked ? " locked" : "")}>
      <h3>{idx + 1}. {ex.nome}</h3>
      <p className="fp-meta">{ex.series} séries × {ex.reps} reps • carga sugerida: {ex.carga_sugerida}kg</p>
      <div className="fp-series-list">
        {rows.map((r, i) => {
          const done = doneKeys.has(idx + ":" + (i + 1));
          return (
            <div key={i} className="fp-serie-row">
              <span>Série {i + 1}</span>
              <input className="fp-input" type="number" placeholder="kg" value={r.kg}
                onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, kg: e.target.value } : x))} />
              <input className="fp-input" type="number" placeholder="reps" value={r.reps}
                onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, reps: e.target.value } : x))} />
              <button className="fp-btn fp-btn-primary" disabled={done}
                onClick={() => onDone(i + 1, Number(r.kg), r.reps)}>
                {done ? "✓" : "OK"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
