import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { fmtBRL } from "@/lib/fitpro/utils";
import { downloadCsv } from "@/lib/fitpro/csv";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

type AlunoRow = {
  id: string; nome: string; cpf: string | null; telefone: string | null; plano: string;
  valor_plano: number; status: string; status_financeiro: string; data_matricula: string;
};
type PagamentoRow = { id: string; valor: number; forma: string; pago_em: string; aluno_id: string };
type RecRow = { id: string; valor: number; status: string; vencimento: string | null; aluno_id: string };
type AcessoRow = { id: string; created_at: string; metodo: string; permitido: boolean; motivo: string | null; aluno_id: string | null };
type VendaRow = { id: string; total: number; created_at: string; aluno_id: string | null };

const hoje = new Date();
const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);

function RelatoriosPage() {
  const { session } = useSession();
  const [de, setDe] = useState(primeiroDia);
  const [ate, setAte] = useState(hoje.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [alunos, setAlunos] = useState<AlunoRow[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [recorrencias, setRecorrencias] = useState<RecRow[]>([]);
  const [acessos, setAcessos] = useState<AcessoRow[]>([]);
  const [vendas, setVendas] = useState<VendaRow[]>([]);

  const nomePorAluno = useMemo(
    () => Object.fromEntries(alunos.map((a) => [a.id, a.nome])) as Record<string, string>,
    [alunos]
  );

  const carregar = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const ini = `${de}T00:00:00.000Z`;
    const fim = `${ate}T23:59:59.999Z`;
    const [a, p, r, ac, v] = await Promise.all([
      supabase.from("alunos").select("id,nome,cpf,telefone,plano,valor_plano,status,status_financeiro,data_matricula").order("nome"),
      supabase.from("pagamentos").select("id,valor,forma,pago_em,aluno_id").gte("pago_em", ini).lte("pago_em", fim).order("pago_em", { ascending: false }),
      supabase.from("recorrencias").select("id,valor,status,vencimento,aluno_id").order("vencimento", { ascending: false }),
      supabase.from("acessos").select("id,created_at,metodo,permitido,motivo,aluno_id").gte("created_at", ini).lte("created_at", fim).order("created_at", { ascending: false }).limit(2000),
      supabase.from("vendas").select("id,total,created_at,aluno_id").gte("created_at", ini).lte("created_at", fim).order("created_at", { ascending: false }),
    ]);
    setAlunos((a.data ?? []) as AlunoRow[]);
    setPagamentos((p.data ?? []) as PagamentoRow[]);
    setRecorrencias((r.data ?? []) as RecRow[]);
    setAcessos((ac.data ?? []) as AcessoRow[]);
    setVendas((v.data ?? []) as VendaRow[]);
    setLoading(false);
  }, [session, de, ate]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalPagamentos = pagamentos.reduce((s, x) => s + Number(x.valor || 0), 0);
  const totalVendas = vendas.reduce((s, x) => s + Number(x.total || 0), 0);
  const inadimplentes = alunos.filter((x) => x.status_financeiro === "INADIMPLENTE");
  const emAberto = recorrencias.filter((x) => x.status !== "PAGO" && x.status !== "CANCELADO");
  const totalEmAberto = emAberto.reduce((s, x) => s + Number(x.valor || 0), 0);
  const acessosOk = acessos.filter((x) => x.permitido).length;

  const frequencia = useMemo(() => {
    const map: Record<string, number> = {};
    acessos.filter((x) => x.permitido && x.aluno_id).forEach((x) => {
      map[x.aluno_id!] = (map[x.aluno_id!] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([id, qtd]) => ({ id, nome: nomePorAluno[id] ?? "—", qtd }))
      .sort((x, y) => y.qtd - x.qtd);
  }, [acessos, nomePorAluno]);

  function exportar(tipo: string) {
    const sufixo = `${de}_a_${ate}`;
    try {
      if (tipo === "alunos") {
        downloadCsv(`alunos_${sufixo}`, alunos, [
          { header: "Nome", value: (r) => r.nome },
          { header: "CPF", value: (r) => r.cpf },
          { header: "Telefone", value: (r) => r.telefone },
          { header: "Plano", value: (r) => r.plano },
          { header: "Valor", value: (r) => fmtBRL(r.valor_plano) },
          { header: "Situação", value: (r) => r.status },
          { header: "Financeiro", value: (r) => r.status_financeiro },
          { header: "Matrícula", value: (r) => r.data_matricula },
        ]);
      } else if (tipo === "pagamentos") {
        downloadCsv(`pagamentos_${sufixo}`, pagamentos, [
          { header: "Data", value: (r) => new Date(r.pago_em).toLocaleString("pt-BR") },
          { header: "Aluno", value: (r) => nomePorAluno[r.aluno_id] ?? "—" },
          { header: "Forma", value: (r) => r.forma },
          { header: "Valor", value: (r) => fmtBRL(r.valor) },
        ]);
      } else if (tipo === "inadimplencia") {
        downloadCsv(`inadimplencia_${sufixo}`, emAberto, [
          { header: "Aluno", value: (r) => nomePorAluno[r.aluno_id] ?? "—" },
          { header: "Vencimento", value: (r) => r.vencimento ?? "" },
          { header: "Status", value: (r) => r.status },
          { header: "Valor", value: (r) => fmtBRL(r.valor) },
        ]);
      } else if (tipo === "acessos") {
        downloadCsv(`acessos_${sufixo}`, acessos, [
          { header: "Data", value: (r) => new Date(r.created_at).toLocaleString("pt-BR") },
          { header: "Aluno", value: (r) => (r.aluno_id ? nomePorAluno[r.aluno_id] ?? "—" : "—") },
          { header: "Método", value: (r) => r.metodo },
          { header: "Permitido", value: (r) => (r.permitido ? "SIM" : "NÃO") },
          { header: "Motivo", value: (r) => r.motivo },
        ]);
      } else if (tipo === "frequencia") {
        downloadCsv(`frequencia_${sufixo}`, frequencia, [
          { header: "Aluno", value: (r) => r.nome },
          { header: "Check-ins", value: (r) => r.qtd },
        ]);
      } else if (tipo === "vendas") {
        downloadCsv(`vendas_pdv_${sufixo}`, vendas, [
          { header: "Data", value: (r) => new Date(r.created_at).toLocaleString("pt-BR") },
          { header: "Aluno", value: (r) => (r.aluno_id ? nomePorAluno[r.aluno_id] ?? "—" : "Balcão") },
          { header: "Total", value: (r) => fmtBRL(r.total) },
        ]);
      }
      toast.success("Relatório exportado em CSV");
    } catch {
      toast.error("Falha ao exportar relatório");
    }
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Relatórios & Exportações</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="fp-label">De</label>
            <input className="fp-input" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <label className="fp-label">Até</label>
            <input className="fp-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <button className="fp-btn fp-btn-secondary" onClick={carregar} disabled={loading}>
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
      </header>

      <div className="fp-cards-grid">
        <div className="fp-kpi"><h4>Recebido no período</h4><p>R$ {fmtBRL(totalPagamentos)}</p></div>
        <div className="fp-kpi"><h4>Vendas PDV</h4><p>R$ {fmtBRL(totalVendas)}</p></div>
        <div className="fp-kpi"><h4>Em aberto</h4><p>R$ {fmtBRL(totalEmAberto)}</p></div>
        <div className="fp-kpi"><h4>Inadimplentes</h4><p>{inadimplentes.length}</p></div>
        <div className="fp-kpi"><h4>Check-ins liberados</h4><p>{acessosOk}</p></div>
        <div className="fp-kpi"><h4>Alunos cadastrados</h4><p>{alunos.length}</p></div>
      </div>

      <div className="fp-glass-inner" style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="fp-btn fp-btn-primary" onClick={() => exportar("alunos")}>CSV Alunos</button>
        <button className="fp-btn fp-btn-primary" onClick={() => exportar("pagamentos")}>CSV Pagamentos</button>
        <button className="fp-btn fp-btn-primary" onClick={() => exportar("inadimplencia")}>CSV Inadimplência</button>
        <button className="fp-btn fp-btn-primary" onClick={() => exportar("acessos")}>CSV Acessos</button>
        <button className="fp-btn fp-btn-primary" onClick={() => exportar("frequencia")}>CSV Frequência</button>
        <button className="fp-btn fp-btn-primary" onClick={() => exportar("vendas")}>CSV Vendas PDV</button>
      </div>

      <div className="fp-chart-box">
        <h3>Ranking de frequência no período</h3>
        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead><tr><th>#</th><th>Aluno</th><th>Check-ins</th></tr></thead>
            <tbody>
              {frequencia.slice(0, 15).map((f, i) => (
                <tr key={f.id}><td>#{i + 1}</td><td>{f.nome}</td><td><strong style={{ color: "var(--fp-neon3)" }}>{f.qtd}</strong></td></tr>
              ))}
              {frequencia.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--fp-muted)", padding: 18 }}>Sem acessos no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fp-chart-box">
        <h3>Cobranças em aberto</h3>
        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead><tr><th>Aluno</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead>
            <tbody>
              {emAberto.slice(0, 20).map((r) => (
                <tr key={r.id}>
                  <td>{nomePorAluno[r.aluno_id] ?? "—"}</td>
                  <td>{r.vencimento ? new Date(r.vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td><span className={"fp-badge " + (r.status === "ATRASADO" ? "bad" : "warn")}>{r.status}</span></td>
                  <td>R$ {fmtBRL(r.valor)}</td>
                </tr>
              ))}
              {emAberto.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--fp-muted)", padding: 18 }}>Nenhuma cobrança em aberto. 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
