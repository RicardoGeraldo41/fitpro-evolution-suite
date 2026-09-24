import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/_authenticated/grade")({
  head: () => ({
    meta: [
      { title: "Grade de Aulas — FitPro" },
      { name: "description", content: "Grade semanal de aulas coletivas com reserva de vaga, cancelamento e lista de presença." },
      { property: "og:title", content: "Grade de Aulas — FitPro" },
      { property: "og:description", content: "Agende aulas coletivas, controle vagas e registre presença dos alunos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GradePage,
});

type Aula = {
  id: string;
  nome: string;
  horario: string;
  professor: string;
  dia_semana: number;
  duracao_min: number;
  capacidade: number;
};
type Agendamento = {
  id: string;
  aula_id: string;
  aluno_id: string;
  data: string;
  status: string;
};
type Aluno = { id: string; nome: string };

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function proximaData(diaSemana: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const delta = (diaSemana - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function GradePage() {
  const { session } = useSession();
  const isStaff = session ? session.role !== "ALUNO" : false;
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [agendas, setAgendas] = useState<Agendamento[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [nova, setNova] = useState({ nome: "", professor: "", horario: "07:00", dia_semana: "1", capacidade: "20", duracao_min: "60" });
  const [presencaAula, setPresencaAula] = useState<Aula | null>(null);

  const load = useCallback(async () => {
    if (!session?.academia_id) return;
    const [{ data: au }, { data: ag }, { data: al }] = await Promise.all([
      supabase.from("aulas").select("*").eq("academia_id", session.academia_id).order("dia_semana").order("horario"),
      supabase.from("agendamentos").select("*").eq("academia_id", session.academia_id).gte("data", new Date().toISOString().slice(0, 10)),
      isStaff ? supabase.from("alunos").select("id,nome").eq("academia_id", session.academia_id).order("nome") : Promise.resolve({ data: [] as Aluno[] }),
    ]);
    setAulas((au ?? []) as Aula[]);
    setAgendas((ag ?? []) as Agendamento[]);
    setAlunos((al ?? []) as Aluno[]);
  }, [isStaff, session?.academia_id]);

  useEffect(() => { load(); }, [load]);

  const porAula = useMemo(() => {
    const map: Record<string, Agendamento[]> = {};
    for (const a of agendas) {
      if (a.status === "CANCELADO") continue;
      (map[a.aula_id + "|" + a.data] ||= []).push(a);
    }
    return map;
  }, [agendas]);

  async function criarAula(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const { error } = await supabase.from("aulas").insert({
      academia_id: session.academia_id,
      nome: nova.nome.trim(),
      professor: nova.professor.trim(),
      horario: nova.horario,
      dia_semana: Number(nova.dia_semana),
      capacidade: Number(nova.capacidade || 20),
      duracao_min: Number(nova.duracao_min || 60),
      vagas: Number(nova.capacidade || 20),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Aula cadastrada");
    setNova({ nome: "", professor: "", horario: "07:00", dia_semana: "1", capacidade: "20", duracao_min: "60" });
    load();
  }

  async function agendar(aula: Aula, data: string) {
    if (!session?.aluno_id) { toast.error("Somente alunos podem reservar vaga."); return; }
    const { error } = await supabase.from("agendamentos").insert({
      academia_id: session.academia_id,
      aula_id: aula.id,
      aluno_id: session.aluno_id,
      data,
    });
    if (error) {
      toast.error(error.message.includes("lotada") ? "Aula lotada — sem vagas." : error.message);
      return;
    }
    toast.success(`Vaga reservada em ${aula.nome}`);
    load();
  }

  async function cancelar(ag: Agendamento) {
    const { error } = await supabase.from("agendamentos").update({ status: "CANCELADO" }).eq("id", ag.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Reserva cancelada");
    load();
  }

  async function marcarPresenca(ag: Agendamento, status: "PRESENTE" | "FALTA") {
    const { error } = await supabase.from("agendamentos").update({ status }).eq("id", ag.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function excluirAula(aula: Aula) {
    if (!confirm(`Excluir a aula "${aula.nome}"? As reservas dela serão removidas.`)) return;
    const { error } = await supabase.from("aulas").delete().eq("id", aula.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Aula excluída");
    load();
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header"><h2>Grade de Aulas Coletivas</h2></header>

      {isStaff && (
        <form onSubmit={criarAula} className="fp-glass-inner" style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr auto" }}>
          <input className="fp-input" placeholder="Nome da aula" value={nova.nome} required onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
          <input className="fp-input" placeholder="Professor" value={nova.professor} required onChange={(e) => setNova({ ...nova, professor: e.target.value })} />
          <select className="fp-select" value={nova.dia_semana} onChange={(e) => setNova({ ...nova, dia_semana: e.target.value })}>
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input className="fp-input" type="time" value={nova.horario} onChange={(e) => setNova({ ...nova, horario: e.target.value })} />
          <input className="fp-input" type="number" min={10} step={5} value={nova.duracao_min} title="Duração (min)" onChange={(e) => setNova({ ...nova, duracao_min: e.target.value })} />
          <input className="fp-input" type="number" min={1} value={nova.capacidade} title="Capacidade" onChange={(e) => setNova({ ...nova, capacidade: e.target.value })} />
          <button className="fp-btn fp-btn-primary" type="submit">+ Aula</button>
        </form>
      )}

      <div className="fp-grade-grid" style={{ marginTop: 18 }}>
        {aulas.length === 0 && <p style={{ color: "var(--fp-muted)" }}>Sem aulas cadastradas.</p>}
        {aulas.map((a) => {
          const data = proximaData(a.dia_semana);
          const reservas = porAula[a.id + "|" + data] ?? [];
          const minha = session?.aluno_id ? reservas.find((r) => r.aluno_id === session.aluno_id) : undefined;
          const restantes = Math.max(0, a.capacidade - reservas.length);
          return (
            <div key={a.id} className="fp-aula-card">
              <h4>{a.nome}</h4>
              <p>{DIAS[a.dia_semana]} • ⏰ {a.horario} • {a.duracao_min} min</p>
              <p>Prof. {a.professor}</p>
              <p>
                <span className={"fp-badge " + (restantes > 0 ? "ok" : "bad")}>
                  {restantes > 0 ? `${restantes} vaga(s)` : "Lotada"}
                </span>
              </p>
              <p style={{ fontSize: 11, color: "var(--fp-muted)" }}>
                Próxima: {new Date(data + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
              {!isStaff && (
                minha ? (
                  <button className="fp-btn fp-btn-ghost" onClick={() => cancelar(minha)}>Cancelar minha vaga</button>
                ) : (
                  <button className="fp-btn fp-btn-primary" disabled={restantes === 0} onClick={() => agendar(a, data)}>
                    {restantes === 0 ? "Sem vagas" : "Reservar vaga"}
                  </button>
                )
              )}
              {isStaff && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="fp-btn fp-btn-ghost" onClick={() => setPresencaAula(a)}>Lista de presença</button>
                  <button className="fp-btn fp-btn-ghost" onClick={() => excluirAula(a)}>Excluir</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {presencaAula && (
        <div className="fp-timer-overlay" onClick={() => setPresencaAula(null)}>
          <div className="fp-glass" style={{ maxWidth: 520, width: "90%", padding: 24, maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>Presença — {presencaAula.nome}</h3>
            <p style={{ fontSize: 12, color: "var(--fp-muted)", marginBottom: 12 }}>
              {DIAS[presencaAula.dia_semana]} {presencaAula.horario} ·{" "}
              {new Date(proximaData(presencaAula.dia_semana) + "T00:00:00").toLocaleDateString("pt-BR")}
            </p>
            {(porAula[presencaAula.id + "|" + proximaData(presencaAula.dia_semana)] ?? []).length === 0 && (
              <p style={{ color: "var(--fp-muted)" }}>Nenhuma reserva para esta data.</p>
            )}
            {(porAula[presencaAula.id + "|" + proximaData(presencaAula.dia_semana)] ?? []).map((ag) => (
              <div key={ag.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8 }}>
                <span>{alunos.find((x) => x.id === ag.aluno_id)?.nome ?? "Aluno"}</span>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className={"fp-badge " + (ag.status === "PRESENTE" ? "ok" : ag.status === "FALTA" ? "bad" : "warn")}>{ag.status}</span>
                  <button className="fp-btn fp-btn-ghost" onClick={() => marcarPresenca(ag, "PRESENTE")}>Presente</button>
                  <button className="fp-btn fp-btn-ghost" onClick={() => marcarPresenca(ag, "FALTA")}>Falta</button>
                </span>
              </div>
            ))}
            <button className="fp-btn fp-btn-primary" style={{ marginTop: 16 }} onClick={() => setPresencaAula(null)}>Fechar</button>
          </div>
        </div>
      )}
    </section>
  );
}
