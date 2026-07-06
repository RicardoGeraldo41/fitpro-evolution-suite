import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

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
  const isAdmin = session?.role === "DONO" || session?.role === "ADMIN";

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
                <td>
                  {isAdmin && (
                    <button className="fp-btn fp-btn-ghost" onClick={() => toggleStatus(a)}>
                      Alternar Status
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
