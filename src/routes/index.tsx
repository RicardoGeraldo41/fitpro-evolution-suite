import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { seedFitProDemoUsers } from "@/lib/fitpro-seed.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitPro GYM2 — Ecossistema de Academias" },
      {
        name: "description",
        content:
          "FitPro GYM2: gestão completa de academias com biometria, PDV, recorrência, treino imersivo e avaliação antropométrica.",
      },
      { property: "og:title", content: "FitPro GYM2" },
      {
        property: "og:description",
        content:
          "Ecossistema premium para academias de alta concorrência: biometria, recorrência, treino imersivo e RBAC.",
      },
    ],
  }),
  component: FitProApp,
});

type Role = "DONO" | "ADMIN" | "PERSONAL" | "ALUNO";
type AppSession = {
  user_id: string;
  email: string;
  nome: string;
  role: Role;
  aluno_id: string | null;
  personal_id: string | null;
};

declare global {
  interface Window {
    __fp?: {
      sb: typeof supabase;
      session: AppSession;
      signOut: () => Promise<void>;
    };
    __startFitProApp?: (session: AppSession) => void;
    __stopFitProApp?: () => void;
  }
}

function FitProApp() {
  const seedFn = useServerFn(seedFitProDemoUsers);
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<AppSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const initialized = useRef(false);

  // Boot: seed demo users (idempotente) + checa sessão atual
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        await seedFn({});
      } catch (e) {
        console.warn("seed demo users:", e);
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const built = await buildAppSession(data.session.user.id);
        if (built) setSession(built);
      }
      setBooting(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, s) => {
      if (evt === "SIGNED_OUT") {
        setSession(null);
        window.__stopFitProApp?.();
      }
      if (evt === "SIGNED_IN" && s) {
        const built = await buildAppSession(s.user.id);
        if (built) setSession(built);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [seedFn]);

  // Quando a sessão entra/sai, inicia ou para o motor vanilla
  useEffect(() => {
    if (!session) return;
    window.__fp = {
      sb: supabase,
      session,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
    // pequeno atraso garante que o DOM dos shells está montado
    const t = setTimeout(() => window.__startFitProApp?.(session), 0);
    return () => clearTimeout(t);
  }, [session]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr(null);
    setLoginLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoginLoading(false);
    if (error || !data.session) {
      setLoginErr(error?.message ?? "Credenciais inválidas.");
      return;
    }
    const built = await buildAppSession(data.session.user.id);
    if (!built) {
      setLoginErr("Usuário sem papel atribuído. Contate o administrador.");
      await supabase.auth.signOut();
      return;
    }
    setSession(built);
  }

  if (booting) {
    return (
      <>
        <style>{CSS}</style>
        <div className="screen" style={{ alignItems: "center", justifyContent: "center" }}>
          <div className="glass auth-card" style={{ textAlign: "center" }}>
            <h1 className="brand">FitPro <span>GYM2</span></h1>
            <p className="subtitle">Conectando ao Lovable Cloud...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>

      {!session && (
        <section id="screen-login" className="screen">
          <form className="glass auth-card" onSubmit={handleLogin}>
            <h1 className="brand">FitPro <span>GYM2</span></h1>
            <p className="subtitle">Ecossistema Premium de Gestão Fitness</p>
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dono@fitpro.local"
              required
            />
            <label>Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button type="submit" className="btn-primary" disabled={loginLoading}>
              {loginLoading ? "Autenticando..." : "Acessar Plataforma"}
            </button>
            {loginErr && <p className="error">{loginErr}</p>}
            <div className="demo-hint glass-inner">
              <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
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
        </section>
      )}

      {session && (
        <section id="screen-app" className="screen">
          <aside className="sidebar glass">
            <h2 className="brand-mini">FitPro <span>GYM2</span></h2>
            <nav id="nav-menu"></nav>
            <div className="user-box">
              <div id="user-avatar" className="avatar"></div>
              <div>
                <p id="user-name"></p>
                <p id="user-role" className="role-tag"></p>
              </div>
              <button
                id="btn-logout"
                className="btn-ghost"
                onClick={() => window.__fp?.signOut()}
              >
                Sair
              </button>
            </div>
          </aside>

          <main className="content">
            <section id="view-dashboard" className="view glass hidden">
              <h2>Painel Estratégico</h2>
              <div id="dashboard-cards" className="cards-grid"></div>
              <div id="dashboard-financeiro" className="finance-box glass-inner hidden">
                <h3>Faturamento Consolidado</h3>
                <div id="finance-metrics" className="metrics"></div>
              </div>
            </section>

            <section id="view-alunos" className="view glass hidden">
              <header className="view-header">
                <h2>Matrículas & Alunos</h2>
                <button id="btn-novo-aluno" className="btn-primary">+ Nova Matrícula</button>
              </header>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Nome</th><th>Plano</th><th>Status Financeiro</th><th>Biometria</th><th>Ações</th></tr>
                  </thead>
                  <tbody id="alunos-tbody"></tbody>
                </table>
              </div>
            </section>

            <section id="view-biometria" className="view glass hidden">
              <h2>Cadastro de Biometria Digital & Facial</h2>
              <div className="bio-grid">
                <div className="glass-inner bio-card">
                  <h3>Aluno Selecionado</h3>
                  <select id="bio-aluno-select"></select>
                  <p>Status financeiro: <span id="bio-status" className="role-tag"></span></p>
                </div>
                <div className="glass-inner bio-card">
                  <h3>Digital (USB-Persona)</h3>
                  <div id="bio-digital-preview" className="bio-preview">Aguardando leitor...</div>
                  <button id="btn-capturar-digital" className="btn-primary">Capturar Template</button>
                </div>
                <div className="glass-inner bio-card">
                  <h3>Reconhecimento Facial</h3>
                  <div id="bio-facial-preview" className="bio-preview">Sem captura</div>
                  <button id="btn-capturar-facial" className="btn-primary">Processar Selfie</button>
                </div>
                <div className="glass-inner bio-card">
                  <h3>Simulador Catraca iDFace</h3>
                  <button id="btn-simular-catraca" className="btn-secondary">Tentar Acesso</button>
                  <p id="catraca-log" className="catraca-log"></p>
                </div>
              </div>
            </section>

            <section id="view-pdv" className="view glass hidden">
              <h2>PDV de Balcão — Recepção Expressa</h2>
              <div className="pdv-grid">
                <div className="glass-inner">
                  <h3>Catálogo</h3>
                  <div id="pdv-catalogo" className="catalog-grid"></div>
                </div>
                <div className="glass-inner">
                  <h3>Carrinho</h3>
                  <ul id="pdv-carrinho"></ul>
                  <p className="total">Total: R$ <span id="pdv-total">0,00</span></p>
                  <label>Meio de pagamento</label>
                  <select id="pdv-pagamento">
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="DEBITO">Cartão Débito</option>
                    <option value="CREDITO">Cartão Crédito</option>
                  </select>
                  <button id="btn-fechar-venda" className="btn-primary">Fechar Venda</button>
                  <p id="pdv-log" className="catraca-log"></p>
                </div>
              </div>
            </section>

            <section id="view-recorrencia" className="view glass hidden">
              <h2>Motor Financeiro Recorrente</h2>
              <button id="btn-rodar-recorrencia" className="btn-primary">Processar Faturamento Mensal</button>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Status</th><th>Última Cobrança</th></tr></thead>
                  <tbody id="recorrencia-tbody"></tbody>
                </table>
              </div>
            </section>

            <section id="view-treino" className="view glass hidden">
              <h2>Modo Em Treino</h2>
              <div id="treino-container" className="treino-wrap"></div>
            </section>

            <section id="view-avaliacao" className="view glass hidden">
              <h2>Avaliação Antropométrica — Protocolo Pollock 3 Dobras</h2>
              <div className="aval-grid">
                <div className="glass-inner">
                  <label>Aluno</label>
                  <select id="aval-aluno"></select>
                  <label>Sexo</label>
                  <select id="aval-sexo"><option value="M">Masculino</option><option value="F">Feminino</option></select>
                  <label>Idade</label><input id="aval-idade" type="number" />
                  <label>Peso (kg)</label><input id="aval-peso" type="number" step="0.1" />
                  <label>Altura (cm)</label><input id="aval-altura" type="number" />
                  <label>Dobra Peitoral (mm)</label><input id="aval-peitoral" type="number" step="0.1" />
                  <label>Dobra Abdominal (mm)</label><input id="aval-abdominal" type="number" step="0.1" />
                  <label>Dobra Coxa (mm)</label><input id="aval-coxa" type="number" step="0.1" />
                  <button id="btn-calcular-aval" className="btn-primary">Calcular & Persistir</button>
                </div>
                <div className="glass-inner">
                  <h3>Resultado</h3>
                  <div id="aval-resultado" className="resultado-aval"></div>
                  <h3>Histórico</h3>
                  <ul id="aval-historico"></ul>
                </div>
              </div>
            </section>

            <section id="view-grade" className="view glass hidden">
              <h2>Grade de Aulas Coletivas</h2>
              <div id="grade-aulas" className="grade-grid"></div>
            </section>

            <section id="view-evolucao" className="view glass hidden">
              <h2>Minha Evolução</h2>
              <div id="evolucao-box" className="glass-inner"></div>
            </section>
          </main>
        </section>
      )}

      <div id="toast-container"></div>

      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: APP_JS }} />
    </>
  );
}

