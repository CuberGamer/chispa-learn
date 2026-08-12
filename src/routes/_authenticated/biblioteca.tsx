import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Clock, Search, Tag } from "lucide-react";

import { Chispa, BurbujaChispa } from "@/components/chispa";
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
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [tagActiva, setTagActiva] = useState<string | null>(null);

  const temas = useQuery({
    queryKey: ["biblioteca"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, description, duration_suggested, topic_tags(tags(name))")
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
    return (temas.data ?? []).filter((t) => {
      const matchTexto =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false);
      const matchTag =
        !tagActiva ||
        t.topic_tags?.some((tt) => tt.tags?.name === tagActiva);
      return matchTexto && matchTag;
    });
  }, [temas.data, busqueda, tagActiva]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 pb-16">
      <div className="flex items-center gap-4">
        <Chispa skin={skin} estado="concentrado" size="sm" flotando={false} />
        <div>
          <h1 className="text-2xl font-extrabold">Biblioteca</h1>
          <p className="text-sm text-muted-foreground">
            Elegí un tema y empezá a investigar.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar tema o palabra clave…"
          className="bg-surface pl-9"
          aria-label="Buscar temas"
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTagActiva(null)}
            className={cn(
              "rounded-full border-2 px-3 py-1 text-xs font-medium transition-colors",
              tagActiva === null
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            Todos
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagActiva((t) => (t === tag ? null : tag))}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-medium transition-colors",
                tagActiva === tag
                  ? "border-violeta bg-accent/20 text-accent-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Tag className="size-3" />
              {tag}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {temas.isLoading ? "Cargando…" : `${filtrados.length} temas`}
      </p>

      {temas.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : filtrados.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtrados.map((t) => {
            const etiquetas = t.topic_tags
              ?.map((tt) => tt.tags?.name)
              .filter((n): n is string => Boolean(n));
            return (
              <li
                key={t.id}
                className="panel flex flex-col gap-3 p-5 transition-colors hover:border-primary/50"
              >
                <div className="space-y-1">
                  <h2 className="font-semibold leading-snug">{t.title}</h2>
                  {t.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {t.duration_suggested} min
                  </span>
                  {etiquetas?.map((n) => (
                    <span
                      key={n}
                      className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                    >
                      {n}
                    </span>
                  ))}
                </div>

                <Button
                  variant="contorno"
                  size="sm"
                  className="mt-auto self-start"
                  onClick={() =>
                    navigate({
                      to: "/sesion",
                      search: { tema: t.id, minutos: t.duration_suggested },
                    })
                  }
                >
                  Investigar
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="panel flex flex-col items-center gap-4 p-8 text-center">
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
              onClick={() => {
                setBusqueda("");
                setTagActiva(null);
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
