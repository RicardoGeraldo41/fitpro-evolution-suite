import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/_authenticated/evolucao")({
  component: EvolucaoPage,
});

type Hist = { id: string; exercicio_nome: string; carga: number; reps_realizadas: string; created_at: string };
type Aval = { id: string; created_at: string; dados: Record<string, number> };

function EvolucaoPage() {
  const { session } = useSession();
  const [hist, setHist] = useState<Hist[]>([]);
  const [avs, setAvs] = useState<Aval[]>([]);

  useEffect(() => {
    if (!session?.aluno_id) return;
    supabase.from("historico_cargas_treino").select("*")
      .eq("aluno_id", session.aluno_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setHist((data ?? []) as Hist[]));
    supabase.from("avaliacoes").select("*")
      .eq("aluno_id", session.aluno_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAvs((data ?? []) as Aval[]));
  }, [session]);

  if (!session?.aluno_id) {
    return <section className="fp-view fp-glass"><h2>Minha Evolução</h2><p>Sem aluno vinculado.</p></section>;
  }

  // Simple line: last 10 sessions carga
  const last10 = hist.slice(0, 10).reverse();
  const max = Math.max(1, ...last10.map((h) => h.carga));

  return (
    <section className="fp-view fp-glass">
      <h2>Minha Evolução</h2>
      <div className="fp-glass-inner">
        <h3 style={{ marginBottom: 8 }}>Séries Registradas: {hist.length}</h3>
        <h3 style={{ marginBottom: 12 }}>Avaliações: {avs.length}</h3>
      </div>

      <div className="fp-chart-box">
        <h3>Cargas — últimas 10 séries</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
          {last10.map((h) => (
            <div key={h.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                title={h.exercicio_nome + " — " + h.carga + "kg"}
                style={{
                  width: "100%",
                  height: (h.carga / max) * 140 + "px",
                  minHeight: 2,
                  background: "linear-gradient(180deg, var(--fp-neon3), var(--fp-neon2))",
                  borderRadius: 6,
                }}
              />
              <span style={{ fontSize: 9, color: "var(--fp-muted)" }}>{h.carga}kg</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fp-glass-inner" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Últimas 10 execuções</h3>
        <ul className="fp-hist-list">
          {hist.slice(0, 10).map((h) => (
            <li key={h.id}>
              {new Date(h.created_at).toLocaleString()} • {h.exercicio_nome} • {h.carga}kg × {h.reps_realizadas} reps
            </li>
          ))}
          {hist.length === 0 && <li style={{ color: "var(--fp-muted)" }}>Sem histórico ainda.</li>}
        </ul>
      </div>
    </section>
  );
}