/* Busca papel + perfil + vínculo aluno/personal a partir do user_id */
async function buildAppSession(userId: string): Promise<AppSession | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("nome,email").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (!roles || roles.length === 0) return null;
  // hierarquia: DONO > ADMIN > PERSONAL > ALUNO
  const order: Role[] = ["DONO", "ADMIN", "PERSONAL", "ALUNO"];
  const role =
    order.find((r) => roles.some((x: { role: string }) => x.role === r)) ??
    "ALUNO";

  let aluno_id: string | null = null;
  if (role === "ALUNO") {
    const { data: a } = await supabase
      .from("alunos")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    aluno_id = a?.id ?? null;
  }
  return {
    user_id: userId,
    email: profile?.email ?? "",
    nome: profile?.nome ?? "Usuário",
    role,
    aluno_id,
    personal_id: role === "PERSONAL" ? userId : null,
  };
}

/* =========================================================================
 * CSS — Glassmorphism premium (roxo / escuro / rosa neon)
 * ========================================================================= */
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg-grad:radial-gradient(circle at 20% 10%,#3a0a5e 0%,#0a0418 45%,#020108 100%);
  --neon:#ff2bd6;--neon2:#7c3aed;--neon3:#22d3ee;
  --glass:rgba(255,255,255,0.06);--glass-strong:rgba(255,255,255,0.10);
  --border:rgba(255,255,255,0.18);
  --text:#f5f3ff;--muted:#a89cc8;--danger:#ff4d6d;--ok:#4ade80;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;
}
html,body,#root{height:100%}
body{background:var(--bg-grad);color:var(--text);min-height:100vh;overflow-x:hidden}
body::before{content:"";position:fixed;inset:0;background:
  radial-gradient(circle at 80% 80%,rgba(255,43,214,.18),transparent 40%),
  radial-gradient(circle at 10% 90%,rgba(124,58,237,.20),transparent 45%);
  pointer-events:none;z-index:0}
