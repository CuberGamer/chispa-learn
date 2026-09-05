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
 * Reproductor de música local: el usuario sube archivos de audio de su
 * dispositivo y suenan mientras estudia. Todo vive en memoria (URLs objeto).
 */

export type Pista = { id: string; nombre: string; url: string };

type MusicaContexto = {
  pistas: Pista[];
  /** Índice de la pista actual; -1 si no hay ninguna cargada. */
  indice: number;
  actual: Pista | null;
  sonando: boolean;
  /** 0..1 */
  progreso: number;
  agregarArchivos: (archivos: Iterable<File>) => void;
  reproducir: (i: number) => void;
  alternar: () => void;
  siguiente: () => void;
  anterior: () => void;
  quitarTodo: () => void;
  irA: (fraccion: number) => void;
};

const Ctx = createContext<MusicaContexto | null>(null);

export function MusicaProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pistas, setPistas] = useState<Pista[]>([]);
  const [indice, setIndice] = useState(-1);
  const [sonando, setSonando] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const pistasRef = useRef(pistas);
  pistasRef.current = pistas;
  const indiceRef = useRef(indice);
  indiceRef.current = indice;

  const reproducir = useCallback((i: number) => {
    const lista = pistasRef.current;
    const audio = audioRef.current;
    if (!audio || lista.length === 0) return;
    const idx = ((i % lista.length) + lista.length) % lista.length;
    const pista = lista[idx];
    if (!pista) return;
    if (audio.src !== pista.url) audio.src = pista.url;
    void audio.play().catch(() => setSonando(false));
    setIndice(idx);
    setSonando(true);
  }, []);

  const siguiente = useCallback(() => {
    if (pistasRef.current.length) reproducir(indiceRef.current + 1);
  }, [reproducir]);

  const anterior = useCallback(() => {
    if (pistasRef.current.length) reproducir(indiceRef.current - 1);
  }, [reproducir]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const alTiempo = () =>
      setProgreso(audio.duration ? audio.currentTime / audio.duration : 0);
    const alTerminar = () => {
      const lista = pistasRef.current;
      if (lista.length > 1) {
        const idx = (indiceRef.current + 1) % lista.length;
        const pista = lista[idx];
        if (pista) {
          audio.src = pista.url;
          void audio.play().catch(() => setSonando(false));
          setIndice(idx);
        }
      } else {
        setSonando(false);
        setProgreso(0);
      }
    };
    audio.addEventListener("timeupdate", alTiempo);
    audio.addEventListener("ended", alTerminar);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", alTiempo);
      audio.removeEventListener("ended", alTerminar);
      audioRef.current = null;
    };
  }, []);

  const agregarArchivos = useCallback(
    (archivos: Iterable<File>) => {
      const nuevas: Pista[] = [];
      for (const f of archivos) {
        if (!f.type.startsWith("audio/")) continue;
        nuevas.push({
          id: crypto.randomUUID(),
          nombre: f.name.replace(/\.[a-z0-9]+$/i, ""),
          url: URL.createObjectURL(f),
        });
      }
      if (!nuevas.length) return;
      setPistas((p) => {
        const lista = [...p, ...nuevas];
        if (indiceRef.current === -1) {
          // arranca la primera recién agregada
          setTimeout(() => reproducir(lista.length - nuevas.length), 0);
        }
        return lista;
      });
    },
    [reproducir],
  );

  const alternar = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (indiceRef.current === -1) {
      if (pistasRef.current.length) reproducir(0);
      return;
    }
    if (audio.paused) {
      void audio.play().catch(() => setSonando(false));
      setSonando(true);
    } else {
      audio.pause();
      setSonando(false);
    }
  }, [reproducir]);

  const quitarTodo = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.removeAttribute("src");
    pistasRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPistas([]);
    setIndice(-1);
    setSonando(false);
    setProgreso(0);
  }, []);

  const irA = useCallback((fraccion: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(1, Math.max(0, fraccion)) * audio.duration;
  }, []);

  const actual = indice >= 0 ? (pistas[indice] ?? null) : null;

  return (
    <Ctx.Provider
      value={{
        pistas,
        indice,
        actual,
        sonando,
        progreso,
        agregarArchivos,
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
