import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BotonCompartir } from "@/components/boton-compartir";
import { Chispa, BurbujaChispa } from "@/components/chispa";
import {
  PixelCheck,
  PixelLupa,
  PixelMas,
  PixelPausa,
  PixelPlay,
} from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";
import { actualizarRacha, formatearTiempo } from "@/lib/chispa";
import { evaluarLogros } from "@/lib/logros";
import { useSesionActiva } from "@/lib/sesion-activa";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  tema: z.string().uuid(),
  minutos: z.coerce.number().int().min(1).max(120).default(15),
});

export const Route = createFileRoute("/_authenticated/sesion")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sesión de estudio — Chispa" },
      { name: "description", content: "Cronómetro en marcha: investigá y después explicá lo que aprendiste." },
      { property: "og:title", content: "Sesión de estudio — Chispa" },
      { property: "og:description", content: "Investigá contra reloj y explicá lo aprendido." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Sesion,
});

type Fuente = { id: string; titulo: string; url: string };
type Pestana = { id: string; nombre: string; texto: string };

function Sesion() {
  const skin = useSkin();
  const { tema: temaId, minutos } = Route.useSearch();
  const navigate = useNavigate();
  const sesion = useSesionActiva();

  // Sincronizamos la URL con el estado global al montar: si no hay sesión
  // activa pero la URL trae parámetros, la iniciamos.
  useEffect(() => {
    if (!sesion.activa) {
      sesion.iniciar(temaId, minutos);
    }
  }, []);

  const claveNotas = `chispa-notas-${temaId}`;
  const claveFuentes = `chispa-fuentes-${temaId}`;

  /* ——— Notas en pestañas ——— */
  const [pestanas, setPestanas] = useState<Pestana[]>([
    { id: "p1", nombre: "Pestaña 1", texto: "" },
  ]);
  const [activa, setActiva] = useState("p1");

  useEffect(() => {
    const guardadas = localStorage.getItem(claveNotas);
    if (!guardadas) return;
    try {
      const parsed = JSON.parse(guardadas) as Pestana[];
      if (Array.isArray(parsed) && parsed.length && parsed[0]) {
        setPestanas(parsed);
        setActiva(parsed[0].id);
      }
    } catch {
      setPestanas([{ id: "p1", nombre: "Pestaña 1", texto: guardadas }]);
    }
  }, [claveNotas]);

  useEffect(() => {
    localStorage.setItem(claveNotas, JSON.stringify(pestanas));
  }, [claveNotas, pestanas]);

  const notas = pestanas
    .map((p) => (p.texto.trim() ? `${p.nombre}\n${p.texto.trim()}` : ""))
    .filter(Boolean)
    .join("\n\n");

  /* ——— Fuentes ——— */
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [buscarFuente, setBuscarFuente] = useState("");

  useEffect(() => {
    const g = localStorage.getItem(claveFuentes);
    if (!g) return;
    try {
      const parsed = JSON.parse(g) as Fuente[];
      if (Array.isArray(parsed)) setFuentes(parsed);
    } catch {
      /* fuentes corruptas: se ignoran */
    }
  }, [claveFuentes]);

  useEffect(() => {
    localStorage.setItem(claveFuentes, JSON.stringify(fuentes));
  }, [claveFuentes, fuentes]);

  const tema = useQuery({
    queryKey: ["tema", temaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, description")
        .eq("id", temaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const progreso = 1 - sesion.restante / (minutos * 60);
  const R = 46;
  const perimetro = 2 * Math.PI * R;

  if (sesion.fase === "explicar") {
    return (
      <Explicacion
        temaId={temaId}
        titulo={tema.data?.title ?? "Tema"}
        minutos={minutos}
        notas={notas}
        onLimpiarNotas={() => {
          localStorage.removeItem(claveNotas);
          setPestanas([{ id: "p1", nombre: "Pestaña 1", texto: "" }]);
        }}
        onListo={() => {
          sesion.cerrar();
          navigate({ to: "/inicio" });
        }}
      />
    );
  }

  const buscadas = buscarFuente.trim()
    ? fuentes.filter((f) =>
        `${f.titulo} ${f.url}`.toLowerCase().includes(buscarFuente.trim().toLowerCase()),
      )
    : fuentes;

  const notaActiva = pestanas.find((p) => p.id === activa) ?? pestanas[0]!;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        {/* ——— Fuentes ——— */}
        <section className="glass flex h-fit flex-col gap-3 p-4 lg:sticky lg:top-32">
          <div className="flex items-center gap-2">
            <h2 className="font-pixel text-[9px] text-primary text-glow-amarillo">FUENTES</h2>
            <button
              type="button"
              aria-label="Agregar fuente"
              onClick={() => {
                const url = window.prompt("Pegá el enlace de la fuente");
                if (!url) return;
                const titulo = window.prompt("¿Cómo la llamamos?") ?? url;
                setFuentes((f) => [...f, { id: crypto.randomUUID(), titulo, url }]);
              }}
              className="ml-auto flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-primary"
            >
              <PixelMas size={10} />
            </button>
          </div>

          <label className="glass flex items-center gap-2 px-3 py-2">
            <PixelLupa size={12} className="shrink-0 text-muted-foreground" />
            <input
              value={buscarFuente}
              onChange={(e) => setBuscarFuente(e.target.value)}
              placeholder="buscar en tus fuentes..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </label>

          <ul className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            {buscadas.map((f) => (
              <li key={f.id} className="glass glass-hover flex items-center gap-2 p-3">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-sm">{f.titulo}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{f.url}</span>
                </a>
                <button
                  type="button"
                  aria-label="Quitar fuente"
                  onClick={() => setFuentes((l) => l.filter((x) => x.id !== f.id))}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
            {!buscadas.length && (
              <li className="py-8 text-center text-xs text-muted-foreground">
                Guardá acá los enlaces que vas usando.
              </li>
            )}
          </ul>
        </section>

        {/* ——— Cronómetro ——— */}
        <section className="flex flex-col items-center gap-6">
          <p className="font-pixel text-center text-[10px] text-muted-foreground">
            {tema.data?.title ?? "..."}
          </p>

          <div className="relative flex aspect-square w-full max-w-[26rem] items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={perimetro}
                strokeDashoffset={perimetro * (1 - progreso)}
                style={{
                  transition: "stroke-dashoffset 1s linear",
                  filter: "drop-shadow(0 0 8px var(--primary))",
                }}
              />
            </svg>

            <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={sesion.alternarPausa}
              aria-label={sesion.pausado ? "Reanudar" : "Pausar"}
              className={`flex items-center justify-center gap-3 rounded-full border px-7 py-4 transition-transform hover:scale-105 active:scale-95 ${
                sesion.pausado
                  ? "border-primary/60 bg-primary/20 text-primary glow-amarillo animate-pulse"
                  : "glass size-16 px-0 text-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {sesion.pausado ? (
                <>
                  <PixelPlay size={26} />
                  <span className="font-pixel text-[10px]">SEGUIR</span>
                </>
              ) : (
                <PixelPausa size={30} />
              )}
            </button>
            <span
              className={`font-pixel text-4xl transition-opacity ${
                sesion.pausado ? "animate-pulse text-primary text-glow-amarillo" : "text-primary text-glow-amarillo"
              }`}
            >
              {formatearTiempo(sesion.restante)}
            </span>
            {sesion.pausado && (
              <span className="font-pixel text-[8px] text-muted-foreground">EN PAUSA</span>
            )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sonarAlerta();
              setFase("explicar");
            }}
            aria-label="Terminar y explicar"
            className="flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary glow-amarillo transition-transform hover:scale-105"
          >
            <PixelCheck size={30} />
          </button>

          <div className="flex flex-col items-center gap-2">
            <Chispa skin={skin} estado="concentrado" size="sm" />
            <BurbujaChispa>
              {restante <= 60
                ? "¡Último minuto! Empezá a ordenar las ideas."
                : "Estoy concentrado con vos. Investigá tranquilo."}
            </BurbujaChispa>
          </div>
        </section>

        {/* ——— Notas con pestañas ——— */}
        <section className="glass flex h-fit flex-col gap-3 p-4 lg:sticky lg:top-32">
          <div className="flex items-center gap-2">
            <h2 className="font-pixel text-[9px] text-primary text-glow-amarillo">NOTAS</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">Se guardan solas</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {pestanas.map((p) => (
              <button
                key={p.id}
                type="button"
                onDoubleClick={() => {
                  const nombre = window.prompt("Nombre de la pestaña", p.nombre);
                  if (nombre)
                    setPestanas((l) =>
                      l.map((x) => (x.id === p.id ? { ...x, nombre } : x)),
                    );
                }}
                onClick={() => setActiva(p.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] transition-colors",
                  p.id === activa
                    ? "bg-primary/20 text-primary"
                    : "bg-white/5 text-muted-foreground hover:text-foreground",
                )}
              >
                {p.nombre}
              </button>
            ))}
            <button
              type="button"
              aria-label="Nueva pestaña"
              onClick={() => {
                const id = crypto.randomUUID();
                setPestanas((l) => [
                  ...l,
                  { id, nombre: `Pestaña ${l.length + 1}`, texto: "" },
                ]);
                setActiva(id);
              }}
              className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-primary"
            >
              <PixelMas size={10} />
            </button>
          </div>

          <Textarea
            value={notaActiva.texto}
            onChange={(e) =>
              setPestanas((l) =>
                l.map((x) => (x.id === notaActiva.id ? { ...x, texto: e.target.value } : x)),
              )
            }
            placeholder="Anotá ideas, datos y palabras clave mientras investigás…"
            className="min-h-[22rem] resize-y bg-transparent p-3 text-sm leading-relaxed"
          />
        </section>
      </div>
    </main>
  );
}

type Reconocimiento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function Explicacion({
  temaId,
  titulo,
  minutos,
  notas,
  onLimpiarNotas,
  onListo,
}: {
  temaId: string;
  titulo: string;
  minutos: number;
  notas: string;
  onLimpiarNotas: () => void;
  onListo: () => void;
}) {
  const skin = useSkin();
  const [texto, setTexto] = useState("");
  const [dictando, setDictando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [publico, setPublico] = useState(false);
  const [guardada, setGuardada] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const recRef = useRef<Reconocimiento | null>(null);

  const detener = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setDictando(false);
  }, []);

  useEffect(() => () => recRef.current?.stop(), []);

  function dictar() {
    if (dictando) {
      detener();
      return;
    }
    const Ctor = (
      window as unknown as {
        SpeechRecognition?: new () => Reconocimiento;
        webkitSpeechRecognition?: new () => Reconocimiento;
      }
    ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Reconocimiento })
        .webkitSpeechRecognition;

    if (!Ctor) {
      toast.error("Tu navegador no soporta dictado. Escribí tu explicación y listo.");
      return;
    }

    const rec = new Ctor();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let nuevo = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r?.isFinal && r[0]) nuevo += r[0].transcript;
      }
      if (nuevo) setTexto((t) => (t ? `${t} ${nuevo.trim()}` : nuevo.trim()));
    };
    rec.onerror = () => {
      toast.error("No pude escucharte bien. Revisá el micrófono.");
      detener();
    };
    rec.onend = () => setDictando(false);
    rec.start();
    recRef.current = rec;
    setDictando(true);
    toast.success("Te escucho. Explicá con tus palabras.");
  }

  async function guardar() {
    if (texto.trim().length < 10) {
      toast.error("Escribí un poco más: contame qué entendiste.");
      return;
    }
    setGuardando(true);
    try {
      detener();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");

      const { data: sesion, error } = await supabase
        .from("study_sessions")
        .insert({
          user_id: userId,
          topic_id: temaId,
          duration_minutes: minutos,
          explanation_text: texto.trim(),
          is_public: publico,
        })
        .select("id")
        .single();
      if (error) throw error;

      const racha = await actualizarRacha(userId);
      toast.success(
        racha.current > 1 ? `¡Guardado! Racha de ${racha.current} días 🔥` : "¡Guardado! Primera chispa del día",
      );

      try {
        const nuevos = await evaluarLogros(userId);
        nuevos.forEach((l) =>
          toast.success(`🏆 Logro desbloqueado: ${l.name}`, { description: l.description }),
        );
      } catch {
        /* los logros no deben romper el flujo */
      }


      onLimpiarNotas();
      setGuardada(sesion.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pude guardar tu explicación");
    } finally {
      setGuardando(false);
    }
  }

  async function publicarAhora() {
    if (!guardada) return;
    setPublicando(true);
    const { error } = await supabase
      .from("study_sessions")
      .update({ is_public: true })
      .eq("id", guardada);
    setPublicando(false);
    if (error) {
      toast.error("No pude publicarla");
      return;
    }
    setPublico(true);
    toast.success("¡Ya está en la comunidad! 🎉");
  }

  if (guardada) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-6 px-5 pb-16">
        <div className="glass flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin={skin} estado="emocionado" size="md" />
          <h1 className="font-pixel text-sm text-primary text-glow-amarillo">
            ¡EXPLICACIÓN GUARDADA!
          </h1>
          <BurbujaChispa>
            {publico
              ? "Ya está en la comunidad. ¡Compartila con quien quieras!"
              : "Quedó guardada como privada. Si querés, publicala y compartila."}
          </BurbujaChispa>

          <div className="flex flex-wrap justify-center gap-2">
            {publico ? (
              <BotonCompartir id={guardada} titulo={titulo} variante="chispa" />
            ) : (
              <Button
                variant="chispa"
                size="sm"
                className="font-pixel text-[10px]"
                disabled={publicando}
                onClick={publicarAhora}
              >
                {publicando ? "PUBLICANDO…" : "PUBLICAR Y COMPARTIR"}
              </Button>
            )}
            <Button
              variant="contorno"
              size="sm"
              className="font-pixel text-[10px]"
              onClick={onListo}
            >
              LISTO
            </Button>
          </div>
        </div>
      </main>
    );
  }



  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-5 pb-16">
      <div className="glass flex items-center gap-4 p-5">
        <Chispa skin={skin} estado="emocionado" size="sm" flotando={false} />
        <div>
          <h1 className="font-pixel text-sm text-primary text-glow-amarillo">
            ¿QUÉ APRENDISTE?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{titulo}</p>
        </div>
      </div>

      <BurbujaChispa>
        Explicalo como si me lo enseñaras a mí. Si dictás, revisá el texto antes de guardar.
      </BurbujaChispa>

      {notas.trim() && (
        <div className="glass space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-pixel text-[10px] text-secondary">NOTAS DE TU INVESTIGACIÓN</h2>
            <Button
              variant="contorno"
              size="sm"
              className="font-pixel text-[10px]"
              onClick={() =>
                setTexto((t) => (t.trim() ? `${t.trim()}\n\n${notas.trim()}` : notas.trim()))
              }
            >
              <NotebookPen />
              USAR MIS NOTAS
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {notas.trim()}
          </p>
        </div>
      )}

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Empezá por lo más importante: ¿de qué se trata el tema? ¿Qué te sorprendió?"
        className="glass min-h-64 resize-y p-4 text-base leading-relaxed"
      />

      <button
        type="button"
        role="switch"
        aria-checked={publico}
        onClick={() => setPublico((p) => !p)}
        className="glass glass-hover flex w-full items-center gap-4 p-4 text-left"
      >
        <span
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
            publico
              ? "border-primary/60 bg-primary/30 glow-amarillo"
              : "border-white/15 bg-white/5",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 size-5 -translate-y-1/2 rounded-sm transition-all",
              publico ? "left-6 bg-primary" : "left-1 bg-muted-foreground",
            )}
          />
        </span>
        <span className="min-w-0">
          <span className="font-pixel block text-[10px] text-foreground">
            COMPARTIR EN LA COMUNIDAD
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Tu explicación aparece en el feed con tu nombre y tu Chispa. Podés cambiarlo
            después desde el historial.
          </span>
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant={dictando ? "destructive" : "contorno"}
          onClick={dictar}
          className="font-pixel text-[10px]"
        >
          {dictando ? <MicOff /> : <Mic />}
          {dictando ? "DETENER" : "DICTAR"}
        </Button>
        <span className="text-xs text-muted-foreground">{texto.trim().length} caracteres</span>
      </div>

      <Button
        variant="chispa"
        size="xl"
        className="font-pixel w-full text-xs"
        onClick={guardar}
        disabled={guardando}
      >
        {guardando ? "GUARDANDO..." : "GUARDAR EXPLICACIÓN"}
      </Button>
    </main>
  );
}



