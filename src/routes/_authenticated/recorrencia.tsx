import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { fmtBRL } from "@/lib/fitpro/utils";

export const Route = createFileRoute("/_authenticated/recorrencia")({
  head: () => ({
    meta: [
      { title: "Financeiro & Mensalidades — FitPro GYM2" },
      { name: "description", content: "Gere mensalidades, registre pagamentos e acompanhe a inadimplência da academia." },
      { property: "og:title", content: "Financeiro & Mensalidades — FitPro GYM2" },
      { property: "og:description", content: "Motor financeiro recorrente com baixa de pagamentos e controle de inadimplência." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecorrenciaPage,
});

type Aluno = { id: string; nome: string; plano: string; valor_plano: number; status: string };
type Matricula = { id: string; aluno_id: string; valor: number; dia_vencimento: number; status: string };
type Rec = {
  id: string;
  aluno_id: string;
  status: string;
  valor: number;
  vencimento: string | null;
  created_at: string;
};
type Pagamento = { id: string; aluno_id: string; valor: number; forma: string; pago_em: string };

const FORMAS = ["PIX", "DINHEIRO", "DEBITO", "CREDITO", "BOLETO", "CORTESIA"] as const;
type Forma = (typeof FORMAS)[number];

function competenciaAtual() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

function RecorrenciaPage() {
  const { session } = useSession();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [filtro, setFiltro] = useState<"TODOS" | "PENDENTE" | "ATRASADO" | "PAGO">("TODOS");
  const [rodando, setRodando] = useState(false);
  const [baixa, setBaixa] = useState<Rec | null>(null);

  const load = useCallback(async () => {
    if (!session?.academia_id) return;
    const [{ data: a }, { data: m }, { data: r }, { data: p }] = await Promise.all([
      supabase.from("alunos").select("id,nome,plano,valor_plano,status").eq("academia_id", session.academia_id).order("nome"),
      supabase.from("matriculas").select("id,aluno_id,valor,dia_vencimento,status").eq("academia_id", session.academia_id).eq("status", "ATIVA"),
      supabase.from("recorrencias").select("*").eq("academia_id", session.academia_id).order("vencimento", { ascending: false }),
      supabase.from("pagamentos").select("id,aluno_id,valor,forma,pago_em").eq("academia_id", session.academia_id).order("pago_em", { ascending: false }).limit(50),
    ]);
    setAlunos((a ?? []) as Aluno[]);
    setMatriculas((m ?? []) as Matricula[]);
    setRecs((r ?? []) as Rec[]);
    setPagamentos((p ?? []) as Pagamento[]);
  }, [session?.academia_id]);

  useEffect(() => { load(); }, [load]);

  const nomes = useMemo(() => Object.fromEntries(alunos.map((a) => [a.id, a.nome])), [alunos]);

  const hoje = new Date().toISOString().slice(0, 10);
  const efetivo = useCallback(
    (r: Rec) => (r.status === "PENDENTE" && r.vencimento && r.vencimento < hoje ? "ATRASADO" : r.status),
    [hoje]
  );

  const visiveis = useMemo(
    () => (filtro === "TODOS" ? recs : recs.filter((r) => efetivo(r) === filtro)),
    [recs, filtro, efetivo]
  );

  const totais = useMemo(() => {
    const { ano, mes } = competenciaAtual();
    const doMes = recs.filter((r) => {
      if (!r.vencimento) return false;
      const d = new Date(r.vencimento + "T00:00:00");
      return d.getFullYear() === ano && d.getMonth() === mes;
    });
    const receber = doMes.filter((r) => efetivo(r) !== "PAGO").reduce((s, r) => s + Number(r.valor), 0);
    const recebido = doMes.filter((r) => r.status === "PAGO").reduce((s, r) => s + Number(r.valor), 0);
    const atrasados = recs.filter((r) => efetivo(r) === "ATRASADO");
    return {
      receber,
      recebido,
      atrasados: atrasados.length,
      valorAtrasado: atrasados.reduce((s, r) => s + Number(r.valor), 0),
    };
  }, [recs, efetivo]);

  async function gerarMensalidades() {
    if (!session) return;
    setRodando(true);
    const { ano, mes } = competenciaAtual();
    const ativos = matriculas.filter((m) => m.status === "ATIVA");
    let criadas = 0;
    for (const m of ativos) {
      const dia = Math.min(m.dia_vencimento || 10, 28);
      const venc = new Date(ano, mes, dia).toISOString().slice(0, 10);
      const jaExiste = recs.some((r) => r.aluno_id === m.aluno_id && r.vencimento === venc);
      if (jaExiste) continue;
      const { error } = await supabase.from("recorrencias").insert({
        academia_id: session.academia_id,
        aluno_id: m.aluno_id,
        valor: m.valor,
        status: "PENDENTE",
        vencimento: venc,
      });
      if (!error) criadas++;
    }
    setRodando(false);
    toast.success(
      criadas > 0
        ? `${criadas} mensalidade(s) gerada(s) para a competência atual`
        : ativos.length === 0
          ? "Nenhuma matrícula ativa encontrada — cadastre matrículas primeiro"
          : "Mensalidades do mês já estavam geradas"
    );
    load();
  }

  async function registrarPagamento(r: Rec, forma: Forma, valor: number) {
    if (!session) return;
    const { error } = await supabase.from("pagamentos").insert({
      academia_id: session.academia_id,
      aluno_id: r.aluno_id,
      recorrencia_id: r.id,
      valor,
      forma,
      created_by: session.user_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento registrado — mensalidade baixada");
    setBaixa(null);
    load();
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Financeiro & Mensalidades</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="fp-select" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
            <option value="TODOS">Todas</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="ATRASADO">Atrasadas</option>
            <option value="PAGO">Pagas</option>
          </select>
          <button className="fp-btn fp-btn-primary" onClick={gerarMensalidades} disabled={rodando}>
            {rodando ? "Gerando..." : "Gerar mensalidades do mês"}
          </button>
        </div>
      </header>

      <div className="fp-metrics">
        <div><span>A receber (mês)</span><strong>R$ {fmtBRL(totais.receber)}</strong></div>
        <div><span>Recebido (mês)</span><strong>R$ {fmtBRL(totais.recebido)}</strong></div>
        <div><span>Em atraso</span><strong>{totais.atrasados}</strong></div>
        <div><span>Valor em atraso</span><strong>R$ {fmtBRL(totais.valorAtrasado)}</strong></div>
      </div>

      <div className="fp-table-wrap" style={{ marginTop: 18 }}>
        <table className="fp-table">
          <thead>
            <tr><th>Aluno</th><th>Valor</th><th>Vencimento</th><th>Situação</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>
                Nenhuma mensalidade nesse filtro. Gere as mensalidades do mês para começar.
              </td></tr>
            )}
            {visiveis.map((r) => {
              const sts = efetivo(r);
              const cls = sts === "PAGO" ? "ok" : sts === "ATRASADO" || sts === "CANCELADO" ? "bad" : "warn";
              return (
                <tr key={r.id}>
                  <td>{nomes[r.aluno_id] ?? "—"}</td>
                  <td>R$ {fmtBRL(r.valor)}</td>
                  <td>{r.vencimento ? new Date(r.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td><span className={"fp-badge " + cls}>{sts}</span></td>
                  <td>
                    {sts !== "PAGO" && (
                      <button className="fp-btn fp-btn-primary" onClick={() => setBaixa(r)}>Registrar pagamento</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 24, fontSize: 16 }}>Últimos pagamentos</h3>
      <div className="fp-table-wrap" style={{ marginTop: 10 }}>
        <table className="fp-table">
          <thead><tr><th>Quando</th><th>Aluno</th><th>Valor</th><th>Forma</th></tr></thead>
          <tbody>
            {pagamentos.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>Nenhum pagamento registrado.</td></tr>
            )}
            {pagamentos.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.pago_em).toLocaleString("pt-BR")}</td>
                <td>{nomes[p.aluno_id] ?? "—"}</td>
                <td>R$ {fmtBRL(p.valor)}</td>
                <td>{p.forma}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {baixa && (
        <BaixaModal
          rec={baixa}
          nome={nomes[baixa.aluno_id] ?? "Aluno"}
          onClose={() => setBaixa(null)}
          onConfirm={(forma, valor) => registrarPagamento(baixa, forma, valor)}
        />
      )}
    </section>
  );
}

function BaixaModal({
  rec,
  nome,
  onClose,
  onConfirm,
}: {
  rec: Rec;
  nome: string;
  onClose: () => void;
  onConfirm: (forma: Forma, valor: number) => void;
}) {
  const [forma, setForma] = useState<Forma>("PIX");
  const [valor, setValor] = useState(String(rec.valor));

  return (
    <div className="fp-timer-overlay" onClick={onClose}>
      <div className="fp-glass" style={{ maxWidth: 420, width: "90%", padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>Registrar pagamento — {nome}</h3>
        <label className="fp-label">Valor recebido</label>
        <input className="fp-input" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
        <label className="fp-label">Forma de pagamento</label>
        <select className="fp-select" value={forma} onChange={(e) => setForma(e.target.value as Forma)}>
          {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="fp-btn fp-btn-primary" onClick={() => onConfirm(forma, Number(valor || 0))}>Confirmar baixa</button>
          <button className="fp-btn fp-btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
