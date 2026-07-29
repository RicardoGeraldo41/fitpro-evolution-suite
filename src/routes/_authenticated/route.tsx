import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession, type Role } from "@/lib/fitpro/session";
import "@/styles/fitpro.css";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

type NavItem = { to: string; label: string; roles: Role[] };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Painel Estratégico", roles: ["DONO", "ADMIN"] },
  { to: "/alunos", label: "Matrículas", roles: ["DONO", "ADMIN", "PERSONAL"] },
  { to: "/biometria", label: "Biometria", roles: ["DONO", "ADMIN"] },
  { to: "/pdv", label: "PDV Balcão", roles: ["DONO", "ADMIN"] },
  { to: "/recorrencia", label: "Recorrência", roles: ["DONO", "ADMIN"] },
  { to: "/treino", label: "Modo Em Treino", roles: ["ALUNO"] },
  { to: "/avaliacao", label: "Avaliação", roles: ["DONO", "PERSONAL"] },
  { to: "/medidas", label: "Medidas & Fotos", roles: ["DONO", "ADMIN", "PERSONAL", "ALUNO"] },
  { to: "/alimentacao", label: "Plano Alimentar", roles: ["DONO", "ADMIN", "PERSONAL", "ALUNO"] },
  { to: "/grade", label: "Grade de Aulas", roles: ["DONO", "ADMIN", "PERSONAL", "ALUNO"] },
  { to: "/evolucao", label: "Minha Evolução", roles: ["ALUNO"] },
  { to: "/ranking", label: "Ranking XP", roles: ["DONO", "ADMIN", "PERSONAL", "ALUNO"] },
  { to: "/auditoria", label: "Auditoria", roles: ["DONO", "ADMIN"] },
];

function AuthLayout() {
  const { session, loading, signOut } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("fp-body");
    return () => document.body.classList.remove("fp-body");
  }, []);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="fp-screen fp-login">
        <div className="fp-glass fp-auth-card" style={{ textAlign: "center" }}>
          <h1 className="fp-brand">FitPro <span>GYM2</span></h1>
          <p className="fp-subtitle">Conectando ao Lovable Cloud...</p>
        </div>
      </div>
    );
  }

  const items = NAV.filter((n) => n.roles.includes(session.role));

  return (
    <div className="fp-screen">
      <aside className="fp-sidebar fp-glass">
        <h2 className="fp-brand-mini">FitPro <span>GYM2</span></h2>
        <p style={{ fontSize: 11, color: "var(--fp-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
          {session.academia_nome}
        </p>
        <nav className="fp-nav">
          {items.map((it) => (
            <Link key={it.to} to={it.to} activeProps={{ className: "active" }}>
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="fp-user-box">
          <div className="fp-avatar">{(session.nome || "?").charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <p>{session.nome}</p>
            <p className="fp-role-tag">{session.role}</p>
          </div>
          <button className="fp-btn fp-btn-ghost" onClick={signOut}>
            Sair
          </button>
        </div>
      </aside>
      <main className="fp-content">
        <Outlet />
      </main>
    </div>
  );
}
