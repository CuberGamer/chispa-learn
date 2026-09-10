import { supabase } from "@/integrations/supabase/client";
import { calcularEstadisticas, logrosNuevos, type Estadisticas } from "./logros-calculo";

export type { Estadisticas };

export type Logro = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

/** Junta las estadísticas del usuario a partir de sus sesiones y su racha. */
export async function getEstadisticas(userId: string): Promise<Estadisticas> {
  const [{ data: sesiones, error }, { data: racha }] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("topic_id, duration_minutes, explanation_text")
      .eq("user_id", userId),
    supabase
      .from("streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (error) throw error;

  return calcularEstadisticas(sesiones, racha);
}

/** Evalúa los logros del usuario y guarda los nuevos. Devuelve los recién desbloqueados. */
export async function evaluarLogros(userId: string): Promise<Logro[]> {
  const [stats, { data: logros }, { data: mios }] = await Promise.all([
    getEstadisticas(userId),
    supabase.from("achievements").select("id, name, description, icon"),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);

  const nuevos = logrosNuevos(
    logros,
    (mios ?? []).map((m) => m.achievement_id),
    stats,
  );

  if (nuevos.length > 0) {
    await supabase
      .from("user_achievements")
      .insert(nuevos.map((l) => ({ user_id: userId, achievement_id: l.id })));
  }

  return nuevos as Logro[];
}
