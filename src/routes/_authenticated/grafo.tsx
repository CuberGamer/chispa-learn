import { createFileRoute } from "@tanstack/react-router";

import { GrafoTemas } from "@/components/grafo-temas";

export const Route = createFileRoute("/_authenticated/grafo")({
  head: () => ({
    meta: [
      { title: "Grafo de temas — Chispa" },
      { name: "description", content: "Mirá cómo se conectan los temas que estudiaste en Chispa." },
      { property: "og:title", content: "Grafo de temas — Chispa" },
      { property: "og:description", content: "Un mapa mental de todo lo que estudiaste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <main className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pb-16 lg:px-8">
      <h1 className="font-pixel text-sm text-primary text-glow-amarillo">GRAFO DE TEMAS</h1>
      <GrafoTemas />
    </main>
  ),
});
