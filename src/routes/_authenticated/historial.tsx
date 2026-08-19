import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Chispa, BurbujaChispa } from "@/components/chispa";
import {
  PixelCalendario,
  PixelCandado,
  PixelGlobo,
  PixelReloj,
} from "@/components/pixel-icons";
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
  const queryClient = useQueryClient();

  const sesiones = useQuery({
    queryKey: ["historial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("id, duration_minutes, explanation_text, created_at, is_public, topics(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const publicar = useMutation({
    mutationFn: async ({ id, publico }: { id: string; publico: boolean }) => {
      const { error } = await supabase
        .from("study_sessions")
        .update({ is_public: publico })
        .eq("id", id);
      if (error) throw error;
      return publico;
    },
    onSuccess: (publico) => {
      queryClient.invalidateQueries({ queryKey: ["historial"] });
      queryClient.invalidateQueries({ queryKey: ["comunidad"] });
      toast.success(publico ? "¡Ya está en la comunidad! 🎉" : "Volvió a ser privada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No pude cambiar la visibilidad"),
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 pb-16">
      <div className="glass p-5">
        <h1 className="font-pixel text-sm text-primary text-glow-amarillo">TU HISTORIAL</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí cuáles explicaciones querés publicar en la comunidad.
        </p>
      </div>

      {sesiones.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : sesiones.data && sesiones.data.length > 0 ? (
        <ul className="space-y-4">
          {sesiones.data.map((s) => (
            <li key={s.id} className="glass glass-hover space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">
                  {(s.topics as { title: string } | null)?.title ?? "Tema"}
                </h2>
                <span
                  className={
                    "font-pixel inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] " +
                    (s.is_public ? "text-cian" : "text-muted-foreground")
                  }
                >
                  {s.is_public ? <PixelGlobo size={12} /> : <PixelCandado size={12} />}
                  {s.is_public ? "PÚBLICA" : "PRIVADA"}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <PixelCalendario />
                  {new Date(s.created_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PixelReloj />
                  {s.duration_minutes} min
                </span>
              </div>

              {s.explanation_text && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {s.explanation_text}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={s.is_public ? "contorno" : "chispa"}
                  size="sm"
                  className="font-pixel text-[10px]"
                  disabled={publicar.isPending}
                  onClick={() => publicar.mutate({ id: s.id, publico: !s.is_public })}
                >
                  {s.is_public ? <PixelCandado /> : <PixelGlobo />}
                  {s.is_public ? "HACER PRIVADA" : "PUBLICAR"}
                </Button>
                {s.is_public && (
                  <BotonCompartir
                    id={s.id}
                    titulo={(s.topics as { title: string } | null)?.title ?? "Tema"}
                    variante="ghost"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="glass flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin={skin} estado="neutral" size="md" />
          <BurbujaChispa>Todavía no estudiaste nada. ¡Vamos con el primero!</BurbujaChispa>
          <Button asChild variant="chispa" className="font-pixel text-[10px]">
            <Link to="/inicio">VER EL TEMA DE HOY</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
