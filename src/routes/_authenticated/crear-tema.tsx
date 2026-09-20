import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PixelDado, PixelLupa, PixelMas, PixelReloj } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { crearTemaManual } from "@/lib/temas.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/crear-tema")({
  head: () => ({
    meta: [
      { title: "Crear tema — Chispa" },
      { name: "description", content: "Creá un nuevo tema para investigar en Chispa." },
      { property: "og:title", content: "Crear tema — Chispa" },
      { property: "og:description", content: "Creá un nuevo tema para investigar en Chispa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CrearTema,
});

const DURACIONES = [5, 15, 30, 45, 60];
const FUENTES_INICIALES = [
  { nombre: "Google Scholar", url: "https://scholar.google.com" },
  { nombre: "Wikipedia", url: "https://es.wikipedia.org" },
  { nombre: "Biblioteca Digital Mundial", url: "https://www.loc.gov/collections/world-digital-library/about-this-collection/" },
];

function CrearTema() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [duracion, setDuracion] = useState(15);
  const [busqueda, setBusqueda] = useState("");
  const [tagsElegidas, setTagsElegidas] = useState<string[]>([]);
  const [fuentes, setFuentes] = useState(FUENTES_INICIALES);
  const [nuevaFuente, setNuevaFuente] = useState("");

  const tags = useQuery({
    queryKey: ["tags-crear-tema"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((tag) => tag.name);
    },
  });

  const tagsVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (tags.data ?? []).filter((tag) => !q || tag.toLowerCase().includes(q));
  }, [busqueda, tags.data]);

  const crear = useMutation({
    mutationFn: () =>
      crearTemaManual({
        data: {
          title: titulo,
          description: descripcion,
          duration_suggested: duracion,
          tags: tagsElegidas,
        },
      }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["tema-del-dia"] });
      toast.success("¡Tema creado!");
      navigate({ to: "/tema/$id", params: { id } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No pude crear el tema"),
  });

  function alternarTag(tag: string) {
    setTagsElegidas((actuales) =>
      actuales.includes(tag)
        ? actuales.filter((actual) => actual !== tag)
        : actuales.length < 5
          ? [...actuales, tag]
          : actuales,
    );
  }

  function agregarFuente() {
    const entrada = nuevaFuente.trim();
    if (!entrada) return;
    const esUrl = /^https?:\/\//i.test(entrada);
    setFuentes((actuales) => [
      ...actuales,
      { nombre: esUrl ? new URL(entrada).hostname.replace("www.", "") : entrada, url: esUrl ? entrada : `https://scholar.google.com/scholar?q=${encodeURIComponent(entrada)}` },
    ]);
    setNuevaFuente("");
  }

  const valido = titulo.trim().length >= 3 && descripcion.trim().length >= 10 && tagsElegidas.length > 0;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-pixel text-[8px] text-muted-foreground">NUEVO APRENDIZAJE</p>
          <h1 className="font-pixel mt-2 text-sm text-primary text-glow-amarillo">CREAR TEMA</h1>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar creación" onClick={() => navigate({ to: "/inicio" })}>
          ×
        </Button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valido && !crear.isPending) crear.mutate();
        }}
        className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1.4fr)_minmax(220px,0.8fr)]"
      >
        <section className="glass space-y-3 p-4 lg:min-h-[520px]">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-pixel text-[9px]">FUENTES RECOMENDADAS</h2>
            <PixelMas size={15} className="text-primary" />
          </div>
          <div className="flex gap-2">
            <Input
              value={nuevaFuente}
              onChange={(event) => setNuevaFuente(event.target.value)}
              placeholder="URL o búsqueda"
              aria-label="Agregar una fuente"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  agregarFuente();
                }
              }}
            />
            <Button type="button" size="icon" variant="contorno" aria-label="Agregar fuente" onClick={agregarFuente}>
              <PixelMas />
            </Button>
          </div>
          <ul className="space-y-3">
            {fuentes.map((fuente) => (
              <li key={`${fuente.nombre}-${fuente.url}`}>
                <a
                  href={fuente.url}
                  target="_blank"
                  rel="noreferrer"
                  className="glass glass-hover block min-h-24 p-4"
                >
                  <span className="font-pixel text-[9px] text-primary">{fuente.nombre.toUpperCase()}</span>
                  <span className="mt-2 block truncate text-xs text-muted-foreground">{fuente.url}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass flex flex-col gap-4 p-5 lg:min-h-[520px]">
          <div className="flex gap-2">
            <Input
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Nombre del tema"
              maxLength={120}
              className="h-12 text-base"
              aria-label="Nombre del tema"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Elegir un nombre al azar"
              onClick={() => {
                const opciones = ["El origen de los mapas", "Cómo funciona la memoria", "La vida en los océanos profundos"];
                const opcion = opciones[Math.floor(Math.random() * opciones.length)];
                if (opcion) setTitulo(opcion);
              }}
            >
              <PixelDado />
            </Button>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <label className="glass flex items-center gap-3 px-4 py-3">
              <PixelReloj size={16} className="text-primary" />
              <span className="font-pixel text-[8px] text-muted-foreground">TIEMPO SUGERIDO</span>
              <select
                value={duracion}
                onChange={(event) => setDuracion(Number(event.target.value))}
                className="ml-auto bg-transparent text-sm text-foreground outline-none"
              >
                {DURACIONES.map((minutos) => <option key={minutos} value={minutos}>{minutos} min</option>)}
              </select>
            </label>
            <div className="glass flex min-w-20 items-center justify-center text-2xl" aria-label="Ícono del tema">📚</div>
          </div>

          <Textarea
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Descripción: ¿qué querés investigar y aprender?"
            maxLength={800}
            className="min-h-56 flex-1 resize-none"
            aria-label="Descripción del tema"
          />
          <Button type="submit" variant="chispa" size="xl" className="font-pixel w-full text-[11px]" disabled={!valido || crear.isPending}>
            {crear.isPending ? "CREANDO…" : "CREAR"}
          </Button>
        </section>

        <section className="glass space-y-4 p-4 lg:min-h-[520px]">
          <h2 className="font-pixel border-b border-border pb-3 text-center text-[10px]">ETIQUETAS</h2>
          <div className="relative">
            <PixelLupa size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar…" className="pr-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            {tagsVisibles.map((tag) => {
              const elegida = tagsElegidas.includes(tag);
              return (
                <Button
                  key={tag}
                  type="button"
                  size="sm"
                  variant={elegida ? "chispa" : "secondary"}
                  aria-pressed={elegida}
                  onClick={() => alternarTag(tag)}
                  className={cn("font-pixel h-auto whitespace-normal px-3 py-2 text-[7px]", elegida && "glow-amarillo")}
                >
                  {tag.toUpperCase()}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Elegí entre 1 y 5 etiquetas · {tagsElegidas.length}/5</p>
        </section>
      </form>
    </main>
  );
}