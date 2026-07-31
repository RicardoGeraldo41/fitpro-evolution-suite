import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession, type Role } from "@/lib/fitpro/session";
import "@/styles/fitpro.css";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

type NavItem = { to: string; label: string; roles: Role[] };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Painel Estratégico", roles: ["DONO", "ADMIN"] },
  { to: "/recepcao", label: "Recepção & Catraca", roles: ["DONO", "ADMIN", "PERSONAL"] },
  { to: "/alunos", label: "Alunos", roles: ["DONO", "ADMIN", "PERSONAL"] },
  { to: "/planos", label: "Planos & Matrículas", roles: ["DONO", "ADMIN"] },
  { to: "/biometria", label: "Biometria", roles: ["DONO", "ADMIN"] },
  { to: "/pdv", label: "PDV Balcão", roles: ["DONO", "ADMIN"] },
  { to: "/recorrencia", label: "Financeiro", roles: ["DONO", "ADMIN"] },
  { to: "/relatorios", label: "Relatórios", roles: ["DONO", "ADMIN"] },
  { to: "/treino", label: "Modo Em Treino", roles: ["ALUNO"] },
  { to: "/avaliacao", label: "Avaliação", roles: ["DONO", "PERSONAL"] },
  { to: "/medidas", label: "Medidas & Fotos", roles: ["DONO", "ADMIN", "PERSONAL", "ALUNO"] },
  { to: "/alimentacao", label: "Plano Alimentar", roles: ["DONO", "ADMIN", "PERSONAL", "ALUNO"] },
  { to: "/grade", label: "Grade de Aulas", roles: ["DONO", "ADMIN", "PERSONAL", "ALUNO"] },
  { to: "/recepcao", label: "Meus Acessos", roles: ["ALUNO"] },
  { to: "/planos", label: "Minha Matrícula", roles: ["ALUNO"] },
  { to: "/evolucao", label: "Minha Evolução", roles: ["ALUNO"] },
  { to: "/ranking", label: "Ranking XP", roles: ["DONO", "ADMIN", "PERSONAL", "ALUNO"] },
  { to: "/configuracoes", label: "Configurações & Equipe", roles: ["DONO", "ADMIN"] },
  { to: "/auditoria", label: "Auditoria", roles: ["DONO", "ADMIN"] },
];


function AuthLayout() {
  const { session, loading, signOut } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    document.body.classList.add("fp-body");
    return () => document.body.classList.remove("fp-body");
  }, []);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => { setMenuAberto(false); }, [pathname]);

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
      <header className="fp-topbar fp-glass">
        <button className="fp-burger" aria-label="Abrir menu" onClick={() => setMenuAberto((v) => !v)}>
          ☰
        </button>
        <h2 className="fp-brand-mini" style={{ padding: 0 }}>FitPro <span>GYM2</span></h2>
      </header>

      {menuAberto && <div className="fp-backdrop" onClick={() => setMenuAberto(false)} />}

      <aside className={"fp-sidebar fp-glass" + (menuAberto ? " open" : "")}>
        <h2 className="fp-brand-mini">FitPro <span>GYM2</span></h2>
        <p style={{ fontSize: 11, color: "var(--fp-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
          {session.academia_nome}
        </p>
        <nav className="fp-nav">
          {items.map((it) => (
            <Link key={it.to + it.label} to={it.to} activeProps={{ className: "active" }}>
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="fp-user-box">
          <div className="fp-avatar">{(session.nome || "?").charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{session.nome}</p>
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

