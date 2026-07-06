import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/fitpro/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitPro GYM2 — Ecossistema de Academias" },
      {
        name: "description",
        content:
          "FitPro GYM2: gestão completa de academias com biometria, PDV, recorrência, treino imersivo, avaliação antropométrica e IA.",
      },
      { property: "og:title", content: "FitPro GYM2" },
      {
        property: "og:description",
        content:
          "Ecossistema premium para academias: biometria, recorrência, treino imersivo, RBAC, IA e dashboards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? "/dashboard" : "/auth", replace: true });
  }, [session, loading, navigate]);
  return null;
}
