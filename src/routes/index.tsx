import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

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

function FitProApp() {
  useEffect(() => {
    // Equivalente ao DOMContentLoaded para SPA — dispara a rotina mãe.
    if (typeof window !== "undefined") {
      // @ts-expect-error injetado em runtime
      window.initSystem?.();
    }
  }, []);

  return (
    <>
      <style>{CSS}</style>

      {/* ===================== LOGIN ===================== */}
      <section id="screen-login" className="screen">
        <div className="glass auth-card">
          <h1 className="brand">FitPro <span>GYM2</span></h1>
          <p className="subtitle">Ecossistema Premium de Gestão Fitness</p>
          <label>Usuário</label>
          <input id="login-user" autoComplete="off" placeholder="dono | admin | personal | aluno" />
          <label>Senha</label>
          <input id="login-pass" type="password" placeholder="senha: 123" />
          <button id="btn-login" className="btn-primary">Acessar Plataforma</button>
          <p id="login-error" className="error hidden"></p>
          <p className="hint">Perfis demo: dono / admin / personal / aluno (senha: 123)</p>
        </div>
      </section>

      {/* ===================== APP SHELL ===================== */}
      <section id="screen-app" className="screen hidden">
        <aside className="sidebar glass">
          <h2 className="brand-mini">FitPro <span>GYM2</span></h2>
          <nav id="nav-menu"></nav>
          <div className="user-box">
            <div id="user-avatar" className="avatar"></div>
            <div>
              <p id="user-name"></p>
              <p id="user-role" className="role-tag"></p>
            </div>
            <button id="btn-logout" className="btn-ghost">Sair</button>
          </div>
        </aside>

        <main className="content">
          {/* DASHBOARD */}
          <section id="view-dashboard" className="view glass hidden">
            <h2>Painel Estratégico</h2>
            <div id="dashboard-cards" className="cards-grid"></div>
            <div id="dashboard-financeiro" className="finance-box glass-inner hidden">
              <h3>Faturamento Consolidado</h3>
              <div id="finance-metrics" className="metrics"></div>
            </div>
          </section>

          {/* ALUNOS / MATRÍCULAS */}
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

          {/* BIOMETRIA */}
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

          {/* PDV */}
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

          {/* RECORRÊNCIA */}
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

          {/* TREINO IMERSIVO */}
          <section id="view-treino" className="view glass hidden">
            <h2>Modo Em Treino</h2>
            <div id="treino-container" className="treino-wrap"></div>
          </section>

          {/* AVALIAÇÃO ANTROPOMÉTRICA */}
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

          {/* GRADE DE AULAS */}
          <section id="view-grade" className="view glass hidden">
            <h2>Grade de Aulas Coletivas</h2>
            <div id="grade-aulas" className="grade-grid"></div>
          </section>

          {/* EVOLUÇÃO */}
          <section id="view-evolucao" className="view glass hidden">
            <h2>Minha Evolução</h2>
            <div id="evolucao-box" className="glass-inner"></div>
          </section>
        </main>
      </section>

      <div id="toast-container"></div>

      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: APP_JS }} />
    </>
  );
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
.auth-card{width:100%;max-width:420px;padding:36px;display:flex;flex-direction:column;gap:10px}
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
.btn-primary{background:linear-gradient(90deg,var(--neon2),var(--neon));color:#fff;
  box-shadow:0 6px 24px -8px rgba(255,43,214,.6);margin-top:14px}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 10px 30px -8px rgba(255,43,214,.8)}
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
 * APP_JS — toda a lógica vanilla orquestrada por initSystem()
 * ========================================================================= */
