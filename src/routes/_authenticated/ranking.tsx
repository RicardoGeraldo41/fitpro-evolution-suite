import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking XP — FitPro GYM2" },
      { name: "description", content: "Top 20 alunos da academia no ranking de conquistas e pontos de experiência." },
      { property: "og:title", content: "Ranking XP — FitPro GYM2" },
      { property: "og:description", content: "Gamificação fitness: ranking de XP e níveis dos alunos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RankingPage,
});

type Row = { user_id: string; xp_total: number; nivel: number; nome: string | null };

function RankingPage() {
  const { session } = useSession();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!session?.academia_id) return;
    (async () => {
      const { data: xp } = await supabase
        .from("pontos_xp")
        .select("user_id,xp_total,nivel")
        .eq("academia_id", session.academia_id)
        .order("xp_total", { ascending: false })
        .limit(20);
      const ids = (xp ?? []).map((x) => x.user_id);
      let nomes: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,nome").in("id", ids);
        nomes = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome]));
      }
      setRows((xp ?? []).map((x) => ({ ...x, nome: nomes[x.user_id] ?? "—" })));
    })();
  }, [session?.academia_id]);

  return (
    <section className="fp-view fp-glass">
      <h2>🏆 Ranking XP — Top 20</h2>
      <div className="fp-table-wrap" style={{ marginTop: 12 }}>
        <table className="fp-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>Aluno</th>
              <th>Nível</th>
              <th>XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>Sem pontuação ainda — desbloqueie conquistas para aparecer aqui.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.user_id} style={session?.user_id === r.user_id ? { background: "rgba(255,43,214,0.08)" } : undefined}>
                <td><strong style={{ color: i < 3 ? "var(--fp-neon)" : "var(--fp-muted)" }}>#{i + 1}</strong></td>
                <td>{r.nome}</td>
                <td><span className="fp-badge ok">Nv {r.nivel}</span></td>
                <td><strong style={{ color: "var(--fp-neon3)" }}>{r.xp_total} XP</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
