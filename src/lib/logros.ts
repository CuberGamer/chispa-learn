import { supabase } from "@/integrations/supabase/client";

export type Logro = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type Estadisticas = {
  sesiones: number;
  temasDistintos: number;
  minutos: number;
  rachaActual: number;
  rachaMaxima: number;
  promedioScore: number | null;
  explicacionMasLarga: number;
};

/** Junta las estadísticas del usuario a partir de sus sesiones y su racha. */
export async function getEstadisticas(userId: string): Promise<Estadisticas> {
  const [{ data: sesiones, error }, { data: racha }] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("topic_id, duration_minutes, explanation_text, ai_score")
      .eq("user_id", userId),
    supabase
      .from("streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (error) throw error;

  const filas = sesiones ?? [];
  const scores = filas
    .map((s) => s.ai_score)
    .filter((n): n is number => typeof n === "number");

  return {
    sesiones: filas.length,
    temasDistintos: new Set(filas.map((s) => s.topic_id)).size,
    minutos: filas.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0),
    rachaActual: racha?.current_streak ?? 0,
    rachaMaxima: racha?.longest_streak ?? 0,
    promedioScore: scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null,
    explicacionMasLarga: filas.reduce(
      (max, s) => Math.max(max, s.explanation_text?.length ?? 0),
      0,
    ),
  };
}

/** Reglas de desbloqueo por nombre de logro. */
function cumple(nombre: string, e: Estadisticas) {
  switch (nombre) {
    case "Primera chispa":
      return e.sesiones >= 1;
    case "Diez temas":
      return e.temasDistintos >= 10;
    case "Racha de 7":
      return e.rachaMaxima >= 7 || e.rachaActual >= 7;
    case "Maratón":
      return e.minutos >= 300;
    case "Explicador":
      return e.explicacionMasLarga >= 1000;
    default:
      return false;
  }
}

/** Evalúa los logros del usuario y guarda los nuevos. Devuelve los recién desbloqueados. */
export async function evaluarLogros(userId: string): Promise<Logro[]> {
  const [stats, { data: logros }, { data: mios }] = await Promise.all([
    getEstadisticas(userId),
    supabase.from("achievements").select("id, name, description, icon"),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);

  const yaTengo = new Set((mios ?? []).map((m) => m.achievement_id));
  const nuevos = (logros ?? []).filter(
    (l) => !yaTengo.has(l.id) && cumple(l.name, stats),
  );

  if (nuevos.length > 0) {
    await supabase
      .from("user_achievements")
      .insert(nuevos.map((l) => ({ user_id: userId, achievement_id: l.id })));
  }

  return nuevos as Logro[];
}
