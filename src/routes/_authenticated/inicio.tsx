import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCompartir } from "@/components/boton-compartir";
import { Chispa, type ChispaSkin } from "@/components/chispa";
import {
  PixelAplauso,
  PixelChat,
  PixelChispita,
  PixelDado,
  PixelEstrella,
  PixelFiltro,
  PixelFuego,
  PixelLupa,
  PixelMas,
  PixelReloj,
} from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";
import { getTemaDelDia } from "@/lib/chispa";
import { generarTemaIA } from "@/lib/temas.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — Chispa" },
      {
        name: "description",
        content: "El tema del día, el feed de la comunidad, tu racha y tus repasos pendientes.",
      },
      { property: "og:title", content: "Inicio — Chispa" },
      { property: "og:description", content: "Tu muro de aprendizaje: tema diario y feed social." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Inicio,
});

type Orden = "recientes" | "aplaudidas";

function haceCuanto(iso: string) {
  const seg = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 60) return "ahora";
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 604800) return `hace ${Math.floor(seg / 86400)} d`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function Inicio() {
  const skin = useSkin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const buscador = useRef<HTMLInputElement>(null);

  const [busqueda, setBusqueda] = useState("");
  const [panelFiltros, setPanelFiltros] = useState(false);
  const [tagActiva, setTagActiva] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [creando, setCreando] = useState(false);
  const [instruccion, setInstruccion] = useState("");

  const tema = useQuery({ queryKey: ["tema-del-dia"], queryFn: getTemaDelDia });

  const racha = useQuery({
    queryKey: ["racha"],
    queryFn: async () => {
      const { data } = await supabase
        .from("streaks")
        .select("current_streak, longest_streak")
        .maybeSingle();
      return data;
    },
  });

  const repasos = useQuery({
    queryKey: ["repasos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("study_sessions")
        .select("id, created_at, topic_id, topics(title)")
        .order("created_at", { ascending: false })
        .limit(6);
      return (data ?? []).map((s) => ({
        id: s.id,
        topicId: s.topic_id,
        titulo: (s.topics as { title: string } | null)?.title ?? "Tema",
        cuando: s.created_at,
      }));
    },
  });

  const feed = useQuery({
    queryKey: ["feed-inicio"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { data: sesiones, error } = await supabase
        .from("study_sessions")
        .select(
          "id, user_id, duration_minutes, explanation_text, created_at, topics(title, topic_tags(tags(name)))",
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;

      const filas = sesiones ?? [];
      const autores = [...new Set(filas.map((s) => s.user_id))];

      const [{ data: perfiles }, { data: claps }, { data: comentarios }, { data: favoritos }] =
        await Promise.all([
          autores.length
            ? supabase
                .from("profiles")
                .select("id, username, avatar_url, avatar_chispa_skin")
                .in("id", autores)
            : Promise.resolve({ data: [] as never[] }),
          supabase.from("session_claps").select("session_id, user_id"),
          supabase.from("session_comments").select("session_id"),
          supabase.from("session_favorites").select("session_id"),
        ]);

      const perfilPor = new Map((perfiles ?? []).map((p) => [p.id, p]));
      const conteo = new Map<string, number>();
      const mios = new Set<string>();
      (claps ?? []).forEach((c) => {
        conteo.set(c.session_id, (conteo.get(c.session_id) ?? 0) + 1);
        if (c.user_id === userId) mios.add(c.session_id);
      });
      const conteoComentarios = new Map<string, number>();
      (comentarios ?? []).forEach((c) =>
        conteoComentarios.set(c.session_id, (conteoComentarios.get(c.session_id) ?? 0) + 1),
      );
      const misFavoritos = new Set((favoritos ?? []).map((f) => f.session_id));

      return filas.map((s) => {
        const t = s.topics as {
          title: string;
          topic_tags?: Array<{ tags: { name: string } | null }>;
        } | null;
        return {
          id: s.id,
          userId: s.user_id,
          minutos: s.duration_minutes,
          texto: s.explanation_text,
          cuando: s.created_at,
          titulo: t?.title ?? "Tema",
          etiquetas: (t?.topic_tags ?? [])
            .map((tt) => tt.tags?.name)
            .filter((n): n is string => Boolean(n)),
          autor: perfilPor.get(s.user_id)?.username ?? "Alguien",
          foto: perfilPor.get(s.user_id)?.avatar_url ?? null,
          skin: (perfilPor.get(s.user_id)?.avatar_chispa_skin as ChispaSkin) ?? "clasico",
          aplausos: conteo.get(s.id) ?? 0,
          aplaudida: mios.has(s.id),
          comentarios: conteoComentarios.get(s.id) ?? 0,
          favorita: misFavoritos.has(s.id),
        };
      });
    },
  });

  const aplaudir = useMutation({
    mutationFn: async ({ id, aplaudida }: { id: string; aplaudida: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");
      if (aplaudida) {
        const { error } = await supabase
          .from("session_claps")
          .delete()
          .eq("session_id", id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("session_claps")
          .insert({ session_id: id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-inicio"] }),
    onError: () => toast.error("No pude registrar el aplauso"),
  });

  const favorito = useMutation({
    mutationFn: async ({ id, favorita }: { id: string; favorita: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");
      if (favorita) {
        const { error } = await supabase
          .from("session_favorites")
          .delete()
          .eq("session_id", id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("session_favorites")
          .insert({ session_id: id, user_id: userId });
        if (error) throw error;
      }
      return !favorita;
    },
    onSuccess: (guardada) => {
      queryClient.invalidateQueries({ queryKey: ["feed-inicio"] });
      toast.success(guardada ? "Guardada en favoritos ⭐" : "La saqué de favoritos");
    },
    onError: () => toast.error("No pude guardar el favorito"),
  });

  const etiquetasDisponibles = useMemo(() => {
    const set = new Set<string>();
    feed.data?.forEach((p) => p.etiquetas.forEach((e) => set.add(e)));
    return Array.from(set).sort();
  }, [feed.data]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = (feed.data ?? []).filter((p) => {
      if (tagActiva && !p.etiquetas.includes(tagActiva)) return false;
      if (!q) return true;
      return (
        p.titulo.toLowerCase().includes(q) ||
        p.autor.toLowerCase().includes(q) ||
        (p.texto ?? "").toLowerCase().includes(q)
      );
    });
    return orden === "aplaudidas"
      ? [...filtradas].sort((a, b) => b.aplausos - a.aplausos)
      : filtradas;
  }, [feed.data, busqueda, tagActiva, orden]);

  const streak = racha.data?.current_streak ?? 0;
  const buscando = panelFiltros || busqueda.length > 0 || Boolean(tagActiva);

  const crearTemaIA = useMutation({
    mutationFn: async (instruccion: string) => {
      const nuevo = await generarTemaIA({
        data: { instruccion: instruccion.trim() || undefined },
      });
      return nuevo;
    },
    onSuccess: (nuevo) => {
      setCreando(false);
      setInstruccion("");
      toast.success("¡Tema creado con IA! ✨");
      queryClient.invalidateQueries({ queryKey: ["tema-del-dia"] });
      navigate({ to: "/tema/$id", params: { id: nuevo.id } });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No pude crear el tema con IA"),
  });

  async function temaAleatorio() {
    const { data } = await supabase.from("topics").select("id").limit(200);
    const lista = data ?? [];
    const elegido = lista[Math.floor(Math.random() * lista.length)];
    if (!elegido) {
      // No hay temas en la base: generamos uno con IA como fallback.
      toast("No hay temas cargados, te genero uno con IA…");
      crearTemaIA.mutate("");
      return;
    }
    navigate({ to: "/tema/$id", params: { id: elegido.id } });
  }

  return (
    <main className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 pb-16 lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:px-8">
      {/* ── Columna izquierda: tema del día y accesos ── */}
      <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
        <section className="glass space-y-4 p-5">
          {tema.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : (
            <>
              <h1 className="text-xl leading-tight font-extrabold">
                {tema.data?.title ?? "Todavía no hay temas"}
              </h1>
              {tema.data?.description && (
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {tema.data.description}
                </p>
              )}
              <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4">
                <Chispa skin={skin} estado={streak > 0 ? "emocionado" : "neutral"} size="md" />
              </div>
              <Button
                variant="chispa"
                className="font-pixel w-full text-[10px]"
                disabled={!tema.data}
                onClick={() =>
                  tema.data && navigate({ to: "/tema/$id", params: { id: tema.data.id } })
                }
              >
                <PixelChispita size={13} />
                TEMA DIARIO
              </Button>
            </>
          )}
        </section>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setCreando((v) => !v)}
            className={cn(
              "glass glass-hover flex flex-col items-center gap-2 p-5 text-center",
              creando && "border-primary/50",
            )}
          >
            <PixelMas size={26} className="text-primary" />
            <span className="font-pixel text-[8px] text-muted-foreground">
              {creando ? "CERRAR" : "CREAR TEMA"}
            </span>
          </button>
          <button
            type="button"
            onClick={temaAleatorio}
            disabled={crearTemaIA.isPending}
            className="glass glass-hover flex flex-col items-center gap-2 p-5 text-center"
          >
            <PixelDado size={26} className="text-cian" />
            <span className="font-pixel text-[8px] text-muted-foreground">
              {crearTemaIA.isPending ? "GENERANDO…" : "TEMA ALEATORIO"}
            </span>
          </button>
        </div>

        {creando && (
          <form
            className="glass space-y-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!crearTemaIA.isPending) crearTemaIA.mutate(instruccion);
            }}
          >
            <p className="font-pixel text-[9px] text-primary text-glow-amarillo">
              CREAR TEMA CON IA
            </p>
            <Input
              value={instruccion}
              onChange={(e) => setInstruccion(e.target.value)}
              placeholder="¿De qué querés aprender? (ej. agujeros negros)"
              maxLength={200}
              aria-label="Instrucción para el nuevo tema"
            />
            <Button
              type="submit"
              variant="chispa"
              className="font-pixel w-full text-[10px]"
              disabled={crearTemaIA.isPending}
            >
              {crearTemaIA.isPending ? "GENERANDO…" : "CREAR ✨"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Dejalo vacío y la IA elige un tema sorprendente por vos.
            </p>
          </form>
        )}
      </aside>

      {/* ── Columna central: buscador + feed ── */}
      <section className="glass space-y-4 p-4 lg:p-5">
        <div className="relative">
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <PixelLupa size={16} />
          </span>
          <Input
            ref={buscador}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onFocus={() => setPanelFiltros(true)}
            placeholder="Buscar tema, autor o palabra clave…"
            className="h-12 pr-11"
            aria-label="Buscar en el feed"
          />
        </div>

        <h2 className="font-pixel text-center text-xs text-primary text-glow-amarillo">
          {buscando ? "TENDENCIAS" : "FEED DE LA COMUNIDAD"}
        </h2>

        {feed.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : visibles.length > 0 ? (
          <ul className="space-y-4">
            {visibles.map((p) => (
              <li key={p.id} className="glass glass-hover p-4">
                <div className="flex gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Link to="/u/$id" params={{ id: p.userId }}>
                        <AvatarUsuario
                          path={p.foto}
                          skin={p.skin}
                          nombre={p.autor}
                          size={36}
                        />
                      </Link>
                      <div className="min-w-0">
                        <Link
                          to="/u/$id"
                          params={{ id: p.userId }}
                          className="font-pixel block truncate text-[10px]"
                        >
                          {p.autor}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">
                          {haceCuanto(p.cuando)} · {p.minutos} min
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="font-pixel rounded-full border border-violeta/50 bg-accent/20 px-2.5 py-1 text-[8px]">
                        {p.titulo.toUpperCase()}
                      </span>
                      {p.etiquetas.slice(0, 2).map((e) => (
                        <span
                          key={e}
                          className="font-pixel rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[8px] text-muted-foreground"
                        >
                          {e.toUpperCase()}
                        </span>
                      ))}
                    </div>

                    {p.texto && (
                      <p className="line-clamp-4 text-sm leading-relaxed text-foreground/90">
                        {p.texto}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button
                        variant={p.aplaudida ? "chispa" : "ghost"}
                        size="sm"
                        className="font-pixel text-[9px]"
                        disabled={aplaudir.isPending}
                        onClick={() => aplaudir.mutate({ id: p.id, aplaudida: p.aplaudida })}
                      >
                        <PixelAplauso size={13} />
                        {p.aplausos}
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="font-pixel text-[9px]">
                        <Link to="/comunidad">
                          <PixelChat size={13} />
                          {p.comentarios}
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("font-pixel text-[9px]", p.favorita && "text-primary")}
                        disabled={favorito.isPending}
                        onClick={() => favorito.mutate({ id: p.id, favorita: p.favorita })}
                      >
                        <PixelEstrella size={13} />
                        {p.favorita ? "GUARDADA" : "GUARDAR"}
                      </Button>
                      <BotonCompartir id={p.id} titulo={p.titulo} variante="ghost" />
                    </div>
                  </div>

                  <Link
                    to="/e/$id"
                    params={{ id: p.id }}
                    className="hidden w-44 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 xl:flex"
                    aria-label={`Ver la explicación de ${p.titulo}`}
                  >
                    <Chispa skin={p.skin} estado="concentrado" size="sm" flotando={false} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Chispa skin={skin} estado="sorprendido" size="md" />
            <p className="text-sm text-muted-foreground">
              {buscando
                ? "No encontré nada con ese filtro."
                : "Todavía nadie compartió una explicación. ¡Podés ser el primero!"}
            </p>
          </div>
        )}
      </section>

      {/* ── Columna derecha: racha + repasos ⇄ filtros ── */}
      <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
        {buscando ? (
          <>
            <div className="glass flex items-center justify-between gap-2 p-4">
              <span className="font-pixel inline-flex items-center gap-2 text-[10px] text-cian text-glow-cian">
                <PixelFiltro size={14} />
                FILTROS
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="font-pixel text-[8px] text-muted-foreground"
                onClick={() => {
                  setPanelFiltros(false);
                  setBusqueda("");
                  setTagActiva(null);
                  buscador.current?.blur();
                }}
              >
                CERRAR
              </Button>
            </div>

            <div className="glass space-y-3 p-4">
              <p className="font-pixel text-[8px] text-muted-foreground">ORDENAR</p>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ["recientes", "MÁS RECIENTES"],
                    ["aplaudidas", "MÁS APLAUDIDAS"],
                  ] as [Orden, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOrden(id)}
                    className={cn(
                      "font-pixel rounded-full border px-3 py-2 text-[8px] transition-colors",
                      orden === id
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-white/15 bg-white/5 text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="font-pixel pt-2 text-[8px] text-muted-foreground">ETIQUETAS</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTagActiva(null)}
                  className={cn(
                    "font-pixel rounded-full border px-3 py-1.5 text-[8px]",
                    tagActiva === null
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-white/15 bg-white/5 text-muted-foreground",
                  )}
                >
                  TODAS
                </button>
                {etiquetasDisponibles.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setTagActiva((t) => (t === e ? null : e))}
                    className={cn(
                      "font-pixel rounded-full border px-3 py-1.5 text-[8px]",
                      tagActiva === e
                        ? "border-violeta bg-accent/25 text-foreground"
                        : "border-white/15 bg-white/5 text-muted-foreground",
                    )}
                  >
                    {e.toUpperCase()}
                  </button>
                ))}
                {etiquetasDisponibles.length === 0 && (
                  <p className="text-xs text-muted-foreground">Todavía no hay etiquetas.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="glass flex items-center gap-3 p-5">
              <PixelFuego size={26} className="text-primary" />
              <div>
                <p className="font-pixel text-base text-primary text-glow-amarillo">{streak}</p>
                <p className="font-pixel text-[8px] text-muted-foreground">RACHA EN DÍAS</p>
              </div>
            </div>

            <div className="glass space-y-3 p-4">
              <p className="font-pixel text-center text-[9px] text-muted-foreground">REPASOS</p>
              {repasos.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : repasos.data && repasos.data.length > 0 ? (
                <ul className="space-y-3">
                  {repasos.data.map((r) =>
                    r.topicId ? (
                      <li key={r.id}>
                        <Link
                          to="/tema/$id"
                          params={{ id: r.topicId }}
                          className="glass glass-hover flex flex-col gap-1 p-4"
                        >
                          <span className="line-clamp-2 text-sm font-semibold">{r.titulo}</span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <PixelReloj size={11} />
                            {haceCuanto(r.cuando)}
                          </span>
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : (
                <p className="px-2 pb-2 text-center text-xs text-muted-foreground">
                  Cuando estudies un tema va a aparecer acá para repasarlo.
                </p>
              )}
            </div>
          </>
        )}
      </aside>
    </main>
  );
}
