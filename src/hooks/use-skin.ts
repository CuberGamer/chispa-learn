import { useQuery } from "@tanstack/react-query";

import type { ChispaSkin } from "@/components/chispa";
import { supabase } from "@/integrations/supabase/client";

/** Devuelve el skin elegido por el usuario para la mascota. */
export function useSkin(): ChispaSkin {
  const { data } = useQuery({
    queryKey: ["skin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return "clasico";
      const { data: perfil } = await supabase
        .from("profiles")
        .select("avatar_chispa_skin")
        .eq("id", userId)
        .maybeSingle();
      return (perfil?.avatar_chispa_skin as ChispaSkin) ?? "clasico";
    },
    staleTime: 5 * 60 * 1000,
  });

  return data ?? "clasico";
}
