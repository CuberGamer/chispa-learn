import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock } from "lucide-react";

import { Chispa, BurbujaChispa } from "@/components/chispa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/historial")({
  head: () => ({
    meta: [
      { title: "Tu historial — Chispa" },
      { name: "description", content: "Todos los temas que estudiaste y las explicaciones que escribiste." },
      { property: "og:title", content: "Tu historial — Chispa" },
      { property: "og:description", content: "Repasá tus explicaciones anteriores." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Historial,
});

function Historial() {
  const skin = useSkin();
  const sesiones = useQuery({
    queryKey: ["historial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("id, duration_minutes, explanation_text, created_at, ai_score, ai_summary, topics(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 pb-16">
      <h1 className="text-2xl font-extrabold">Tu historial</h1>

      {sesiones.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : sesiones.data && sesiones.data.length > 0 ? (
        <ul className="space-y-3">
          {sesiones.data.map((s) => (
            <li key={s.id} className="panel space-y-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">
                  {(s.topics as { title: string } | null)?.title ?? "Tema"}
                </h2>
                {typeof s.ai_score === "number" && (
                  <span className="font-pixel shrink-0 rounded-full border-2 border-primary px-2 py-1 text-[10px] text-primary">
                    {s.ai_score}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {new Date(s.created_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {s.duration_minutes} min
                </span>
              </div>
              {s.ai_summary && (
                <p className="text-sm italic text-muted-foreground">“{s.ai_summary}”</p>
              )}
              {s.explanation_text && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {s.explanation_text}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin={skin} estado="neutral" size="md" />
          <BurbujaChispa>Todavía no estudiaste nada. ¡Vamos con el primero!</BurbujaChispa>
          <Button asChild variant="chispa">
            <Link to="/inicio">Ver el tema de hoy</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
