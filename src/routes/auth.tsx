import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Building2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { cadastrarPerfil, consultarConvite } from "@/lib/fitpro/cadastro.functions";
import { useSession } from "@/lib/fitpro/session";
import logoFitPro from "@/assets/logo-fitpro.png";
import "@/styles/fitpro.css";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search["tab"] === "cadastrar" ? ("cadastrar" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar ou cadastrar academia — FitPro" },
      {
        name: "description",
        content:
          "Acesse a plataforma FitPro, cadastre sua academia como gestor ou entre na sua academia com o código de convite.",
      },
      { property: "og:title", content: "FitPro — Acesso e cadastro de academias" },
      {
        property: "og:description",
        content: "Plataforma de gestão para academias: crie sua conta ou acesse seu painel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Tipo = "ACADEMIA" | "MEMBRO";

function AuthPage() {
  const { tab } = Route.useSearch();
  const [aba, setAba] = useState<"entrar" | "cadastrar">(tab === "cadastrar" ? "cadastrar" : "entrar");
  const [tipo, setTipo] = useState<Tipo>("ACADEMIA");
  const [recuperando, setRecuperando] = useState(false);
  const navigate = useNavigate();
  const { session, refresh } = useSession();

  const cadastrarFn = useServerFn(cadastrarPerfil);
  const consultarFn = useServerFn(consultarConvite);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // dados de cadastro
  const [nome, setNome] = useState("");
  const [academiaNome, setAcademiaNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [codigo, setCodigo] = useState("");
  const [convite, setConvite] = useState<{ nome: string; cidade: string | null; estado: string | null } | null>(null);
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");

  useEffect(() => {
    document.body.classList.add("fp-body");
    return () => document.body.classList.remove("fp-body");
  }, []);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  // valida o código de convite enquanto o usuário digita
  useEffect(() => {
    const limpo = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (tipo !== "MEMBRO" || limpo.length < 6) {
      setConvite(null);
      return;
    }
    let ativo = true;
    const t = setTimeout(() => {
      consultarFn({ data: { codigo: limpo } })
        .then((r) => {
          if (!ativo) return;
          setConvite(r.encontrado ? { nome: r.nome, cidade: r.cidade, estado: r.estado } : null);
        })
        .catch(() => ativo && setConvite(null));
    }, 350);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [codigo, tipo, consultarFn]);

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
    if (nome.trim().length < 2) {
      setErr("Informe seu nome completo.");
      return;
    }
    if (tipo === "ACADEMIA") {
      if (academiaNome.trim().length < 2) return setErr("Informe o nome da academia.");
      if (cidade.trim().length < 2) return setErr("Informe a cidade da academia.");
      if (estado.trim().length !== 2) return setErr("Informe a UF com 2 letras (ex.: SP).");
    } else if (codigo.replace(/[^A-Za-z0-9]/g, "").length < 6) {
      return setErr("Informe o código de convite da sua academia.");
    }

    setLoading(true);
    try {
      const comum = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: password,
        telefone: telefone.trim() || undefined,
        cpf: cpf.trim() || undefined,
      };
      await cadastrarFn({
        data:
          tipo === "ACADEMIA"
            ? {
                tipo: "ACADEMIA" as const,
                ...comum,
                academia_nome: academiaNome.trim(),
                cidade: cidade.trim(),
                estado: estado.trim().toUpperCase(),
                cnpj: cnpj.trim() || undefined,
              }
            : {
                tipo: "MEMBRO" as const,
                ...comum,
                codigo_convite: codigo.toUpperCase().replace(/[^A-Z0-9]/g, ""),
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

  return (
    <div className="fp-screen fp-login">
      <div className="fp-aurora" aria-hidden="true" />
      <div className="fp-glass fp-auth-card fp-rise">
        <img src={logoFitPro} alt="Logo FitPro" className="fp-logo-mark" width={816} height={816} />
        <h1 className="fp-brand" style={{ textAlign: "center" }}>
          Fit<span>Pro</span>
        </h1>
        <p className="fp-subtitle" style={{ textAlign: "center" }}>
          Plataforma de gestão para academias
        </p>

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
            Criar conta
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
              placeholder="voce@suaacademia.com"
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
              {loading ? "Autenticando..." : "Acessar plataforma"}
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
            <div className="fp-choice-grid">
              <button
                type="button"
                className={"fp-choice" + (tipo === "ACADEMIA" ? " active" : "")}
                onClick={() => {
                  setTipo("ACADEMIA");
                  setErr(null);
                }}
                aria-pressed={tipo === "ACADEMIA"}
              >
                <Building2 size={18} />
                <strong>Sou gestor</strong>
                <span>Cadastrar minha academia na plataforma</span>
              </button>
              <button
                type="button"
                className={"fp-choice" + (tipo === "MEMBRO" ? " active" : "")}
                onClick={() => {
                  setTipo("MEMBRO");
                  setErr(null);
                }}
                aria-pressed={tipo === "MEMBRO"}
              >
                <UserPlus size={18} />
                <strong>Sou aluno</strong>
                <span>Entrar com o código da minha academia</span>
              </button>
            </div>

            <label className="fp-label">Nome completo</label>
            <input
              className="fp-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
            />

            {tipo === "ACADEMIA" ? (
              <>
                <label className="fp-label">Nome da academia</label>
                <input
                  className="fp-input"
                  value={academiaNome}
                  onChange={(e) => setAcademiaNome(e.target.value)}
                  placeholder="Ex.: Academia Alpha"
                  required
                />
                <div className="fp-grid-2">
                  <div>
                    <label className="fp-label">Cidade</label>
                    <input
                      className="fp-input"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="São Paulo"
                      required
                    />
                  </div>
                  <div>
                    <label className="fp-label">UF</label>
                    <input
                      className="fp-input"
                      value={estado}
                      maxLength={2}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      placeholder="SP"
                      required
                    />
                  </div>
                </div>
                <label className="fp-label">CNPJ (opcional)</label>
                <input
                  className="fp-input"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </>
            ) : (
              <>
                <label className="fp-label">Código de convite da academia</label>
                <input
                  className="fp-input fp-input-code"
                  value={codigo}
                  maxLength={12}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="EX: A7K2M9QP"
                  required
                />
                {codigo.replace(/[^A-Z0-9]/g, "").length >= 6 && (
                  <p className={convite ? "fp-ok-msg" : "fp-error"} style={{ marginTop: 6 }}>
                    {convite
                      ? `Academia encontrada: ${convite.nome}${convite.cidade ? ` — ${convite.cidade}/${convite.estado ?? ""}` : ""}`
                      : "Código não encontrado."}
                  </p>
                )}
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
              </>
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
              {loading
                ? "Criando conta..."
                : tipo === "ACADEMIA"
                  ? "Cadastrar academia"
                  : "Entrar na academia"}
            </button>
          </form>
        )}

        {err && <p className="fp-error">{err}</p>}
        {ok && <p className="fp-ok-msg">{ok}</p>}
        <p style={{ fontSize: 11, color: "var(--fp-muted)", marginTop: 14, textAlign: "center" }}>
          Gestores criam a academia e recebem um código de convite para compartilhar com alunos e equipe.
        </p>
      </div>
    </div>
  );
}
