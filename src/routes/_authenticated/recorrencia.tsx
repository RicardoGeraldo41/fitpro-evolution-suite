import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { fmtBRL } from "@/lib/fitpro/utils";

export const Route = createFileRoute("/_authenticated/recorrencia")({
  component: RecorrenciaPage,
});

type Aluno = { id: string; nome: string; plano: string; valor_plano: number };
type Rec = { id: string; aluno_id: string; status: string; valor: number; created_at: string };

function RecorrenciaPage() {
  const { session } = useSession();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [rodando, setRodando] = useState(false);

  const load = useCallback(async () => {
    const [{ data: a }, { data: r }] = await Promise.all([
      supabase.from("alunos").select("id,nome,plano,valor_plano").order("nome"),
      supabase.from("recorrencias").select("*").order("created_at", { ascending: false }),
    ]);
    setAlunos((a ?? []) as Aluno[]);
    setRecs((r ?? []) as Rec[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function rodar() {
    if (!session) return;
    setRodando(true);
    for (const a of alunos) {
      const ok = Math.random() > 0.1;
      await supabase.from("recorrencias").insert({
        aluno_id: a.id,
        valor: a.valor_plano,
        status: ok ? "PAGO" : "ATRASADO",
        academia_id: session.academia_id,
      });
      if (!ok) {
        await supabase.from("alunos").update({ status_financeiro: "INADIMPLENTE" }).eq("id", a.id);
      }
    }
    setRodando(false);
    toast.success("Faturamento mensal processado");
    load();
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Motor Financeiro Recorrente</h2>
        <button className="fp-btn fp-btn-primary" onClick={rodar} disabled={rodando}>
          {rodando ? "Processando..." : "Processar Faturamento Mensal"}
        </button>
      </header>
      <div className="fp-table-wrap">
        <table className="fp-table">
          <thead>
            <tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Status</th><th>Última Cobrança</th></tr>
          </thead>
          <tbody>
            {alunos.map((a) => {
              const last = recs.find((r) => r.aluno_id === a.id);
              const sts = last?.status ?? "PENDENTE";
              const cls = sts === "PAGO" ? "ok" : (sts === "ATRASADO" || sts === "CANCELADO") ? "bad" : "warn";
              return (
                <tr key={a.id}>
                  <td>{a.nome}</td>
                  <td>{a.plano}</td>
                  <td>R$ {fmtBRL(a.valor_plano)}</td>
                  <td><span className={"fp-badge " + cls}>{sts}</span></td>
                  <td>{last ? new Date(last.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