const APP_JS = `
(function(){
'use strict';

/* ---------- API ASSÍNCRONA (mock acoplável a backend REST/SQL) ---------- */
const STORAGE_KEY = 'fitpro_gym2_db_v1';
const DB_SEED = {
  alunos:[
    {id:1,nome:'Lucas Silva',plano:'Black',valor_plano:189.90,status_financeiro:'ADIMPLENTE',hash_biometria_digital:null,vetor_facial:null,personal_id:3},
    {id:2,nome:'Marina Costa',plano:'Standard',valor_plano:129.90,status_financeiro:'INADIMPLENTE',hash_biometria_digital:null,vetor_facial:null,personal_id:3},
    {id:3,nome:'Rafael Lima',plano:'Black',valor_plano:189.90,status_financeiro:'ADIMPLENTE',hash_biometria_digital:null,vetor_facial:null,personal_id:3}
  ],
  produtos:[
    {id:1,nome:'Whey Protein 900g',preco:159.90,estoque_atual:24},
    {id:2,nome:'Creatina 300g',preco:89.90,estoque_atual:40},
    {id:3,nome:'Garrafa Shaker',preco:29.90,estoque_atual:80},
    {id:4,nome:'Toalha Premium',preco:39.90,estoque_atual:15},
    {id:5,nome:'Barra Proteica',preco:9.90,estoque_atual:120}
  ],
  vendas:[],
  recorrencias:[],
  treinos:[
    {aluno_id:1,exercicios:[
      {nome:'Supino Reto',series:3,reps:'10-12',carga_sugerida:60},
      {nome:'Remada Curvada',series:3,reps:'10-12',carga_sugerida:50},
      {nome:'Agachamento Livre',series:4,reps:'8-10',carga_sugerida:80}
    ]}
  ],
  historico_cargas_treino:[],
  avaliacoes:[],
  aulas:[
    {id:1,nome:'Spinning',horario:'06:00',professor:'Carla',vagas:15},
    {id:2,nome:'Funcional HIIT',horario:'07:30',professor:'Bruno',vagas:12},
    {id:3,nome:'Pilates',horario:'09:00',professor:'Renata',vagas:10},
    {id:4,nome:'Boxe',horario:'18:30',professor:'Marcos',vagas:20},
    {id:5,nome:'Yoga',horario:'20:00',professor:'Ana',vagas:18}
  ]
};
function loadDB(){
  try{const d=localStorage.getItem(STORAGE_KEY);if(d)return JSON.parse(d);}catch(e){}
  localStorage.setItem(STORAGE_KEY,JSON.stringify(DB_SEED));return JSON.parse(JSON.stringify(DB_SEED));
}
function saveDB(db){localStorage.setItem(STORAGE_KEY,JSON.stringify(db));}
const API = {
  async get(entity){await delay();return loadDB()[entity]||[];},
  async update(entity,id,patch){await delay();const db=loadDB();const i=db[entity].findIndex(x=>x.id===id);if(i>=0){db[entity][i]={...db[entity][i],...patch};saveDB(db);return db[entity][i];}return null;},
  async insert(entity,row){await delay();const db=loadDB();row.id=Date.now();db[entity].push(row);saveDB(db);return row;},
  async find(entity,id){await delay();return (loadDB()[entity]||[]).find(x=>x.id===id);}
};
function delay(){return new Promise(r=>setTimeout(r,80+Math.random()*120));}

/* ---------- AUTH / RBAC ---------- */
const USERS = {
  dono:{nome:'Roberto Diretor',role:'DONO',pass:'123'},
  admin:{nome:'Patrícia Recepção',role:'ADMIN',pass:'123'},
  personal:{nome:'Diego Personal',role:'PERSONAL',pass:'123',id:3},
  aluno:{nome:'Lucas Silva',role:'ALUNO',pass:'123',aluno_id:1}
};
const MENU_BY_ROLE = {
  DONO:[['dashboard','Painel Estratégico'],['recorrencia','Recorrência']],
  ADMIN:[['dashboard','Painel'],['alunos','Matrículas'],['biometria','Biometria'],['pdv','PDV Balcão'],['recorrencia','Recorrência']],
  PERSONAL:[['alunos','Meus Alunos'],['avaliacao','Avaliação Física']],
  ALUNO:[['treino','Modo Em Treino'],['grade','Grade de Aulas'],['evolucao','Minha Evolução']]
};
let session=null;

/* ---------- SANITIZAÇÃO (OWASP) ---------- */
function safeSet(el,val){if(el)el.textContent=(val==null?'':String(val));}
function $(id){return document.getElementById(id);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));$(id).classList.remove('hidden');}
function showView(name){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));const v=$('view-'+name);if(v)v.classList.remove('hidden');document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));renderView(name);}
function toast(msg,kind){const c=$('toast-container');const t=document.createElement('div');t.className='toast '+(kind||'');safeSet(t,msg);c.appendChild(t);setTimeout(()=>t.remove(),3800);}
function fmtBRL(n){return Number(n||0).toFixed(2).replace('.',',');}

/* ---------- LOGIN ---------- */
function bindLogin(){
  $('btn-login').addEventListener('click',()=>{
    const u=$('login-user').value.trim().toLowerCase();
    const p=$('login-pass').value;
    const err=$('login-error');err.classList.add('hidden');
    const user=USERS[u];
    if(!user||user.pass!==p){err.classList.remove('hidden');safeSet(err,'Credenciais inválidas.');return;}
    session={key:u,...user};
    buildShell();showScreen('screen-app');
    const first=MENU_BY_ROLE[session.role][0][0];showView(first);
    toast('Bem-vindo, '+session.nome,'success');
  });
}
function buildShell(){
  safeSet($('user-name'),session.nome);
  safeSet($('user-role'),session.role);
  safeSet($('user-avatar'),session.nome.charAt(0));
  const nav=$('nav-menu');nav.textContent='';
  MENU_BY_ROLE[session.role].forEach(([k,label])=>{
    const b=document.createElement('div');b.className='nav-item';b.dataset.view=k;safeSet(b,label);
    b.addEventListener('click',()=>showView(k));nav.appendChild(b);
  });
  $('btn-logout').onclick=()=>{session=null;showScreen('screen-login');$('login-user').value='';$('login-pass').value='';};
}

/* ---------- RENDER ROUTER ---------- */
function renderView(name){
  ({dashboard:renderDashboard,alunos:renderAlunos,biometria:renderBiometria,pdv:renderPDV,
    recorrencia:renderRecorrencia,treino:renderTreino,avaliacao:renderAvaliacao,
    grade:renderGrade,evolucao:renderEvolucao})[name]?.();
}

/* ---------- DASHBOARD ---------- */
async function renderDashboard(){
  const [alunos,vendas,rec]=await Promise.all([API.get('alunos'),API.get('vendas'),API.get('recorrencias')]);
  const grid=$('dashboard-cards');grid.textContent='';
  const totalVendas=vendas.reduce((s,v)=>s+v.total,0);
  const totalRec=rec.filter(r=>r.status==='PAGO').reduce((s,r)=>s+r.valor,0);
  const kpis=[['Alunos Ativos',alunos.filter(a=>a.status_financeiro==='ADIMPLENTE').length],
    ['Inadimplentes',alunos.filter(a=>a.status_financeiro==='INADIMPLENTE').length],
    ['Caixa (PDV)','R$ '+fmtBRL(totalVendas)],['Recorrência','R$ '+fmtBRL(totalRec)]];
  kpis.forEach(([t,v])=>{const c=document.createElement('div');c.className='card-kpi';
    const h=document.createElement('h4');safeSet(h,t);const p=document.createElement('p');safeSet(p,v);
    c.append(h,p);grid.appendChild(c);});
  if(session.role==='DONO'){
    $('dashboard-financeiro').classList.remove('hidden');
    const m=$('finance-metrics');m.textContent='';
    [['Faturamento Total','R$ '+fmtBRL(totalVendas+totalRec)],
     ['Ticket Médio PDV','R$ '+fmtBRL(vendas.length?totalVendas/vendas.length:0)],
     ['Cobranças Recorrentes',rec.length]].forEach(([k,v])=>{
      const d=document.createElement('div');const s=document.createElement('span');safeSet(s,k);
      const st=document.createElement('strong');safeSet(st,v);d.append(s,st);m.appendChild(d);});
  }else $('dashboard-financeiro').classList.add('hidden');
}

/* ---------- ALUNOS ---------- */
async function renderAlunos(){
  let alunos=await API.get('alunos');
  if(session.role==='PERSONAL')alunos=alunos.filter(a=>a.personal_id===session.id);
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
    if(session.role==='ADMIN'){
      const b=document.createElement('button');b.className='btn-ghost';safeSet(b,'Alternar Status');
      b.onclick=async()=>{await API.update('alunos',a.id,{status_financeiro:a.status_financeiro==='ADIMPLENTE'?'INADIMPLENTE':'ADIMPLENTE'});renderAlunos();toast('Status atualizado','success');};
      ac.appendChild(b);
    }
    tr.appendChild(ac);tb.appendChild(tr);
  });
  $('btn-novo-aluno').onclick=async()=>{
    const nome=prompt('Nome do aluno:');if(!nome)return;
    await API.insert('alunos',{nome,plano:'Standard',valor_plano:129.90,status_financeiro:'ADIMPLENTE',hash_biometria_digital:null,vetor_facial:null,personal_id:3});
    renderAlunos();toast('Matrícula criada','success');
  };
}

/* ---------- BIOMETRIA ---------- */
async function renderBiometria(){
  const alunos=await API.get('alunos');
  const sel=$('bio-aluno-select');sel.textContent='';
  alunos.forEach(a=>{const o=document.createElement('option');o.value=a.id;safeSet(o,a.nome);sel.appendChild(o);});
  const refreshStatus=async()=>{const a=await API.find('alunos',Number(sel.value));safeSet($('bio-status'),a?.status_financeiro||'-');};
  sel.onchange=refreshStatus;await refreshStatus();
  $('btn-capturar-digital').onclick=async()=>{
    const id=Number(sel.value);const hash=capturarTemplateDigital();
    await API.update('alunos',id,{hash_biometria_digital:hash});
    const p=$('bio-digital-preview');p.className='bio-preview ok';safeSet(p,'Template salvo: '+hash.slice(0,32)+'...');
    toast('Digital cadastrada','success');
  };
  $('btn-capturar-facial').onclick=async()=>{
    const id=Number(sel.value);const vetor=processarSelfieFacial();
    await API.update('alunos',id,{vetor_facial:vetor});
    const p=$('bio-facial-preview');p.className='bio-preview ok';safeSet(p,'Vetor 128D capturado ['+vetor.slice(0,3).map(n=>n.toFixed(2)).join(', ')+'...]');
    toast('Facial cadastrada','success');
  };
  $('btn-simular-catraca').onclick=async()=>{
    const a=await API.find('alunos',Number(sel.value));
    const r=validarAcessoCatraca(a);const log=$('catraca-log');
    safeSet(log,'['+new Date().toLocaleTimeString()+'] '+r.codigo+' — '+r.mensagem);
    toast(r.mensagem,r.permitido?'success':'error');
  };
}
// Função simulando captura via leitor USB-Persona — gera minúcias criptografadas
function capturarTemplateDigital(){
  const bytes=new Uint8Array(64);for(let i=0;i<64;i++)bytes[i]=Math.floor(Math.random()*256);
  return 'BIO-DIG::'+Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}
// Converte selfie (webcam/upload) em vetor numérico de 128 dimensões (Hikvision/iDFace)
function processarSelfieFacial(){const v=[];for(let i=0;i<128;i++)v.push((Math.random()*2-1));return v;}
// Regra de portaria — bloqueia destravamento do solenoide se INADIMPLENTE
function validarAcessoCatraca(aluno){
  if(!aluno)return{permitido:false,codigo:'ERR_404',mensagem:'Aluno não localizado'};
  if(aluno.status_financeiro==='INADIMPLENTE')return{permitido:false,codigo:'BLOQ_FIN_402',mensagem:'Acesso negado: aluno inadimplente — solenoide travado'};
  if(!aluno.hash_biometria_digital&&!aluno.vetor_facial)return{permitido:false,codigo:'ERR_BIO_MISS',mensagem:'Sem biometria cadastrada'};
  return{permitido:true,codigo:'OK_200',mensagem:'Acesso liberado — destravando catraca'};
}

/* ---------- PDV ---------- */
let carrinho=[];
async function renderPDV(){
  carrinho=[];const prods=await API.get('produtos');
  const cat=$('pdv-catalogo');cat.textContent='';
  prods.forEach(p=>{
    const c=document.createElement('div');c.className='prod-card';
    const h=document.createElement('h5');safeSet(h,p.nome);
    const e=document.createElement('p');safeSet(e,'Estoque: '+p.estoque_atual);
    const v=document.createElement('strong');safeSet(v,'R$ '+fmtBRL(p.preco));
    c.append(h,e,v);c.onclick=()=>{if(p.estoque_atual<=0){toast('Sem estoque','error');return;}addCarrinho(p);};
    cat.appendChild(c);
  });
  updateCarrinho();
  $('btn-fechar-venda').onclick=fecharVenda;
}
function addCarrinho(p){const ex=carrinho.find(x=>x.id===p.id);if(ex)ex.qtd++;else carrinho.push({...p,qtd:1});updateCarrinho();}
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
    const atual=(await API.find('produtos',item.id)).estoque_atual;
    await API.update('produtos',item.id,{estoque_atual:atual-item.qtd});
  }
  await API.insert('vendas',{itens:carrinho,total,meio_pagamento:pag,data:new Date().toISOString()});
  safeSet($('pdv-log'),'Venda fechada • R$ '+fmtBRL(total)+' • '+pag);
  toast('Venda registrada com sucesso','success');renderPDV();
}

/* ---------- RECORRÊNCIA ---------- */
async function renderRecorrencia(){
  const alunos=await API.get('alunos');const rec=await API.get('recorrencias');
  const tb=$('recorrencia-tbody');tb.textContent='';
  alunos.forEach(a=>{
    const last=rec.filter(r=>r.aluno_id===a.id).sort((x,y)=>y.data.localeCompare(x.data))[0];
    const tr=document.createElement('tr');const td=v=>{const c=document.createElement('td');safeSet(c,v);return c;};
    tr.append(td(a.nome),td(a.plano),td('R$ '+fmtBRL(a.valor_plano)));
    const st=document.createElement('td');const bd=document.createElement('span');
    const sts=last?last.status:'PENDENTE';bd.className='badge '+(sts==='PAGO'?'ok':sts==='FALHA'?'bad':'warn');safeSet(bd,sts);
    st.appendChild(bd);tr.appendChild(st);
    tr.appendChild(td(last?new Date(last.data).toLocaleDateString():'—'));
    tb.appendChild(tr);
  });
  $('btn-rodar-recorrencia').onclick=async()=>{
    const al=await API.get('alunos');
    for(const a of al)await faturarRecorrente(a);
    toast('Faturamento mensal processado','success');renderRecorrencia();
  };
}
// Simula faturamento mensal sem bloqueio de limite global (capture-only)
async function faturarRecorrente(aluno){
  const ok=Math.random()>0.1;
  await API.insert('recorrencias',{aluno_id:aluno.id,valor:aluno.valor_plano,status:ok?'PAGO':'FALHA',data:new Date().toISOString(),gateway:'STRIPE-SIM',captura:'NAO-BLOQUEIA-LIMITE'});
  if(!ok)await API.update('alunos',aluno.id,{status_financeiro:'INADIMPLENTE'});
}

/* ---------- TREINO IMERSIVO ---------- */
async function renderTreino(){
  const c=$('treino-container');c.textContent='';
  const aluno_id=session.aluno_id||1;
  const treinos=await API.get('treinos');
  const treino=treinos.find(t=>t.aluno_id===aluno_id);
  if(!treino){const p=document.createElement('p');safeSet(p,'Sem treino atribuído.');c.appendChild(p);return;}
  treino.exercicios.forEach((ex,idx)=>{
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
        await API.insert('historico_cargas_treino',{aluno_id,exercicio:ex.nome,serie:s,carga:Number(kg.value),reps:Number(rp.value),data:new Date().toISOString()});
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

/* ---------- AVALIAÇÃO ANTROPOMÉTRICA (POLLOCK 3 DOBRAS) ---------- */
async function renderAvaliacao(){
  let alunos=await API.get('alunos');
  if(session.role==='PERSONAL')alunos=alunos.filter(a=>a.personal_id===session.id);
  const sel=$('aval-aluno');sel.textContent='';
  alunos.forEach(a=>{const o=document.createElement('option');o.value=a.id;safeSet(o,a.nome);sel.appendChild(o);});
  $('btn-calcular-aval').onclick=async()=>{
    const dados={aluno_id:Number(sel.value),sexo:$('aval-sexo').value,idade:Number($('aval-idade').value),
      peso:Number($('aval-peso').value),altura:Number($('aval-altura').value),
      peitoral:Number($('aval-peitoral').value),abdominal:Number($('aval-abdominal').value),coxa:Number($('aval-coxa').value)};
    if(!dados.idade||!dados.peso||!dados.peitoral){toast('Preencha todos os campos','error');return;}
    const r=calcularPollock3(dados);
    await API.insert('avaliacoes',{...dados,...r,data:new Date().toISOString()});
    renderResultadoAval(r,dados);renderHistAval();toast('Avaliação persistida','success');
  };
  sel.onchange=renderHistAval;renderHistAval();
}
// Protocolo Pollock 3 dobras — fórmula científica
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
function renderResultadoAval(r,d){
  const c=$('aval-resultado');c.textContent='';
  const blocks=[['% Gordura Corporal',r.percentual_gordura+' %'],['Densidade Corporal',r.densidade_corporal+' g/cm³'],
    ['Massa Gorda',r.massa_gorda+' kg'],['Massa Magra',r.massa_magra+' kg'],['IMC',r.imc]];
  blocks.forEach(([k,v])=>{const p=document.createElement('p');const s=document.createElement('strong');safeSet(s,v);
    const t=document.createTextNode(' — ');p.append(s,t,document.createTextNode(k));c.appendChild(p);});
}
async function renderHistAval(){
  const sel=$('aval-aluno');const id=Number(sel.value);
  const avs=(await API.get('avaliacoes')).filter(a=>a.aluno_id===id).sort((a,b)=>b.data.localeCompare(a.data));
  const ul=$('aval-historico');ul.textContent='';
  avs.forEach(a=>{const li=document.createElement('li');safeSet(li,new Date(a.data).toLocaleDateString()+' • '+a.percentual_gordura+'% gordura • '+a.massa_magra+'kg magra');ul.appendChild(li);});
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
  const id=session.aluno_id||1;
  const hist=(await API.get('historico_cargas_treino')).filter(h=>h.aluno_id===id);
  const avs=(await API.get('avaliacoes')).filter(a=>a.aluno_id===id);
  const c=$('evolucao-box');c.textContent='';
  const h1=document.createElement('h3');safeSet(h1,'Séries Registradas: '+hist.length);
  const h2=document.createElement('h3');safeSet(h2,'Avaliações: '+avs.length);
  c.append(h1,h2);
  hist.slice(-10).reverse().forEach(h=>{const p=document.createElement('p');safeSet(p,new Date(h.data).toLocaleString()+' • '+h.exercicio+' • Série '+h.serie+' • '+h.carga+'kg × '+h.reps+' reps');c.appendChild(p);});
}

/* ---------- INIT MÃE ---------- */
function initSystem(){
  loadDB();
  bindLogin();
  showScreen('screen-login');
  console.info('[FitPro GYM2] initSystem() OK');
}
window.initSystem=initSystem;
// Auto-bootstrap em ambiente SPA (DOMContentLoaded ou imediato)
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSystem);
else initSystem();
})();
`;
