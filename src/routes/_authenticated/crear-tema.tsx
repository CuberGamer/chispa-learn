import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PixelCheck, PixelDado, PixelFlechaAbajo, PixelLupa, PixelReloj } from "@/components/pixel-icons";
import { TOPIC_ICONS, TopicIcon } from "@/components/topic-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
type Fuente = { nombre: string; url: string };

const ETIQUETAS_BASE = [
  "arte",
  "biología",
  "ciencia",
  "economía",
  "filosofía",
  "física",
  "geografía",
  "historia",
  "literatura",
  "matemática",
  "música",
  "naturaleza",
  "psicología",
  "salud",
  "sociedad",
  "tecnología",
];
const FUENTES_RECOMENDADAS: Fuente[] = [
  { nombre: "Google Scholar", url: "https://scholar.google.com" },
];

function SelectorDuracion({
  duracion,
  onCambiar,
}: {
  duracion: number;
  onCambiar: (duracion: number) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="glass h-auto min-h-16 justify-between border border-primary/30 px-4 py-3 text-left"
          aria-label="Elegir tiempo sugerido"
        >
          <span className="flex items-center gap-3">
            <PixelReloj size={16} className="text-primary" />
            <span>
              <span className="font-pixel block text-[8px] text-muted-foreground">TIEMPO SUGERIDO</span>
              <span className="mt-1 block text-sm text-foreground">{duracion} min</span>
            </span>
          </span>
          <PixelFlechaAbajo size={13} className="text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="glass w-64 border-primary/30 p-3">
        <div className="grid gap-2">
          {DURACIONES.map((minutos) => {
            const elegido = minutos === duracion;
            return (
              <Button
                key={minutos}
                type="button"
                variant={elegido ? "chispa" : "secondary"}
                className={cn("font-pixel justify-between text-[9px]", elegido && "glow-amarillo")}
                aria-pressed={elegido}
                onClick={() => {
                  onCambiar(minutos);
                  setAbierto(false);
                }}
              >
                <span>{minutos} MIN</span>
                {elegido && <PixelCheck size={13} />}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CrearTema() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [duracion, setDuracion] = useState(15);
  const [icono, setIcono] = useState("libro");
  const [selectorIcono, setSelectorIcono] = useState(false);
  const [busquedaIcono, setBusquedaIcono] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [tagsElegidas, setTagsElegidas] = useState<string[]>([]);
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [nuevaFuente, setNuevaFuente] = useState("");

  const tags = useQuery({
    queryKey: ["tags-crear-tema"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("name").order("name");
      if (error) throw error;
      const disponibles = (data ?? []).map((tag) => tag.name);
      return disponibles.length > 0 ? disponibles : ETIQUETAS_BASE;
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
          icon: icono,
          tags: tagsElegidas,
        },
      }),
    onSuccess: async ({ id }) => {
      const fuentesDelTema = fuentes.map((fuente, indice) => ({
        id: `creada-${indice}-${Date.now()}`,
        titulo: fuente.nombre,
        url: fuente.url,
      }));
      localStorage.setItem(`chispa-fuentes-${id}`, JSON.stringify(fuentesDelTema));
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

  function agregarFuente(fuenteElegida?: Fuente) {
    const entrada = nuevaFuente.trim();
    if (!fuenteElegida && !entrada) return;

    let fuente: Fuente;
    if (fuenteElegida) {
      fuente = fuenteElegida;
    } else {
      const esUrl = /^https?:\/\//i.test(entrada);
      // Dominio simple (ej: scholar.google.com, es.wikipedia.org, arxiv.org)
      const esDominio = /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(entrada);
      if (esUrl || esDominio) {
        try {
          const url = new URL(esUrl ? entrada : `https://${entrada}`);
          fuente = { nombre: url.hostname.replace("www.", ""), url: url.href };
        } catch {
          toast.error("Revisá la URL de la fuente");
          return;
        }
      } else {
        fuente = {
          nombre: entrada,
          url: `https://scholar.google.com/scholar?q=${encodeURIComponent(entrada)}`,
        };
      }
    }

    setFuentes((actuales) => {
      const yaExiste = actuales.some((actual) => actual.url.toLowerCase() === fuente.url.toLowerCase());
      return yaExiste ? actuales : [...actuales, fuente];
    });
    if (!fuenteElegida) setNuevaFuente("");
  }

  const valido = titulo.trim().length >= 3 && descripcion.trim().length >= 10 && tagsElegidas.length > 0;
  const iconosVisibles = TOPIC_ICONS.filter((item) => {
    const q = busquedaIcono.trim().toLocaleLowerCase("es");
    return !q || `${item.label} ${item.category}`.toLocaleLowerCase("es").includes(q);
  });

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
          </div>
          <div className="grid gap-2">
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
            <Button
              type="button"
              variant="contorno"
              className="font-pixel w-full text-[8px]"
              onClick={() => agregarFuente()}
              disabled={!nuevaFuente.trim()}
            >
              AGREGAR FUENTE
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">No se agrega ninguna fuente hasta que la elijas.</p>
            {FUENTES_RECOMENDADAS.map((fuente) => {
              const agregada = fuentes.some((actual) => actual.url === fuente.url);
              return (
                <div key={fuente.url} className="glass flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-pixel text-[8px] text-primary">{fuente.nombre.toUpperCase()}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{fuente.url}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={agregada ? "chispa" : "secondary"}
                    className="font-pixel shrink-0 text-[7px]"
                    onClick={() => agregarFuente(fuente)}
                    disabled={agregada}
                  >
                    {agregada ? "AÑADIDA" : "AÑADIR"}
                  </Button>
                </div>
              );
            })}
          </div>

          <ul className="space-y-3">
            {fuentes.length === 0 ? (
              <li className="glass p-4 text-sm text-muted-foreground">Todavía no agregaste fuentes.</li>
            ) : (
              fuentes.map((fuente) => (
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
              ))
            )}
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
            <SelectorDuracion duracion={duracion} onCambiar={setDuracion} />
            <Button
              type="button"
              variant="secondary"
              className="glass group h-auto min-h-16 min-w-20 flex-col gap-1 border border-primary/30 px-3"
              aria-label="Elegir ícono del tema"
              onClick={() => setSelectorIcono(true)}
            >
              <TopicIcon icon={icono} size={27} className="transition-transform group-hover:scale-110" />
              <span className="font-pixel text-[6px] text-muted-foreground">CAMBIAR</span>
            </Button>
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

      <Dialog open={selectorIcono} onOpenChange={setSelectorIcono}>
        <DialogContent className="glass max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden border-primary/30 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-pixel text-xs text-primary">ELEGÍ UN ÍCONO</DialogTitle>
            <DialogDescription>Será la imagen que identifica tu tema.</DialogDescription>
          </DialogHeader>
          <Input
            value={busquedaIcono}
            onChange={(event) => setBusquedaIcono(event.target.value)}
            placeholder="Buscar ciencia, arte, música…"
            aria-label="Buscar íconos"
          />
          <div className="grid max-h-[58vh] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 md:grid-cols-8">
            {iconosVisibles.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={icono === item.id ? "chispa" : "secondary"}
                className="h-20 min-w-0 flex-col gap-2 px-1"
                aria-label={`Usar ícono ${item.label}`}
                aria-pressed={icono === item.id}
                title={`${item.label} · ${item.category}`}
                onClick={() => {
                  setIcono(item.id);
                  setSelectorIcono(false);
                }}
              >
                <TopicIcon icon={item.id} size={25} className={icono === item.id ? "text-primary-foreground" : undefined} />
                <span className="font-pixel w-full truncate text-[6px]">{item.label.toUpperCase()}</span>
              </Button>
            ))}
          </div>
          {iconosVisibles.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay íconos con ese nombre.</p>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}