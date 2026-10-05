import { supabase } from "@/integrations/supabase/client";

export type NodoTema = {
  id: string;
  titulo: string;
  icon: string;
  materia: string;
  tags: string[];
  sesionId: string;
  palabras: Set<string>;
  grado: number;
};

export type Enlace = {
  source: string;
  target: string;
  fuerza: number;
  motivos: string[];
  manual: boolean;
  label?: string | null;
  linkId?: string;
};

export type ConexionGuardada = {
  id: string;
  topic_a: string;
  topic_b: string;
  kind: "manual" | "ignorada";
  label: string | null;
  strength: number;
};

export const COLORES_MATERIA: Record<string, string> = {
  Matemática: "#facc15",
  Física: "#38bdf8",
  Química: "#4ade80",
  Biología: "#86efac",
  Historia: "#fb923c",
  Geografía: "#2dd4bf",
  "Lengua y Literatura": "#f472b6",
  Economía: "#a78bfa",
  Tecnología: "#60a5fa",
  Arte: "#e879f9",
  Música: "#f87171",
  Filosofía: "#c4b5fd",
  General: "#94a3b8",
};
export const colorMateria = (m: string) => COLORES_MATERIA[m] ?? "#94a3b8";

const VACIAS = new Set(
  "porque cuando donde desde hasta sobre entre tambien también puede pueden tiene tienen hacer este esta estos estas ellos ellas otros otras mismo misma cada todo todos todas siempre nunca entonces aunque mientras durante según segun sobre como cómo para pero sino además ademas porque cual cuales quien quienes muchos mucha mucho muchas poco pocos tanto tanta forma parte manera ejemplo mis notas".split(
    " ",
  ),
);

function palabrasClave(texto: string): Set<string> {
  const out = new Set<string>();
  for (const w of texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-zñ]+/)) {
    if (w.length >= 5 && !VACIAS.has(w)) out.add(w);
  }
  return out;
}

export const clavePar = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export async function cargarDatosGrafo(userId: string) {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("id, topic_id, explanation_text, created_at, topics(title, icon, subject, topic_tags(tags(name)))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const nodos = new Map<string, NodoTema>();
  for (const s of data ?? []) {
    const t = s.topics as unknown as {
      title: string;
      icon: string;
      subject: string;
      topic_tags: { tags: { name: string } | null }[];
    } | null;
    if (!t) continue;
    const previo = nodos.get(s.topic_id);
    const texto = `${t.title} ${s.explanation_text ?? ""}`;
    if (previo) {
      palabrasClave(texto).forEach((w) => previo.palabras.add(w));
      continue;
    }
    nodos.set(s.topic_id, {
      id: s.topic_id,
      titulo: t.title,
      icon: t.icon,
      materia: t.subject || "General",
      tags: (t.topic_tags ?? []).map((x) => x.tags?.name).filter(Boolean) as string[],
      sesionId: s.id,
      palabras: palabrasClave(texto),
      grado: 0,
    });
  }

  const { data: links } = await (supabase as any)
    .from("topic_links")
    .select("id, topic_a, topic_b, kind, label, strength")
    .eq("user_id", userId);

  return { nodos: [...nodos.values()], conexiones: (links ?? []) as ConexionGuardada[] };
}

/** Calcula enlaces automáticos (materia + tags + palabras) y suma los manuales. */
export function calcularEnlaces(nodos: NodoTema[], conexiones: ConexionGuardada[]): Enlace[] {
  const ignoradas = new Set(conexiones.filter((c) => c.kind === "ignorada").map((c) => clavePar(c.topic_a, c.topic_b)));
  const ids = new Set(nodos.map((n) => n.id));
  const enlaces = new Map<string, Enlace>();

  for (let i = 0; i < nodos.length; i++) {
    for (let j = i + 1; j < nodos.length; j++) {
      const a = nodos[i]!;
      const b = nodos[j]!;
      const par = clavePar(a.id, b.id);
      if (ignoradas.has(par)) continue;
      let fuerza = 0;
      const motivos: string[] = [];
      if (a.materia === b.materia) {
        fuerza += 3;
        motivos.push(`Materia: ${a.materia}`);
      }
      const tags = a.tags.filter((t) => b.tags.includes(t));
      if (tags.length) {
        fuerza += Math.min(4, tags.length * 2);
        motivos.push(`Etiquetas: ${tags.join(", ")}`);
      }
      let comunes = 0;
      a.palabras.forEach((w) => b.palabras.has(w) && comunes++);
      if (comunes >= 2) {
        fuerza += Math.min(3, Math.floor(comunes / 2));
        motivos.push(`${comunes} palabras en común`);
      }
      if (fuerza > 0) enlaces.set(par, { source: a.id, target: b.id, fuerza, motivos, manual: false });
    }
  }

  for (const c of conexiones) {
    if (c.kind !== "manual" || !ids.has(c.topic_a) || !ids.has(c.topic_b)) continue;
    const par = clavePar(c.topic_a, c.topic_b);
    const previo = enlaces.get(par);
    enlaces.set(par, {
      source: c.topic_a,
      target: c.topic_b,
      fuerza: (previo?.fuerza ?? 0) + c.strength,
      motivos: [`Manual${c.label ? `: ${c.label}` : ""}`, ...(previo?.motivos ?? [])],
      manual: true,
      label: c.label,
      linkId: c.id,
    });
  }
  return [...enlaces.values()];
}
