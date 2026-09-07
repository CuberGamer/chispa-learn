import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Música de concentración generada en el navegador con Web Audio API.
 * Son paisajes sonoros propios (ruido filtrado + acordes suaves), así que
 * no dependen de ningún archivo con derechos de autor ni de internet.
 */

export type Pista = {
  id: string;
  nombre: string;
  descripcion: string;
  /** Construye el sonido; devuelve una función para detenerlo. */
  crear: (ctx: AudioContext, destino: AudioNode) => () => void;
};

/* ————— helpers de síntesis ————— */

function bufferRuido(ctx: AudioContext, segundos = 4) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * segundos, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Ruido continuo pasado por un filtro. */
function capaRuido(
  ctx: AudioContext,
  destino: AudioNode,
  opciones: { tipo: BiquadFilterType; frecuencia: number; q?: number; volumen: number },
) {
  const fuente = ctx.createBufferSource();
  fuente.buffer = bufferRuido(ctx);
  fuente.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = opciones.tipo;
  filtro.frequency.value = opciones.frecuencia;
  if (opciones.q) filtro.Q.value = opciones.q;
  const gan = ctx.createGain();
  gan.gain.value = opciones.volumen;
  fuente.connect(filtro).connect(gan).connect(destino);
  fuente.start();
  return { fuente, filtro, gan };
}

/** Oscilación lenta sobre un parámetro (respiración del sonido). */
function vaiven(
  ctx: AudioContext,
  parametro: AudioParam,
  opciones: { periodo: number; profundidad: number; centro: number },
) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1 / opciones.periodo;
  const amp = ctx.createGain();
  amp.gain.value = opciones.profundidad;
  parametro.value = opciones.centro;
  lfo.connect(amp).connect(parametro);
  lfo.start();
  return lfo;
}

function acorde(
  ctx: AudioContext,
  destino: AudioNode,
  notas: number[],
  volumen: number,
  tipo: OscillatorType = "sine",
) {
  const osciladores = notas.map((hz, i) => {
    const osc = ctx.createOscillator();
    osc.type = tipo;
    osc.frequency.value = hz;
    const gan = ctx.createGain();
    gan.gain.value = 0;
    // cada nota respira a distinto ritmo → textura viva
    vaiven(ctx, gan.gain, {
      periodo: 11 + i * 4,
      profundidad: volumen * 0.5,
      centro: volumen * 0.6,
    });
    osc.connect(gan).connect(destino);
    osc.start();
    return osc;
  });
  return osciladores;
}

/* ————— catálogo ————— */

export const CATALOGO: Pista[] = [
  {
    id: "lluvia",
    nombre: "Lluvia tranquila",
    descripcion: "Lluvia constante para tapar el ruido de alrededor",
    crear: (ctx, destino) => {
      const a = capaRuido(ctx, destino, { tipo: "lowpass", frecuencia: 1400, volumen: 0.22 });
      const b = capaRuido(ctx, destino, { tipo: "highpass", frecuencia: 2600, volumen: 0.05 });
      const lfo = vaiven(ctx, a.filtro.frequency, { periodo: 17, profundidad: 400, centro: 1400 });
      return () => {
        a.fuente.stop();
        b.fuente.stop();
        lfo.stop();
      };
    },
  },
  {
    id: "olas",
    nombre: "Olas del mar",
    descripcion: "Olas lentas que van y vienen",
    crear: (ctx, destino) => {
      const capa = capaRuido(ctx, destino, { tipo: "lowpass", frecuencia: 900, volumen: 0.001 });
      const lfoVol = vaiven(ctx, capa.gan.gain, { periodo: 9, profundidad: 0.14, centro: 0.16 });
      const lfoFiltro = vaiven(ctx, capa.filtro.frequency, {
        periodo: 9,
        profundidad: 450,
        centro: 900,
      });
      return () => {
        capa.fuente.stop();
        lfoVol.stop();
        lfoFiltro.stop();
      };
    },
  },
  {
    id: "ruido-marron",
    nombre: "Ruido marrón",
    descripcion: "Zumbido grave y parejo, ideal para leer",
    crear: (ctx, destino) => {
      const a = capaRuido(ctx, destino, { tipo: "lowpass", frecuencia: 500, volumen: 0.28 });
      const b = capaRuido(ctx, destino, { tipo: "lowpass", frecuencia: 180, volumen: 0.18 });
      return () => {
        a.fuente.stop();
        b.fuente.stop();
      };
    },
  },
  {
    id: "drone",
    nombre: "Nebulosa",
    descripcion: "Acordes espaciales muy lentos",
    crear: (ctx, destino) => {
      const oscs = acorde(ctx, destino, [110, 164.81, 220, 329.63], 0.05);
      const fondo = capaRuido(ctx, destino, { tipo: "lowpass", frecuencia: 700, volumen: 0.05 });
      return () => {
        oscs.forEach((o) => o.stop());
        fondo.fuente.stop();
      };
    },
  },
  {
    id: "estudio",
    nombre: "Sala de estudio",
    descripcion: "Aire suave con notas cálidas de fondo",
    crear: (ctx, destino) => {
      const aire = capaRuido(ctx, destino, { tipo: "bandpass", frecuencia: 800, q: 0.7, volumen: 0.12 });
      const oscs = acorde(ctx, destino, [196, 261.63, 392], 0.035, "triangle");
      return () => {
        aire.fuente.stop();
        oscs.forEach((o) => o.stop());
      };
    },
  },
  {
    id: "alfa",
    nombre: "Ondas alfa",
    descripcion: "Pulso binaural suave para entrar en foco",
    crear: (ctx, destino) => {
      const izq = ctx.createOscillator();
      const der = ctx.createOscillator();
      izq.frequency.value = 200;
      der.frequency.value = 210; // 10 Hz de diferencia
      const panIzq = ctx.createStereoPanner();
      panIzq.pan.value = -1;
      const panDer = ctx.createStereoPanner();
      panDer.pan.value = 1;
      const gan = ctx.createGain();
      gan.gain.value = 0.06;
      izq.connect(panIzq).connect(gan);
      der.connect(panDer).connect(gan);
      gan.connect(destino);
      izq.start();
      der.start();
      const fondo = capaRuido(ctx, destino, { tipo: "lowpass", frecuencia: 600, volumen: 0.07 });
      return () => {
        izq.stop();
        der.stop();
        fondo.fuente.stop();
      };
    },
  },
];

