import { useQuery } from "@tanstack/react-query";

import { Chispa, type ChispaSkin } from "@/components/chispa";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Avatar de una cuenta: foto subida al bucket privado `avatars` (link firmado)
 * y, si no hay foto, la mascota Chispa con el skin elegido.
 */
export function AvatarUsuario({
  path,
  skin = "clasico",
  nombre,
  size = 44,
  className,
}: {
  path?: string | null;
  skin?: ChispaSkin;
  nombre?: string;
  size?: number;
  className?: string;
}) {
  const firmado = useQuery({
    queryKey: ["avatar", path],
    enabled: Boolean(path),
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path!, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-white/5",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {firmado.data ? (
        <img
          src={firmado.data}
          alt={nombre ? `Foto de ${nombre}` : "Foto de perfil"}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <Chispa skin={skin} estado="neutral" size="sm" flotando={false} className="scale-[0.62]" />
      )}
    </span>
  );
}
