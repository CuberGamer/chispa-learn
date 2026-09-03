import { useQuery } from "@tanstack/react-query";

import type { ChispaSkin } from "@/components/chispa";
import { supabase } from "@/integrations/supabase/client";

/** Datos básicos de la cuenta propia (para el header y los avatares). */
export function useMiPerfil() {
  return useQuery({
    queryKey: ["mi-perfil"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, avatar_chispa_skin")
        .eq("id", userId)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        username: data.username,
        avatarUrl: data.avatar_url,
        skin: (data.avatar_chispa_skin as ChispaSkin) ?? "clasico",
      };
    },
  });
}
