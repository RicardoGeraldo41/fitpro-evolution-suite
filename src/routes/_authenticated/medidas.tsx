import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/_authenticated/medidas")({
  head: () => ({
    meta: [
      { title: "Medidas & Fotos — FitPro GYM2" },
      { name: "description", content: "Registro de medidas corporais e fotos de evolução com gráfico de peso." },
      { property: "og:title", content: "Medidas & Fotos — FitPro GYM2" },
      { property: "og:description", content: "Acompanhamento de medidas corporais e fotos de evolução do aluno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MedidasPage,
});

type Aluno = { id: string; nome: string };
type Medida = {
  id: string;
  aluno_id: string;
  data: string;
  peso: number | null;
  percentual_gordura: number | null;
  cintura: number | null;
  quadril: number | null;
  braco: number | null;
  coxa: number | null;
  foto_frente: string | null;
  foto_lado: string | null;
  foto_costas: string | null;
  observacoes: string | null;
};

const CAMPOS_FOTO = ["foto_frente", "foto_lado", "foto_costas"] as const;
type CampoFoto = (typeof CAMPOS_FOTO)[number];

function MedidasPage() {
  const { session } = useSession();
  const isStaff = session?.role !== "ALUNO";
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoId, setAlunoId] = useState<string>("");
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    peso: "",
    percentual_gordura: "",
    cintura: "",
    quadril: "",
    braco: "",
    coxa: "",
    observacoes: "",
  });
  const [urls, setUrls] = useState<Record<string, Record<CampoFoto, string | null>>>({});

  const loadAlunos = useCallback(async () => {
    if (!session?.academia_id) return;
    if (isStaff) {
      const { data } = await supabase.from("alunos").select("id,nome").eq("academia_id", session.academia_id).order("nome");
      const list = (data ?? []) as Aluno[];
      setAlunos(list);
      if (!alunoId && list[0]) setAlunoId(list[0].id);
    } else if (session.aluno_id) {
      setAlunoId(session.aluno_id);
    }
  }, [session, isStaff, alunoId]);

  const loadMedidas = useCallback(async () => {
    if (!alunoId) return;
    const { data } = await supabase
      .from("medidas_corporais")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("data", { ascending: false });
    const list = (data ?? []) as Medida[];
    setMedidas(list);
    const cache: Record<string, Record<CampoFoto, string | null>> = {};
    await Promise.all(
      list.map(async (m) => {
        cache[m.id] = { foto_frente: null, foto_lado: null, foto_costas: null };
        await Promise.all(
          CAMPOS_FOTO.map(async (c) => {
            const path = m[c];
            if (!path) return;
            const { data: signed } = await supabase.storage
              .from("evolucao-fotos")
              .createSignedUrl(path, 3600);
            cache[m.id][c] = signed?.signedUrl ?? null;
          })
        );
      })
    );
    setUrls(cache);
  }, [alunoId]);

  useEffect(() => { loadAlunos(); }, [loadAlunos]);
  useEffect(() => { loadMedidas(); }, [loadMedidas]);

  async function uploadFoto(file: File, campo: CampoFoto): Promise<string | null> {
    if (!session || !alunoId) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${session.academia_id}/${alunoId}/${Date.now()}-${campo}.${ext}`;
    const { error } = await supabase.storage.from("evolucao-fotos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) { toast.error(error.message); return null; }
    return path;
  }

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || !alunoId) return;
    const fd = new FormData(e.currentTarget);
    const paths: Partial<Record<CampoFoto, string>> = {};
    for (const c of CAMPOS_FOTO) {
      const f = fd.get(c) as File | null;
      if (f && f.size > 0) {
        const p = await uploadFoto(f, c);
        if (p) paths[c] = p;
      }
    }
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const { error } = await supabase.from("medidas_corporais").insert({
      academia_id: session.academia_id,
      aluno_id: alunoId,
      data: form.data,
      peso: num(form.peso),
      percentual_gordura: num(form.percentual_gordura),
      cintura: num(form.cintura),
      quadril: num(form.quadril),
      braco: num(form.braco),
      coxa: num(form.coxa),
      observacoes: form.observacoes || null,
      foto_frente: paths.foto_frente ?? null,
      foto_lado: paths.foto_lado ?? null,
      foto_costas: paths.foto_costas ?? null,
      created_by: session.user_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Medida registrada");
    setForm({ ...form, peso: "", percentual_gordura: "", cintura: "", quadril: "", braco: "", coxa: "", observacoes: "" });
    (e.currentTarget as HTMLFormElement).reset();
    loadMedidas();
  }

  const grafico = useMemo(() => {
    const asc = [...medidas].reverse();
    const max = Math.max(1, ...asc.map((m) => Number(m.peso || 0)));
    return { asc, max };
  }, [medidas]);

  return (
    <section className="fp-view fp-glass">
      <header className="fp-view-header">
        <h2>Medidas Corporais & Fotos de Evolução</h2>
        {isStaff && alunos.length > 0 && (
          <select className="fp-select" style={{ maxWidth: 260 }} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
      </header>

      {isStaff && alunoId && (
        <form onSubmit={salvar} className="fp-glass-inner" style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <label className="fp-label">Data</label>
            <input className="fp-input" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          </div>
          <div>
            <label className="fp-label">Peso (kg)</label>
            <input className="fp-input" type="number" step="0.1" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} />
          </div>
          <div>
            <label className="fp-label">% Gordura</label>
            <input className="fp-input" type="number" step="0.1" value={form.percentual_gordura} onChange={(e) => setForm({ ...form, percentual_gordura: e.target.value })} />
          </div>
          <div>
            <label className="fp-label">Cintura (cm)</label>
            <input className="fp-input" type="number" step="0.1" value={form.cintura} onChange={(e) => setForm({ ...form, cintura: e.target.value })} />
          </div>
          <div>
            <label className="fp-label">Quadril (cm)</label>
            <input className="fp-input" type="number" step="0.1" value={form.quadril} onChange={(e) => setForm({ ...form, quadril: e.target.value })} />
          </div>
          <div>
            <label className="fp-label">Braço (cm)</label>
            <input className="fp-input" type="number" step="0.1" value={form.braco} onChange={(e) => setForm({ ...form, braco: e.target.value })} />
          </div>
          <div>
            <label className="fp-label">Coxa (cm)</label>
            <input className="fp-input" type="number" step="0.1" value={form.coxa} onChange={(e) => setForm({ ...form, coxa: e.target.value })} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="fp-label">Observações</label>
            <textarea className="fp-textarea" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          <div>
            <label className="fp-label">Foto Frente</label>
            <input type="file" name="foto_frente" accept="image/*" className="fp-input" />
          </div>
          <div>
            <label className="fp-label">Foto Lado</label>
            <input type="file" name="foto_lado" accept="image/*" className="fp-input" />
          </div>
          <div>
            <label className="fp-label">Foto Costas</label>
            <input type="file" name="foto_costas" accept="image/*" className="fp-input" />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button className="fp-btn fp-btn-primary" type="submit">Registrar medida</button>
          </div>
        </form>
      )}

      {medidas.length > 0 && (
        <div className="fp-chart-box">
          <h3>Evolução de peso</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
            {grafico.asc.map((m) => (
              <div key={m.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div title={`${m.peso ?? "-"} kg`}
                  style={{
                    width: "100%",
                    height: ((Number(m.peso || 0) / grafico.max) * 120) + "px",
                    minHeight: 2,
                    background: "linear-gradient(180deg, var(--fp-neon3), var(--fp-neon2))",
                    borderRadius: 6,
                  }} />
                <span style={{ fontSize: 10, color: "var(--fp-muted)" }}>{m.data.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fp-bio-grid" style={{ marginTop: 18 }}>
        {medidas.map((m) => (
          <div key={m.id} className="fp-glass-inner fp-bio-card">
            <strong>{new Date(m.data).toLocaleDateString("pt-BR")}</strong>
            <div style={{ fontSize: 12, color: "var(--fp-muted)" }}>
              Peso: <strong style={{ color: "var(--fp-neon)" }}>{m.peso ?? "-"} kg</strong> ·
              % Gord: <strong style={{ color: "var(--fp-neon)" }}>{m.percentual_gordura ?? "-"}%</strong>
            </div>
            <div style={{ fontSize: 11, color: "var(--fp-muted)" }}>
              Cintura {m.cintura ?? "-"} · Quadril {m.quadril ?? "-"} · Braço {m.braco ?? "-"} · Coxa {m.coxa ?? "-"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {CAMPOS_FOTO.map((c) => {
                const u = urls[m.id]?.[c];
                return (
                  <div key={c} className={"fp-bio-preview" + (u ? " ok" : "")} style={{ height: 90, padding: 0, overflow: "hidden" }}>
                    {u ? <img src={u} alt={c} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : c.replace("foto_", "")}
                  </div>
                );
              })}
            </div>
            {m.observacoes && <p style={{ fontSize: 12, color: "var(--fp-muted)" }}>{m.observacoes}</p>}
          </div>
        ))}
        {medidas.length === 0 && <p style={{ color: "var(--fp-muted)" }}>Sem medidas registradas ainda.</p>}
      </div>
    </section>
  );
}
