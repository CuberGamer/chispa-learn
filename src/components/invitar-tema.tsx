import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/avatar-usuario";
import type { ChispaSkin } from "@/components/chispa";
import { PixelPersona } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Invita a las cuentas que seguís a hacer el mismo tema.
 * Guarda una fila por invitación en `topic_invites`.
 */
export function InvitarTema({
  temaId,
  sessionId,
  etiqueta = "INVITAR A HACERLO",
  variante = "contorno",
}: {
  temaId: string;
  sessionId?: string | null;
  etiqueta?: string;
  variante?: "contorno" | "chispa" | "ghost";
}) {
  const [abierto, setAbierto] = useState(false);
  const [elegidos, setElegidos] = useState<Record<string, boolean>>({});
  const [enviando, setEnviando] = useState(false);
  const queryClient = useQueryClient();

  const seguidos = useQuery({
    queryKey: ["mis-seguidos"],
    enabled: abierto,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return [];
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);
      const ids = (follows ?? []).map((f) => f.following_id);
      if (!ids.length) return [];
      const { data: perfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, avatar_chispa_skin")
        .in("id", ids);
      return perfiles ?? [];
    },
  });

  const seleccionados = Object.keys(elegidos).filter((id) => elegidos[id]);

  async function enviar() {
    if (!seleccionados.length) {
      toast.error("Elegí al menos una persona");
      return;
    }
    setEnviando(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setEnviando(false);
      toast.error("Sesión expirada");
      return;
    }
    const filas = seleccionados.map((receptor) => ({
      topic_id: temaId,
      sender_id: userId,
      receiver_id: receptor,
      session_id: sessionId ?? null,
    }));
    const { error } = await supabase
      .from("topic_invites")
      .upsert(filas, { onConflict: "topic_id,sender_id,receiver_id" });
    setEnviando(false);
    if (error) {
      toast.error("No pude enviar la invitación");
      return;
    }
    toast.success(
      seleccionados.length === 1 ? "¡Invitación enviada! 📨" : `¡Invitaste a ${seleccionados.length} personas!`,
    );
    setElegidos({});
    setAbierto(false);
    void queryClient.invalidateQueries({ queryKey: ["invitaciones"] });
    void queryClient.invalidateQueries({ queryKey: ["paneles-perfil"] });
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button variant={variante} size="sm" className="font-pixel text-[10px]">
          <PixelPersona size={12} />
          {etiqueta}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="glass w-72 space-y-2 border-white/15 p-3" align="start">
        <p className="font-pixel text-[9px] text-muted-foreground">INVITAR A QUIENES SEGUÍS</p>
        {seguidos.isLoading ? (
          <p className="text-xs text-muted-foreground">Buscando…</p>
        ) : (seguidos.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Todavía no seguís a nadie. Seguí cuentas en la comunidad y después invitalas.
          </p>
        ) : (
          <>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {(seguidos.data ?? []).map((p) => {
                const activo = elegidos[p.id] ?? false;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setElegidos((e) => ({ ...e, [p.id]: !activo }))}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl border-2 p-2 text-left transition-colors",
                        activo
                          ? "border-primary/60 bg-primary/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                      )}
                    >
                      <AvatarUsuario
                        path={p.avatar_url}
                        skin={(p.avatar_chispa_skin as ChispaSkin) ?? "clasico"}
                        nombre={p.username}
                        size={28}
                      />
                      <span className="font-pixel flex-1 truncate text-[9px]">{p.username}</span>
                      {activo && <span className="font-pixel text-[9px] text-primary">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <Button
              variant="chispa"
              size="sm"
              className="font-pixel w-full text-[9px]"
              disabled={enviando}
              onClick={enviar}
            >
              {enviando ? "ENVIANDO…" : `ENVIAR (${seleccionados.length})`}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
