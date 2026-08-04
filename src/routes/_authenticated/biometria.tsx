import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import {
  capturarTemplateDigital,
  processarSelfieFacial,
  validarAcessoCatraca,
} from "@/lib/fitpro/utils";

export const Route = createFileRoute("/_authenticated/biometria")({
  head: () => ({
    meta: [
      { title: "Biometria & Facial — FitPro GYM2" },
      { name: "description", content: "Cadastre digital e reconhecimento facial dos alunos para liberação na catraca." },
      { property: "og:title", content: "Biometria & Facial — FitPro GYM2" },
      { property: "og:description", content: "Cadastro biométrico digital e facial com simulador de catraca." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BiometriaPage,
});

type Aluno = {
  id: string;
  nome: string;
  status_financeiro: string;
  hash_biometria_digital: string | null;
  vetor_facial: string | null;
};

function BiometriaPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [digitalMsg, setDigitalMsg] = useState<string | null>(null);
  const [facialMsg, setFacialMsg] = useState<string | null>(null);
  const [catracaLog, setCatracaLog] = useState<string>("");

  const load = useCallback(async () => {
    if (!session?.academia_id) return;
    const { data } = await supabase
      .from("alunos")
      .select("id,nome,status_financeiro,hash_biometria_digital,vetor_facial")
      .eq("academia_id", session.academia_id)
      .order("nome");
    setAlunos((data ?? []) as Aluno[]);
    if (data && data[0] && !selId) setSelId(data[0].id);
  }, [selId, session?.academia_id]);

  useEffect(() => { load(); }, [load]);

  const current = alunos.find((a) => a.id === selId);

  async function capturarDigital() {
    if (!selId) return;
    const hash = capturarTemplateDigital();
    const { error } = await supabase.from("alunos").update({ hash_biometria_digital: hash }).eq("id", selId);
    if (error) { toast.error(error.message); return; }
    setDigitalMsg("Template salvo: " + hash.slice(0, 32) + "...");
    toast.success("Digital cadastrada");
    load();
  }

  async function capturarFacial() {
    if (!selId) return;
    const vetor = processarSelfieFacial();
    const { error } = await supabase.from("alunos").update({ vetor_facial: JSON.stringify(vetor) }).eq("id", selId);
    if (error) { toast.error(error.message); return; }
    setFacialMsg("Vetor 128D capturado [" + vetor.slice(0, 3).map((n) => n.toFixed(2)).join(", ") + "...]");
    toast.success("Facial cadastrada");
    load();
  }

  async function simularCatraca() {
    if (!selId) return;
    const { data } = await supabase.from("alunos").select("*").eq("id", selId).maybeSingle();
    const r = validarAcessoCatraca(data as Aluno | null);
    setCatracaLog("[" + new Date().toLocaleTimeString() + "] " + r.codigo + " — " + r.mensagem);
    r.permitido ? toast.success(r.mensagem) : toast.error(r.mensagem);
  }

  return (
    <section className="fp-view fp-glass">
      <h2>Cadastro de Biometria Digital & Facial</h2>
      <div className="fp-bio-grid">
        <div className="fp-glass-inner fp-bio-card">
          <h3>Aluno Selecionado</h3>
          <select className="fp-select" value={selId} onChange={(e) => setSelId(e.target.value)}>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <p>Status financeiro: <span className="fp-role-tag">{current?.status_financeiro ?? "-"}</span></p>
        </div>

        <div className="fp-glass-inner fp-bio-card">
          <h3>Digital (USB-Persona)</h3>
          <div className={"fp-bio-preview " + (digitalMsg ? "ok" : "")}>{digitalMsg ?? "Aguardando leitor..."}</div>
          <button className="fp-btn fp-btn-primary" onClick={capturarDigital}>Capturar Template</button>
        </div>

        <div className="fp-glass-inner fp-bio-card">
          <h3>Reconhecimento Facial</h3>
          <div className={"fp-bio-preview " + (facialMsg ? "ok" : "")}>{facialMsg ?? "Sem captura"}</div>
          <button className="fp-btn fp-btn-primary" onClick={capturarFacial}>Processar Selfie</button>
        </div>

        <div className="fp-glass-inner fp-bio-card">
          <h3>Simulador Catraca iDFace</h3>
          <button className="fp-btn fp-btn-secondary" onClick={simularCatraca}>Tentar Acesso</button>
          <p className="fp-log">{catracaLog}</p>
        </div>
      </div>
    </section>
  );
}
