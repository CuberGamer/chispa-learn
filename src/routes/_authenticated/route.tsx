import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
        <div className="flex items-center justify-between gap-3">
          <Link to="/inicio" className="font-pixel text-xs text-primary text-glow-amarillo">
            CHISPA
          </Link>
          <Button variant="ghost" size="sm" onClick={salir}>
            Salir
          </Button>
        </div>
        <nav className="-mx-1 mt-2 flex items-center gap-1 overflow-x-auto pb-1">
          {[
            { to: "/inicio", label: "Inicio" },
            { to: "/biblioteca", label: "Biblioteca" },
            { to: "/historial", label: "Historial" },
            { to: "/comunidad", label: "Comunidad" },
            { to: "/progreso", label: "Progreso" },
            { to: "/perfil", label: "Perfil" },
          ].map((item) => (
            <Button key={item.to} asChild variant="ghost" size="sm" className="shrink-0">
              <Link
                to={item.to}
                activeProps={{ className: "text-primary bg-surface-2" }}
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

