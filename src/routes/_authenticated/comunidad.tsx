import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Hand } from "lucide-react";
import { toast } from "sonner";

import { Chispa, BurbujaChispa, type ChispaSkin } from "@/components/chispa";
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

type Fila = {
  id: string;
  user_id: string;
  duration_minutes: number;
  explanation_text: string | null;
  created_at: string;
  topics: { title: string } | null;
  profiles: { username: string; avatar_chispa_skin: string } | null;
};

function Comunidad() {
  const miSkin = useSkin();
  const queryClient = useQueryClient();

  const feed = useQuery({
    queryKey: ["comunidad"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const [{ data: sesiones, error }, { data: claps }] = await Promise.all([
        supabase
          .from("study_sessions")
          .select(
            "id, user_id, duration_minutes, explanation_text, created_at, topics(title), profiles(username, avatar_chispa_skin)",
          )
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("session_claps").select("session_id, user_id"),
      ]);
      if (error) throw error;

      const conteo = new Map<string, number>();
      const mios = new Set<string>();
      (claps ?? []).forEach((c) => {
        conteo.set(c.session_id, (conteo.get(c.session_id) ?? 0) + 1);
        if (c.user_id === userId) mios.add(c.session_id);
      });

      return ((sesiones ?? []) as unknown as Fila[]).map((s) => ({
        ...s,
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
      <div className="flex items-center gap-4">
        <Chispa skin={miSkin} estado="emocionado" size="sm" flotando={false} />
        <div>
          <h1 className="text-2xl font-extrabold">Comunidad</h1>
          <p className="text-sm text-muted-foreground">
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
            <li key={s.id} className="panel space-y-3 p-5">
              <div className="flex items-start gap-3">
                <Chispa
                  skin={(s.profiles?.avatar_chispa_skin as ChispaSkin) ?? "clasico"}
                  estado="neutral"
                  size="sm"
                  flotando={false}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {s.profiles?.username ?? "Alguien"}
                    {s.propia && <span className="text-muted-foreground"> (vos)</span>}
                  </p>
                  <p className="truncate text-sm text-primary">{s.topics?.title ?? "Tema"}</p>
                </div>
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

              {s.explanation_text && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {s.explanation_text}
                </p>
              )}

              <Button
                variant={s.aplaudida ? "chispa" : "contorno"}
                size="sm"
                disabled={aplaudir.isPending}
                onClick={() => aplaudir.mutate({ id: s.id, aplaudida: s.aplaudida })}
              >
                <Hand className={cn("size-4", s.aplaudida && "text-background")} />
                {s.aplausos} {s.aplausos === 1 ? "aplauso" : "aplausos"}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin={miSkin} estado="sorprendido" size="md" />
          <BurbujaChispa>
            Todavía nadie compartió nada. ¡Podés ser la primera chispa del feed!
          </BurbujaChispa>
          <Button asChild variant="chispa">
            <Link to="/inicio">Estudiar y compartir</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
