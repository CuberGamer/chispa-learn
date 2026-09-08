import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { sonarAlerta } from "@/lib/chispa";

/**
 * Estado global de la sesión de estudio en curso. Vive en el layout, así el
 * cronómetro sigue corriendo aunque el usuario cambie de pestaña dentro de la
 * app, y la dynamic island del tema puede mostrar el tiempo restante.
 */

export type FaseSesion = "timer" | "explicar";

type SesionActivaContexto = {
  /** null si no hay sesión en curso */
  activa: { temaId: string; minutos: number } | null;
  restante: number;
  pausado: boolean;
  fase: FaseSesion;
  /** Inicia la sesión si no hay una para ese tema; si ya existe, la mantiene. */
  iniciar: (temaId: string, minutos: number) => void;
  alternarPausa: () => void;
  /** Termina el cronómetro y pasa a la fase de explicación. */
  terminar: () => void;
  /** Cierra la sesión por completo (después de guardar o al abandonar). */
  cerrar: () => void;
};

const Ctx = createContext<SesionActivaContexto | null>(null);

export function SesionActivaProvider({ children }: { children: ReactNode }) {
  const [activa, setActiva] = useState<{ temaId: string; minutos: number } | null>(null);
  const [restante, setRestante] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [fase, setFase] = useState<FaseSesion>("timer");
  const activaRef = useRef(activa);
  activaRef.current = activa;

  const iniciar = useCallback((temaId: string, minutos: number) => {
    const actual = activaRef.current;
    if (actual && actual.temaId === temaId) return; // misma sesión: no reiniciar
    setActiva({ temaId, minutos });
    setRestante(minutos * 60);
    setPausado(false);
    setFase("timer");
  }, []);

  const alternarPausa = useCallback(() => setPausado((p) => !p), []);

  const terminar = useCallback(() => {
    sonarAlerta();
    setRestante(0);
    setFase("explicar");
  }, []);

  const cerrar = useCallback(() => {
    setActiva(null);
    setRestante(0);
    setPausado(false);
    setFase("timer");
  }, []);

  useEffect(() => {
    if (!activa || fase !== "timer" || pausado) return;
    const id = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          sonarAlerta();
          setFase("explicar");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [activa, fase, pausado]);

  return (
    <Ctx.Provider
      value={{ activa, restante, pausado, fase, iniciar, alternarPausa, terminar, cerrar }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSesionActiva() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSesionActiva debe usarse dentro de SesionActivaProvider");
  return ctx;
}
