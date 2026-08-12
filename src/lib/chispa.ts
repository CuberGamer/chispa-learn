import { supabase } from "@/integrations/supabase/client";

export type Topic = {
  id: string;
  title: string;
  description: string | null;
  duration_suggested: number;
};

/** Fecha local en formato YYYY-MM-DD */
export function hoyISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Tema del día: igual para todos, rota cada día de forma determinista. */
export async function getTemaDelDia(): Promise<Topic | null> {
  const { data, error } = await supabase
    .from("topics")
    .select("id, title, description, duration_suggested")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const dias = Math.floor(Date.now() / 86_400_000);
  return data[dias % data.length] as Topic;
}

export function formatearTiempo(segundos: number) {
  const m = Math.floor(Math.max(0, segundos) / 60);
  const s = Math.max(0, segundos) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Actualiza la racha del usuario luego de guardar una sesión. */
export async function actualizarRacha(userId: string) {
  const hoy = hoyISO();
  const ayer = hoyISO(new Date(Date.now() - 86_400_000));

  const { data: racha } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak, last_study_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (!racha) {
    await supabase
      .from("streaks")
      .insert({ user_id: userId, current_streak: 1, longest_streak: 1, last_study_date: hoy });
    return { current: 1, rota: false };
  }

  if (racha.last_study_date === hoy) {
    return { current: racha.current_streak, rota: false };
  }

  const continua = racha.last_study_date === ayer;
  const actual = continua ? racha.current_streak + 1 : 1;
  const rota = !continua && (racha.current_streak ?? 0) > 1;

  await supabase
    .from("streaks")
    .update({
      current_streak: actual,
      longest_streak: Math.max(actual, racha.longest_streak ?? 0),
      last_study_date: hoy,
    })
    .eq("user_id", userId);

  return { current: actual, rota };
}

/** Alerta sonora al terminar el cronómetro (sin archivos externos). */
export function sonarAlerta() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notas = [660, 880, 1180];
    notas.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* el navegador puede bloquear el audio; no es crítico */
  }
}
