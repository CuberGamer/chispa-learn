import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const esquemaTemaIA = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(800),
  duration_suggested: z.union([z.literal(5), z.literal(15), z.literal(30)]),
  tags: z.array(z.string().min(1).max(30)).min(1).max(5),
});

const esquemaTemaManual = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(800),
  duration_suggested: z.number().int().min(5).max(120),
  icon: z.string().trim().min(1).max(40),
  tags: z.array(z.string().trim().min(1).max(30)).min(1).max(5),
});

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODELO = "google/gemini-3.7-flash";

const SYSTEM_PROMPT = `Sos un generador de temas de estudio para una app en español llamada Chispa.
Devolvé ÚNICAMENTE un objeto JSON válido (sin markdown, sin comentarios, sin bloques de código) con esta forma exacta:
{
  "title": "Título corto y atractivo del tema (máx 120 caracteres)",
  "description": "Descripción de 2-4 oraciones que invite a investigar el tema (máx 800 caracteres)",
  "duration_suggested": 5 | 15 | 30,
  "tags": ["etiqueta1", "etiqueta2", "etiqueta3"]
}
Las etiquetas deben ser palabras simples en minúsculas, sin espacios, relacionadas con el tema. Entre 1 y 5 etiquetas.`;

async function llamarLovableAI(apiKey: string, prompt: string) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "tanstack-ai-direct",
    },
    body: JSON.stringify({
      model: MODELO,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "error desconocido");
    throw new Error(`Lovable AI respondió ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("La respuesta de la IA no contiene contenido");
  return content;
}

function extraerJSON(texto: string): unknown {
  const limpio = texto.trim();
  // Primero intentamos parsear directamente
  try {
    return JSON.parse(limpio);
  } catch {
    /* continuar */
  }
  // Si viene envuelto en bloque de código markdown
  const match = limpio.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match?.[1]) {
    return JSON.parse(match[1]);
  }
  // Buscar el primer objeto JSON válido
  const objetoMatch = limpio.match(/\{[\s\S]*\}/);
  if (objetoMatch) {
    return JSON.parse(objetoMatch[0]);
  }
  throw new Error("No se pudo extraer JSON de la respuesta de la IA");
}

export const generarTemaIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        instruccion: z.string().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY no está configurado");
    }

    const prompt = data.instruccion?.trim()
      ? `Generá un tema de estudio sobre: ${data.instruccion.trim()}`
      : "Generá un tema de estudio interesante, variado y sorprendente.";

    const content = await llamarLovableAI(apiKey, prompt);
    const parsed = extraerJSON(content);
    const tema = esquemaTemaIA.parse(parsed);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Evitar duplicados por título (insensible a mayúsculas)
    const { data: existente } = await supabaseAdmin
      .from("topics")
      .select("id")
      .ilike("title", tema.title)
      .maybeSingle();

    if (existente) {
      throw new Error("Ese tema ya existe. Probá con otra instrucción.");
    }

    // Crear el tema
    const { data: topicRow, error: topicError } = await supabaseAdmin
      .from("topics")
      .insert({
        title: tema.title,
        description: tema.description,
        duration_suggested: tema.duration_suggested,
        source: "ia_generado",
      })
      .select("id, title, description, duration_suggested")
      .single();

    if (topicError || !topicRow) {
      throw new Error(topicError?.message ?? "No se pudo guardar el tema");
    }

    // Crear/obtener tags y vincularlos
    for (const tagName of tema.tags) {
      const normalized = tagName.trim().toLowerCase().replace(/\s+/g, "-");
      if (!normalized) continue;

      const { data: tagExistente } = await supabaseAdmin
        .from("tags")
        .select("id")
        .eq("name", normalized)
        .maybeSingle();

      let tagId = tagExistente?.id;
      if (!tagId) {
        const { data: nuevoTag, error: tagError } = await supabaseAdmin
          .from("tags")
          .insert({ name: normalized })
          .select("id")
          .single();
        if (tagError || !nuevoTag) {
          console.error("Error creando tag:", tagError);
          continue;
        }
        tagId = nuevoTag.id;
      }

      await supabaseAdmin.from("topic_tags").insert({ topic_id: topicRow.id, tag_id: tagId });
    }

    return {
      id: topicRow.id,
      title: topicRow.title,
      description: topicRow.description,
      duration_suggested: topicRow.duration_suggested,
    };
  });

export const crearTemaManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => esquemaTemaManual.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: topicRow, error: topicError } = await supabaseAdmin
      .from("topics")
      .insert({
        title: data.title,
        description: data.description,
        duration_suggested: data.duration_suggested,
        icon: data.icon,
        source: "usuario",
      })
      .select("id")
      .single();

    if (topicError || !topicRow) {
      throw new Error(topicError?.message ?? "No se pudo guardar el tema");
    }

    for (const tagName of data.tags) {
      const normalized = tagName.toLowerCase().replace(/\s+/g, "-");
      const { data: existente } = await supabaseAdmin
        .from("tags")
        .select("id")
        .eq("name", normalized)
        .maybeSingle();

      let tagId = existente?.id;
      if (!tagId) {
        const { data: nueva } = await supabaseAdmin
          .from("tags")
          .insert({ name: normalized })
          .select("id")
          .single();
        tagId = nueva?.id;
      }
      if (tagId) {
        await supabaseAdmin.from("topic_tags").insert({ topic_id: topicRow.id, tag_id: tagId });
      }
    }

    return { id: topicRow.id };
  });
