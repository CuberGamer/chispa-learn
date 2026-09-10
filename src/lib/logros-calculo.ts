/**
 * Lógica pura de estadísticas y logros.
 * No conoce la base de datos: recibe filas y devuelve valores.
 */

export type Estadisticas = {
  sesiones: number;
  temasDistintos: number;
  minutos: number;
  rachaActual: number;
  rachaMaxima: number;
  explicacionMasLarga: number;
};

export type FilaSesion = {
  topic_id: string | null;
  duration_minutes: number | null;
  explanation_text: string | null;
};

export type FilaRacha = {
  current_streak: number | null;
  longest_streak: number | null;
} | null;

/** Regla de desbloqueo de cada logro, por nombre. */
export const REGLAS_LOGROS: Record<string, (e: Estadisticas) => boolean> = {
  "Primera chispa": (e) => e.sesiones >= 1,
  "Diez temas": (e) => e.temasDistintos >= 10,
  "Racha de 7": (e) => e.rachaMaxima >= 7 || e.rachaActual >= 7,
  Maratón: (e) => e.minutos >= 300,
  Explicador: (e) => e.explicacionMasLarga >= 1000,
};

/** Calcula las estadísticas del usuario a partir de sus filas de sesiones y su racha. */
export function calcularEstadisticas(
  sesiones: FilaSesion[] | null | undefined,
  racha: FilaRacha,
): Estadisticas {
  const filas = sesiones ?? [];

  return {
    sesiones: filas.length,
    temasDistintos: new Set(filas.map((s) => s.topic_id)).size,
    minutos: filas.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0),
    rachaActual: racha?.current_streak ?? 0,
    rachaMaxima: racha?.longest_streak ?? 0,
    explicacionMasLarga: filas.reduce(
      (max, s) => Math.max(max, s.explanation_text?.length ?? 0),
      0,
    ),
  };
}

/** Indica si un logro está cumplido con las estadísticas dadas. */
export function cumpleLogro(nombre: string, e: Estadisticas): boolean {
  return REGLAS_LOGROS[nombre]?.(e) ?? false;
}

/** Filtra los logros que el usuario todavía no tiene y ya cumple. */
export function logrosNuevos<T extends { id: string; name: string }>(
  todos: T[] | null | undefined,
  yaObtenidos: Iterable<string>,
  stats: Estadisticas,
): T[] {
  const yaTengo = new Set(yaObtenidos);
  return (todos ?? []).filter((l) => !yaTengo.has(l.id) && cumpleLogro(l.name, stats));
}
