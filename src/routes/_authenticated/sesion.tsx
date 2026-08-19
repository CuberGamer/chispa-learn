import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Pause, Play, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Chispa, BurbujaChispa } from "@/components/chispa";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";
import { actualizarRacha, formatearTiempo, sonarAlerta } from "@/lib/chispa";
import { evaluarLogros } from "@/lib/logros";
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

function Sesion() {
  const skin = useSkin();
  const { tema: temaId, minutos } = Route.useSearch();
  const navigate = useNavigate();

  const [restante, setRestante] = useState(minutos * 60);
  const [pausado, setPausado] = useState(false);
  const [fase, setFase] = useState<"timer" | "explicar">("timer");

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

  useEffect(() => {
    if (fase !== "timer" || pausado) return;
    const id = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          clearInterval(id);
          sonarAlerta();
          setFase("explicar");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [fase, pausado]);

  const progreso = 1 - restante / (minutos * 60);

  if (fase === "explicar") {
    return (
      <Explicacion
        temaId={temaId}
        titulo={tema.data?.title ?? "Tema"}
        minutos={minutos}
        onListo={() => navigate({ to: "/inicio" })}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-5 pb-16 text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Estás investigando
        </p>
        <h1 className="mt-2 text-xl font-bold sm:text-2xl">{tema.data?.title ?? "..."}</h1>
      </div>

      <div className="relative flex size-72 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - progreso)}
            style={{ transition: "stroke-dashoffset 1s linear", filter: "drop-shadow(0 0 6px var(--primary))" }}
          />
        </svg>
        <div className="flex flex-col items-center">
          <Chispa skin={skin} estado="concentrado" size="md" />
          <p className="font-pixel mt-3 text-3xl text-primary text-glow-amarillo">
            {formatearTiempo(restante)}
          </p>
        </div>
      </div>

      <BurbujaChispa>
        {restante <= 60
          ? "¡Último minuto! Empezá a ordenar las ideas."
          : "Estoy concentrado con vos. Investigá tranquilo."}
      </BurbujaChispa>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="contorno" onClick={() => setPausado((p) => !p)}>
          {pausado ? <Play /> : <Pause />}
          {pausado ? "Seguir" : "Pausar"}
        </Button>
        <Button variant="neon" onClick={() => { sonarAlerta(); setFase("explicar"); }}>
          <SkipForward />
          Ya terminé, quiero explicar
        </Button>
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
  onListo,
}: {
  temaId: string;
  titulo: string;
  minutos: number;
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



