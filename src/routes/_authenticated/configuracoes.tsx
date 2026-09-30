import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession, type Role } from "@/lib/fitpro/session";
import { alterarPapelMembro, criarMembroEquipe, removerMembroEquipe } from "@/lib/fitpro/equipe.functions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da Unidade — FitPro" },
      { name: "description", content: "Gestão de equipe, dados da academia e preferências do sistema FitPro." },
      { property: "og:title", content: "Configurações da Unidade — FitPro" },
      { property: "og:description", content: "Configure a academia, gerencie usuários e permissões da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfiguracoesPage,
});

type Membro = { user_id: string; role: Role; nome: string; email: string | null };
type Academia = { id: string; nome: string; cnpj: string | null; fuso_horario: string; logo_url: string | null; plano_saas: string; status: string; cidade: string | null; estado: string | null; codigo_convite: string };

const novoSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(8, "Mínimo 8 caracteres").max(72),
  role: z.enum(["ADMIN", "PERSONAL", "ALUNO"]),
});

function ConfiguracoesPage() {
  const { session, refresh } = useSession();
  const criar = useServerFn(criarMembroEquipe);
  const alterar = useServerFn(alterarPapelMembro);
  const remover = useServerFn(removerMembroEquipe);

  const [academia, setAcademia] = useState<Academia | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", role: "PERSONAL" as "ADMIN" | "PERSONAL" | "ALUNO" });

  const podeGerir = session?.role === "DONO" || session?.role === "ADMIN";

  const carregar = useCallback(async () => {
    if (!session) return;
    const { data: ac } = await supabase
      .from("academias")
      .select("id,nome,cnpj,fuso_horario,logo_url,plano_saas,status,cidade,estado,codigo_convite")
      .eq("id", session.academia_id)
      .maybeSingle();
    setAcademia((ac ?? null) as Academia | null);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id,role")
      .eq("academia_id", session.academia_id);
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    let perfis: Record<string, { nome: string; email: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,nome,email").in("id", ids);
      perfis = Object.fromEntries((profs ?? []).map((p) => [p.id, { nome: p.nome, email: p.email }]));
    }
    setMembros(
      (roles ?? []).map((r) => ({
        user_id: r.user_id,
        role: r.role as Role,
        nome: perfis[r.user_id]?.nome ?? "—",
        email: perfis[r.user_id]?.email ?? null,
      })),
    );
  }, [session]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarAcademia(e: React.FormEvent) {
    e.preventDefault();
    if (!academia) return;
    setSalvando(true);
    const { error } = await supabase
      .from("academias")
      .update({
        nome: academia.nome.trim(),
        cnpj: academia.cnpj?.trim() || null,
        fuso_horario: academia.fuso_horario,
        logo_url: academia.logo_url?.trim() || null,
      })
      .eq("id", academia.id);
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Dados da academia atualizados");
    refresh();
  }

  async function criarMembro(e: React.FormEvent) {
    e.preventDefault();
    const parsed = novoSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSalvando(true);
    try {
      await criar({ data: parsed.data });
      toast.success("Membro criado com sucesso");
      setForm({ nome: "", email: "", senha: "", role: "PERSONAL" });
      carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar membro");
    } finally {
      setSalvando(false);
    }
  }

  async function mudarPapel(user_id: string, role: "ADMIN" | "PERSONAL" | "ALUNO") {
    try {
      await alterar({ data: { user_id, role } });
      toast.success("Papel atualizado");
      carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar papel");
    }
  }

  async function excluir(user_id: string) {
    if (!confirm("Remover o acesso deste membro à academia?")) return;
    try {
      await remover({ data: { user_id } });
      toast.success("Acesso removido");
      carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover acesso");
    }
  }

  if (!podeGerir) {
    return (
      <section className="fp-view fp-glass">
        <h2>Configurações</h2>
        <p style={{ color: "var(--fp-muted)" }}>Somente DONO ou ADMIN podem acessar esta área.</p>
      </section>
    );
  }

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Configurações da Academia & Equipe</h2>
      </header>

      {academia && (
        <form className="fp-glass-inner" onSubmit={salvarAcademia} style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))" }}>
          <div>
            <label className="fp-label">Nome da academia</label>
            <input className="fp-input" value={academia.nome} maxLength={120} required
              onChange={(e) => setAcademia({ ...academia, nome: e.target.value })} />
          </div>
          <div>
            <label className="fp-label">CNPJ</label>
            <input className="fp-input" value={academia.cnpj ?? ""} maxLength={20}
              onChange={(e) => setAcademia({ ...academia, cnpj: e.target.value })} />
          </div>
          <div>
            <label className="fp-label">Fuso horário</label>
            <select className="fp-select" value={academia.fuso_horario}
              onChange={(e) => setAcademia({ ...academia, fuso_horario: e.target.value })}>
              {["America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Cuiaba", "America/Fortaleza", "America/Recife"].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fp-label">Logo (URL)</label>
            <input className="fp-input" value={academia.logo_url ?? ""} maxLength={500}
              onChange={(e) => setAcademia({ ...academia, logo_url: e.target.value })} />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--fp-muted)" }}>
              Plano SaaS: <strong style={{ color: "var(--fp-neon)" }}>{academia.plano_saas}</strong> · Status:{" "}
              <span className={"fp-badge " + (academia.status === "ATIVA" ? "ok" : "warn")}>{academia.status}</span>
            </span>
            <button className="fp-btn fp-btn-primary" type="submit" disabled={salvando}>Salvar dados</button>
          </div>
        </form>
      )}

      <div className="fp-chart-box">
        <h3>Convidar novo membro</h3>
        <form onSubmit={criarMembro} style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))" }}>
          <div>
            <label className="fp-label">Nome</label>
            <input className="fp-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div>
            <label className="fp-label">E-mail</label>
            <input className="fp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="fp-label">Senha provisória</label>
            <input className="fp-input" type="password" minLength={8} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
          </div>
          <div>
            <label className="fp-label">Papel</label>
            <select className="fp-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}>
              <option value="ADMIN">ADMIN</option>
              <option value="PERSONAL">PERSONAL</option>
              <option value="ALUNO">ALUNO</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button className="fp-btn fp-btn-primary" type="submit" disabled={salvando}>
              {salvando ? "Criando..." : "Criar acesso"}
            </button>
          </div>
        </form>
      </div>

      <div className="fp-table-wrap" style={{ marginTop: 18 }}>
        <table className="fp-table">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th style={{ width: 200 }}>Ações</th></tr></thead>
          <tbody>
            {membros.map((m) => (
              <tr key={m.user_id + m.role}>
                <td>{m.nome}</td>
                <td style={{ color: "var(--fp-muted)" }}>{m.email ?? "—"}</td>
                <td><span className="fp-badge ok">{m.role}</span></td>
                <td>
                  {m.role === "DONO" || m.user_id === session?.user_id ? (
                    <span style={{ fontSize: 12, color: "var(--fp-muted)" }}>—</span>
                  ) : (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <select className="fp-select" style={{ maxWidth: 130 }} value={m.role}
                        onChange={(e) => mudarPapel(m.user_id, e.target.value as "ADMIN" | "PERSONAL" | "ALUNO")}>
                        <option value="ADMIN">ADMIN</option>
                        <option value="PERSONAL">PERSONAL</option>
                        <option value="ALUNO">ALUNO</option>
                      </select>
                      <button className="fp-btn fp-btn-ghost" onClick={() => excluir(m.user_id)}>Remover</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {membros.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--fp-muted)", padding: 18 }}>Nenhum membro cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
