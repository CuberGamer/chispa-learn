import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Chispa, BurbujaChispa } from "@/components/chispa";
import { PixelFiltro, PixelLupa, PixelReloj } from "@/components/pixel-icons";
import { TopicIcon } from "@/components/topic-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type TopicConTags = {
  id: string;
  title: string;
  description: string | null;
  duration_suggested: number;
  icon: string;
  topic_tags: Array<{ tags: { name: string } | null }>;
};

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Chispa" },
      {
        name: "description",
        content: "Explorá todos los temas disponibles y arrancá una sesión cuando quieras.",
      },
      { property: "og:title", content: "Biblioteca — Chispa" },
      {
        property: "og:description",
        content: "Buscá temas por nombre o etiqueta y empezá a investigar.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Biblioteca,
});

function Biblioteca() {
  const skin = useSkin();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [tagActiva, setTagActiva] = useState<string | null>(null);
  const [orden, setOrden] = useState<"alfabetico" | "corto" | "largo">("alfabetico");

  const temas = useQuery({
    queryKey: ["biblioteca"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, description, duration_suggested, icon, topic_tags(tags(name))")
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TopicConTags[];
    },
  });

  const tags = useMemo(() => {
    const set = new Set<string>();
    temas.data?.forEach((t) =>
      t.topic_tags?.forEach((tt) => {
        if (tt.tags?.name) set.add(tt.tags.name);
      }),
    );
    return Array.from(set).sort();
  }, [temas.data]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = (temas.data ?? []).filter((t) => {
      const matchTexto =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false);
      const matchTag = !tagActiva || t.topic_tags?.some((tt) => tt.tags?.name === tagActiva);
      return matchTexto && matchTag;
    });
    if (orden === "corto")
      return [...lista].sort((a, b) => a.duration_suggested - b.duration_suggested);
    if (orden === "largo")
      return [...lista].sort((a, b) => b.duration_suggested - a.duration_suggested);
    return lista;
  }, [temas.data, busqueda, tagActiva, orden]);

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pb-16 lg:px-8">
      <div className="glass flex items-center gap-4 p-5">
        <Chispa skin={skin} estado="concentrado" size="sm" flotando={false} />
        <div>
          <h1 className="font-pixel text-sm text-primary text-glow-amarillo">BIBLIOTECA</h1>
          <p className="text-sm text-muted-foreground">Elegí un tema y empezá a investigar.</p>
        </div>
      </div>

      <div className="glass grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-5">
        {/* Buscador + grilla de temas */}
        <div className="space-y-4">
          <div className="relative">
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <PixelLupa size={16} />
            </span>
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tema o palabra clave…"
              className="h-12 pr-11"
              aria-label="Buscar temas"
            />
          </div>

          <p className="font-pixel text-[9px] text-muted-foreground">
            {temas.isLoading ? "CARGANDO…" : `${filtrados.length} TEMAS`}
          </p>

          {temas.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          ) : filtrados.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {filtrados.map((t) => {
                const etiquetas = t.topic_tags
                  ?.map((tt) => tt.tags?.name)
                  .filter((n): n is string => Boolean(n));
                return (
                  <li key={t.id} className="glass glass-hover flex gap-4 p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <h2 className="leading-snug font-semibold">{t.title}</h2>
                      <div className="flex flex-wrap gap-1.5">
                        {etiquetas?.slice(0, 2).map((n) => (
                          <span
                            key={n}
                            className="font-pixel rounded-full border border-violeta/50 bg-accent/20 px-2.5 py-1 text-[8px]"
                          >
                            {n.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      {t.description && (
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                      <span className="font-pixel inline-flex items-center gap-1.5 text-[8px] text-muted-foreground">
                        <PixelReloj size={11} />
                        {t.duration_suggested} MIN
                      </span>
                      <Button
                        variant="contorno"
                        size="sm"
                        className="font-pixel mt-auto self-start text-[9px]"
                        onClick={() => navigate({ to: "/tema/$id", params: { id: t.id } })}
                      >
                        VER TEMA
                      </Button>
                    </div>
                    <div className="hidden w-28 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 xl:flex">
                      <TopicIcon icon={t.icon} size={50} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <Chispa skin={skin} estado="sorprendido" size="md" />
              <BurbujaChispa>
                {busqueda || tagActiva
                  ? "No encontré temas con esos filtros. Probá con otra palabra."
                  : "Todavía no hay temas cargados."}
              </BurbujaChispa>
              {(busqueda || tagActiva) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-pixel text-[9px]"
                  onClick={() => {
                    setBusqueda("");
                    setTagActiva(null);
                  }}
                >
                  LIMPIAR FILTROS
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Panel de filtros */}
        <aside className="glass h-fit space-y-3 p-4 lg:sticky lg:top-32">
          <p className="font-pixel inline-flex items-center gap-2 text-[10px] text-cian text-glow-cian">
            <PixelFiltro size={14} />
            FILTROS
          </p>

          <p className="font-pixel pt-2 text-[8px] text-muted-foreground">DURACIÓN</p>
          <div className="flex flex-col gap-2">
            {(
              [
                ["alfabetico", "A – Z"],
                ["corto", "MÁS CORTOS"],
                ["largo", "MÁS LARGOS"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setOrden(id)}
                className={cn(
                  "font-pixel rounded-full border px-3 py-2 text-[8px] transition-colors",
                  orden === id
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-white/15 bg-white/5 text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="font-pixel pt-2 text-[8px] text-muted-foreground">ETIQUETAS</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTagActiva(null)}
              className={cn(
                "font-pixel rounded-full border px-3 py-1.5 text-[8px]",
                tagActiva === null
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-white/15 bg-white/5 text-muted-foreground",
              )}
            >
              TODAS
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagActiva((t) => (t === tag ? null : tag))}
                className={cn(
                  "font-pixel rounded-full border px-3 py-1.5 text-[8px]",
                  tagActiva === tag
                    ? "border-violeta bg-accent/25 text-foreground"
                    : "border-white/15 bg-white/5 text-muted-foreground",
                )}
              >
                {tag.toUpperCase()}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
