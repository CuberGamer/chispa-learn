import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCompartir } from "@/components/boton-compartir";
import { BotonReportar } from "@/components/boton-reportar";
import { Comentarios } from "@/components/comentarios";
import { Chispa, BurbujaChispa, type ChispaSkin } from "@/components/chispa";
import {
  PixelAplauso,
  PixelChat,
  PixelChispita,
  PixelEstrella,
  PixelLupa,
  PixelPersona,
  PixelReloj,
} from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/** "hace 5 min", "hace 3 h", "hace 2 d" — el tiempo relativo de las redes. */
function haceCuanto(iso: string) {
  const seg = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 60) return "ahora";
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 604800) return `hace ${Math.floor(seg / 86400)} d`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

type Pestania = "todo" | "siguiendo" | "favoritos";

function Comunidad() {
  const miSkin = useSkin();
  const queryClient = useQueryClient();
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  const [comentando, setComentando] = useState<Record<string, boolean>>({});
  const [busqueda, setBusqueda] = useState("");
  const [pestania, setPestania] = useState<Pestania>("todo");

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

      const [{ data: perfiles }, { data: claps }, { data: comentarios }, { data: favoritos }, { data: seguidos }] =
        await Promise.all([
          autores.length
            ? supabase
                .from("profiles")
                .select("id, username, avatar_url, avatar_chispa_skin")
                .in("id", autores)
            : Promise.resolve({
                data: [] as {
                  id: string;
                  username: string;
                  avatar_url: string | null;
                  avatar_chispa_skin: string;
                }[],
              }),
          supabase.from("session_claps").select("session_id, user_id"),
          supabase.from("session_comments").select("session_id"),
          supabase.from("session_favorites").select("session_id"),
          supabase.from("user_follows").select("follower_id, following_id"),
        ]);

      const perfilPor = new Map((perfiles ?? []).map((p) => [p.id, p]));
      const conteo = new Map<string, number>();
      const mios = new Set<string>();
      (claps ?? []).forEach((c) => {
        conteo.set(c.session_id, (conteo.get(c.session_id) ?? 0) + 1);
        if (c.user_id === userId) mios.add(c.session_id);
      });

      const conteoComentarios = new Map<string, number>();
      (comentarios ?? []).forEach((c) => {
        conteoComentarios.set(c.session_id, (conteoComentarios.get(c.session_id) ?? 0) + 1);
      });

      const misFavoritos = new Set((favoritos ?? []).map((f) => f.session_id));
      const sigo = new Set(
        (seguidos ?? []).filter((f) => f.follower_id === userId).map((f) => f.following_id),
      );

      return filas.map((s) => ({
        ...s,
        titulo: (s.topics as { title: string } | null)?.title ?? "Tema",
        autor: perfilPor.get(s.user_id)?.username ?? "Alguien",
        foto: perfilPor.get(s.user_id)?.avatar_url ?? null,
        skin: (perfilPor.get(s.user_id)?.avatar_chispa_skin as ChispaSkin) ?? "clasico",
        aplausos: conteo.get(s.id) ?? 0,
        aplaudida: mios.has(s.id),
        comentarios: conteoComentarios.get(s.id) ?? 0,
        favorita: misFavoritos.has(s.id),
        siguiendo: sigo.has(s.user_id),
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

  const favorito = useMutation({
    mutationFn: async ({ id, favorita }: { id: string; favorita: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");

      if (favorita) {
        const { error } = await supabase
          .from("session_favorites")
          .delete()
          .eq("session_id", id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("session_favorites")
          .insert({ session_id: id, user_id: userId });
        if (error) throw error;
      }
      return !favorita;
    },
    onSuccess: (guardada) => {
      queryClient.invalidateQueries({ queryKey: ["comunidad"] });
      toast.success(guardada ? "Guardada en favoritos ⭐" : "La saqué de favoritos");
    },
    onError: () => toast.error("No pude guardar el favorito"),
  });

  const seguir = useMutation({
    mutationFn: async ({ autorId, siguiendo }: { autorId: string; siguiendo: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");

      if (siguiendo) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", autorId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: userId, following_id: autorId });
        if (error) throw error;
      }
      return !siguiendo;
    },
    onSuccess: (ahora) => {
      queryClient.invalidateQueries({ queryKey: ["comunidad"] });
      toast.success(ahora ? "¡Ahora lo seguís! 👀" : "Dejaste de seguirlo");
    },
    onError: () => toast.error("No pude actualizar el seguimiento"),
  });

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (feed.data ?? []).filter((s) => {
      if (pestania === "siguiendo" && !s.siguiendo) return false;
      if (pestania === "favoritos" && !s.favorita) return false;
      if (!q) return true;
      return (
        s.titulo.toLowerCase().includes(q) ||
        s.autor.toLowerCase().includes(q) ||
        (s.explanation_text ?? "").toLowerCase().includes(q)
      );
    });
  }, [feed.data, busqueda, pestania]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-5 pb-16">
      <div className="glass flex items-center gap-4 p-5">
        <Chispa skin={miSkin} estado="emocionado" size="sm" flotando={false} />
        <div>
          <h1 className="font-pixel text-sm text-primary text-glow-amarillo">COMUNIDAD</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El feed de las explicaciones que se comparten.
          </p>
        </div>
      </div>

      <Link
        to="/biblioteca"
        className="glass glass-hover flex items-center gap-3 p-4 transition-transform active:scale-[0.99]"
      >
        <AvatarUsuario skin={miSkin} size={40} />
        <span className="flex-1 text-sm text-muted-foreground">
          ¿Qué estás aprendiendo hoy? Elegí un tema…
        </span>
        <span className="font-pixel inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-[9px] text-primary">
          <PixelChispita size={12} />
          PUBLICAR
        </span>
      </Link>

      <div className="glass space-y-3 p-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <PixelLupa size={14} />
          </span>
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por tema, autor o texto…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              ["todo", "TODO"],
              ["siguiendo", "SIGUIENDO"],
              ["favoritos", "FAVORITOS"],
            ] as [Pestania, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestania(id)}
              className={cn(
                "font-pixel rounded-full border-2 px-3 py-1.5 text-[9px] transition-colors",
                pestania === id
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-white/15 bg-white/5 text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {feed.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : visibles.length > 0 ? (
        <ul className="space-y-4">
          {visibles.map((s) => {
            const largo = (s.explanation_text?.length ?? 0) > 380;
            const abierta = expandidas[s.id] ?? false;
            return (
              <li key={s.id} className="glass glass-hover overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Link to="/u/$id" params={{ id: s.user_id }}>
                    <AvatarUsuario path={s.foto} skin={s.skin} nombre={s.autor} size={44} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/u/$id"
                      params={{ id: s.user_id }}
                      className="font-pixel block truncate text-[10px] text-foreground"
                    >
                      {s.autor}
                      {s.propia && <span className="text-muted-foreground"> (VOS)</span>}
                    </Link>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{haceCuanto(s.created_at)}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <PixelReloj size={11} />
                        {s.duration_minutes} min
                      </span>
                    </p>
                  </div>
                  {!s.propia && (
                    <Button
                      variant={s.siguiendo ? "ghost" : "contorno"}
                      size="sm"
                      className="font-pixel text-[9px]"
                      disabled={seguir.isPending}
                      onClick={() =>
                        seguir.mutate({ autorId: s.user_id, siguiendo: s.siguiendo })
                      }
                    >
                      <PixelPersona size={12} />
                      {s.siguiendo ? "SIGUIENDO" : "SEGUIR"}
                    </Button>
                  )}
                </div>

                <div className="px-4">
                  <span className="font-pixel inline-block rounded-full border-2 border-violeta/50 bg-accent/20 px-3 py-1 text-[9px] text-foreground">
                    {s.titulo.toUpperCase()}
                  </span>
                </div>

                {s.explanation_text && (
                  <div className="px-4 pt-3">
                    <p
                      className={cn(
                        "whitespace-pre-wrap text-sm leading-relaxed text-foreground/90",
                        largo && !abierta && "line-clamp-6",
                      )}
                    >
                      {s.explanation_text}
                    </p>
                    {largo && (
                      <button
                        type="button"
                        className="font-pixel mt-2 text-[9px] text-primary"
                        onClick={() => setExpandidas((e) => ({ ...e, [s.id]: !abierta }))}
                      >
                        {abierta ? "VER MENOS" : "VER MÁS"}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 p-3">
                  <Button
                    variant={s.aplaudida ? "chispa" : "ghost"}
                    size="sm"
                    className="font-pixel text-[10px]"
                    disabled={aplaudir.isPending}
                    onClick={() => aplaudir.mutate({ id: s.id, aplaudida: s.aplaudida })}
                  >
                    <PixelAplauso className={cn(s.aplaudida && "text-background")} />
                    {s.aplausos}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-pixel text-[10px]"
                    onClick={() => setComentando((c) => ({ ...c, [s.id]: !c[s.id] }))}
                  >
                    <PixelChat />
                    {s.comentarios}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("font-pixel text-[10px]", s.favorita && "text-primary")}
                    disabled={favorito.isPending}
                    onClick={() => favorito.mutate({ id: s.id, favorita: s.favorita })}
                  >
                    <PixelEstrella />
                    {s.favorita ? "GUARDADA" : "GUARDAR"}
                  </Button>
                  <BotonCompartir id={s.id} titulo={s.titulo} variante="ghost" />
                  {!s.propia && <BotonReportar sessionId={s.id} />}
                </div>

                {comentando[s.id] && <Comentarios sessionId={s.id} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="glass flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin={miSkin} estado="sorprendido" size="md" />
          <BurbujaChispa>
            {busqueda || pestania !== "todo"
              ? "No encontré nada con ese filtro. Probá otra búsqueda."
              : "Todavía nadie compartió nada. ¡Podés ser la primera chispa del feed!"}
          </BurbujaChispa>
          <Button asChild variant="chispa" className="font-pixel text-[10px]">
            <Link to="/inicio">ESTUDIAR Y COMPARTIR</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
