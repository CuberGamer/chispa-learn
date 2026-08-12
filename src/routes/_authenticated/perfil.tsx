import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
        content: "Cambiá tu nombre y elegí el look de Chispa que más te guste.",
      },
      { property: "og:title", content: "Tu perfil — Chispa" },
      { property: "og:description", content: "Personalizá tu nombre y el skin de la mascota." },
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

  const perfil = useQuery({
    queryKey: ["perfil"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_chispa_skin")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return { ...data, email: userData.user?.email ?? "" };
    },
  });

  useEffect(() => {
    if (perfil.data) {
      setUsername(perfil.data.username ?? "");
      setSkin((perfil.data.avatar_chispa_skin as ChispaSkin) ?? "clasico");
    }
  }, [perfil.data]);

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
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 pb-16">
      <div className="flex items-center gap-4">
        <Chispa estado="emocionado" size="sm" skin={skin} flotando={false} />
        <div>
          <h1 className="text-2xl font-extrabold">Tu perfil</h1>
          <p className="text-sm text-muted-foreground">
            Ponete cómodo: elegí tu nombre y el look de Chispa.
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
          <section className="panel space-y-4 p-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-semibold">
                Cómo te llamo
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
            <h2 className="text-lg font-bold">Look de Chispa</h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {SKINS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSkin(s.id)}
                    aria-pressed={skin === s.id}
                    className={cn(
                      "panel flex w-full flex-col items-center gap-3 p-5 transition-colors",
                      skin === s.id ? "border-primary" : "opacity-70 hover:opacity-100",
                    )}
                  >
                    <Chispa estado="neutral" size="sm" skin={s.id} flotando={false} />
                    <span className="text-sm font-semibold">{s.nombre}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <Button variant="chispa" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </>
      )}
    </main>
  );
}
