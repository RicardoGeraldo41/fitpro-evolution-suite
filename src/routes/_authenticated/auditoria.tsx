import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria de Ações — Studio Xtreme Workout" },
      { name: "description", content: "Logs de segurança e auditoria das ações executadas na academia." },
      { property: "og:title", content: "Auditoria de Ações — Studio Xtreme Workout" },
      { property: "og:description", content: "Registro de alterações e ações críticas no sistema para governança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditoriaPage,
});

type Log = {
  id: string;
  created_at: string;
  user_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  payload: unknown;
};

function AuditoriaPage() {
  const { session } = useSession();
  const [logs, setLogs] = useState<Log[]>([]);
  const [filtroEnt, setFiltroEnt] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [nomes, setNomes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!session?.academia_id) return;
    let q = supabase
      .from("audit_logs")
      .select("*")
      .eq("academia_id", session.academia_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (filtroEnt) q = q.eq("entidade", filtroEnt);
    if (filtroAcao) q = q.eq("acao", filtroAcao);
    const { data } = await q;
    const list = (data ?? []) as Log[];
    setLogs(list);
    const uids = Array.from(new Set(list.map((l) => l.user_id).filter((x): x is string => !!x)));
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,nome").in("id", uids);
      setNomes(Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome])));
    }
  }, [filtroEnt, filtroAcao, session?.academia_id]);

  useEffect(() => { load(); }, [load]);

  if (session && session.role !== "DONO" && session.role !== "ADMIN") {
    return <section className="fp-view fp-glass"><p>Acesso restrito.</p></section>;
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Auditoria de Ações</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="fp-select" value={filtroEnt} onChange={(e) => setFiltroEnt(e.target.value)}>
            <option value="">Todas entidades</option>
            <option value="alunos">alunos</option>
            <option value="vendas">vendas</option>
            <option value="recorrencias">recorrencias</option>
            <option value="treinos">treinos</option>
          </select>
          <select className="fp-select" value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}>
            <option value="">Todas ações</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </header>
      <div className="fp-table-wrap">
        <table className="fp-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>Sem registros.</td></tr>}
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                <td>{l.user_id ? (nomes[l.user_id] ?? l.user_id.slice(0, 8)) : "—"}</td>
                <td>
                  <span className={"fp-badge " + (l.acao === "DELETE" ? "bad" : l.acao === "UPDATE" ? "warn" : "ok")}>
                    {l.acao}
                  </span>
                </td>
                <td>{l.entidade}</td>
                <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>{l.entidade_id?.slice(0, 8) ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
