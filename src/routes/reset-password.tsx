import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/fitpro.css";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — FitPro GYM2" },
      { name: "description", content: "Defina uma nova senha para acessar sua conta no FitPro GYM2." },
      { property: "og:title", content: "Redefinir senha — FitPro GYM2" },
      { property: "og:description", content: "Recuperação de acesso à plataforma FitPro GYM2." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [loading, setLoading] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    document.body.classList.add("fp-body");
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) setPronto(true);
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "PASSWORD_RECOVERY" || evt === "SIGNED_IN") setPronto(true);
    });
    return () => {
      sub.subscription.unsubscribe();
      document.body.classList.remove("fp-body");
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) { toast.error("A senha precisa ter ao menos 8 caracteres."); return; }
    if (senha !== conf) { toast.error("As senhas não conferem."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada — faça login novamente.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="fp-screen fp-login">
      <form className="fp-glass fp-auth-card" onSubmit={submit}>
        <h1 className="fp-brand">FitPro <span>GYM2</span></h1>
        <p className="fp-subtitle">Definir nova senha</p>
        {!pronto && (
          <p style={{ fontSize: 12, color: "var(--fp-muted)", marginBottom: 10 }}>
            Abra esta página pelo link enviado no seu e-mail de recuperação.
          </p>
        )}
        <label className="fp-label">Nova senha</label>
        <input className="fp-input" type="password" autoComplete="new-password" value={senha}
          onChange={(e) => setSenha(e.target.value)} required minLength={8} />
        <label className="fp-label">Confirmar senha</label>
        <input className="fp-input" type="password" autoComplete="new-password" value={conf}
          onChange={(e) => setConf(e.target.value)} required minLength={8} />
        <button className="fp-btn fp-btn-primary" type="submit" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
