import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Chispa } from "@/components/chispa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar a Chispa" },
      { name: "description", content: "Creá tu cuenta o iniciá sesión para estudiar con Chispa." },
      { property: "og:title", content: "Entrar a Chispa" },
      { property: "og:description", content: "Creá tu cuenta y empezá a entrenar tu aprendizaje." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [cargando, setCargando] = useState(false);
  const [avisoEmail, setAvisoEmail] = useState(false);

  useEffect(() => {
    let activo = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (activo && data.user) void navigate({ to: "/inicio", replace: true });
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setCargando(false);
        void navigate({ to: "/inicio", replace: true });
      }
    });

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  async function entrarConGoogle() {
    setCargando(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw error ?? new Error("No se pudo confirmar la sesión");
      await navigate({ to: "/inicio", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo entrar con Google");
      setCargando(false);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/inicio", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/inicio", replace: true });
        } else {
          setAvisoEmail(true);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Algo falló, probá de nuevo");
    } finally {
      setCargando(false);
    }
  }

  function cambiarModo() {
    setModo(modo === "login" ? "registro" : "login");
    setAvisoEmail(false);
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5 py-10">
      {/* Haces de luz ámbar diagonales, estilo Login V7 */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-haces absolute -inset-[30%]">
          <div className="absolute left-[-10%] top-[8%] h-40 w-[130%] rotate-[-18deg] rounded-full bg-gradient-to-r from-transparent via-primary/25 to-transparent blur-2xl" />
          <div className="absolute left-[-15%] top-[38%] h-24 w-[130%] rotate-[-18deg] rounded-full bg-gradient-to-r from-transparent via-primary/35 to-transparent blur-xl" />
          <div className="absolute left-[-5%] top-[62%] h-52 w-[130%] rotate-[-18deg] rounded-full bg-gradient-to-r from-transparent via-primary/15 to-transparent blur-3xl" />
          <div className="absolute left-[-10%] top-[82%] h-20 w-[130%] rotate-[-18deg] rounded-full bg-gradient-to-r from-transparent via-cian/20 to-transparent blur-xl" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(70rem_50rem_at_50%_120%,oklch(0.1_0.02_265/0.85),transparent)]" />
      </div>

      <div className="animate-tarjeta-in relative w-full max-w-md">
        {/* Esquinas decorativas de vidrio */}
        <div aria-hidden="true" className="glass absolute -left-3 -top-3 size-10 rounded-lg" />
        <div aria-hidden="true" className="glass absolute -bottom-3 -right-3 size-10 rounded-lg" />

        <div className="glass relative flex flex-col gap-6 p-6 sm:p-8">
          <div key={modo} className="animate-swap-in flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <Chispa estado={modo === "registro" ? "sorprendido" : "neutral"} size="lg" />
              <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">
                {modo === "login" ? (
                  <>
                    ¡Hola de <span className="text-primary text-glow-amarillo">nuevo!</span>
                  </>
                ) : (
                  <>
                    Crear <span className="text-primary text-glow-amarillo">cuenta</span>
                  </>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {modo === "login"
                  ? "Entrá y seguimos donde quedamos."
                  : "Sumate y arrancamos con tu primer tema."}
              </p>
            </div>

            {avisoEmail ? (
              <div className="space-y-4 text-center">
                <p className="text-sm">
                  Te mandé un mail a <strong>{email}</strong>. Confirmá tu cuenta desde ahí y volvé
                  para iniciar sesión.
                </p>
                <Button
                  variant="contorno"
                  className="w-full"
                  onClick={() => {
                    setAvisoEmail(false);
                    setModo("login");
                  }}
                >
                  Ya confirmé, quiero entrar
                </Button>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-4">
                {modo === "registro" && (
                  <div className="space-y-2">
                    <Label htmlFor="username">Nombre de usuario</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="chispita99"
                      autoComplete="nickname"
                      className="bg-background/40 backdrop-blur-sm"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vos@email.com"
                    autoComplete="email"
                    className="bg-background/40 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={modo === "login" ? "current-password" : "new-password"}
                    className="bg-background/40 backdrop-blur-sm"
                  />
                </div>

                <Button
                  type="submit"
                  variant="chispa"
                  size="lg"
                  disabled={cargando}
                  className="animate-brillo-btn w-full font-bold"
                >
                  {cargando ? "Un segundo..." : modo === "login" ? "Entrar →" : "Crear cuenta →"}
                </Button>

                <div className="flex items-center gap-3 text-[10px] font-pixel text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  o también
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="contorno"
                  size="lg"
                  className="w-full bg-background/30 backdrop-blur-sm"
                  disabled={cargando}
                  onClick={entrarConGoogle}
                >
                  <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.65.75 3.89 3.25 2.03 6.85l3.66 2.84C6.62 7.01 9.03 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.25 12.26c0-.92-.08-1.61-.26-2.31H12v4.39h6.44c-.13 1.07-.83 2.68-2.39 3.77l3.56 2.75c2.13-1.97 3.64-4.87 3.64-8.6z" />
                    <path fill="#FBBC05" d="M5.7 14.3a6.87 6.87 0 0 1 0-4.61L2.03 6.85a11.26 11.26 0 0 0 0 10.29L5.7 14.3z" />
                    <path fill="#34A853" d="M12 23.25c3.04 0 5.59-1 7.45-2.73l-3.56-2.75c-.95.66-2.23 1.12-3.89 1.12-2.97 0-5.38-1.97-6.31-4.66l-3.66 2.83c1.86 3.68 5.62 6.19 9.97 6.19z" />
                  </svg>
                  Entrar con Google
                </Button>
              </form>
            )}

            <p className="text-center text-sm text-muted-foreground">
              {modo === "login" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
              <button
                type="button"
                className="font-semibold text-primary underline-offset-4 transition-colors hover:text-glow-amarillo hover:underline"
                onClick={cambiarModo}
              >
                {modo === "login" ? "Registrate" : "Iniciá sesión"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <p className="absolute bottom-4 text-center text-xs text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
