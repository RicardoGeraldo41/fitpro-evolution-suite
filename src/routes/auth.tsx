import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { seedFitProDemoUsers } from "@/lib/fitpro-seed.functions";
import { useSession } from "@/lib/fitpro/session";
import "@/styles/fitpro.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — FitPro GYM2" },
      { name: "description", content: "Acesse sua academia no FitPro GYM2." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [recuperando, setRecuperando] = useState(false);
  const navigate = useNavigate();
  const { session, refresh } = useSession();
  const seedFn = useServerFn(seedFitProDemoUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add("fp-body");
    seedFn({}).catch(() => {});
    return () => document.body.classList.remove("fp-body");
  }, [seedFn]);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
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

  async function recuperarSenha() {
    const alvo = email.trim().toLowerCase();
    if (!alvo) { setErr("Informe seu e-mail para receber o link de recuperação."); return; }
    setErr(null);
    setRecuperando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(alvo, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecuperando(false);
    setErr(error ? error.message : "Se o e-mail existir, enviamos um link de recuperação.");
  }

  return (
    <div className="fp-screen fp-login">
      <form className="fp-glass fp-auth-card" onSubmit={handleLogin}>
        <h1 className="fp-brand">FitPro <span>GYM2</span></h1>
        <p className="fp-subtitle">Ecossistema Premium de Gestão Fitness</p>
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
        <button type="submit" className="fp-btn fp-btn-primary" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? "Autenticando..." : "Acessar Plataforma"}
        </button>
        {err && <p className="fp-error">{err}</p>}
        <button type="button" className="fp-btn fp-btn-ghost" style={{ marginTop: 8 }}
          onClick={recuperarSenha} disabled={recuperando}>
          {recuperando ? "Enviando..." : "Esqueci minha senha"}
        </button>
        <div className="fp-glass-inner" style={{ marginTop: 14, padding: 12 }}>
          <p style={{ fontSize: 11, color: "var(--fp-muted)", marginBottom: 6 }}>
            Contas demo (auto-criadas):
          </p>
          <p style={{ fontSize: 11, fontFamily: "monospace", lineHeight: 1.7 }}>
            dono@fitpro.local · FitPro@Dono2026<br />
            admin@fitpro.local · FitPro@Admin2026<br />
            personal@fitpro.local · FitPro@Personal2026<br />
            aluno@fitpro.local · FitPro@Aluno2026
          </p>
        </div>
      </form>
    </div>
  );
}
