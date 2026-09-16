import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCompartir } from "@/components/boton-compartir";
import { Chispa, BurbujaChispa, type ChispaSkin } from "@/components/chispa";
import { PixelCalendario, PixelChispita, PixelReloj } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

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
  component: ExplicacionPublica,
});

function ExplicacionPublica() {
  const { id } = Route.useParams();

  const sesion = useQuery({
    queryKey: ["explicacion-publica", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("id, user_id, duration_minutes, explanation_text, created_at, topics(title)")
        .eq("id", id)
        .eq("is_public", true)
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
        titulo: (data.topics as { title: string } | null)?.title ?? "Tema",
        autor: perfil?.username ?? "Alguien",
        foto: perfil?.avatar_url ?? null,
        skin: (perfil?.avatar_chispa_skin as ChispaSkin) ?? "clasico",
      };
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8">
      <Link to="/" className="font-pixel inline-flex items-center gap-2 text-xs text-primary text-glow-amarillo">
        <PixelChispita />
        CHISPA
      </Link>

      {sesion.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : sesion.data ? (
        <>
          <article className="glass space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Link to="/u/$id" params={{ id: sesion.data.user_id }}>
                <AvatarUsuario
                  path={sesion.data.foto}
                  skin={sesion.data.skin}
                  nombre={sesion.data.autor}
                />
              </Link>
              <div className="min-w-0">
                <Link
                  to="/u/$id"
                  params={{ id: sesion.data.user_id }}
                  className="font-pixel block truncate text-[10px] hover:text-primary"
                >
                  {sesion.data.autor}
                </Link>
                <p className="truncate text-sm text-primary">{sesion.data.titulo}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
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

            {sesion.data.explanation_text && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {sesion.data.explanation_text}
              </p>
            )}

            <BotonCompartir id={sesion.data.id} titulo={sesion.data.titulo} />
          </article>

          <div className="glass flex flex-col items-center gap-4 p-6 text-center">
            <Chispa skin="clasico" estado="emocionado" size="sm" />
            <BurbujaChispa>
              ¿Te copás? Elegí un tema, investigalo contra reloj y explicalo con tus palabras.
            </BurbujaChispa>
            <Button asChild variant="chispa" className="font-pixel text-[10px]">
              <Link to="/auth">EMPEZAR GRATIS</Link>
            </Button>
          </div>
        </>
      ) : (
        <div className="glass flex flex-col items-center gap-4 p-8 text-center">
          <Chispa skin="clasico" estado="triste" size="md" />
          <BurbujaChispa>Esta explicación no existe o dejó de ser pública.</BurbujaChispa>
          <Button asChild variant="contorno" className="font-pixel text-[10px]">
            <Link to="/">IR AL INICIO</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
