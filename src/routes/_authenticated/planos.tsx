import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { fmtBRL } from "@/lib/fitpro/utils";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({
    meta: [
      { title: "Planos & Matrículas — FitPro GYM2" },
      { name: "description", content: "Cadastre planos da academia e gerencie contratos de matrícula com vencimento e situação." },
      { property: "og:title", content: "Planos & Matrículas — FitPro GYM2" },
      { property: "og:description", content: "Catálogo de planos, valores e contratos de matrícula dos alunos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanosPage,
});

type Plano = {
  id: string;
  nome: string;
  valor: number;
  duracao_meses: number;
  inclui_aulas: boolean;
  ativo: boolean;
};
type Aluno = { id: string; nome: string };
type Matricula = {
  id: string;
  aluno_id: string;
  plano_id: string | null;
  valor: number;
  data_inicio: string;
  data_fim: string | null;
  dia_vencimento: number;
  status: string;
};

const planoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do plano").max(80),
  valor: z.number().min(0, "Valor inválido").max(100000),
  duracao_meses: z.number().int().min(1).max(36),
});

function PlanosPage() {
  const { session } = useSession();
  const isStaff = session ? session.role !== "ALUNO" : false;
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [form, setForm] = useState({ nome: "", valor: "", duracao_meses: "1", inclui_aulas: true });
  const [mat, setMat] = useState({ aluno_id: "", plano_id: "", dia_vencimento: "10" });

  const load = useCallback(async () => {
    const [{ data: p }, { data: a }, { data: m }] = await Promise.all([
      supabase.from("planos").select("*").order("valor"),
      supabase.from("alunos").select("id,nome").order("nome"),
      supabase.from("matriculas").select("*").order("created_at", { ascending: false }),
    ]);
    setPlanos((p ?? []) as Plano[]);
    setAlunos((a ?? []) as Aluno[]);
    setMatriculas((m ?? []) as Matricula[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function criarPlano(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const parsed = planoSchema.safeParse({
      nome: form.nome,
      valor: Number(form.valor || 0),
      duracao_meses: Number(form.duracao_meses || 1),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const { error } = await supabase.from("planos").insert({
      academia_id: session.academia_id,
      ...parsed.data,
      inclui_aulas: form.inclui_aulas,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Plano criado");
    setForm({ nome: "", valor: "", duracao_meses: "1", inclui_aulas: true });
    load();
  }

  async function toggleAtivo(p: Plano) {
    const { error } = await supabase.from("planos").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function criarMatricula(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const plano = planos.find((p) => p.id === mat.plano_id);
    if (!mat.aluno_id || !plano) { toast.error("Selecione aluno e plano"); return; }
    const inicio = new Date();
    const fim = new Date();
    fim.setMonth(fim.getMonth() + plano.duracao_meses);
    const { error } = await supabase.from("matriculas").insert({
      academia_id: session.academia_id,
      aluno_id: mat.aluno_id,
      plano_id: plano.id,
      valor: plano.valor,
      data_inicio: inicio.toISOString().slice(0, 10),
      data_fim: fim.toISOString().slice(0, 10),
      dia_vencimento: Math.min(28, Math.max(1, Number(mat.dia_vencimento || 10))),
    });
    if (error) { toast.error(error.message); return; }
    await supabase
      .from("alunos")
      .update({ plano: plano.nome, valor_plano: plano.valor })
      .eq("id", mat.aluno_id);
    toast.success("Matrícula criada");
    load();
  }

  async function mudarStatus(m: Matricula, status: "ATIVA" | "TRANCADA" | "CANCELADA") {
    const { error } = await supabase.from("matriculas").update({ status }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    const novoStatusAluno = status === "CANCELADA" ? "CANCELADO" : status === "TRANCADA" ? "TRANCADO" : "ATIVO";
    await supabase.from("alunos").update({ status: novoStatusAluno }).eq("id", m.aluno_id);
    toast.success("Matrícula atualizada");
    load();
  }

  if (!isStaff) {
    return (
      <section className="fp-view fp-glass">
        <h2>Minha matrícula</h2>
        <div className="fp-table-wrap" style={{ marginTop: 12 }}>
          <table className="fp-table">
            <thead><tr><th>Plano</th><th>Valor</th><th>Início</th><th>Fim</th><th>Situação</th></tr></thead>
            <tbody>
              {matriculas.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>Sem matrícula registrada.</td></tr>
              )}
              {matriculas.map((m) => (
                <tr key={m.id}>
                  <td>{planos.find((p) => p.id === m.plano_id)?.nome ?? "—"}</td>
                  <td>R$ {fmtBRL(m.valor)}</td>
                  <td>{new Date(m.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{m.data_fim ? new Date(m.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td><span className={"fp-badge " + (m.status === "ATIVA" ? "ok" : "warn")}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header"><h2>Planos & Matrículas</h2></header>

      <form onSubmit={criarPlano} className="fp-glass-inner" style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr 1fr auto auto" }}>
        <input className="fp-input" placeholder="Nome do plano" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <input className="fp-input" type="number" step="0.01" placeholder="Valor mensal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
        <input className="fp-input" type="number" min={1} placeholder="Meses" value={form.duracao_meses} onChange={(e) => setForm({ ...form, duracao_meses: e.target.value })} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={form.inclui_aulas} onChange={(e) => setForm({ ...form, inclui_aulas: e.target.checked })} />
          Aulas
        </label>
        <button className="fp-btn fp-btn-primary" type="submit">+ Plano</button>
      </form>

      <div className="fp-table-wrap" style={{ marginTop: 16 }}>
        <table className="fp-table">
          <thead><tr><th>Plano</th><th>Valor</th><th>Duração</th><th>Aulas</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {planos.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>Nenhum plano cadastrado.</td></tr>
            )}
            {planos.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>R$ {fmtBRL(p.valor)}</td>
                <td>{p.duracao_meses} {p.duracao_meses === 1 ? "mês" : "meses"}</td>
                <td>{p.inclui_aulas ? "Sim" : "Não"}</td>
                <td><span className={"fp-badge " + (p.ativo ? "ok" : "warn")}>{p.ativo ? "ATIVO" : "INATIVO"}</span></td>
                <td><button className="fp-btn fp-btn-ghost" onClick={() => toggleAtivo(p)}>{p.ativo ? "Desativar" : "Ativar"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 24, fontSize: 16 }}>Nova matrícula</h3>
      <form onSubmit={criarMatricula} className="fp-glass-inner" style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 2fr 1fr auto", marginTop: 8 }}>
        <select className="fp-select" value={mat.aluno_id} onChange={(e) => setMat({ ...mat, aluno_id: e.target.value })}>
          <option value="">Selecione o aluno</option>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select className="fp-select" value={mat.plano_id} onChange={(e) => setMat({ ...mat, plano_id: e.target.value })}>
          <option value="">Selecione o plano</option>
          {planos.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome} — R$ {fmtBRL(p.valor)}</option>)}
        </select>
        <input className="fp-input" type="number" min={1} max={28} value={mat.dia_vencimento} onChange={(e) => setMat({ ...mat, dia_vencimento: e.target.value })} title="Dia de vencimento" />
        <button className="fp-btn fp-btn-primary" type="submit">Matricular</button>
      </form>

      <div className="fp-table-wrap" style={{ marginTop: 16 }}>
        <table className="fp-table">
          <thead><tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Venc.</th><th>Vigência</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>
            {matriculas.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>Nenhuma matrícula.</td></tr>
            )}
            {matriculas.map((m) => (
              <tr key={m.id}>
                <td>{alunos.find((a) => a.id === m.aluno_id)?.nome ?? "—"}</td>
                <td>{planos.find((p) => p.id === m.plano_id)?.nome ?? "—"}</td>
                <td>R$ {fmtBRL(m.valor)}</td>
                <td>dia {m.dia_vencimento}</td>
                <td style={{ fontSize: 12 }}>
                  {new Date(m.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} →{" "}
                  {m.data_fim ? new Date(m.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                </td>
                <td><span className={"fp-badge " + (m.status === "ATIVA" ? "ok" : m.status === "CANCELADA" ? "bad" : "warn")}>{m.status}</span></td>
                <td style={{ display: "flex", gap: 6 }}>
                  {m.status !== "ATIVA" && <button className="fp-btn fp-btn-ghost" onClick={() => mudarStatus(m, "ATIVA")}>Reativar</button>}
                  {m.status === "ATIVA" && <button className="fp-btn fp-btn-ghost" onClick={() => mudarStatus(m, "TRANCADA")}>Trancar</button>}
                  {m.status !== "CANCELADA" && <button className="fp-btn fp-btn-ghost" onClick={() => mudarStatus(m, "CANCELADA")}>Cancelar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
