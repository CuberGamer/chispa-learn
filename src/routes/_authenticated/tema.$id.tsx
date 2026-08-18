import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCompartir } from "@/components/boton-compartir";
import { Chispa, BurbujaChispa, type ChispaSkin } from "@/components/chispa";
import { PixelAplauso, PixelCalendario, PixelReloj } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/tema/$id")({
  head: () => ({
    meta: [
      { title: "Tema para investigar — Chispa" },
      {
        name: "description",
        content: "Mirá de qué se trata el tema, leé explicaciones de la comunidad y arrancá cuando estés listo.",
      },
      { property: "og:title", content: "Tema para investigar — Chispa" },
      { property: "og:description", content: "Preparate y apretá iniciar para arrancar el cronómetro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DetalleTema,
});

function DetalleTema() {
  const { id } = Route.useParams();
  const skin = useSkin();
  const navigate = useNavigate();

  const tema = useQuery({
    queryKey: ["tema-detalle", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, description, duration_suggested, topic_tags(tags(name))")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const publicaciones = useQuery({
    queryKey: ["tema-publicaciones", id],
    queryFn: async () => {
      const { data: sesiones, error } = await supabase
        .from("study_sessions")
        .select("id, user_id, duration_minutes, explanation_text, created_at")
        .eq("topic_id", id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;

      const filas = sesiones ?? [];
      const autores = [...new Set(filas.map((s) => s.user_id))];

      const [{ data: perfiles }, { data: claps }] = await Promise.all([
        autores.length
          ? supabase
              .from("profiles")
              .select("id, username, avatar_url, avatar_chispa_skin")
              .in("id", autores)
          : Promise.resolve({
              data: [] as {
                id: string;
                username: string;
                avatar_url: string | null;
                avatar_chispa_skin: string;
              }[],
            }),
        supabase.from("session_claps").select("session_id"),
      ]);

      const perfilPor = new Map((perfiles ?? []).map((p) => [p.id, p]));
      const conteo = new Map<string, number>();
      (claps ?? []).forEach((c) =>
        conteo.set(c.session_id, (conteo.get(c.session_id) ?? 0) + 1),
      );

      return filas.map((s) => ({
        ...s,
        autor: perfilPor.get(s.user_id)?.username ?? "Alguien",
        foto: perfilPor.get(s.user_id)?.avatar_url ?? null,
        skin: (perfilPor.get(s.user_id)?.avatar_chispa_skin as ChispaSkin) ?? "clasico",
        aplausos: conteo.get(s.id) ?? 0,
      }));
    },
  });

  const etiquetas =
    tema.data?.topic_tags
      ?.map((tt) => (tt.tags as { name: string } | null)?.name)
      .filter((n): n is string => Boolean(n)) ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 pb-16">
      <Button asChild variant="ghost" size="sm" className="font-pixel text-[9px] text-muted-foreground">
        <Link to="/biblioteca">◀ VOLVER A LA BIBLIOTECA</Link>
      </Button>

      {tema.isLoading ? (
        <Skeleton className="h-44 w-full" />
      ) : tema.data ? (
        <section className="glass space-y-4 p-6">
          <div className="flex items-start gap-4">
            <Chispa skin={skin} estado="concentrado" size="sm" flotando={false} />
            <div className="min-w-0 space-y-2">
              <h1 className="text-xl font-bold leading-tight">{tema.data.title}</h1>
              {tema.data.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tema.data.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <PixelReloj size={12} />
              {tema.data.duration_suggested} min sugeridos
            </span>
            {etiquetas.map((n) => (
              <span
                key={n}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                {n}
              </span>
            ))}
          </div>

          <BurbujaChispa>
            Cuando estés listo apretá iniciar: ahí arranca el cronómetro y no antes.
          </BurbujaChispa>

          <Button
            variant="chispa"
            size="xl"
            className="font-pixel w-full text-xs"
            onClick={() =>
              navigate({
                to: "/sesion",
                search: { tema: tema.data!.id, minutos: tema.data!.duration_suggested },
              })
            }
          >
            INICIAR CRONÓMETRO
          </Button>
        </section>
      ) : (
        <div className="glass p-6 text-center text-sm text-muted-foreground">
          No encontré este tema.
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-pixel text-xs text-primary text-glow-amarillo">
          QUIÉNES YA LO HICIERON
        </h2>

        {publicaciones.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : publicaciones.data && publicaciones.data.length > 0 ? (
          <ul className="space-y-4">
            {publicaciones.data.map((s) => (
              <li key={s.id} className="glass glass-hover space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <AvatarUsuario path={s.foto} skin={s.skin} nombre={s.autor} />
                  <div className="min-w-0 flex-1">
                    <p className="font-pixel truncate text-[10px]">{s.autor}</p>
                    <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <PixelCalendario />
                        {new Date(s.created_at).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <PixelReloj />
                        {s.duration_minutes} min
                      </span>
                    </p>
                  </div>
                </div>

                {s.explanation_text && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {s.explanation_text}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-pixel inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <PixelAplauso />
                    {s.aplausos}
                  </span>
                  <BotonCompartir id={s.id} titulo={tema.data?.title ?? "Tema"} variante="ghost" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="glass flex flex-col items-center gap-3 p-6 text-center">
            <Chispa skin={skin} estado="sorprendido" size="sm" />
            <BurbujaChispa>
              Nadie compartió este tema todavía. ¡Podés ser la primera explicación!
            </BurbujaChispa>
          </div>
        )}
      </section>
    </main>
  );
}
