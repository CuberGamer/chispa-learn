import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/avatar-usuario";
import { Chispa, SKINS, type ChispaSkin } from "@/components/chispa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
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
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_chispa_skin, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return { ...data, id: data?.id ?? userId, email: userData.user?.email ?? "" };
    },
  });

  useEffect(() => {
    if (perfil.data) {
      setUsername(perfil.data.username ?? "");
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
      .update({ username: nombre, avatar_chispa_skin: skin })
      .eq("id", perfil.data?.id as string);
    setGuardando(false);
    if (error) {
      toast.error("No pude guardar los cambios");
      return;
    }
    toast.success("¡Listo! Guardado");
    void queryClient.invalidateQueries({ queryKey: ["perfil"] });
    void queryClient.invalidateQueries({ queryKey: ["skin"] });
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 pb-16">
      <div className="glass flex items-center gap-4 p-5">
        <Chispa estado="emocionado" size="sm" skin={skin} flotando={false} />
        <div>
          <h1 className="font-pixel text-sm text-primary text-glow-amarillo">PERFIL</h1>
          <p className="text-sm text-muted-foreground">
            Ponete cómodo: foto, nombre y el look de Chispa.
          </p>
        </div>
      </div>

      {perfil.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <>
          <section className="glass flex flex-wrap items-center gap-5 p-5">
            <AvatarUsuario
              path={perfil.data?.avatar_url ?? null}
              skin={skin}
              nombre={username}
              size={88}
              className="border-primary/40"
            />
            <div className="space-y-2">
              <p className="font-pixel text-[10px] text-muted-foreground">TU FOTO DE PERFIL</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="chispa"
                  size="sm"
                  className="font-pixel text-[9px]"
                  disabled={subiendo}
                  onClick={() => inputFoto.current?.click()}
                >
                  {subiendo ? "SUBIENDO…" : "CAMBIAR FOTO"}
                </Button>
                {perfil.data?.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-pixel text-[9px] text-muted-foreground"
                    disabled={subiendo}
                    onClick={quitarFoto}
                  >
                    QUITAR
                  </Button>
                )}
              </div>
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
              <p className="text-xs text-muted-foreground">
                Si no subís foto, te muestro con tu Chispa.
              </p>
            </div>
          </section>

          <section className="glass space-y-4 p-5">
            <div className="space-y-2">
              <label htmlFor="username" className="font-pixel text-[10px] text-muted-foreground">
                CÓMO TE LLAMO
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={32}
                placeholder="Tu nombre"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tu email: <span className="text-foreground/80">{perfil.data?.email}</span>
            </p>
          </section>

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
          </section>

          <Button
            variant="chispa"
            onClick={guardar}
            disabled={guardando}
            className="font-pixel text-[10px]"
          >
            {guardando ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
          </Button>
        </>
      )}
    </main>
  );
}
