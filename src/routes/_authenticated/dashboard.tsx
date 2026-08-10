import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { fmtBRL } from "@/lib/fitpro/utils";
import { sugerirRetencao } from "@/lib/fitpro/ai.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel Estratégico — Studio Xtreme Workout" },
      { name: "description", content: "Dashboard operacional da academia: alunos, inadimplência, caixa e faturamento recorrente." },
      { property: "og:title", content: "Painel Estratégico — Studio Xtreme Workout" },
      { property: "og:description", content: "Acompanhe KPIs financeiros e operacionais da sua academia em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

type Kpi = { label: string; value: string | number };

function DashboardPage() {
  const { session } = useSession();
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [finance, setFinance] = useState<Kpi[]>([]);
  const [faturamento12m, setFaturamento12m] = useState<{ mes: string; total: number }[]>([]);

  useEffect(() => {
    if (!session?.academia_id) return;
    (async () => {
      const [{ data: alunos = [] }, { data: vendas = [] }, { data: rec = [] }] = await Promise.all([
        supabase.from("alunos").select("status_financeiro").eq("academia_id", session.academia_id),
        supabase.from("vendas").select("total,created_at").eq("academia_id", session.academia_id),
        supabase.from("recorrencias").select("valor,status,created_at").eq("academia_id", session.academia_id),
      ]);

      const totalVendas = (vendas ?? []).reduce((s, v) => s + Number(v.total || 0), 0);
      const totalRec = (rec ?? [])
        .filter((r) => r.status === "PAGO")
        .reduce((s, r) => s + Number(r.valor || 0), 0);

      setKpis([
        { label: "Alunos Ativos", value: (alunos ?? []).filter((a) => a.status_financeiro === "ADIMPLENTE").length },
        { label: "Inadimplentes", value: (alunos ?? []).filter((a) => a.status_financeiro === "INADIMPLENTE").length },
        { label: "Caixa (PDV)", value: "R$ " + fmtBRL(totalVendas) },
        { label: "Recorrência", value: "R$ " + fmtBRL(totalRec) },
      ]);

      if (session?.role === "DONO") {
        setFinance([
          { label: "Faturamento Total", value: "R$ " + fmtBRL(totalVendas + totalRec) },
          { label: "Ticket Médio PDV", value: "R$ " + fmtBRL((vendas ?? []).length ? totalVendas / (vendas ?? []).length : 0) },
          { label: "Cobranças Recorrentes", value: (rec ?? []).length },
        ]);

        // Faturamento 12 meses (PDV + Recorrência)
        const now = new Date();
        const buckets: Record<string, number> = {};
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets[d.toISOString().slice(0, 7)] = 0;
        }
        const acc = (dt: string | null, val: number) => {
          if (!dt) return;
          const k = dt.slice(0, 7);
          if (k in buckets) buckets[k] += val;
        };
        (vendas ?? []).forEach((v) => acc(v.created_at, Number(v.total || 0)));
        (rec ?? []).filter((r) => r.status === "PAGO").forEach((r) => acc(r.created_at, Number(r.valor || 0)));
        setFaturamento12m(
          Object.entries(buckets).map(([mes, total]) => ({ mes: mes.slice(5) + "/" + mes.slice(2, 4), total }))
        );
      }
    })();
  }, [session]);

  return (
    <section className="fp-view fp-glass">
      <h2>Painel Estratégico</h2>
      <div className="fp-cards-grid">
        {kpis.map((k) => (
          <div key={k.label} className="fp-kpi">
            <h4>{k.label}</h4>
            <p>{k.value}</p>
          </div>
        ))}
      </div>

      {session?.role === "DONO" && (
        <>
          <div className="fp-glass-inner" style={{ marginTop: 22 }}>
            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "var(--fp-muted)" }}>
              Faturamento Consolidado
            </h3>
            <div className="fp-metrics">
              {finance.map((m) => (
                <div key={m.label}>
                  <span>{m.label}</span>
                  <strong>{m.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <BarChart12m data={faturamento12m} />
        </>
      )}

      {(session?.role === "DONO" || session?.role === "ADMIN") && <RetencaoWidget />}
      {session?.role === "ALUNO" && <XPWidget userId={session.user_id} />}
    </section>
  );
}

function XPWidget({ userId }: { userId: string }) {
  const [xp, setXp] = useState<{ xp_total: number; nivel: number } | null>(null);
  const [conquistas, setConquistas] = useState<{ nome: string; icone: string | null; xp: number; unlocked_at: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("pontos_xp").select("xp_total,nivel").eq("user_id", userId).maybeSingle();
      setXp(p ?? { xp_total: 0, nivel: 1 });
      const { data: cu } = await supabase
        .from("conquistas_usuario")
        .select("unlocked_at,conquistas(nome,icone,xp)")
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false })
        .limit(6);
      setConquistas(
        (cu ?? []).map((c: { unlocked_at: string; conquistas: { nome: string; icone: string | null; xp: number } | null }) => ({
          unlocked_at: c.unlocked_at,
          nome: c.conquistas?.nome ?? "-",
          icone: c.conquistas?.icone ?? null,
          xp: c.conquistas?.xp ?? 0,
        }))
      );
    })();
  }, [userId]);
  const progresso = xp ? xp.xp_total % 100 : 0;
  return (
    <div className="fp-ai-box">
      <h4>🎮 Sua Jornada</h4>
      <p>Nível <strong style={{ color: "var(--fp-neon)" }}>{xp?.nivel ?? 1}</strong> · <strong>{xp?.xp_total ?? 0} XP</strong></p>
      <div style={{ height: 8, background: "rgba(0,0,0,0.4)", borderRadius: 6, marginTop: 8, overflow: "hidden" }}>
        <div style={{ width: progresso + "%", height: "100%", background: "linear-gradient(90deg, var(--fp-neon2), var(--fp-neon))" }} />
      </div>
      {conquistas.length > 0 && (
        <ul className="fp-hist-list" style={{ marginTop: 12 }}>
          {conquistas.map((c, i) => (
            <li key={i}>🏅 <strong>{c.nome}</strong> · +{c.xp} XP</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RetencaoWidget() {
  const fn = useServerFn(sugerirRetencao);
  const [items, setItems] = useState<{ id: string; nome: string; mensagem: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    try {
      const r = await fn({});
      setItems(r.alunos);
      if (!r.alunos.length) toast.success("Nenhum aluno em risco 🎉");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally { setLoading(false); }
  }
  return (
    <div className="fp-ai-box">
      <h4>✨ Retenção com IA</h4>
      <p style={{ marginBottom: 10 }}>Detecta inadimplentes e gera mensagem personalizada para WhatsApp.</p>
      <button className="fp-btn fp-btn-primary" onClick={run} disabled={loading}>
        {loading ? "Analisando..." : "Sugerir contatos"}
      </button>
      {items && items.length > 0 && (
        <ul className="fp-hist-list" style={{ marginTop: 12 }}>
          {items.map((i) => (
            <li key={i.id}><strong>{i.nome}:</strong> {i.mensagem}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BarChart12m({ data }: { data: { mes: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="fp-chart-box">
      <h3>Faturamento — últimos 12 meses</h3>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180 }}>
        {data.map((d) => (
          <div key={d.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              title={"R$ " + fmtBRL(d.total)}
              style={{
                width: "100%",
                height: (d.total / max) * 150 + "px",
                minHeight: 2,
                background: "linear-gradient(180deg, var(--fp-neon), var(--fp-neon2))",
                borderRadius: 6,
              }}
            />
            <span style={{ fontSize: 10, color: "var(--fp-muted)" }}>{d.mes}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
