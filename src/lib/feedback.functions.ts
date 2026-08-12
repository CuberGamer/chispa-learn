import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FeedbackIA = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  questions: string[];
};

const esquema = z.object({
  sessionId: z.string().uuid(),
});

/** Analiza la explicación de una sesión con IA y guarda el feedback. */
export const analizarExplicacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => esquema.parse(data))
  .handler(async ({ data, context }): Promise<FeedbackIA> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta la clave de IA");

    const { data: sesion, error } = await context.supabase
      .from("study_sessions")
      .select("id, explanation_text, topics(title, description)")
      .eq("id", data.sessionId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!sesion?.explanation_text) throw new Error("No encontré esa explicación");

    const tema = Array.isArray(sesion.topics) ? sesion.topics[0] : sesion.topics;

    const respuesta = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Sos Chispa, una mascota tutora argentina, cálida y directa. Evaluás explicaciones de estudiantes autodidactas usando recuperación activa. Hablás en español rioplatense (vos), breve y motivador. Nunca humillás: siempre señalás algo bueno primero.",
          },
          {
            role: "user",
            content: [
              `Tema: ${tema?.title ?? "Tema libre"}`,
              tema?.description ? `Contexto del tema: ${tema.description}` : "",
              "",
              "Explicación del estudiante:",
              sesion.explanation_text,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "devolver_feedback",
              description: "Devuelve el feedback estructurado de la explicación",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "integer",
                    description: "Puntaje de comprensión de 0 a 100",
                  },
                  summary: {
                    type: "string",
                    description: "Resumen del feedback en 1 o 2 oraciones",
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "2 o 3 cosas que el estudiante explicó bien",
                  },
                  improvements: {
                    type: "array",
                    items: { type: "string" },
                    description: "2 o 3 huecos o errores a mejorar",
                  },
                  questions: {
                    type: "array",
                    items: { type: "string" },
                    description: "2 o 3 preguntas de repaso para la próxima vez",
                  },
                },
                required: ["score", "summary", "strengths", "improvements", "questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "devolver_feedback" } },
      }),
    });

    if (respuesta.status === 429) throw new Error("Se agotaron los intentos por ahora. Probá en un rato.");
    if (respuesta.status === 402) throw new Error("Se agotaron los créditos de IA del proyecto.");
    if (!respuesta.ok) {
      console.error("AI gateway error", respuesta.status, await respuesta.text());
      throw new Error("No pude analizar tu explicación");
    }

    const json = (await respuesta.json()) as {
      choices?: Array<{
        message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
      }>;
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("La IA no devolvió feedback");

    const parsed = z
      .object({
        score: z.coerce.number().int().min(0).max(100),
        summary: z.string(),
        strengths: z.array(z.string()).default([]),
        improvements: z.array(z.string()).default([]),
        questions: z.array(z.string()).default([]),
      })
      .parse(JSON.parse(args));

    await context.supabase
      .from("study_sessions")
      .update({
        ai_score: parsed.score,
        ai_summary: parsed.summary,
        ai_strengths: parsed.strengths,
        ai_improvements: parsed.improvements,
        ai_questions: parsed.questions,
      })
      .eq("id", sesion.id);

    return parsed;
  });
