import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/avatar-usuario";
import type { ChispaSkin } from "@/components/chispa";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

/** Hilo de comentarios de una explicación pública. */
export function Comentarios({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");

  const comentarios = useQuery({
    queryKey: ["comentarios", sessionId],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const miId = userData.user?.id ?? null;

      const { data, error } = await supabase
        .from("session_comments")
        .select("id, user_id, body, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const filas = data ?? [];
      const autores = [...new Set(filas.map((c) => c.user_id))];
      const { data: perfiles } = autores.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, avatar_chispa_skin")
            .in("id", autores)
        : { data: [] };

      const perfilPor = new Map((perfiles ?? []).map((p) => [p.id, p]));
      return filas.map((c) => ({
        ...c,
        autor: perfilPor.get(c.user_id)?.username ?? "Alguien",
        foto: perfilPor.get(c.user_id)?.avatar_url ?? null,
        skin: (perfilPor.get(c.user_id)?.avatar_chispa_skin as ChispaSkin) ?? "clasico",
        mio: c.user_id === miId,
      }));
    },
  });

  const publicar = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");
      const { error } = await supabase
        .from("session_comments")
        .insert({ session_id: sessionId, user_id: userId, body: texto.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["comentarios", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["comunidad"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No pude comentar"),
  });

  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("session_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["comunidad"] });
    },
    onError: () => toast.error("No pude borrar el comentario"),
  });

  return (
    <div className="space-y-3 border-t border-white/10 p-4">
      {comentarios.data && comentarios.data.length > 0 ? (
        <ul className="space-y-3">
          {comentarios.data.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <Link to="/u/$id" params={{ id: c.user_id }}>
                <AvatarUsuario path={c.foto} skin={c.skin} nombre={c.autor} size={32} />
              </Link>
              <div className="min-w-0 flex-1 rounded-2xl bg-white/5 px-3 py-2">
                <Link
                  to="/u/$id"
                  params={{ id: c.user_id }}
                  className="font-pixel text-[9px] text-foreground"
                >
                  {c.autor}
                </Link>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{c.body}</p>
              </div>
              {c.mio && (
                <button
                  type="button"
                  className="font-pixel text-[9px] text-muted-foreground"
                  onClick={() => borrar.mutate(c.id)}
                >
                  BORRAR
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Todavía no hay comentarios. Rompé el hielo 👇
        </p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Sumá tu comentario…"
          rows={2}
          maxLength={600}
          className="min-h-0"
        />
        <Button
          variant="chispa"
          size="sm"
          className="font-pixel text-[10px]"
          disabled={publicar.isPending || texto.trim().length < 2}
          onClick={() => publicar.mutate()}
        >
          ENVIAR
        </Button>
      </div>
    </div>
  );
}
