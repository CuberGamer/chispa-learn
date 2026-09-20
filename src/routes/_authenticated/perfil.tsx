import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { PanelesPerfil } from "@/components/paneles-perfil";
import { Chispa, SKINS, type ChispaSkin } from "@/components/chispa";
import {
  PixelCalendario,
  PixelChispita,
  PixelFuego,
  PixelPersona,
  PixelReloj,
} from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Tu perfil — Chispa" },
      {
        name: "description",
        content: "Cambiá tu foto, tu nombre y elegí el look de Chispa que más te guste.",
      },
      { property: "og:title", content: "Tu perfil — Chispa" },
      {
        property: "og:description",
        content: "Personalizá tu foto de perfil, tu nombre y el skin de la mascota.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [editando, setEditando] = useState(false);
  const [skin, setSkin] = useState<ChispaSkin>("clasico");
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const inputFoto = useRef<HTMLInputElement | null>(null);

  const perfil = useQuery({
    queryKey: ["perfil"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");

      const [{ data, error }, { data: racha }, { data: sesiones }, { data: follows }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, bio, avatar_chispa_skin, avatar_url, created_at")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("streaks")
            .select("current_streak, longest_streak")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("study_sessions")
            .select("id, duration_minutes, is_public")
            .eq("user_id", userId),
          supabase.from("user_follows").select("follower_id, following_id"),
        ]);
      if (error) throw error;

      const relaciones = follows ?? [];
      const filas = sesiones ?? [];

      return {
        ...data,
        id: data?.id ?? userId,
        email: userData.user?.email ?? "",
        rachaActual: racha?.current_streak ?? 0,
        rachaMaxima: racha?.longest_streak ?? 0,
        minutos: filas.reduce((a, s) => a + (s.duration_minutes ?? 0), 0),
        publicas: filas.filter((s) => s.is_public).length,
        seguidores: relaciones.filter((f) => f.following_id === userId).length,
        siguiendoCantidad: relaciones.filter((f) => f.follower_id === userId).length,
      };
    },
  });

  useEffect(() => {
    if (perfil.data) {
      setUsername(perfil.data.username ?? "");
      setBio(perfil.data.bio ?? "");
      setSkin((perfil.data.avatar_chispa_skin as ChispaSkin) ?? "clasico");
    }
  }, [perfil.data]);

  async function subirFoto(archivo: File) {
    const userId = perfil.data?.id;
    if (!userId) return;
    if (!archivo.type.startsWith("image/")) {
      toast.error("Elegí una imagen (jpg, png o webp)");
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede pesar más de 5 MB");
      return;
    }

    setSubiendo(true);
    try {
      const ext = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: subida } = await supabase.storage
        .from("avatars")
        .upload(path, archivo, { upsert: true, contentType: archivo.type });
      if (subida) throw subida;

      const anterior = perfil.data?.avatar_url;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", userId);
      if (error) throw error;

      if (anterior) await supabase.storage.from("avatars").remove([anterior]);

      toast.success("¡Nueva foto de perfil! 📸");
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude subir la foto");
    } finally {
      setSubiendo(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  async function quitarFoto() {
    const userId = perfil.data?.id;
    const anterior = perfil.data?.avatar_url;
    if (!userId || !anterior) return;
    setSubiendo(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    if (!error) await supabase.storage.from("avatars").remove([anterior]);
    setSubiendo(false);
    if (error) {
      toast.error("No pude quitar la foto");
      return;
    }
    toast.success("Volvés a mostrar tu Chispa");
    await queryClient.invalidateQueries();
  }

  async function guardar() {
    const nombre = username.trim();
    if (nombre.length < 2) {
      toast.error("Tu nombre necesita al menos 2 letras");
      return;
    }
    setGuardando(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: nombre, bio: bio.trim() || null, avatar_chispa_skin: skin })
      .eq("id", perfil.data?.id as string);
    setGuardando(false);
    if (error) {
      toast.error("No pude guardar los cambios");
      return;
    }
    setEditando(false);
    toast.success("¡Listo! Guardado");
    void queryClient.invalidateQueries({ queryKey: ["perfil"] });
    void queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });
    void queryClient.invalidateQueries({ queryKey: ["skin"] });
  }

  async function salir() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (perfil.isLoading || !perfil.data) {
    return (
      <main className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pb-16 lg:px-8">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </main>
    );
  }

  const d = perfil.data;

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pb-16 lg:px-8">
      {/* Cabecera: foto editable · nombre y descripción editables · racha */}
      <div className="glass grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)_180px] lg:items-center">
        <div className="flex justify-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => inputFoto.current?.click()}
              disabled={subiendo}
              aria-label="Cambiar tu foto de perfil"
              className="rounded-full transition-transform active:scale-[0.98]"
            >
              <AvatarUsuario
                path={d.avatar_url ?? null}
                skin={skin}
                nombre={username}
                size={180}
                className="max-w-full border-primary/40"
              />
            </button>
            <button
              type="button"
              onClick={() => inputFoto.current?.click()}
              disabled={subiendo}
              aria-label="Cambiar tu foto de perfil"
              className="font-pixel absolute -bottom-1 -right-1 rounded-full border-2 border-primary/60 bg-background/90 px-3 py-2 text-[9px] text-primary"
            >
              {subiendo ? "…" : "✎"}
            </button>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void subirFoto(f);
              }}
            />
          </div>
        </div>

        <div className="glass space-y-3 p-5">
          {editando ? (
            <div className="space-y-3">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={32}
                placeholder="Tu nombre"
              />
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={2}
                placeholder="Descripción de tu cuenta"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="chispa"
                  size="sm"
                  className="font-pixel text-[9px]"
                  disabled={guardando}
                  onClick={guardar}
                >
                  {guardando ? "GUARDANDO…" : "GUARDAR"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-pixel text-[9px]"
                  onClick={() => {
                    setUsername(d.username ?? "");
                    setBio(d.bio ?? "");
                    setEditando(false);
                  }}
                >
                  CANCELAR
                </Button>
                {d.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-pixel text-[9px] text-muted-foreground"
                    disabled={subiendo}
                    onClick={quitarFoto}
                  >
                    QUITAR FOTO
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-pixel flex-1 truncate text-base text-primary text-glow-amarillo">
                  {(d.username ?? "").toUpperCase()}
                </h1>
                <Button
                  variant="contorno"
                  size="sm"
                  className="font-pixel text-[9px]"
                  onClick={() => setEditando(true)}
                >
                  ✎ EDITAR
                </Button>
                <span className="font-pixel rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[9px] text-muted-foreground">
                  {d.seguidores} SEGUIDORES
                </span>
              </div>
              <p className="border-b border-dashed border-white/15 pb-2 text-sm text-muted-foreground">
                {d.bio?.trim() ? d.bio : "Agregá una descripción de tu cuenta con ✎ EDITAR."}
              </p>
              <p className="text-sm text-muted-foreground">
                {d.publicas} explicaciones públicas · {d.siguiendoCantidad} siguiendo
              </p>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <PixelCalendario size={12} />
                {d.created_at
                  ? `Desde ${new Date(d.created_at).toLocaleDateString("es-AR", {
                      month: "long",
                      year: "numeric",
                    })}`
                  : d.email}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-1">
          <PixelFuego size={64} className="text-primary" />
          <p className="font-pixel text-lg text-primary text-glow-amarillo">{d.rachaActual}</p>
          <p className="font-pixel text-[8px] text-muted-foreground">RACHA</p>
        </div>
      </div>

      {/* Métricas rápidas */}
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "RACHA MÁXIMA", valor: `${d.rachaMaxima} d`, icon: <PixelFuego size={14} /> },
          { label: "MINUTOS", valor: `${d.minutos}`, icon: <PixelReloj size={14} /> },
          { label: "PÚBLICAS", valor: `${d.publicas}`, icon: <PixelChispita size={14} /> },
          { label: "SIGUIENDO", valor: `${d.siguiendoCantidad}`, icon: <PixelPersona size={14} /> },
        ].map((m) => (
          <li key={m.label} className="glass glass-hover p-4">
            <p className="font-pixel inline-flex items-center gap-1.5 text-[8px] text-muted-foreground">
              {m.icon}
              {m.label}
            </p>
            <p className="font-pixel mt-2 text-sm text-foreground">{m.valor}</p>
          </li>
        ))}
      </ul>

      <PanelesPerfil userId={d.id} esMio />

      <section className="space-y-4">
        <h2 className="font-pixel text-xs text-primary text-glow-amarillo">LOOK DE CHISPA</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {SKINS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSkin(s.id)}
                aria-pressed={skin === s.id}
                className={cn(
                  "glass glass-hover flex w-full flex-col items-center gap-3 p-5",
                  skin === s.id ? "border-primary/60" : "opacity-70 hover:opacity-100",
                )}
              >
                <Chispa estado="neutral" size="sm" skin={s.id} flotando={false} />
                <span className="font-pixel text-[9px]">{s.nombre.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="chispa"
            onClick={guardar}
            disabled={guardando}
            className="font-pixel text-[10px]"
          >
            {guardando ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
          </Button>
          <Button asChild variant="ghost" className="font-pixel text-[10px]">
            <Link to="/comunidad">IR A LA COMUNIDAD</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-pixel text-xs text-foreground">CONFIGURACIÓN DE PERFIL</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cerrá tu sesión en este dispositivo.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={salir}
            className="font-pixel w-full text-[9px] sm:w-auto"
          >
            CERRAR SESIÓN
          </Button>
        </div>
      </section>
    </main>
  );
}
