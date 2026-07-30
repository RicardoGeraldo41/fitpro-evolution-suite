import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/_authenticated/recepcao")({
  head: () => ({
    meta: [
      { title: "Recepção & Catraca — FitPro GYM2" },
      { name: "description", content: "Controle de entrada da academia: libere ou bloqueie acessos e acompanhe o histórico em tempo real." },
      { property: "og:title", content: "Recepção & Catraca — FitPro GYM2" },
      { property: "og:description", content: "Check-in de alunos com registro de acessos e bloqueio automático de inadimplentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecepcaoPage,
});

type Aluno = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  status: string;
  status_financeiro: string;
  hash_biometria_digital: string | null;
  vetor_facial: string | null;
};

type Acesso = {
  id: string;
  aluno_id: string | null;
  metodo: string;
  permitido: boolean;
  motivo: string | null;
  created_at: string;
};

type Metodo = "MANUAL" | "DIGITAL" | "FACIAL" | "QRCODE";

function avaliar(a: Aluno, metodo: Metodo): { permitido: boolean; motivo: string } {
  if (a.status === "CANCELADO") return { permitido: false, motivo: "Matrícula cancelada" };
  if (a.status === "TRANCADO") return { permitido: false, motivo: "Matrícula trancada" };
  if (a.status_financeiro === "INADIMPLENTE") return { permitido: false, motivo: "Mensalidade em atraso" };
  if (metodo === "DIGITAL" && !a.hash_biometria_digital)
    return { permitido: false, motivo: "Digital não cadastrada" };
  if (metodo === "FACIAL" && !a.vetor_facial)
    return { permitido: false, motivo: "Face não cadastrada" };
  return { permitido: true, motivo: "Acesso liberado" };
}

function RecepcaoPage() {
  const { session } = useSession();
  const isStaff = session ? session.role !== "ALUNO" : false;
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [busca, setBusca] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("MANUAL");
  const [ultimo, setUltimo] = useState<{ nome: string; permitido: boolean; motivo: string } | null>(null);
  const [carregando, setCarregando] = useState(true);

  const load = useCallback(async () => {
    setCarregando(true);
    const [{ data: al }, { data: ac }] = await Promise.all([
      supabase
        .from("alunos")
        .select("id,nome,cpf,telefone,status,status_financeiro,hash_biometria_digital,vetor_facial")
        .order("nome"),
      supabase.from("acessos").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setAlunos((al ?? []) as Aluno[]);
    setAcessos((ac ?? []) as Acesso[]);
    setCarregando(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const nomes = useMemo(
    () => Object.fromEntries(alunos.map((a) => [a.id, a.nome])),
    [alunos]
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return alunos.slice(0, 12);
    return alunos
      .filter((a) => a.nome.toLowerCase().includes(q) || (a.cpf ?? "").includes(q))
      .slice(0, 12);
  }, [alunos, busca]);

  const hoje = useMemo(() => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const doDia = acessos.filter((x) => new Date(x.created_at) >= inicio);
    return {
      total: doDia.length,
      liberados: doDia.filter((x) => x.permitido).length,
      bloqueados: doDia.filter((x) => !x.permitido).length,
    };
  }, [acessos]);

  async function registrar(a: Aluno) {
    if (!session) return;
    const r = avaliar(a, metodo);
    const { error } = await supabase.from("acessos").insert({
      academia_id: session.academia_id,
      aluno_id: a.id,
      metodo,
      permitido: r.permitido,
      motivo: r.motivo,
      registrado_por: session.user_id,
    });
    if (error) { toast.error(error.message); return; }
    setUltimo({ nome: a.nome, permitido: r.permitido, motivo: r.motivo });
    r.permitido ? toast.success(`${a.nome}: ${r.motivo}`) : toast.error(`${a.nome}: ${r.motivo}`);
    setBusca("");
    load();
  }

  if (!isStaff) {
    return (
      <section className="fp-view fp-glass">
        <h2>Meus acessos</h2>
        <p style={{ color: "var(--fp-muted)", marginTop: 8 }}>
          Histórico das suas entradas na academia.
        </p>
        <HistoricoTabela acessos={acessos} nomes={nomes} vazio="Você ainda não registrou nenhuma entrada." />
      </section>
    );
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Recepção & Catraca</h2>
        <select className="fp-select" style={{ maxWidth: 200 }} value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
          <option value="MANUAL">Liberação manual</option>
          <option value="DIGITAL">Digital</option>
          <option value="FACIAL">Facial</option>
          <option value="QRCODE">QR Code</option>
        </select>
      </header>

      <div className="fp-metrics">
        <div><span>Entradas hoje</span><strong>{hoje.total}</strong></div>
        <div><span>Liberadas</span><strong>{hoje.liberados}</strong></div>
        <div><span>Bloqueadas</span><strong>{hoje.bloqueados}</strong></div>
        <div><span>Alunos ativos</span><strong>{alunos.filter((a) => a.status === "ATIVO").length}</strong></div>
      </div>

      {ultimo && (
        <div
          className="fp-glass-inner"
          style={{
            marginTop: 16,
            borderLeft: `4px solid ${ultimo.permitido ? "var(--fp-ok)" : "var(--fp-danger)"}`,
          }}
        >
          <strong style={{ fontSize: 18 }}>{ultimo.permitido ? "✅ LIBERADO" : "⛔ BLOQUEADO"}</strong>
          <p style={{ marginTop: 4 }}>{ultimo.nome} — {ultimo.motivo}</p>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <label className="fp-label">Buscar aluno (nome ou CPF)</label>
        <input
          className="fp-input"
          value={busca}
          autoFocus
          placeholder="Digite para localizar..."
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {carregando && <p style={{ color: "var(--fp-muted)" }}>Carregando alunos...</p>}
        {!carregando && filtrados.length === 0 && (
          <p style={{ color: "var(--fp-muted)" }}>Nenhum aluno encontrado.</p>
        )}
        {filtrados.map((a) => {
          const r = avaliar(a, metodo);
          return (
            <div
              key={a.id}
              className="fp-glass-inner"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
            >
              <div>
                <strong>{a.nome}</strong>
                <p style={{ fontSize: 12, color: "var(--fp-muted)" }}>
                  {a.cpf ?? "sem CPF"} · {a.telefone ?? "sem telefone"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={"fp-badge " + (r.permitido ? "ok" : "bad")}>{r.motivo}</span>
                <button className="fp-btn fp-btn-primary" onClick={() => registrar(a)}>
                  Registrar entrada
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: 24, fontSize: 16 }}>Últimos acessos</h3>
      <HistoricoTabela acessos={acessos} nomes={nomes} vazio="Nenhum acesso registrado ainda." />
    </section>
  );
}

function HistoricoTabela({
  acessos,
  nomes,
  vazio,
}: {
  acessos: Acesso[];
  nomes: Record<string, string>;
  vazio: string;
}) {
  return (
    <div className="fp-table-wrap" style={{ marginTop: 10 }}>
      <table className="fp-table">
        <thead>
          <tr><th>Quando</th><th>Aluno</th><th>Método</th><th>Resultado</th><th>Motivo</th></tr>
        </thead>
        <tbody>
          {acessos.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--fp-muted)" }}>{vazio}</td></tr>
          )}
          {acessos.map((x) => (
            <tr key={x.id}>
              <td>{new Date(x.created_at).toLocaleString("pt-BR")}</td>
              <td>{x.aluno_id ? (nomes[x.aluno_id] ?? "—") : "—"}</td>
              <td>{x.metodo}</td>
              <td><span className={"fp-badge " + (x.permitido ? "ok" : "bad")}>{x.permitido ? "LIBERADO" : "BLOQUEADO"}</span></td>
              <td>{x.motivo ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
