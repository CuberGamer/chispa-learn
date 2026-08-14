import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Chispa, BurbujaChispa, type ChispaSkin } from "@/components/chispa";
import { PixelAplauso, PixelCalendario, PixelReloj } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/comunidad")({
  head: () => ({
    meta: [
      { title: "Comunidad — Chispa" },
      {
        name: "description",
        content: "Leé las explicaciones que otras personas compartieron y regalales un aplauso.",
      },
      { property: "og:title", content: "Comunidad — Chispa" },
      { property: "og:description", content: "Explicaciones públicas de la comunidad de Chispa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Comunidad,
});

function Comunidad() {
  const miSkin = useSkin();
  const queryClient = useQueryClient();

  const feed = useQuery({
    queryKey: ["comunidad"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { data: sesiones, error } = await supabase
        .from("study_sessions")
        .select("id, user_id, duration_minutes, explanation_text, created_at, topics(title)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const filas = sesiones ?? [];
      const autores = [...new Set(filas.map((s) => s.user_id))];

      const [{ data: perfiles }, { data: claps }] = await Promise.all([
        autores.length
          ? supabase.from("profiles").select("id, username, avatar_chispa_skin").in("id", autores)
          : Promise.resolve({ data: [] as { id: string; username: string; avatar_chispa_skin: string }[] }),
        supabase.from("session_claps").select("session_id, user_id"),
      ]);

      const perfilPor = new Map((perfiles ?? []).map((p) => [p.id, p]));
      const conteo = new Map<string, number>();
      const mios = new Set<string>();
      (claps ?? []).forEach((c) => {
        conteo.set(c.session_id, (conteo.get(c.session_id) ?? 0) + 1);
        if (c.user_id === userId) mios.add(c.session_id);
      });

      return filas.map((s) => ({
        ...s,
        titulo: (s.topics as { title: string } | null)?.title ?? "Tema",
        autor: perfilPor.get(s.user_id)?.username ?? "Alguien",
        skin: (perfilPor.get(s.user_id)?.avatar_chispa_skin as ChispaSkin) ?? "clasico",
        aplausos: conteo.get(s.id) ?? 0,
        aplaudida: mios.has(s.id),
        propia: s.user_id === userId,
      }));
    },
  });

  const aplaudir = useMutation({
    mutationFn: async ({ id, aplaudida }: { id: string; aplaudida: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");

      if (aplaudida) {
        const { error } = await supabase
          .from("session_claps")
          .delete()
          .eq("session_id", id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("session_claps")
          .insert({ session_id: id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comunidad"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "No pude registrar el aplauso"),
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 pb-16">
      <div className="glass flex items-center gap-4 p-5">
        <Chispa skin={miSkin} estado="emocionado" size="sm" flotando={false} />
        <div>
          <h1 className="font-pixel text-sm text-primary text-glow-amarillo">COMUNIDAD</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explicaciones que otras personas eligieron compartir.
          </p>
        </div>
      </div>

      {feed.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : feed.data && feed.data.length > 0 ? (
        <ul className="space-y-4">
          {feed.data.map((s) => (
            <li key={s.id} className="glass glass-hover space-y-3 p-5">
              <div className="flex items-start gap-3">
                <Chispa skin={s.skin} estado="neutral" size="sm" flotando={false} />
                <div className="min-w-0 flex-1">
                  <p className="font-pixel truncate text-[10px] text-foreground">
                    {s.autor}
                    {s.propia && <span className="text-muted-foreground"> (VOS)</span>}
                  </p>
                  <p className="truncate text-sm text-primary">{s.titulo}</p>
                </div>
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

              <Button
                variant={s.aplaudida ? "chispa" : "contorno"}
                size="sm"
                className="font-pixel text-[10px]"
                disabled={aplaudir.isPending}
                onClick={() => aplaudir.mutate({ id: s.id, aplaudida: s.aplaudida })}
              >
                <PixelAplauso className={cn(s.aplaudida && "text-background")} />
                {s.aplausos}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="glass flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin={miSkin} estado="sorprendido" size="md" />
          <BurbujaChispa>
            Todavía nadie compartió nada. ¡Podés ser la primera chispa del feed!
          </BurbujaChispa>
          <Button asChild variant="chispa" className="font-pixel text-[10px]">
            <Link to="/inicio">ESTUDIAR Y COMPARTIR</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
