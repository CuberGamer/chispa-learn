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
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-5">
        <Link to="/inicio" className="font-pixel text-xs text-primary text-glow-amarillo">
          CHISPA
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/inicio">Inicio</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/biblioteca">Biblioteca</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/historial">Historial</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/progreso">Progreso</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={salir}>
            Salir
          </Button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
