import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { AvatarUsuario } from "@/components/avatar-usuario";
import { DynamicIsland } from "@/components/dynamic-island";
import { MusicaProvider } from "@/lib/musica";
import { SesionActivaProvider } from "@/lib/sesion-activa";
import { Button } from "@/components/ui/button";
import {
  PixelCartas,
  PixelChispita,
  PixelEquis,
  PixelInstagram,
  PixelPlan,
  PixelTiktok,
} from "@/components/pixel-icons";
import { useMiPerfil } from "@/hooks/use-mi-perfil";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: LayoutApp,
});

const NAV = [
  { to: "/historial", label: "HISTORIAL" },
  { to: "/comunidad", label: "COMUNIDAD" },
  { to: "/inicio", label: "INICIO" },
  { to: "/biblioteca", label: "BIBLIOTECA" },
  { to: "/progreso", label: "PROGRESO" },
] as const;

const PRONTO = [
  { label: "PLANES", icon: <PixelPlan size={11} /> },
  { label: "FLASHCARDS", icon: <PixelCartas size={11} /> },
] as const;

function LayoutApp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const perfil = useMiPerfil();

  async function salir() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <MusicaProvider>
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-3 lg:px-8">
          {/* Barra superior: logo · redes · perfil */}
          <div className="flex items-center gap-3">
            <Link
              to="/inicio"
              className="glass font-pixel inline-flex items-center gap-2 px-4 py-2.5 text-[11px] text-primary text-glow-amarillo"
            >
              <PixelChispita size={18} />
              CHISPA
            </Link>

            <div className="glass ml-auto hidden items-center gap-3 px-4 py-2.5 text-muted-foreground lg:flex">
              {[PixelInstagram, PixelEquis, PixelTiktok].map((Icono, i) => (
                <span key={i} className="transition-colors hover:text-primary">
                  <Icono size={16} />
                </span>
              ))}
            </div>

            <div className="glass ml-auto flex items-center gap-2 py-1.5 pl-4 pr-1.5 lg:ml-0">
              <Link to="/perfil" className="font-pixel text-[10px] text-foreground">
                PERFIL
              </Link>
              <Link to="/perfil" aria-label="Ir a tu perfil">
                <AvatarUsuario
                  path={perfil.data?.avatarUrl ?? null}
                  skin={perfil.data?.skin ?? "clasico"}
                  nombre={perfil.data?.username ?? "Tu perfil"}
                  size={38}
                />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={salir}
                className="font-pixel text-[9px] text-muted-foreground"
              >
                SALIR
              </Button>
            </div>
          </div>

          {/* Pestañas centrales tipo red social */}
          <nav className="mt-3 flex justify-center">
            <div className="glass flex max-w-full items-center gap-1 overflow-x-auto p-1.5">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="font-pixel shrink-0 rounded-full px-4 py-2 text-[9px] text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{
                    className: cn(
                      "bg-primary/15 text-primary text-glow-amarillo text-[10px]",
                    ),
                  }}
                >
                  {item.label}
                </Link>
              ))}
              {PRONTO.map((item) => (
                <span
                  key={item.label}
                  title="Muy pronto"
                  className="font-pixel inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full px-4 py-2 text-[9px] text-muted-foreground/50"
                >
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </div>
          </nav>
        </div>
      </header>
      <div className="pt-6">
        <Outlet />
      </div>
      <DynamicIsland />
    </div>
    </MusicaProvider>
  );
}
