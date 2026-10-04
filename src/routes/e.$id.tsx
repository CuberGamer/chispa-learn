import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCompartir } from "@/components/boton-compartir";
import { BotonReportar } from "@/components/boton-reportar";
import { Chispa, BurbujaChispa, type ChispaSkin } from "@/components/chispa";
import {
  PixelCalendario,
  PixelChispita,
  PixelReloj,
} from "@/components/pixel-icons";
import { TopicIcon } from "@/components/topic-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/e/$id")({
  head: () => ({
    meta: [
      { title: "Una explicación compartida — Chispa" },
      {
        name: "description",
        content:
          "Alguien investigó un tema contra reloj y lo explicó con sus propias palabras en Chispa.",
      },
      { property: "og:type", content: "article" },
      { property: "og:title", content: "Una explicación compartida — Chispa" },
      {
        property: "og:description",
        content: "Mirá cómo alguien explicó lo que aprendió en Chispa.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { desde?: "grafo" } =>
    s.desde === "grafo" ? { desde: "grafo" } : {},
  component: ExplicacionPublica,
});

function ExplicacionPublica() {
  const { id } = Route.useParams();
  const { desde } = Route.useSearch();
  const [panel, setPanel] = useState<"fuentes" | "notas">("fuentes");
  const [fuentes, setFuentes] = useState<{ nombre: string; url: string }[]>([]);

  const sesion = useQuery({
    queryKey: ["explicacion-publica", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(
          "id, user_id, topic_id, duration_minutes, explanation_text, created_at, topics(title, description, icon, topic_tags(tags(name)))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: perfil } = await supabase
        .from("profiles")
        .select("username, avatar_url, avatar_chispa_skin")
        .eq("id", data.user_id)
        .maybeSingle();

      return {
        ...data,
        tema: data.topics as {
          title: string;
          description: string | null;
          icon: string;
          topic_tags: { tags: { name: string } | null }[] | null;
        } | null,
        titulo: (data.topics as { title: string } | null)?.title ?? "Tema",
        autor: perfil?.username ?? "Alguien",
        foto: perfil?.avatar_url ?? null,
        skin: (perfil?.avatar_chispa_skin as ChispaSkin) ?? "clasico",
      };
    },
  });

  useEffect(() => {
    const temaId = sesion.data?.topic_id;
    if (!temaId) return;
    try {
      const guardadas = JSON.parse(localStorage.getItem(`chispa-fuentes-${temaId}`) ?? "[]");
      if (Array.isArray(guardadas)) {
        setFuentes(
          guardadas.filter(
            (fuente): fuente is { nombre: string; url: string } =>
              typeof fuente?.nombre === "string" && typeof fuente?.url === "string",
          ),
        );
      }
    } catch {
      setFuentes([]);
    }
  }, [sesion.data?.topic_id]);

  const contenido = useMemo(() => {
    const texto = sesion.data?.explanation_text ?? "";
    const separador = "— Mis notas —";
    const indice = texto.indexOf(separador);
    if (indice < 0) return { explicacion: texto, notas: "" };
    return {
      explicacion: texto.slice(0, indice).trim(),
      notas: texto.slice(indice + separador.length).trim(),
    };
  }, [sesion.data?.explanation_text]);

  const etiquetas =
    sesion.data?.tema?.topic_tags
      ?.map((relacion) => relacion.tags?.name)
      .filter((nombre): nombre is string => Boolean(nombre)) ?? [];

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 pb-24 lg:px-8">
      <Link to="/" className="font-pixel inline-flex items-center gap-2 text-[10px] text-primary text-glow-amarillo">
        <PixelChispita />
        CHISPA
      </Link>

      {sesion.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Skeleton className="h-[34rem]" />
          <Skeleton className="h-[34rem]" />
        </div>
      ) : sesion.data ? (
        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-32">
            <section className="glass flex min-h-[30rem] flex-col p-4">
              <div className="flex rounded-xl bg-background/45 p-1">
                {(["fuentes", "notas"] as const).map((nombre) => (
                  <Button
                    key={nombre}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={panel === nombre}
                    onClick={() => setPanel(nombre)}
                    className={cn(
                      "font-pixel flex-1 text-[9px]",
                      panel === nombre
                        ? "bg-secondary text-foreground shadow-sm hover:bg-secondary"
                        : "text-muted-foreground",
                    )}
                  >
                    {nombre.toUpperCase()}
                  </Button>
                ))}
              </div>

              <div className="mt-4 flex-1 space-y-3">
                {panel === "fuentes" ? (
                  fuentes.length ? (
                    fuentes.map((fuente) => (
                      <a
                        key={fuente.url}
                        href={fuente.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="glass glass-hover block p-3"
                      >
                        <span className="font-pixel block truncate text-[8px] text-primary">
                          {fuente.nombre.toUpperCase()}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                          {fuente.url}
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-border px-5 text-center">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        No se compartieron fuentes con esta explicación.
                      </p>
                    </div>
                  )
                ) : contenido.notas ? (
                  <div className="rounded-xl border border-border bg-background/35 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {contenido.notas}
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-border px-5 text-center">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      No se publicaron notas con esta explicación.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {desde === "grafo" && (
              <Button asChild variant="secondary" size="lg" className="font-pixel w-full text-[10px]">
                <Link to="/grafo">VOLVER AL GRAFO</Link>
              </Button>
            )}
            {sesion.data.topic_id && (
              <Button asChild variant="chispa" size="xl" className="font-pixel w-full text-[11px]">
                <Link to="/tema/$id" params={{ id: sesion.data.topic_id }}>
                  PROBAR TEMA
                </Link>
              </Button>
            )}
          </aside>

          <article className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
              <section className="glass flex min-h-40 items-center gap-4 p-5 sm:p-6">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                  <TopicIcon icon={sesion.data.tema?.icon} size={36} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-pixel text-[8px] text-muted-foreground">TEMA RESUELTO POR</p>
                  <Link
                    to="/u/$id"
                    params={{ id: sesion.data.user_id }}
                    className="mt-2 flex w-fit max-w-full items-center gap-2 hover:text-primary"
                  >
                    <AvatarUsuario
                      path={sesion.data.foto}
                      skin={sesion.data.skin}
                      nombre={sesion.data.autor}
                      size={34}
                    />
                    <span className="font-pixel truncate text-[9px]">{sesion.data.autor}</span>
                  </Link>
                  <h1 className="mt-3 text-xl font-bold leading-tight sm:text-2xl">
                    {sesion.data.titulo}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {etiquetas.map((etiqueta) => (
                      <span
                        key={etiqueta}
                        className="font-pixel rounded-md border border-border bg-secondary px-2 py-1 text-[7px] text-muted-foreground"
                      >
                        {etiqueta.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <PixelCalendario />
                      {new Date(sesion.data.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <PixelReloj />
                      {sesion.data.duration_minutes} min
                    </span>
                  </div>
                </div>
              </section>

              <section className="glass min-h-40 p-5 sm:p-6">
                <h2 className="font-pixel text-[9px] text-muted-foreground">DESCRIPCIÓN</h2>
                <p className="mt-4 text-sm leading-relaxed text-foreground/85">
                  {sesion.data.tema?.description ?? "Este tema no tiene una descripción."}
                </p>
              </section>
            </div>

            <section className="glass min-h-[24rem] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                <h2 className="font-pixel text-[10px] text-primary text-glow-amarillo">
                  EXPLICACIÓN
                </h2>
                <div className="flex flex-wrap gap-2">
                  <BotonCompartir id={sesion.data.id} titulo={sesion.data.titulo} variante="ghost" />
                  <BotonReportar sessionId={sesion.data.id} />
                </div>
              </div>
              {contenido.explicacion ? (
                <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-foreground/90 sm:text-base">
                  {contenido.explicacion}
                </p>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">No se publicó una explicación escrita.</p>
              )}
            </section>
          </article>
        </div>
      ) : (
        <div className="glass flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin="clasico" estado="triste" size="md" />
          <BurbujaChispa>Esta explicación no existe o dejó de ser pública.</BurbujaChispa>
          <Button asChild variant="contorno" className="font-pixel text-[10px]">
            <Link to="/">IR AL INICIO</Link>
          </Button>
        </div>
      )}

      {sesion.data && (
        <section className="glass flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <Chispa skin="clasico" estado="emocionado" size="sm" />
          <BurbujaChispa>
            ¿Te copás? Investigá el mismo tema contra reloj y explicalo con tus palabras.
          </BurbujaChispa>
          <Button asChild variant="contorno" className="font-pixel shrink-0 text-[9px]">
            <Link to="/auth">SUMARME A CHISPA</Link>
          </Button>
        </section>
      )}
    </main>
  );
}
