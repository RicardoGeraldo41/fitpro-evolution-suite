import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/grade")({
  component: GradePage,
});

type Aula = { id: string; nome: string; horario: string; professor: string; vagas: number };

function GradePage() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  useEffect(() => {
    supabase.from("aulas").select("*").order("horario").then(({ data }) => setAulas((data ?? []) as Aula[]));
  }, []);
  return (
    <section className="fp-view fp-glass">
      <h2>Grade de Aulas Coletivas</h2>
      <div className="fp-grade-grid">
        {aulas.map((a) => (
          <div key={a.id} className="fp-aula-card">
            <h4>{a.nome}</h4>
            <p>⏰ {a.horario} • Prof. {a.professor}</p>
            <p>Vagas: {a.vagas}</p>
            <button className="fp-btn fp-btn-primary" onClick={() => toast.success("Aula " + a.nome + " agendada")}>
              Agendar
            </button>
          </div>
        ))}
        {aulas.length === 0 && <p style={{ color: "var(--fp-muted)" }}>Sem aulas cadastradas.</p>}
      </div>
    </section>
  );
}
