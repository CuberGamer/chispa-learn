import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCompartir } from "@/components/boton-compartir";
import type { ChispaSkin } from "@/components/chispa";
import { PixelPersona, PixelReloj } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Panel = "temas" | "seguidos" | "compartidos" | "guardados";

type PerfilMini = {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_chispa_skin: string;
};

/**
 * Paneles del perfil: temas publicados, cuentas seguidas, temas que compartió
 * (invitaciones enviadas) y, solo en el perfil propio, los temas guardados.
 */
export function PanelesPerfil({ userId, esMio }: { userId: string; esMio: boolean }) {
  const [panel, setPanel] = useState<Panel>("temas");

  const datos = useQuery({
    queryKey: ["paneles-perfil", userId, esMio],
    queryFn: async () => {
      const [{ data: sesiones }, { data: follows }, { data: invitaciones }] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("id, topic_id, duration_minutes, explanation_text, created_at, topics(title)")
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false }),
        supabase.from("user_follows").select("following_id").eq("follower_id", userId),
        supabase
          .from("topic_invites")
          .select("id, topic_id, receiver_id, created_at, topics(title)")
          .eq("sender_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      const seguidosIds = (follows ?? []).map((f) => f.following_id);
      const receptores = [...new Set((invitaciones ?? []).map((i) => i.receiver_id))];
      const ids = [...new Set([...seguidosIds, ...receptores])];

      const { data: perfiles } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, avatar_chispa_skin")
            .in("id", ids)
        : { data: [] as PerfilMini[] };
      const perfilPor = new Map((perfiles ?? []).map((p) => [p.id, p]));

      let guardados: {
        id: string;
        titulo: string;
        topic_id: string;
        explanation_text: string | null;
      }[] = [];
      if (esMio) {
        const { data: favoritos } = await supabase
          .from("session_favorites")
          .select("session_id")
          .eq("user_id", userId);
        const favIds = (favoritos ?? []).map((f) => f.session_id);
        if (favIds.length) {
          const { data: sesionesFav } = await supabase
            .from("study_sessions")
            .select("id, topic_id, explanation_text, topics(title)")
            .in("id", favIds);
          guardados = (sesionesFav ?? []).map((s) => ({
            id: s.id,
            topic_id: s.topic_id,
            explanation_text: s.explanation_text,
            titulo: (s.topics as { title: string } | null)?.title ?? "Tema",
          }));
        }
      }

      return {
        temas: (sesiones ?? []).map((s) => ({
          ...s,
          titulo: (s.topics as { title: string } | null)?.title ?? "Tema",
        })),
        seguidos: seguidosIds
          .map((id) => perfilPor.get(id))
          .filter((p): p is PerfilMini => Boolean(p)),
        compartidos: (invitaciones ?? []).map((i) => ({
          id: i.id,
          topic_id: i.topic_id,
          titulo: (i.topics as { title: string } | null)?.title ?? "Tema",
          receptor: perfilPor.get(i.receiver_id) ?? null,
          created_at: i.created_at,
        })),
        guardados,
      };
    },
  });

  const pestanias: [Panel, string][] = [
    ["temas", "TEMAS"],
    ["seguidos", "SEGUIDOS"],
    ["compartidos", "COMPARTIDOS"],
    ...(esMio ? ([["guardados", "TEMAS GUARDADOS"]] as [Panel, string][]) : []),
  ];

  const d = datos.data;

  return (
    <section className="space-y-4">
      <div className="glass flex flex-wrap gap-2 p-3">
        {pestanias.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPanel(id)}
            className={cn(
              "font-pixel flex-1 rounded-full border-2 px-3 py-2 text-[9px] transition-colors",
              panel === id
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-white/15 bg-white/5 text-muted-foreground hover:bg-white/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="glass p-5">
        {datos.isLoading || !d ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : panel === "temas" ? (
          d.temas.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {d.temas.map((s) => (
                <li key={s.id} className="glass glass-hover flex flex-col gap-2 p-4">
                  <span className="font-pixel self-start rounded-full border border-violeta/50 bg-accent/20 px-2.5 py-1 text-[8px]">
                    {s.titulo.toUpperCase()}
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
                    <BotonCompartir id={s.id} titulo={s.titulo} variante="ghost" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="Todavía no hay explicaciones públicas." />
          )
        ) : panel === "seguidos" ? (
          d.seguidos.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {d.seguidos.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/u/$id"
                    params={{ id: p.id }}
                    className="glass glass-hover flex items-center gap-3 p-3"
                  >
                    <AvatarUsuario
                      path={p.avatar_url}
                      skin={(p.avatar_chispa_skin as ChispaSkin) ?? "clasico"}
                      nombre={p.username}
                      size={40}
                    />
                    <span className="font-pixel flex-1 truncate text-[9px]">{p.username}</span>
                    <PixelPersona size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="Todavía no sigue a nadie." />
          )
        ) : panel === "compartidos" ? (
          d.compartidos.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {d.compartidos.map((i) => (
                <li key={i.id} className="glass glass-hover flex flex-col gap-2 p-4">
                  <span className="font-pixel self-start rounded-full border border-violeta/50 bg-accent/20 px-2.5 py-1 text-[8px]">
                    {i.titulo.toUpperCase()}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Invitó a {i.receptor?.username ?? "alguien"}
                  </p>
                  <Button asChild variant="ghost" size="sm" className="font-pixel mt-auto text-[9px]">
                    <Link to="/tema/$id" params={{ id: i.topic_id }}>
                      VER TEMA
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="Todavía no compartió temas con nadie." />
          )
        ) : d.guardados.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {d.guardados.map((s) => (
              <li key={s.id} className="glass glass-hover flex flex-col gap-2 p-4">
                <span className="font-pixel self-start rounded-full border border-violeta/50 bg-accent/20 px-2.5 py-1 text-[8px]">
                  {s.titulo.toUpperCase()}
                </span>
                {s.explanation_text && (
                  <p className="line-clamp-4 text-xs whitespace-pre-wrap text-foreground/90">
                    {s.explanation_text}
                  </p>
                )}
                <Button asChild variant="ghost" size="sm" className="font-pixel mt-auto text-[9px]">
                  <Link to="/e/$id" params={{ id: s.id }}>
                    VER
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Vacio texto="Todavía no guardaste temas. Tocá GUARDAR en la comunidad." />
        )}
      </div>
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="p-6 text-center text-sm text-muted-foreground">{texto}</p>;
}