.hidden{display:none !important}
.screen{position:relative;z-index:1;min-height:100vh;display:flex}
#screen-login{align-items:center;justify-content:center;padding:24px}
#screen-app{display:flex}
.glass{background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02));
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1px solid var(--border);border-radius:20px;
  box-shadow:0 8px 40px -10px rgba(124,58,237,.35)}
.glass-inner{background:rgba(255,255,255,.04);border:1px solid var(--border);
  border-radius:14px;padding:18px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.auth-card{width:100%;max-width:440px;padding:36px;display:flex;flex-direction:column;gap:10px}
.demo-hint{margin-top:14px;padding:12px}
.brand{font-size:30px;font-weight:800;letter-spacing:-.5px}
.brand span{background:linear-gradient(90deg,var(--neon),var(--neon2));-webkit-background-clip:text;background-clip:text;color:transparent}
.brand-mini{font-size:22px;font-weight:800;padding:8px 0 20px}
.brand-mini span{background:linear-gradient(90deg,var(--neon),var(--neon2));-webkit-background-clip:text;background-clip:text;color:transparent}
.subtitle{color:var(--muted);margin-bottom:14px;font-size:13px}
label{font-size:12px;color:var(--muted);margin-top:8px;display:block;text-transform:uppercase;letter-spacing:.5px}
input,select,textarea{width:100%;padding:11px 14px;border-radius:10px;
  background:rgba(0,0,0,.35);border:1px solid var(--border);color:var(--text);
  font-size:14px;outline:none;transition:all .2s}
input:focus,select:focus{border-color:var(--neon);box-shadow:0 0 0 3px rgba(255,43,214,.25)}
button{cursor:pointer;border:none;font-family:inherit;font-weight:600;border-radius:10px;padding:11px 18px;font-size:14px;transition:transform .15s,box-shadow .2s}
button:disabled{opacity:.55;cursor:not-allowed}
.btn-primary{background:linear-gradient(90deg,var(--neon2),var(--neon));color:#fff;
  box-shadow:0 6px 24px -8px rgba(255,43,214,.6);margin-top:14px}
.btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 30px -8px rgba(255,43,214,.8)}
.btn-secondary{background:rgba(255,255,255,.1);color:var(--text);border:1px solid var(--border)}
.btn-ghost{background:transparent;color:var(--muted);padding:6px 10px;font-size:12px}
.btn-ghost:hover{color:var(--neon)}
.hint{font-size:11px;color:var(--muted);margin-top:10px;text-align:center}
.error{color:var(--danger);font-size:13px;margin-top:8px}
.sidebar{width:260px;margin:18px;padding:24px;display:flex;flex-direction:column;height:calc(100vh - 36px);position:sticky;top:18px}
#nav-menu{display:flex;flex-direction:column;gap:6px;flex:1;margin-top:10px}
.nav-item{padding:11px 14px;border-radius:10px;cursor:pointer;color:var(--muted);font-size:14px;font-weight:500;display:flex;align-items:center;gap:10px;transition:all .2s}
.nav-item:hover{background:rgba(255,255,255,.06);color:var(--text)}
.nav-item.active{background:linear-gradient(90deg,rgba(124,58,237,.4),rgba(255,43,214,.25));color:#fff;border:1px solid var(--border)}
.user-box{display:flex;align-items:center;gap:10px;padding-top:14px;border-top:1px solid var(--border);margin-top:auto}
.user-box p{font-size:13px;font-weight:600}
.avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--neon),var(--neon2));display:flex;align-items:center;justify-content:center;font-weight:700}
.role-tag{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--neon);font-weight:700}
.content{flex:1;padding:24px 28px 40px 0;display:flex;flex-direction:column;gap:24px;overflow-x:hidden}
.view{padding:26px 28px;animation:fadeIn .35s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.view h2{font-size:24px;margin-bottom:18px;font-weight:700;letter-spacing:-.3px}
.view-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.view-header h2{margin:0}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}
.card-kpi{padding:18px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--border)}
.card-kpi h4{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.card-kpi p{font-size:26px;font-weight:800;margin-top:6px;background:linear-gradient(90deg,var(--neon3),var(--neon));-webkit-background-clip:text;background-clip:text;color:transparent}
.finance-box{margin-top:22px}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:10px}
.metrics div{padding:12px;background:rgba(0,0,0,.25);border-radius:10px}
.metrics span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase}
.metrics strong{font-size:18px;color:var(--neon)}
.table-wrap{overflow-x:auto;border-radius:12px;border:1px solid var(--border)}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:12px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,.08)}
th{background:rgba(0,0,0,.3);font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
tr:hover td{background:rgba(255,43,214,.05)}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
.badge.ok{background:rgba(74,222,128,.15);color:var(--ok)}
.badge.bad{background:rgba(255,77,109,.18);color:var(--danger)}
.badge.warn{background:rgba(251,191,36,.15);color:#fbbf24}
.bio-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.bio-card{display:flex;flex-direction:column;gap:10px}
.bio-preview{height:120px;border-radius:10px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px;background:rgba(0,0,0,.3);text-align:center;padding:10px}
.bio-preview.ok{border-color:var(--ok);color:var(--ok)}
.catraca-log{font-size:12px;color:var(--muted);margin-top:8px;font-family:'JetBrains Mono',monospace;white-space:pre-wrap}
.pdv-grid{display:grid;grid-template-columns:2fr 1fr;gap:18px}
@media(max-width:900px){.pdv-grid{grid-template-columns:1fr}.sidebar{position:relative;width:100%;height:auto;margin:12px}.content{padding:12px}}
.catalog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-top:10px}
.prod-card{padding:12px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid var(--border);cursor:pointer;transition:all .2s}
.prod-card:hover{border-color:var(--neon);transform:translateY(-2px)}
.prod-card h5{font-size:13px;font-weight:600}
.prod-card p{font-size:12px;color:var(--muted);margin-top:4px}
.prod-card strong{color:var(--neon);font-size:15px;display:block;margin-top:6px}
#pdv-carrinho{list-style:none;max-height:300px;overflow-y:auto;margin-top:10px}
#pdv-carrinho li{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px}
.total{font-size:20px;font-weight:800;margin:14px 0;text-align:right;color:var(--neon)}
.treino-wrap{display:flex;flex-direction:column;gap:14px}
.exercicio{padding:18px;border-radius:14px;background:linear-gradient(135deg,rgba(124,58,237,.15),rgba(255,43,214,.08));border:1px solid var(--border);transition:all .3s}
.exercicio.locked{opacity:.35;filter:blur(2px);pointer-events:none}
.exercicio h3{font-size:18px;margin-bottom:6px}
.exercicio .meta{color:var(--muted);font-size:12px;margin-bottom:10px}
.series-list{display:flex;flex-direction:column;gap:8px}
.serie-row{display:grid;grid-template-columns:60px 1fr 1fr auto;gap:10px;align-items:center}
.serie-row span{font-size:12px;color:var(--muted)}
.serie-row input{padding:8px}
.serie-row button{padding:8px 14px;font-size:12px}
.timer-overlay{position:fixed;inset:0;background:rgba(2,1,8,.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:1000;animation:fadeIn .2s}
.timer-circle{width:240px;height:240px;border-radius:50%;border:6px solid var(--neon);display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:800;color:#fff;box-shadow:0 0 60px var(--neon),inset 0 0 40px rgba(255,43,214,.3);animation:pulse 1s infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.timer-overlay p{margin-top:20px;font-size:18px;color:var(--muted)}
.timer-overlay button{margin-top:16px}
.aval-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:800px){.aval-grid{grid-template-columns:1fr}}
.resultado-aval{padding:18px;border-radius:12px;background:rgba(0,0,0,.35);margin:10px 0;min-height:100px}
.resultado-aval h4{color:var(--neon);font-size:14px;text-transform:uppercase;margin-bottom:8px}
.resultado-aval p{font-size:14px;margin:4px 0}
.resultado-aval strong{color:var(--neon3);font-size:22px}
.grade-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.aula-card{padding:16px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--border)}
.aula-card h4{font-size:16px}
.aula-card p{font-size:12px;color:var(--muted);margin:4px 0}
.aula-card button{margin-top:8px;width:100%}
#toast-container{position:fixed;top:20px;right:20px;z-index:2000;display:flex;flex-direction:column;gap:10px}
.toast{padding:14px 18px;border-radius:12px;background:rgba(20,10,40,.9);border:1px solid var(--border);backdrop-filter:blur(12px);color:#fff;font-size:13px;min-width:240px;animation:slideIn .3s;border-left:3px solid var(--neon)}
.toast.error{border-left-color:var(--danger)}
.toast.success{border-left-color:var(--ok)}
@keyframes slideIn{from{transform:translateX(120%)}to{transform:none}}
`;

/* =========================================================================
 * APP_JS — motor vanilla acoplado ao Lovable Cloud (Supabase)
 * Toda a camada de dados usa window.__fp.sb (cliente Supabase).
 * RLS no banco já filtra o que cada papel pode ver/escrever.
 * ========================================================================= */
const APP_JS = `
(function(){
'use strict';

let started=false, currentSession=null, carrinho=[];

const MENU_BY_ROLE={
  DONO:[['dashboard','Painel Estratégico'],['alunos','Matrículas'],['biometria','Biometria'],['pdv','PDV Balcão'],['recorrencia','Recorrência'],['avaliacao','Avaliação'],['grade','Grade de Aulas']],
  ADMIN:[['dashboard','Painel'],['alunos','Matrículas'],['biometria','Biometria'],['pdv','PDV Balcão'],['recorrencia','Recorrência'],['grade','Grade de Aulas']],
  PERSONAL:[['alunos','Meus Alunos'],['avaliacao','Avaliação Física'],['grade','Grade de Aulas']],
  ALUNO:[['treino','Modo Em Treino'],['grade','Grade de Aulas'],['evolucao','Minha Evolução']]
};

function $(id){return document.getElementById(id);}
function safeSet(el,val){if(el)el.textContent=(val==null?'':String(val));}
function fmtBRL(n){return Number(n||0).toFixed(2).replace('.',',');}
function toast(msg,kind){const c=$('toast-container');if(!c)return;const t=document.createElement('div');t.className='toast '+(kind||'');safeSet(t,msg);c.appendChild(t);setTimeout(()=>t.remove(),3800);}
function sb(){return window.__fp && window.__fp.sb;}

/* ---------- API SUPABASE ---------- */
const API={
  async get(table,opts){
    const q=sb().from(table).select('*');
    const r=await q;
    if(r.error){console.warn('[API.get]',table,r.error);return[];}
    return r.data||[];
  },
  async find(table,id){
    const r=await sb().from(table).select('*').eq('id',id).maybeSingle();
    if(r.error){console.warn('[API.find]',table,r.error);return null;}
    return r.data;
  },
  async insert(table,row){
    const r=await sb().from(table).insert(row).select().single();
    if(r.error){console.warn('[API.insert]',table,r.error);toast('Erro: '+r.error.message,'error');return null;}
    return r.data;
  },
  async update(table,id,patch){
    const r=await sb().from(table).update(patch).eq('id',id).select().single();
    if(r.error){console.warn('[API.update]',table,r.error);toast('Erro: '+r.error.message,'error');return null;}
    return r.data;
  }
};

/* ---------- VIEW ROUTER ---------- */
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  const v=$('view-'+name);if(v)v.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));
  renderView(name);
}
function renderView(name){
  ({dashboard:renderDashboard,alunos:renderAlunos,biometria:renderBiometria,pdv:renderPDV,
    recorrencia:renderRecorrencia,treino:renderTreino,avaliacao:renderAvaliacao,
    grade:renderGrade,evolucao:renderEvolucao})[name]?.();
}

/* ---------- SHELL ---------- */
function buildShell(){
  safeSet($('user-name'),currentSession.nome);
  safeSet($('user-role'),currentSession.role);
  safeSet($('user-avatar'),(currentSession.nome||'?').charAt(0));
  const nav=$('nav-menu');if(!nav)return;
  nav.textContent='';
  (MENU_BY_ROLE[currentSession.role]||[]).forEach(([k,label])=>{
    const b=document.createElement('div');b.className='nav-item';b.dataset.view=k;safeSet(b,label);
    b.addEventListener('click',()=>showView(k));nav.appendChild(b);
  });
}

/* ---------- DASHBOARD ---------- */
async function renderDashboard(){
  const [alunos,vendas,rec]=await Promise.all([API.get('alunos'),API.get('vendas'),API.get('recorrencias')]);
  const grid=$('dashboard-cards');grid.textContent='';
  const totalVendas=vendas.reduce((s,v)=>s+Number(v.total||0),0);
  const totalRec=rec.filter(r=>r.status==='PAGO').reduce((s,r)=>s+Number(r.valor||0),0);
  const kpis=[['Alunos Ativos',alunos.filter(a=>a.status_financeiro==='ADIMPLENTE').length],
    ['Inadimplentes',alunos.filter(a=>a.status_financeiro==='INADIMPLENTE').length],
    ['Caixa (PDV)','R$ '+fmtBRL(totalVendas)],['Recorrência','R$ '+fmtBRL(totalRec)]];
  kpis.forEach(([t,v])=>{const c=document.createElement('div');c.className='card-kpi';
    const h=document.createElement('h4');safeSet(h,t);const p=document.createElement('p');safeSet(p,v);
    c.append(h,p);grid.appendChild(c);});
  if(currentSession.role==='DONO'){
    $('dashboard-financeiro').classList.remove('hidden');
    const m=$('finance-metrics');m.textContent='';
    [['Faturamento Total','R$ '+fmtBRL(totalVendas+totalRec)],
     ['Ticket Médio PDV','R$ '+fmtBRL(vendas.length?totalVendas/vendas.length:0)],
     ['Cobranças Recorrentes',rec.length]].forEach(([k,v])=>{
      const d=document.createElement('div');const s=document.createElement('span');safeSet(s,k);
      const st=document.createElement('strong');safeSet(st,v);d.append(s,st);m.appendChild(d);});
  } else { $('dashboard-financeiro').classList.add('hidden'); }
}

/* ---------- ALUNOS ---------- */
async function renderAlunos(){
  const alunos=await API.get('alunos');
  const tb=$('alunos-tbody');tb.textContent='';
  alunos.forEach(a=>{
    const tr=document.createElement('tr');
    const td=(v)=>{const c=document.createElement('td');safeSet(c,v);return c;};
    tr.append(td(a.nome),td(a.plano));
    const st=document.createElement('td');const bd=document.createElement('span');
    bd.className='badge '+(a.status_financeiro==='ADIMPLENTE'?'ok':'bad');safeSet(bd,a.status_financeiro);
    st.appendChild(bd);tr.appendChild(st);
    tr.appendChild(td(a.hash_biometria_digital?'✓ Cadastrada':'—'));
    const ac=document.createElement('td');
    if(currentSession.role==='ADMIN'||currentSession.role==='DONO'){
      const b=document.createElement('button');b.className='btn-ghost';safeSet(b,'Alternar Status');
      b.onclick=async()=>{
        await API.update('alunos',a.id,{status_financeiro:a.status_financeiro==='ADIMPLENTE'?'INADIMPLENTE':'ADIMPLENTE'});
        renderAlunos();toast('Status atualizado','success');
      };
      ac.appendChild(b);
    }
    tr.appendChild(ac);tb.appendChild(tr);
  });
  const btn=$('btn-novo-aluno');
  if(btn){
    btn.style.display=(currentSession.role==='ADMIN'||currentSession.role==='DONO')?'':'none';
    btn.onclick=async()=>{
      const nome=prompt('Nome do aluno:');if(!nome)return;
      const novo=await API.insert('alunos',{nome,plano:'Standard',valor_plano:129.90,status_financeiro:'ADIMPLENTE'});
      if(novo){renderAlunos();toast('Matrícula criada','success');}
    };
  }
}

/* ---------- BIOMETRIA ---------- */
async function renderBiometria(){
  const alunos=await API.get('alunos');
  const sel=$('bio-aluno-select');sel.textContent='';
  alunos.forEach(a=>{const o=document.createElement('option');o.value=a.id;safeSet(o,a.nome);sel.appendChild(o);});
  const refreshStatus=async()=>{const a=await API.find('alunos',sel.value);safeSet($('bio-status'),a?.status_financeiro||'-');};
  sel.onchange=refreshStatus;if(alunos.length)await refreshStatus();
  $('btn-capturar-digital').onclick=async()=>{
    if(!sel.value)return;const hash=capturarTemplateDigital();
    const r=await API.update('alunos',sel.value,{hash_biometria_digital:hash});
    if(r){const p=$('bio-digital-preview');p.className='bio-preview ok';safeSet(p,'Template salvo: '+hash.slice(0,32)+'...');toast('Digital cadastrada','success');}
  };
  $('btn-capturar-facial').onclick=async()=>{
    if(!sel.value)return;const vetor=processarSelfieFacial();
    const r=await API.update('alunos',sel.value,{vetor_facial:JSON.stringify(vetor)});
    if(r){const p=$('bio-facial-preview');p.className='bio-preview ok';safeSet(p,'Vetor 128D capturado ['+vetor.slice(0,3).map(n=>n.toFixed(2)).join(', ')+'...]');toast('Facial cadastrada','success');}
  };
  $('btn-simular-catraca').onclick=async()=>{
    if(!sel.value)return;const a=await API.find('alunos',sel.value);
    const r=validarAcessoCatraca(a);const log=$('catraca-log');
    safeSet(log,'['+new Date().toLocaleTimeString()+'] '+r.codigo+' — '+r.mensagem);
    toast(r.mensagem,r.permitido?'success':'error');
  };
}
function capturarTemplateDigital(){
  const bytes=new Uint8Array(64);for(let i=0;i<64;i++)bytes[i]=Math.floor(Math.random()*256);
  return 'BIO-DIG::'+Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function processarSelfieFacial(){const v=[];for(let i=0;i<128;i++)v.push((Math.random()*2-1));return v;}
function validarAcessoCatraca(aluno){
  if(!aluno)return{permitido:false,codigo:'ERR_404',mensagem:'Aluno não localizado'};
  if(aluno.status_financeiro==='INADIMPLENTE')return{permitido:false,codigo:'BLOQ_FIN_402',mensagem:'Acesso negado: aluno inadimplente — solenoide travado'};
  if(!aluno.hash_biometria_digital&&!aluno.vetor_facial)return{permitido:false,codigo:'ERR_BIO_MISS',mensagem:'Sem biometria cadastrada'};
  return{permitido:true,codigo:'OK_200',mensagem:'Acesso liberado — destravando catraca'};
}

/* ---------- PDV ---------- */
async function renderPDV(){
  carrinho=[];const prods=await API.get('produtos');
  const cat=$('pdv-catalogo');cat.textContent='';
  prods.forEach(p=>{
    const c=document.createElement('div');c.className='prod-card';
    const h=document.createElement('h5');safeSet(h,p.nome);
    const e=document.createElement('p');safeSet(e,'Estoque: '+p.estoque_atual);
    const v=document.createElement('strong');safeSet(v,'R$ '+fmtBRL(p.preco));
    c.append(h,e,v);
    c.onclick=()=>{if(p.estoque_atual<=0){toast('Sem estoque','error');return;}addCarrinho(p);};
    cat.appendChild(c);
  });
  updateCarrinho();
  $('btn-fechar-venda').onclick=fecharVenda;
}
function addCarrinho(p){const ex=carrinho.find(x=>x.id===p.id);if(ex)ex.qtd++;else carrinho.push({id:p.id,nome:p.nome,preco:Number(p.preco),qtd:1});updateCarrinho();}
function updateCarrinho(){
  const ul=$('pdv-carrinho');ul.textContent='';let total=0;
  carrinho.forEach(item=>{
    const li=document.createElement('li');
    const n=document.createElement('span');safeSet(n,item.qtd+'× '+item.nome);
    const v=document.createElement('span');safeSet(v,'R$ '+fmtBRL(item.preco*item.qtd));
    li.append(n,v);ul.appendChild(li);total+=item.preco*item.qtd;
  });
  safeSet($('pdv-total'),fmtBRL(total));
}
async function fecharVenda(){
  if(!carrinho.length){toast('Carrinho vazio','error');return;}
  const pag=$('pdv-pagamento').value;
  const total=carrinho.reduce((s,i)=>s+i.preco*i.qtd,0);
  for(const item of carrinho){
    const atual=(await API.find('produtos',item.id))?.estoque_atual||0;
    await API.update('produtos',item.id,{estoque_atual:atual-item.qtd});
  }
  const v=await API.insert('vendas',{items:carrinho.map(i=>({id:i.id,nome:i.nome,preco:i.preco,qtd:i.qtd,meio_pagamento:pag})),total});
  if(v){safeSet($('pdv-log'),'Venda fechada • R$ '+fmtBRL(total)+' • '+pag);toast('Venda registrada com sucesso','success');renderPDV();}
}

/* ---------- RECORRÊNCIA ---------- */
async function renderRecorrencia(){
  const alunos=await API.get('alunos');const rec=await API.get('recorrencias');
  const tb=$('recorrencia-tbody');tb.textContent='';
  alunos.forEach(a=>{
    const list=rec.filter(r=>r.aluno_id===a.id).sort((x,y)=>(y.created_at||'').localeCompare(x.created_at||''));
    const last=list[0];
    const tr=document.createElement('tr');const td=v=>{const c=document.createElement('td');safeSet(c,v);return c;};
    tr.append(td(a.nome),td(a.plano),td('R$ '+fmtBRL(a.valor_plano)));
    const st=document.createElement('td');const bd=document.createElement('span');
    const sts=last?last.status:'PENDENTE';
    bd.className='badge '+(sts==='PAGO'?'ok':(sts==='ATRASADO'||sts==='CANCELADO')?'bad':'warn');safeSet(bd,sts);
    st.appendChild(bd);tr.appendChild(st);
    tr.appendChild(td(last?new Date(last.created_at).toLocaleDateString():'—'));
    tb.appendChild(tr);
  });
  $('btn-rodar-recorrencia').onclick=async()=>{
    const al=await API.get('alunos');
    for(const a of al)await faturarRecorrente(a);
    toast('Faturamento mensal processado','success');renderRecorrencia();
  };
}
async function faturarRecorrente(aluno){
  const ok=Math.random()>0.1;
  await API.insert('recorrencias',{aluno_id:aluno.id,valor:aluno.valor_plano,status:ok?'PAGO':'ATRASADO'});
  if(!ok)await API.update('alunos',aluno.id,{status_financeiro:'INADIMPLENTE'});
}

/* ---------- TREINO IMERSIVO ---------- */
async function renderTreino(){
  const c=$('treino-container');c.textContent='';
  const aluno_id=currentSession.aluno_id;
  if(!aluno_id){const p=document.createElement('p');safeSet(p,'Sem aluno vinculado a esta conta.');c.appendChild(p);return;}
  const treinos=await API.get('treinos');
  const treino=treinos.find(t=>t.aluno_id===aluno_id);
  if(!treino){const p=document.createElement('p');safeSet(p,'Sem treino atribuído.');c.appendChild(p);return;}
  (treino.exercicios||[]).forEach((ex,idx)=>{
    const box=document.createElement('div');box.className='exercicio'+(idx>0?' locked':'');box.dataset.idx=idx;
    const h=document.createElement('h3');safeSet(h,(idx+1)+'. '+ex.nome);
    const m=document.createElement('p');m.className='meta';safeSet(m,ex.series+' séries × '+ex.reps+' reps  •  carga sugerida: '+ex.carga_sugerida+'kg');
    box.append(h,m);
    const list=document.createElement('div');list.className='series-list';
    for(let s=1;s<=ex.series;s++){
      const row=document.createElement('div');row.className='serie-row';
      const lbl=document.createElement('span');safeSet(lbl,'Série '+s);
      const kg=document.createElement('input');kg.type='number';kg.placeholder='kg';kg.value=ex.carga_sugerida;
      const rp=document.createElement('input');rp.type='number';rp.placeholder='reps';
      const bt=document.createElement('button');bt.className='btn-primary';safeSet(bt,'OK');
      bt.onclick=async()=>{
        if(!rp.value){toast('Informe as repetições','error');return;}
        await API.insert('historico_cargas_treino',{aluno_id,exercicio_nome:ex.nome+' (série '+s+')',carga:Number(kg.value),reps_realizadas:String(rp.value)});
        bt.disabled=true;safeSet(bt,'✓');
        dispararDescanso(60,()=>{
          const allDone=Array.from(list.querySelectorAll('button')).every(b=>b.disabled);
          if(allDone){const next=c.querySelector('.exercicio[data-idx="'+(idx+1)+'"]');if(next)next.classList.remove('locked');}
        });
      };
      row.append(lbl,kg,rp,bt);list.appendChild(row);
    }
    box.appendChild(list);c.appendChild(box);
  });
}
function dispararDescanso(seg,onEnd){
  const ov=document.createElement('div');ov.className='timer-overlay';
  const circle=document.createElement('div');circle.className='timer-circle';safeSet(circle,seg);
  const p=document.createElement('p');safeSet(p,'Descanso entre séries');
  const sk=document.createElement('button');sk.className='btn-secondary';safeSet(sk,'Pular');
  ov.append(circle,p,sk);document.body.appendChild(ov);
  let t=seg;const intv=setInterval(()=>{t--;safeSet(circle,t);if(t<=0){clearInterval(intv);ov.remove();onEnd&&onEnd();}},1000);
  sk.onclick=()=>{clearInterval(intv);ov.remove();onEnd&&onEnd();};
}

/* ---------- AVALIAÇÃO ANTROPOMÉTRICA ---------- */
async function renderAvaliacao(){
  const alunos=await API.get('alunos');
  const sel=$('aval-aluno');sel.textContent='';
  alunos.forEach(a=>{const o=document.createElement('option');o.value=a.id;safeSet(o,a.nome);sel.appendChild(o);});
  $('btn-calcular-aval').onclick=async()=>{
    const dados={aluno_id:sel.value,sexo:$('aval-sexo').value,idade:Number($('aval-idade').value),
      peso:Number($('aval-peso').value),altura:Number($('aval-altura').value),
      peitoral:Number($('aval-peitoral').value),abdominal:Number($('aval-abdominal').value),coxa:Number($('aval-coxa').value)};
    if(!dados.idade||!dados.peso||!dados.peitoral){toast('Preencha todos os campos','error');return;}
    const r=calcularPollock3(dados);
    const ok=await API.insert('avaliacoes',{aluno_id:dados.aluno_id,dados:{...dados,...r},avaliador_id:currentSession.user_id});
    if(ok){renderResultadoAval(r,dados);renderHistAval();toast('Avaliação persistida','success');}
  };
  sel.onchange=renderHistAval;if(alunos.length)renderHistAval();
}
function calcularPollock3(d){
  const sum=d.peitoral+d.abdominal+d.coxa;let densidade;
  if(d.sexo==='M')densidade=1.10938-(0.0008267*sum)+(0.0000016*sum*sum)-(0.0002574*d.idade);
  else densidade=1.0994921-(0.0009929*sum)+(0.0000023*sum*sum)-(0.0001392*d.idade);
  const percentual_gordura=((4.95/densidade)-4.50)*100;
  const massa_gorda=d.peso*(percentual_gordura/100);
  const massa_magra=d.peso-massa_gorda;
  const imc=d.peso/Math.pow(d.altura/100,2);
  return{densidade_corporal:Number(densidade.toFixed(4)),percentual_gordura:Number(percentual_gordura.toFixed(2)),
    massa_gorda:Number(massa_gorda.toFixed(2)),massa_magra:Number(massa_magra.toFixed(2)),imc:Number(imc.toFixed(2))};
}
function renderResultadoAval(r){
  const c=$('aval-resultado');c.textContent='';
  const blocks=[['% Gordura Corporal',r.percentual_gordura+' %'],['Densidade Corporal',r.densidade_corporal+' g/cm³'],
    ['Massa Gorda',r.massa_gorda+' kg'],['Massa Magra',r.massa_magra+' kg'],['IMC',r.imc]];
  blocks.forEach(([k,v])=>{const p=document.createElement('p');const s=document.createElement('strong');safeSet(s,v);
    p.append(s,document.createTextNode(' — '+k));c.appendChild(p);});
}
async function renderHistAval(){
  const sel=$('aval-aluno');const id=sel.value;if(!id)return;
  const avs=(await API.get('avaliacoes')).filter(a=>a.aluno_id===id).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
  const ul=$('aval-historico');ul.textContent='';
  avs.forEach(a=>{const d=a.dados||{};const li=document.createElement('li');
    safeSet(li,new Date(a.created_at).toLocaleDateString()+' • '+d.percentual_gordura+'% gordura • '+d.massa_magra+'kg magra');ul.appendChild(li);});
}

/* ---------- GRADE DE AULAS ---------- */
async function renderGrade(){
  const aulas=await API.get('aulas');const g=$('grade-aulas');g.textContent='';
  aulas.forEach(a=>{
    const c=document.createElement('div');c.className='aula-card';
    const h=document.createElement('h4');safeSet(h,a.nome);
    const p1=document.createElement('p');safeSet(p1,'⏰ '+a.horario+' • Prof. '+a.professor);
    const p2=document.createElement('p');safeSet(p2,'Vagas: '+a.vagas);
    const b=document.createElement('button');b.className='btn-primary';safeSet(b,'Agendar');
    b.onclick=()=>toast('Aula '+a.nome+' agendada','success');
    c.append(h,p1,p2,b);g.appendChild(c);
  });
}

/* ---------- EVOLUÇÃO ---------- */
async function renderEvolucao(){
  const id=currentSession.aluno_id;
  if(!id){const c=$('evolucao-box');c.textContent='';const p=document.createElement('p');safeSet(p,'Sem aluno vinculado.');c.appendChild(p);return;}
  const hist=(await API.get('historico_cargas_treino')).filter(h=>h.aluno_id===id);
  const avs=(await API.get('avaliacoes')).filter(a=>a.aluno_id===id);
  const c=$('evolucao-box');c.textContent='';
  const h1=document.createElement('h3');safeSet(h1,'Séries Registradas: '+hist.length);
  const h2=document.createElement('h3');safeSet(h2,'Avaliações: '+avs.length);
  c.append(h1,h2);
  hist.slice(-10).reverse().forEach(h=>{const p=document.createElement('p');
    safeSet(p,new Date(h.created_at).toLocaleString()+' • '+h.exercicio_nome+' • '+h.carga+'kg × '+h.reps_realizadas+' reps');c.appendChild(p);});
}

/* ---------- INIT / DESTROY ---------- */
window.__startFitProApp=function(session){
  currentSession=session;started=true;
  buildShell();
  const first=(MENU_BY_ROLE[currentSession.role]||[['dashboard','']])[0][0];
  showView(first);
  toast('Bem-vindo, '+session.nome,'success');
};
window.__stopFitProApp=function(){
  started=false;currentSession=null;carrinho=[];
};
console.info('[FitPro GYM2] motor pronto (Lovable Cloud).');
})();
`;