/** Duración simbólica de un "tema" (para la barra de progreso). */
const CICLO_SEGUNDOS = 300;

type MusicaContexto = {
  pistas: Pista[];
  indice: number;
  actual: Pista | null;
  sonando: boolean;
  /** 0..1 dentro del ciclo actual */
  progreso: number;
  volumen: number;
  cambiarVolumen: (v: number) => void;
  reproducir: (i: number) => void;
  alternar: () => void;
  siguiente: () => void;
  anterior: () => void;
  quitarTodo: () => void;
  irA: (fraccion: number) => void;
  /** Niveles de frecuencia 0..1 (largo = cantidad de barras). null si no hay audio. */
  obtenerNiveles: (cantidad: number) => number[] | null;
};

const Ctx = createContext<MusicaContexto | null>(null);

export function MusicaProvider({ children }: { children: ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const analizadorRef = useRef<AnalyserNode | null>(null);
  const datosRef = useRef<Uint8Array | null>(null);
  const detenerRef = useRef<(() => void) | null>(null);
  const inicioRef = useRef(0);
  const indiceRef = useRef(-1);

  const [indice, setIndice] = useState(-1);
  const [sonando, setSonando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [volumen, setVolumen] = useState(0.7);

  indiceRef.current = indice;

  const asegurarContexto = useCallback(() => {
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.7;
      const analizador = ctx.createAnalyser();
      analizador.fftSize = 256;
      analizador.smoothingTimeConstant = 0.75;
      master.connect(analizador);
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
      analizadorRef.current = analizador;
      datosRef.current = new Uint8Array(analizador.frequencyBinCount);
    }
    void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const detenerSonido = useCallback(() => {
    detenerRef.current?.();
    detenerRef.current = null;
  }, []);

  const reproducir = useCallback(
    (i: number) => {
      const ctx = asegurarContexto();
      const master = masterRef.current;
      if (!ctx || !master) return;
      const idx = ((i % CATALOGO.length) + CATALOGO.length) % CATALOGO.length;
      const pista = CATALOGO[idx];
      if (!pista) return;
      detenerSonido();
      detenerRef.current = pista.crear(ctx, master);
      inicioRef.current = ctx.currentTime;
      setIndice(idx);
      setSonando(true);
      setProgreso(0);
    },
    [asegurarContexto, detenerSonido],
  );

  const alternar = useCallback(() => {
    const ctx = ctxRef.current;
    if (indiceRef.current === -1) {
      reproducir(0);
      return;
    }
    if (!ctx) return;
    if (ctx.state === "running") {
      void ctx.suspend();
      setSonando(false);
    } else {
      void ctx.resume();
      setSonando(true);
    }
  }, [reproducir]);

  const siguiente = useCallback(() => reproducir(indiceRef.current + 1), [reproducir]);
  const anterior = useCallback(() => reproducir(indiceRef.current - 1), [reproducir]);

  const quitarTodo = useCallback(() => {
    detenerSonido();
    void ctxRef.current?.suspend();
    setIndice(-1);
    setSonando(false);
    setProgreso(0);
  }, [detenerSonido]);

  const irA = useCallback((fraccion: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    inicioRef.current = ctx.currentTime - Math.min(1, Math.max(0, fraccion)) * CICLO_SEGUNDOS;
  }, []);

  const cambiarVolumen = useCallback((v: number) => {
    const val = Math.min(1, Math.max(0, v));
    setVolumen(val);
    if (masterRef.current) masterRef.current.gain.value = val;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const ctx = ctxRef.current;
      if (!ctx || ctx.state !== "running" || indiceRef.current === -1) return;
      const t = (ctx.currentTime - inicioRef.current) % CICLO_SEGUNDOS;
      setProgreso(t / CICLO_SEGUNDOS);
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      detenerRef.current?.();
      void ctxRef.current?.close();
    },
    [],
  );

  const actual = indice >= 0 ? (CATALOGO[indice] ?? null) : null;

  return (
    <Ctx.Provider
      value={{
        pistas: CATALOGO,
        indice,
        actual,
        sonando,
        progreso,
        volumen,
        cambiarVolumen,
        reproducir,
        alternar,
        siguiente,
        anterior,
        quitarTodo,
        irA,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMusica() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMusica debe usarse dentro de MusicaProvider");
  return ctx;
}
