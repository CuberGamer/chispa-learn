import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PixelChispita } from "@/components/pixel-icons";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: LayoutApp,
});

function LayoutApp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function salir() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto w-full max-w-3xl px-5 py-5">
        <div className="glass flex items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/inicio"
            className="font-pixel inline-flex items-center gap-2 text-xs text-primary text-glow-amarillo"
          >
            <PixelChispita />
            CHISPA
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={salir}
            className="font-pixel text-[10px] text-muted-foreground"
          >
            SALIR
          </Button>
        </div>
        <nav className="glass mt-3 flex items-center gap-1 overflow-x-auto p-2">
          {[
            { to: "/inicio", label: "INICIO" },
            { to: "/biblioteca", label: "BIBLIOTECA" },
            { to: "/historial", label: "HISTORIAL" },
            { to: "/comunidad", label: "COMUNIDAD" },
            { to: "/progreso", label: "PROGRESO" },
            { to: "/perfil", label: "PERFIL" },
          ].map((item) => (
            <Button
              key={item.to}
              asChild
              variant="ghost"
              size="sm"
              className="font-pixel shrink-0 text-[9px] text-muted-foreground"
            >
              <Link
                to={item.to}
                activeProps={{
                  className: "text-primary bg-primary/10 text-glow-amarillo",
                }}
              >
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

