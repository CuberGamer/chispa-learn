import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/avatar-usuario";
import type { ChispaSkin } from "@/components/chispa";
import { PixelPersona } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Temas a los que otras cuentas te invitaron. */
export function InvitacionesRecibidas() {
  const queryClient = useQueryClient();

  const invitaciones = useQuery({
    queryKey: ["invitaciones"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return [];
      const { data } = await supabase
        .from("topic_invites")
        .select("id, topic_id, sender_id, created_at, topics(title)")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false });
      const filas = data ?? [];
      if (!filas.length) return [];
      const { data: perfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, avatar_chispa_skin")
        .in("id", [...new Set(filas.map((i) => i.sender_id))]);
      const perfilPor = new Map((perfiles ?? []).map((p) => [p.id, p]));
      return filas.map((i) => ({
        id: i.id,
        topicId: i.topic_id,
        titulo: (i.topics as { title: string } | null)?.title ?? "Tema",
        autor: perfilPor.get(i.sender_id) ?? null,
      }));
    },
  });

  async function descartar(id: string) {
    const { error } = await supabase.from("topic_invites").delete().eq("id", id);
    if (error) {
      toast.error("No pude descartar la invitación");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["invitaciones"] });
  }

  const filas = invitaciones.data ?? [];
  if (!filas.length) return null;

  return (
    <section className="glass space-y-3 p-5">
      <h2 className="font-pixel inline-flex items-center gap-2 text-[10px] text-primary">
        <PixelPersona size={12} />
        TE INVITARON A ESTOS TEMAS
      </h2>
      <ul className="space-y-2">
        {filas.map((i) => (
          <li key={i.id} className="glass glass-hover space-y-2 p-3">
            <div className="flex items-center gap-2">
              <AvatarUsuario
                path={i.autor?.avatar_url ?? null}
                skin={(i.autor?.avatar_chispa_skin as ChispaSkin) ?? "clasico"}
                nombre={i.autor?.username}
                size={28}
              />
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {i.autor?.username ?? "Alguien"} te invitó
              </span>
            </div>
            <p className="font-pixel text-[9px] text-foreground">{i.titulo.toUpperCase()}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="chispa" size="sm" className="font-pixel text-[9px]">
                <Link to="/tema/$id" params={{ id: i.topicId }}>
                  HACER EL TEMA
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="font-pixel text-[9px] text-muted-foreground"
                onClick={() => void descartar(i.id)}
              >
                DESCARTAR
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
