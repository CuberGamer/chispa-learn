import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCompartir } from "@/components/boton-compartir";
import { Chispa, BurbujaChispa, type ChispaSkin } from "@/components/chispa";
import { PanelMusica } from "@/components/panel-musica";
import {
  PixelAplauso,
  PixelCalendario,
  PixelFlechaAbajo,
  PixelFlechaArriba,
  PixelReloj,
} from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tema/$id")({
  head: () => ({
    meta: [
      { title: "Tema para investigar — Chispa" },
      {
        name: "description",
        content: "Mirá de qué se trata el tema, elegí cuánto tiempo le vas a dedicar y arrancá.",
      },
      { property: "og:title", content: "Tema para investigar — Chispa" },
      { property: "og:description", content: "Elegí tu tiempo y apretá iniciar." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DetalleTema,
});

/** Opciones del selector tipo rueda (mockup: 2h · 1h · 45m · 30m · 20m · 15m · 10m). */
const TIEMPOS = [120, 60, 45, 30, 20, 15, 10] as const;

function SelectorTiempo({
  minutos,
  onCambiar,
}: {
  minutos: number;
  onCambiar: (m: number) => void;
}) {
  const [manual, setManual] = useState(false);
  const [borrador, setBorrador] = useState(String(minutos));

  const opciones = TIEMPOS.includes(minutos as (typeof TIEMPOS)[number])
    ? [...TIEMPOS]
    : [...TIEMPOS, minutos].sort((a, b) => b - a);
  const actual = opciones.indexOf(minutos);

  function etiqueta(m: number) {
    return m % 60 === 0 && m >= 60 ? `${m / 60}h` : `${m}m`;
  }

  return (
    <aside className="glass flex h-fit flex-col items-center gap-2 p-4 lg:sticky lg:top-32">
      <h2 className="font-pixel mb-1 text-[10px] text-primary text-glow-amarillo">TIEMPO</h2>

      <button
        type="button"
        aria-label="Subir tiempo"
        onClick={() => onCambiar(opciones[Math.max(0, actual - 1)] ?? minutos)}
        className="text-muted-foreground transition-colors hover:text-primary"
      >
        <PixelFlechaArriba size={14} />
      </button>

      <ul className="flex w-full flex-col items-center gap-1.5">
        {opciones.map((m) => {
          const distancia = Math.abs(opciones.indexOf(m) - actual);
          const activo = m === minutos;
          return (
            <li key={m} className="w-full">
              <button
                type="button"
                onClick={() => onCambiar(m)}
                className={cn(
                  "mx-auto flex items-center justify-center gap-2 rounded-full transition-all",
                  activo
                    ? "w-full border border-primary/50 bg-background/70 px-4 py-3 text-2xl text-primary text-glow-amarillo"
                    : "border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground",
                  !activo && distancia === 1 && "w-[88%] px-4 py-2 text-lg",
                  !activo && distancia === 2 && "w-[74%] px-3 py-1.5 text-sm",
                  !activo && distancia >= 3 && "w-[60%] px-3 py-1 text-xs",
                )}
              >
                {etiqueta(m)}
                {activo && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Entrada manual"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBorrador(String(minutos));
                      setManual(true);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && setManual(true)}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    ✎
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        aria-label="Bajar tiempo"
        onClick={() => onCambiar(opciones[Math.min(opciones.length - 1, actual + 1)] ?? minutos)}
        className="text-muted-foreground transition-colors hover:text-primary"
      >
        <PixelFlechaAbajo size={14} />
      </button>

      {manual ? (
        <form
          className="mt-2 flex w-full items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = Math.min(120, Math.max(1, Number(borrador) || minutos));
            onCambiar(v);
            setManual(false);
          }}
        >
          <input
            autoFocus
            type="number"
            min={1}
            max={120}
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            className="glass w-full px-3 py-2 text-center text-sm outline-none"
          />
          <Button type="submit" variant="contorno" size="sm" className="font-pixel text-[9px]">
            OK
          </Button>
        </form>
      ) : (
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Elegí de la lista o escribí tu propio tiempo con el lápiz.
        </p>
      )}
    </aside>
  );
}

function DetalleTema() {
  const { id } = Route.useParams();
  const skin = useSkin();
  const navigate = useNavigate();
  const [minutos, setMinutos] = useState(30);

  const tema = useQuery({
    queryKey: ["tema-detalle", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, description, duration_suggested, topic_tags(tags(name))")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (tema.data?.duration_suggested) setMinutos(tema.data.duration_suggested);
  }, [tema.data?.duration_suggested]);

  const publicaciones = useQuery({
    queryKey: ["tema-publicaciones", id],
    queryFn: async () => {
      const { data: sesiones, error } = await supabase
        .from("study_sessions")
        .select("id, user_id, duration_minutes, explanation_text, created_at")
        .eq("topic_id", id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;

      const filas = sesiones ?? [];
      const autores = [...new Set(filas.map((s) => s.user_id))];

      const [{ data: perfiles }, { data: claps }] = await Promise.all([
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
        supabase.from("session_claps").select("session_id"),
      ]);

      const perfilPor = new Map((perfiles ?? []).map((p) => [p.id, p]));
      const conteo = new Map<string, number>();
      (claps ?? []).forEach((c) =>
        conteo.set(c.session_id, (conteo.get(c.session_id) ?? 0) + 1),
      );

      return filas.map((s) => ({
        ...s,
        autor: perfilPor.get(s.user_id)?.username ?? "Alguien",
        foto: perfilPor.get(s.user_id)?.avatar_url ?? null,
        skin: (perfilPor.get(s.user_id)?.avatar_chispa_skin as ChispaSkin) ?? "clasico",
        aplausos: conteo.get(s.id) ?? 0,
      }));
    },
  });

  const etiquetas =
    tema.data?.topic_tags
      ?.map((tt) => (tt.tags as { name: string } | null)?.name)
      .filter((n): n is string => Boolean(n)) ?? [];

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="font-pixel mb-4 text-[9px] text-muted-foreground">
        <Link to="/biblioteca">◀ VOLVER A LA BIBLIOTECA</Link>
      </Button>

      {/* Tres columnas: música · tema · tiempo */}
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)_280px]">
        <PanelMusica className="h-fit lg:sticky lg:top-32" />

        <section className="glass space-y-5 p-6 text-center">
          {tema.isLoading ? (
            <Skeleton className="mx-auto h-64 w-full" />
          ) : tema.data ? (
            <>
              <div className="mx-auto flex size-48 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <Chispa skin={skin} estado="concentrado" size="md" flotando={false} />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {etiquetas.map((n) => (
                  <span
                    key={n}
                    className="font-pixel rounded-full border border-border px-2.5 py-1 text-[8px] uppercase text-muted-foreground"
                  >
                    {n}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{tema.data.title}</h1>

              {tema.data.description && (
                <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {tema.data.description}
                </p>
              )}

              <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <PixelReloj size={12} />
                {tema.data.duration_suggested} min sugeridos · vas a estudiar {minutos} min
              </p>

              <Button
                variant="chispa"
                size="xl"
                className="font-pixel w-full text-base"
                onClick={() =>
                  navigate({ to: "/sesion", search: { tema: tema.data!.id, minutos } })
                }
              >
                INICIAR
              </Button>
            </>
          ) : (
            <p className="py-10 text-sm text-muted-foreground">No encontré este tema.</p>
          )}
        </section>

        <SelectorTiempo minutos={minutos} onCambiar={setMinutos} />
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="font-pixel text-xs text-primary text-glow-amarillo">
          QUIÉNES YA LO HICIERON
        </h2>

        {publicaciones.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : publicaciones.data && publicaciones.data.length > 0 ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {publicaciones.data.map((s) => (
              <li key={s.id} className="glass glass-hover space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <Link to="/u/$id" params={{ id: s.user_id }}>
                    <AvatarUsuario path={s.foto} skin={s.skin} nombre={s.autor} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/u/$id"
                      params={{ id: s.user_id }}
                      className="font-pixel block truncate text-[10px] hover:text-primary"
                    >
                      {s.autor}
                    </Link>
                    <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
                    </p>
                  </div>
                </div>

                {s.explanation_text && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {s.explanation_text}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-pixel inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <PixelAplauso />
                    {s.aplausos}
                  </span>
                  <BotonCompartir id={s.id} titulo={tema.data?.title ?? "Tema"} variante="ghost" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="glass flex flex-col items-center gap-3 p-6 text-center">
            <Chispa skin={skin} estado="sorprendido" size="sm" />
            <BurbujaChispa>
              Nadie compartió este tema todavía. ¡Podés ser la primera explicación!
            </BurbujaChispa>
          </div>
        )}
      </section>
    </main>
  );
}
