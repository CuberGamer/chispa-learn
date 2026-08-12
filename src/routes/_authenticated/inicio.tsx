import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Flame, BookOpen } from "lucide-react";

import { Chispa, BurbujaChispa } from "@/components/chispa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTemaDelDia } from "@/lib/chispa";
import { supabase } from "@/integrations/supabase/client";

const DURACIONES = [5, 15, 30] as const;

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Tu tema de hoy — Chispa" },
      { name: "description", content: "El tema del día, tu racha y el cronómetro para arrancar." },
      { property: "og:title", content: "Tu tema de hoy — Chispa" },
      { property: "og:description", content: "Elegí cuánto tiempo investigar y arrancá." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const navigate = useNavigate();
  const [minutos, setMinutos] = useState<number>(15);

  const tema = useQuery({ queryKey: ["tema-del-dia"], queryFn: getTemaDelDia });

  const racha = useQuery({
    queryKey: ["racha"],
    queryFn: async () => {
      const { data } = await supabase
        .from("streaks")
        .select("current_streak, longest_streak")
        .maybeSingle();
      return data;
    },
  });

  const total = useQuery({
    queryKey: ["total-sesiones"],
    queryFn: async () => {
      const { count } = await supabase
        .from("study_sessions")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const streak = racha.data?.current_streak ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 pb-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <Chispa estado={streak > 0 ? "emocionado" : "neutral"} size="lg" />
        <BurbujaChispa>
          {streak > 1
            ? `¡Racha de ${streak} días, no la cortes!`
            : "¿Arrancamos? Tenés un tema nuevo esperándote."}
        </BurbujaChispa>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="panel flex items-center gap-3 p-4">
          <Flame className="text-primary" />
          <div>
            <p className="font-pixel text-lg text-primary">{streak}</p>
            <p className="text-xs text-muted-foreground">días de racha</p>
          </div>
        </div>
        <div className="panel flex items-center gap-3 p-4">
          <BookOpen className="text-cian" />
          <div>
            <p className="font-pixel text-lg text-cian">{total.data ?? 0}</p>
            <p className="text-xs text-muted-foreground">temas estudiados</p>
          </div>
        </div>
      </section>

      <section className="panel space-y-5 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Tema del día
        </p>
        {tema.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : tema.data ? (
          <>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{tema.data.title}</h1>
            {tema.data.description && (
              <p className="text-muted-foreground">{tema.data.description}</p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">Todavía no hay temas cargados.</p>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">¿Cuánto tiempo vas a investigar?</p>
          <div className="flex gap-2">
            {DURACIONES.map((m) => (
              <Button
                key={m}
                variant={minutos === m ? "chispa" : "contorno"}
                onClick={() => setMinutos(m)}
                className="flex-1"
              >
                {m} min
              </Button>
            ))}
          </div>
        </div>

        <Button
          variant="chispa"
          size="xl"
          className="w-full"
          disabled={!tema.data}
          onClick={() =>
            tema.data &&
            navigate({
              to: "/sesion",
              search: { tema: tema.data.id, minutos },
            })
          }
        >
          Empezar
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Investigá donde quieras: internet, libros, videos. Después me lo explicás.
        </p>
      </section>
    </main>
  );
}
