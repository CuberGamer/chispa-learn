import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCompartir } from "@/components/boton-compartir";
import { Chispa, BurbujaChispa, type ChispaSkin } from "@/components/chispa";
import {
  PixelCalendario,
  PixelChispita,
  PixelFuego,
  PixelPersona,
  PixelReloj,
} from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/u/$id")({
  head: () => ({
    meta: [
      { title: "Perfil de la comunidad — Chispa" },
      {
        name: "description",
        content: "Mirá los logros, la racha y las explicaciones públicas de esta cuenta de Chispa.",
      },
      { property: "og:title", content: "Perfil de la comunidad — Chispa" },
      { property: "og:description", content: "Logros, rachas y explicaciones de esta cuenta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PerfilPublico,
});

function PerfilPublico() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const perfil = useQuery({
    queryKey: ["perfil-publico", id],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const miId = userData.user?.id ?? null;

      const [
        { data: cuenta, error },
        { data: racha },
        { data: sesiones },
        { data: logros },
        { data: catalogo },
        { data: follows },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url, avatar_chispa_skin, created_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("streaks")
          .select("current_streak, longest_streak")
          .eq("user_id", id)
          .maybeSingle(),
        supabase
          .from("study_sessions")
          .select("id, duration_minutes, explanation_text, created_at, is_public, topics(title)")
          .eq("user_id", id)
          .eq("is_public", true)
          .order("created_at", { ascending: false }),
        supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", id),
        supabase.from("achievements").select("id, name, description, icon"),
        supabase.from("user_follows").select("follower_id, following_id"),
      ]);
      if (error) throw error;

      const desbloqueados = new Map(
        (logros ?? []).map((l) => [l.achievement_id, l.unlocked_at]),
      );
      const todos = (catalogo ?? []).map((l) => ({
        ...l,
        unlocked_at: desbloqueados.get(l.id) ?? null,
      }));

      const relaciones = follows ?? [];

      return {
        cuenta,
        rachaActual: racha?.current_streak ?? 0,
        rachaMaxima: racha?.longest_streak ?? 0,
        sesiones: sesiones ?? [],
        minutos: (sesiones ?? []).reduce((a, s) => a + (s.duration_minutes ?? 0), 0),
        logros: todos,
        seguidores: relaciones.filter((f) => f.following_id === id).length,
        siguiendoCantidad: relaciones.filter((f) => f.follower_id === id).length,
        loSigo: relaciones.some((f) => f.follower_id === miId && f.following_id === id),
        esMio: miId === id,
      };
    },
  });

  const seguir = useMutation({
    mutationFn: async (siguiendo: boolean) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");
      if (siguiendo) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: userId, following_id: id });
        if (error) throw error;
      }
      return !siguiendo;
    },
    onSuccess: (ahora) => {
      queryClient.invalidateQueries({ queryKey: ["perfil-publico", id] });
      queryClient.invalidateQueries({ queryKey: ["comunidad"] });
      toast.success(ahora ? "¡Ahora lo seguís! 👀" : "Dejaste de seguirlo");
    },
    onError: () => toast.error("No pude actualizar el seguimiento"),
  });

  if (perfil.isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 px-5 pb-16">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </main>
    );
  }

  const d = perfil.data;
  if (!d?.cuenta) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-16">
        <div className="glass flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin="clasico" estado="triste" size="md" />
          <BurbujaChispa>No encontré esta cuenta.</BurbujaChispa>
          <Button asChild variant="chispa" className="font-pixel text-[10px]">
            <Link to="/comunidad">VOLVER AL FEED</Link>
          </Button>
        </div>
      </main>
    );
  }

  const skin = (d.cuenta.avatar_chispa_skin as ChispaSkin) ?? "clasico";

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pb-16 lg:px-8">
      {/* Cabecera del perfil: avatar grande · datos · racha */}
      <div className="glass grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)_180px] lg:items-center">
        <div className="flex justify-center">
          <AvatarUsuario
            path={d.cuenta.avatar_url}
            skin={skin}
            nombre={d.cuenta.username}
            size={180}
            className="max-w-full"
          />
        </div>

        <div className="glass space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-pixel flex-1 truncate text-base text-primary text-glow-amarillo">
              {d.cuenta.username.toUpperCase()}
            </h1>
            {d.esMio ? (
              <Button asChild variant="contorno" size="sm" className="font-pixel text-[9px]">
                <Link to="/perfil">EDITAR</Link>
              </Button>
            ) : (
              <Button
                variant={d.loSigo ? "ghost" : "chispa"}
                size="sm"
                className="font-pixel text-[9px]"
                disabled={seguir.isPending}
                onClick={() => seguir.mutate(d.loSigo)}
              >
                <PixelPersona size={12} />
                {d.loSigo ? "SIGUIENDO" : "SEGUIR"}
              </Button>
            )}
            <span className="font-pixel rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[9px] text-muted-foreground">
              {d.seguidores} SEGUIDORES
            </span>
          </div>
          <p className="border-b border-dashed border-white/15 pb-2 text-sm text-muted-foreground">
            {d.sesiones.length} explicaciones públicas · {d.siguiendoCantidad} siguiendo
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <PixelCalendario size={12} />
            Desde{" "}
            {new Date(d.cuenta.created_at).toLocaleDateString("es-AR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-1">
          <PixelFuego size={64} className="text-primary" />
          <p className="font-pixel text-lg text-primary text-glow-amarillo">{d.rachaActual}</p>
          <p className="font-pixel text-[8px] text-muted-foreground">RACHA</p>
        </div>
      </div>

      {/* Métricas rápidas */}
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "RACHA MÁXIMA", valor: `${d.rachaMaxima} d`, icon: <PixelFuego size={14} /> },
          { label: "MINUTOS", valor: `${d.minutos}`, icon: <PixelReloj size={14} /> },
          { label: "PÚBLICAS", valor: `${d.sesiones.length}`, icon: <PixelChispita size={14} /> },
          { label: "SIGUIENDO", valor: `${d.siguiendoCantidad}`, icon: <PixelPersona size={14} /> },
        ].map((m) => (
          <li key={m.label} className="glass glass-hover p-4">
            <p className="font-pixel inline-flex items-center gap-1.5 text-[8px] text-muted-foreground">
              {m.icon}
              {m.label}
            </p>
            <p className="font-pixel mt-2 text-sm text-foreground">{m.valor}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Temas publicados */}
        <section className="glass space-y-4 p-5">
          <h2 className="font-pixel text-xs text-primary">TEMAS</h2>
          {d.sesiones.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {d.sesiones.map((s) => (
                <li key={s.id} className="glass glass-hover flex flex-col gap-2 p-4">
                  <span className="font-pixel self-start rounded-full border border-violeta/50 bg-accent/20 px-2.5 py-1 text-[8px]">
                    {((s.topics as { title: string } | null)?.title ?? "Tema").toUpperCase()}
                  </span>
                  {s.explanation_text && (
                    <p className="line-clamp-5 text-xs whitespace-pre-wrap text-foreground/90">
                      {s.explanation_text}
                    </p>
                  )}
                  <span className="font-pixel inline-flex items-center gap-1.5 text-[8px] text-muted-foreground">
                    <PixelReloj size={11} />
                    {s.duration_minutes} MIN
                  </span>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button asChild variant="ghost" size="sm" className="font-pixel text-[9px]">
                      <Link to="/e/$id" params={{ id: s.id }}>
                        VER
                      </Link>
                    </Button>
                    <BotonCompartir
                      id={s.id}
                      titulo={(s.topics as { title: string } | null)?.title ?? "Tema"}
                      variante="ghost"
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Todavía no compartió explicaciones.
            </p>
          )}
        </section>

        {/* Logros */}
        <aside className="glass h-fit space-y-3 p-5 lg:sticky lg:top-32">
          <h2 className="font-pixel text-xs text-primary">LOGROS</h2>
          <ul className="space-y-2">
            {d.logros.map((l) => (
              <li
                key={l.id}
                className={
                  "rounded-2xl border p-3 " +
                  (l.unlocked_at
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-white/5 opacity-60")
                }
              >
                <p className="font-pixel text-[9px] text-foreground">{l.name.toUpperCase()}</p>
                <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
