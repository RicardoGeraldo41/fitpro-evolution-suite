import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dumbbell, ShieldCheck, LineChart, CreditCard, Fingerprint, Apple, Users, ChevronRight } from "lucide-react";
import { useSession } from "@/lib/fitpro/session";
import "@/styles/fitpro.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitPro GYM2 — Ecossistema de Academias" },
      {
        name: "description",
        content:
          "FitPro GYM2: gestão completa de academias com biometria, PDV, recorrência, treino imersivo, avaliação antropométrica e IA.",
      },
      { property: "og:title", content: "FitPro GYM2 — Ecossistema de Academias" },
      {
        property: "og:description",
        content:
          "Ecossistema premium para academias: biometria, recorrência, treino imersivo, RBAC, IA e dashboards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { session, loading } = useSession();

  useEffect(() => {
    document.body.classList.add("fp-body");
    return () => document.body.classList.remove("fp-body");
  }, []);

  return (
    <div className="fp-landing">
      <div className="fp-aurora" aria-hidden="true" />
      <nav className="fp-landing-nav">
        <h1 className="fp-brand" style={{ fontSize: 24 }}>
          FitPro <span>GYM2</span>
        </h1>
        <div className="fp-landing-nav-actions">
          {loading ? (
            <span className="fp-muted">Carregando...</span>
          ) : session ? (
            <Link to="/dashboard" className="fp-btn fp-btn-primary fp-btn-shine">
              Ir para o Painel
            </Link>
          ) : (
            <>
              <Link to="/auth" className="fp-btn fp-btn-ghost">
                Entrar
              </Link>
              <Link to="/auth" search={{ tab: "cadastrar" }} className="fp-btn fp-btn-primary fp-btn-shine">
                Criar minha academia
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="fp-landing-hero">
        <div className="fp-landing-badge">✨ SaaS Profissional para Academias</div>
        <h2 className="fp-landing-title">
          Gestão fitness de alta performance<br />
          <span>com IA e biometria</span>
        </h2>
        <p className="fp-landing-subtitle">
          Controle financeiro recorrente, catraca digital, avaliações corporais, planos alimentares,
          gamificação e business intelligence em uma única plataforma enterprise.
        </p>
        <div className="fp-landing-cta">
          <Link to="/auth" search={{ tab: "cadastrar" }} className="fp-btn fp-btn-primary fp-btn-shine">
            Começar agora <ChevronRight size={18} />
          </Link>
          <Link to="/auth" className="fp-btn fp-btn-secondary">
            Acessar minha conta
          </Link>
        </div>

        <div className="fp-landing-grid">
          <FeatureCard
            icon={<Fingerprint size={22} />}
            title="Biometria & Facial"
            text="Libere a catraca por digital ou reconhecimento facial com validação de inadimplência."
          />
          <FeatureCard
            icon={<CreditCard size={22} />}
            title="Recorrência & PDV"
            text="Geração automática de mensalidades, controle de recebimentos e ponto de venda integrado."
          />
          <FeatureCard
            icon={<Dumbbell size={22} />}
            title="Treino Imersivo"
            text="Workout tracker com timer, controle de carga, evolução de séries e gamificação XP."
          />
          <FeatureCard
            icon={<LineChart size={22} />}
            title="Avaliação Científica"
            text="Protocolo de dobras, percentual de gordura, medidas corporais e fotos de evolução."
          />
          <FeatureCard
            icon={<Apple size={22} />}
            title="Nutrição & Planos"
            text="Planos alimentares com macros, banco de alimentos e controle calórico."
          />
          <FeatureCard
            icon={<ShieldCheck size={22} />}
            title="RBAC & Auditoria"
            text="Permissões por papel (DONO, ADMIN, PERSONAL, ALUNO) e logs de segurança."
          />
          <FeatureCard
            icon={<Users size={22} />}
            title="Grade de Aulas"
            text="Agendamento online, controle de vagas e lista de presença."
          />
          <FeatureCard
            icon={<LineChart size={22} />}
            title="Business Intelligence"
            text="Dashboards de MRR, churn, inadimplência e fluxo de caixa para decisões."
          />
        </div>
      </main>

      <footer className="fp-landing-footer">
        <p>© {new Date().getFullYear()} FitPro GYM2 — Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="fp-glass fp-feature-card">
      <div className="fp-feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
