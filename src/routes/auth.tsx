import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { cadastrarPerfil, listarAcademiasPublicas } from "@/lib/fitpro/cadastro.functions";
import { useSession } from "@/lib/fitpro/session";
import "@/styles/fitpro.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar perfil — FitPro GYM2" },
      {
        name: "description",
        content:
          "Acesse a plataforma FitPro GYM2 ou crie seu perfil como dono, personal ou aluno da academia.",
      },
      { property: "og:title", content: "FitPro GYM2 — Acesso e cadastro" },
      {
        property: "og:description",
        content: "Gestão fitness premium: entre na sua conta ou cadastre seu perfil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Papel = "DONO" | "PERSONAL" | "ALUNO";

function AuthPage() {
  const [aba, setAba] = useState<"entrar" | "cadastrar">("entrar");
  const [recuperando, setRecuperando] = useState(false);
  const navigate = useNavigate();
  const { session, refresh } = useSession();
  const seedFn = useServerFn(seedFitProDemoUsers);
  const cadastrarFn = useServerFn(cadastrarPerfil);
  const listarFn = useServerFn(listarAcademiasPublicas);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // cadastro
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<Papel>("ALUNO");
  const [academiaId, setAcademiaId] = useState("");
  const [academiaNome, setAcademiaNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [academias, setAcademias] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    document.body.classList.add("fp-body");
    seedFn({}).catch(() => {});
    return () => document.body.classList.remove("fp-body");
  }, [seedFn]);

  useEffect(() => {
    if (aba !== "cadastrar") return;
    listarFn({})
      .then((lista) => {
        setAcademias(lista);
        setAcademiaId((atual) => atual || lista[0]?.id || "");
      })
      .catch(() => {});
  }, [aba, listarFn]);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    await refresh();
    navigate({ to: "/dashboard" });
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (password.length < 8) {
      setErr("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await cadastrarFn({
        data: {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha: password,
          role: papel,
          academia_id: papel === "DONO" ? undefined : academiaId || undefined,
          academia_nome: papel === "DONO" ? academiaNome.trim() : undefined,
          telefone: telefone.trim() || undefined,
          cpf: cpf.trim() || undefined,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(error.message);
      await refresh();
      navigate({ to: "/dashboard" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Não foi possível concluir o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  async function recuperarSenha() {
    const alvo = email.trim().toLowerCase();
    if (!alvo) {
      setErr("Informe seu e-mail para receber o link de recuperação.");
      return;
    }
    setErr(null);
    setRecuperando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(alvo, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecuperando(false);
    if (error) setErr(error.message);
    else setOk("Se o e-mail existir, enviamos um link de recuperação.");
  }

  const papeis: { v: Papel; t: string; d: string }[] = [
    { v: "DONO", t: "Dono", d: "Abro uma nova unidade" },
    { v: "PERSONAL", t: "Personal", d: "Treino meus alunos" },
    { v: "ALUNO", t: "Aluno", d: "Treino na academia" },
  ];

  return (
    <div className="fp-screen fp-login">
      <div className="fp-aurora" aria-hidden="true" />
      <div className="fp-glass fp-auth-card fp-rise">
        <h1 className="fp-brand">
          FitPro <span>GYM2</span>
        </h1>
        <p className="fp-subtitle">Ecossistema Premium de Gestão Fitness</p>

        <div className="fp-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={aba === "entrar"}
            className={"fp-tab" + (aba === "entrar" ? " active" : "")}
            onClick={() => {
              setAba("entrar");
              setErr(null);
              setOk(null);
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === "cadastrar"}
            className={"fp-tab" + (aba === "cadastrar" ? " active" : "")}
            onClick={() => {
              setAba("cadastrar");
              setErr(null);
              setOk(null);
            }}
          >
            Criar perfil
          </button>
        </div>

        {aba === "entrar" ? (
          <form onSubmit={handleLogin} className="fp-fade">
            <label className="fp-label">Email</label>
            <input
              className="fp-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dono@fitpro.local"
              required
            />
            <label className="fp-label">Senha</label>
            <input
              className="fp-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="submit"
              className="fp-btn fp-btn-primary fp-btn-shine"
              disabled={loading}
              style={{ marginTop: 14, width: "100%" }}
            >
              {loading ? "Autenticando..." : "Acessar Plataforma"}
            </button>
            <button
              type="button"
              className="fp-btn fp-btn-ghost"
              style={{ marginTop: 8 }}
              onClick={recuperarSenha}
              disabled={recuperando}
            >
              {recuperando ? "Enviando..." : "Esqueci minha senha"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCadastro} className="fp-fade">
            <label className="fp-label">Perfil de acesso</label>
            <div className="fp-role-grid">
              {papeis.map((p) => (
                <button
                  type="button"
                  key={p.v}
                  className={"fp-role-card" + (papel === p.v ? " active" : "")}
                  onClick={() => setPapel(p.v)}
                >
                  <strong>{p.t}</strong>
                  <span>{p.d}</span>
                </button>
              ))}
            </div>

            <label className="fp-label">Nome completo</label>
            <input
              className="fp-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
            />

            {papel === "DONO" ? (
              <>
                <label className="fp-label">Nome da academia</label>
                <input
                  className="fp-input"
                  value={academiaNome}
                  onChange={(e) => setAcademiaNome(e.target.value)}
                  placeholder="Ex.: FitPro Centro"
                  required
                />
              </>
            ) : (
              <>
                <label className="fp-label">Academia</label>
                <select
                  className="fp-select"
                  value={academiaId}
                  onChange={(e) => setAcademiaId(e.target.value)}
                  required
                >
                  <option value="">Selecione a unidade</option>
                  {academias.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </>
            )}

            {papel === "ALUNO" && (
              <div className="fp-grid-2">
                <div>
                  <label className="fp-label">Telefone</label>
                  <input
                    className="fp-input"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="fp-label">CPF</label>
                  <input
                    className="fp-input"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            )}

            <label className="fp-label">Email</label>
            <input
              className="fp-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
            <label className="fp-label">Senha (mín. 8 caracteres)</label>
            <input
              className="fp-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="submit"
              className="fp-btn fp-btn-primary fp-btn-shine"
              disabled={loading}
              style={{ marginTop: 14, width: "100%" }}
            >
              {loading ? "Criando perfil..." : "Criar meu perfil"}
            </button>
          </form>
        )}

        {err && <p className="fp-error">{err}</p>}
        {ok && <p className="fp-ok-msg">{ok}</p>}

        <div className="fp-glass-inner" style={{ marginTop: 14, padding: 12 }}>
          <p style={{ fontSize: 11, color: "var(--fp-muted)", marginBottom: 6 }}>
            Contas demo (auto-criadas):
          </p>
          <p style={{ fontSize: 11, fontFamily: "monospace", lineHeight: 1.7 }}>
            dono@fitpro.local · FitPro@Dono2026
            <br />
            admin@fitpro.local · FitPro@Admin2026
            <br />
            personal@fitpro.local · FitPro@Personal2026
            <br />
            aluno@fitpro.local · FitPro@Aluno2026
          </p>
        </div>
      </div>
    </div>
  );
}
