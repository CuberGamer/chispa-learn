import { supabase } from "@/integrations/supabase/client";

/**
 * Se asegura de que la cuenta actual tenga fila en `profiles` y `streaks`.
 * Necesario porque las cuentas creadas con Google (o antes del alta automática)
 * podían quedar sin perfil y aparecían como "Alguien" en la comunidad.
 */
export async function asegurarPerfil() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) {
    const meta = user.user_metadata ?? {};
    const nombre =
      (meta["username"] as string | undefined) ??
      (meta["full_name"] as string | undefined) ??
      (meta["name"] as string | undefined) ??
      user.email?.split("@")[0] ??
      "chispa";

    await supabase.from("profiles").insert({ id: user.id, username: nombre });
  }

  const { data: racha } = await supabase
    .from("streaks")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!racha) {
    await supabase.from("streaks").insert({ user_id: user.id });
  }
}
