import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Role = "DONO" | "ADMIN" | "PERSONAL" | "ALUNO";

export type AppSession = {
  user_id: string;
  email: string;
  nome: string;
  role: Role;
  aluno_id: string | null;
  personal_id: string | null;
  academia_id: string;
  academia_nome: string;
};

type Ctx = {
  session: AppSession | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx>({
  session: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export async function buildAppSession(userId: string): Promise<AppSession | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("nome,email,academia_atual_id").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role,academia_id").eq("user_id", userId),
  ]);
  if (!roles || roles.length === 0) return null;
  const order: Role[] = ["DONO", "ADMIN", "PERSONAL", "ALUNO"];
  const role = order.find((r) => roles.some((x) => x.role === r)) ?? "ALUNO";
  const academia_id = profile?.academia_atual_id ?? roles[0].academia_id;
  if (!academia_id) return null;
  const { data: academia } = await supabase
    .from("academias")
    .select("nome")
    .eq("id", academia_id)
    .maybeSingle();
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
    academia_id,
    academia_nome: academia?.nome ?? "FitPro",
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const built = await buildAppSession(data.session.user.id);
      setSession(built);
    } else {
      setSession(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      if (evt === "SIGNED_OUT") {
        setSession(null);
        navigate({ to: "/auth" });
      }
      if (evt === "SIGNED_IN" && s) {
        buildAppSession(s.user.id).then((built) => setSession(built));
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    navigate({ to: "/auth" });
  }

  return (
    <SessionContext.Provider value={{ session, loading, refresh, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
