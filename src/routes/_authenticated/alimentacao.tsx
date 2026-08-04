import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/_authenticated/alimentacao")({
  head: () => ({
    meta: [
      { title: "Plano Alimentar — FitPro GYM2" },
      { name: "description", content: "Monte planos alimentares personalizados com controle de calorias e macros." },
      { property: "og:title", content: "Plano Alimentar — FitPro GYM2" },
      { property: "og:description", content: "Nutrição e controle de macros para alunos e equipe técnica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlimentacaoPage,
});

type Aluno = { id: string; nome: string };
type Alimento = { id: string; nome: string; kcal: number; proteinas: number; carboidratos: number; gorduras: number };
type Item = { alimento_id: string; qtd_g: number };
type Refeicao = { nome: string; horario: string; itens: Item[] };
type Plano = { id: string; aluno_id: string; nome: string; refeicoes: Refeicao[] };

function AlimentacaoPage() {
  const { session } = useSession();
  const isStaff = session?.role !== "ALUNO";
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoId, setAlunoId] = useState<string>("");
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [novoAlimento, setNovoAlimento] = useState({ nome: "", kcal: "", proteinas: "", carboidratos: "", gorduras: "" });

  const loadBase = useCallback(async () => {
    if (!session) return;
    const [{ data: al }, { data: alim }] = await Promise.all([
      isStaff ? supabase.from("alunos").select("id,nome").order("nome") : Promise.resolve({ data: [] as Aluno[] }),
      supabase.from("alimentos").select("*").order("nome"),
    ]);
    if (isStaff) {
      const list = (al ?? []) as Aluno[];
      setAlunos(list);
      if (!alunoId && list[0]) setAlunoId(list[0].id);
    } else if (session.aluno_id) {
      setAlunoId(session.aluno_id);
    }
    setAlimentos((alim ?? []) as Alimento[]);
  }, [session, isStaff, alunoId]);

  const loadPlano = useCallback(async () => {
    if (!alunoId) return;
    const { data } = await supabase
      .from("planos_alimentares")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPlano((data as Plano | null) ?? null);
  }, [alunoId]);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { loadPlano(); }, [loadPlano]);

  async function addAlimento(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const { error } = await supabase.from("alimentos").insert({
      academia_id: session.academia_id,
      nome: novoAlimento.nome,
      kcal: Number(novoAlimento.kcal || 0),
      proteinas: Number(novoAlimento.proteinas || 0),
      carboidratos: Number(novoAlimento.carboidratos || 0),
      gorduras: Number(novoAlimento.gorduras || 0),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Alimento cadastrado");
    setNovoAlimento({ nome: "", kcal: "", proteinas: "", carboidratos: "", gorduras: "" });
    loadBase();
  }

  async function novoPlano() {
    if (!session || !alunoId) return;
    const nome = prompt("Nome do plano alimentar:");
    if (!nome) return;
    const refeicoes: Refeicao[] = [
      { nome: "Café da manhã", horario: "07:00", itens: [] },
      { nome: "Almoço", horario: "12:00", itens: [] },
      { nome: "Lanche", horario: "16:00", itens: [] },
      { nome: "Jantar", horario: "20:00", itens: [] },
    ];
    const { error } = await supabase.from("planos_alimentares").insert({
      academia_id: session.academia_id,
      aluno_id: alunoId,
      nome,
      refeicoes,
      created_by: session.user_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Plano criado");
    loadPlano();
  }

  async function salvarPlano(next: Refeicao[]) {
    if (!plano) return;
    setPlano({ ...plano, refeicoes: next });
    const { error } = await supabase
      .from("planos_alimentares")
      .update({ refeicoes: next })
      .eq("id", plano.id);
    if (error) toast.error(error.message);
  }

  function addItem(rIdx: number) {
    if (!plano || !alimentos[0]) return;
    const next = plano.refeicoes.map((r, i) =>
      i === rIdx ? { ...r, itens: [...r.itens, { alimento_id: alimentos[0].id, qtd_g: 100 }] } : r
    );
    salvarPlano(next);
  }
  function updItem(rIdx: number, iIdx: number, patch: Partial<Item>) {
    if (!plano) return;
    const next = plano.refeicoes.map((r, i) =>
      i === rIdx
        ? { ...r, itens: r.itens.map((it, j) => (j === iIdx ? { ...it, ...patch } : it)) }
        : r
    );
    salvarPlano(next);
  }
  function delItem(rIdx: number, iIdx: number) {
    if (!plano) return;
    const next = plano.refeicoes.map((r, i) =>
      i === rIdx ? { ...r, itens: r.itens.filter((_, j) => j !== iIdx) } : r
    );
    salvarPlano(next);
  }

  const macros = useMemo(() => {
    if (!plano) return { kcal: 0, prot: 0, carb: 0, gord: 0 };
    let k = 0, p = 0, c = 0, g = 0;
    for (const r of plano.refeicoes) {
      for (const it of r.itens) {
        const a = alimentos.find((x) => x.id === it.alimento_id);
        if (!a) continue;
        const f = it.qtd_g / 100;
        k += a.kcal * f; p += a.proteinas * f; c += a.carboidratos * f; g += a.gorduras * f;
      }
    }
    return { kcal: Math.round(k), prot: Math.round(p), carb: Math.round(c), gord: Math.round(g) };
  }, [plano, alimentos]);

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Plano Alimentar</h2>
        {isStaff && alunos.length > 0 && (
          <select className="fp-select" style={{ maxWidth: 260 }} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
      </header>

      {isStaff && (
        <form onSubmit={addAlimento} className="fp-glass-inner" style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}>
          <input className="fp-input" placeholder="Novo alimento (por 100g)" value={novoAlimento.nome} required
            onChange={(e) => setNovoAlimento({ ...novoAlimento, nome: e.target.value })} />
          <input className="fp-input" type="number" placeholder="kcal" value={novoAlimento.kcal}
            onChange={(e) => setNovoAlimento({ ...novoAlimento, kcal: e.target.value })} />
          <input className="fp-input" type="number" placeholder="Prot (g)" value={novoAlimento.proteinas}
            onChange={(e) => setNovoAlimento({ ...novoAlimento, proteinas: e.target.value })} />
          <input className="fp-input" type="number" placeholder="Carb (g)" value={novoAlimento.carboidratos}
            onChange={(e) => setNovoAlimento({ ...novoAlimento, carboidratos: e.target.value })} />
          <input className="fp-input" type="number" placeholder="Gord (g)" value={novoAlimento.gorduras}
            onChange={(e) => setNovoAlimento({ ...novoAlimento, gorduras: e.target.value })} />
          <button className="fp-btn fp-btn-primary" type="submit">+ Alimento</button>
        </form>
      )}

      <div style={{ marginTop: 18 }}>
        <div className="fp-metrics">
          <div><span>Kcal totais</span><strong>{macros.kcal}</strong></div>
          <div><span>Proteínas</span><strong>{macros.prot} g</strong></div>
          <div><span>Carboidratos</span><strong>{macros.carb} g</strong></div>
          <div><span>Gorduras</span><strong>{macros.gord} g</strong></div>
        </div>
      </div>

      {!plano && isStaff && (
        <div style={{ marginTop: 18 }}>
          <button className="fp-btn fp-btn-primary" onClick={novoPlano} disabled={!alunoId}>+ Criar plano alimentar</button>
        </div>
      )}
      {!plano && !isStaff && <p style={{ marginTop: 16, color: "var(--fp-muted)" }}>Nenhum plano alimentar cadastrado ainda.</p>}

      {plano && (
        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          <h3 style={{ fontSize: 16 }}>{plano.nome}</h3>
          {plano.refeicoes.map((r, rIdx) => (
            <div key={rIdx} className="fp-glass-inner">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>{r.nome} — {r.horario}</strong>
                {isStaff && <button className="fp-btn fp-btn-ghost" onClick={() => addItem(rIdx)}>+ Alimento</button>}
              </div>
              {r.itens.length === 0 && <p style={{ fontSize: 12, color: "var(--fp-muted)" }}>Sem itens.</p>}
              {r.itens.map((it, iIdx) => (
                <div key={iIdx} style={{ display: "grid", gridTemplateColumns: "2fr 100px auto", gap: 8, marginTop: 6 }}>
                  {isStaff ? (
                    <select className="fp-select" value={it.alimento_id} onChange={(e) => updItem(rIdx, iIdx, { alimento_id: e.target.value })}>
                      {alimentos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  ) : (
                    <span>{alimentos.find((a) => a.id === it.alimento_id)?.nome ?? "-"}</span>
                  )}
                  {isStaff ? (
                    <input className="fp-input" type="number" value={it.qtd_g} onChange={(e) => updItem(rIdx, iIdx, { qtd_g: Number(e.target.value) })} />
                  ) : (
                    <span>{it.qtd_g}g</span>
                  )}
                  {isStaff && <button className="fp-btn fp-btn-ghost" onClick={() => delItem(rIdx, iIdx)}>x</button>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
