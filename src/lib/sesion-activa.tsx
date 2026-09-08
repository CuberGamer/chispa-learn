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
 * app, recargue la página o minimice el navegador.
 *
 * Usa timestamps en lugar de un contador local, por lo que el tiempo restante
 * es correcto incluso después de estar inactivo.
 */

export type FaseSesion = "timer" | "explicar";

type SesionGuardada = {
  temaId: string;
  minutos: number;
  restante: number;
  pausado: boolean;
  fase: FaseSesion;
  endsAt: number | null;
};

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

const CLAVE = "chispa-sesion-activa";

function ahora() {
  return Date.now();
}

export function SesionActivaProvider({ children }: { children: ReactNode }) {
  const [activa, setActiva] = useState<{ temaId: string; minutos: number } | null>(null);
  const [restante, setRestante] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [fase, setFase] = useState<FaseSesion>("timer");
  const endsAtRef = useRef<number | null>(null);

  /** Persiste el estado en localStorage para que sobreviva a recargas. */
  const persistir = useCallback(() => {
    if (!activa) {
      localStorage.removeItem(CLAVE);
      return;
    }
    const payload: SesionGuardada = {
      temaId: activa.temaId,
      minutos: activa.minutos,
      restante,
      pausado,
      fase,
      endsAt: endsAtRef.current,
    };
    localStorage.setItem(CLAVE, JSON.stringify(payload));
  }, [activa, restante, pausado, fase]);

  /** Restaura la sesión guardada, ajustando el tiempo si estaba corriendo. */
  useEffect(() => {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return;
    try {
      const guardada = JSON.parse(raw) as SesionGuardada;
      if (!guardada || guardada.fase === "explicar") {
        // Si quedó en explicar, la sesión ya terminó: limpiamos.
        localStorage.removeItem(CLAVE);
        return;
      }
      setActiva({ temaId: guardada.temaId, minutos: guardada.minutos });
      setPausado(guardada.pausado);
      setFase(guardada.fase);

      if (guardada.pausado) {
        setRestante(guardada.restante);
        endsAtRef.current = null;
      } else if (guardada.endsAt) {
        const faltante = Math.max(0, Math.ceil((guardada.endsAt - ahora()) / 1000));
        if (faltante <= 0) {
          setRestante(0);
          setFase("explicar");
          endsAtRef.current = null;
          sonarAlerta();
        } else {
          setRestante(faltante);
          endsAtRef.current = ahora() + faltante * 1000;
        }
      } else {
        setRestante(guardada.restante);
      }
    } catch {
      localStorage.removeItem(CLAVE);
    }
  }, []);

  useEffect(() => {
    persistir();
  }, [persistir]);

  const iniciar = useCallback((temaId: string, minutos: number) => {
    const raw = localStorage.getItem(CLAVE);
    if (raw) {
      try {
        const guardada = JSON.parse(raw) as SesionGuardada;
        if (guardada.temaId === temaId && guardada.fase === "timer") {
          // Misma sesión guardada: la restauramos en lugar de reiniciar.
          setActiva({ temaId, minutos: guardada.minutos });
          setPausado(guardada.pausado);
          setFase(guardada.fase);
          if (guardada.pausado) {
            setRestante(guardada.restante);
            endsAtRef.current = null;
          } else if (guardada.endsAt) {
            const faltante = Math.max(0, Math.ceil((guardada.endsAt - ahora()) / 1000));
            setRestante(faltante);
            endsAtRef.current = faltante > 0 ? guardada.endsAt : null;
            if (faltante <= 0) {
              setFase("explicar");
              sonarAlerta();
            }
          } else {
            setRestante(guardada.restante);
          }
          return;
        }
      } catch {
        /* ignorar JSON corrupto */
      }
    }

    setActiva({ temaId, minutos });
    setRestante(minutos * 60);
    setPausado(false);
    setFase("timer");
    endsAtRef.current = ahora() + minutos * 60 * 1000;
  }, []);

  const alternarPausa = useCallback(() => {
    setPausado((p) => {
      if (p) {
        // Reanudar: recalcular endsAt a partir del restante actual.
        endsAtRef.current = ahora() + restante * 1000;
        return false;
      }
      // Pausar: congelar endsAt en el restante actual.
      if (endsAtRef.current) {
        const faltante = Math.max(0, Math.ceil((endsAtRef.current - ahora()) / 1000));
        setRestante(faltante);
      }
      endsAtRef.current = null;
      return true;
    });
  }, [restante]);

  const terminar = useCallback(() => {
    sonarAlerta();
    setRestante(0);
    setPausado(false);
    setFase("explicar");
    endsAtRef.current = null;
  }, []);

  const cerrar = useCallback(() => {
    setActiva(null);
    setRestante(0);
    setPausado(false);
    setFase("timer");
    endsAtRef.current = null;
    localStorage.removeItem(CLAVE);
  }, []);

  useEffect(() => {
    if (!activa || fase !== "timer") return;
    const id = setInterval(() => {
      if (pausado || !endsAtRef.current) return;
      const faltante = Math.max(0, Math.ceil((endsAtRef.current - ahora()) / 1000));
      setRestante(faltante);
      if (faltante <= 0) {
        sonarAlerta();
        setFase("explicar");
        setPausado(false);
        endsAtRef.current = null;
      }
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
