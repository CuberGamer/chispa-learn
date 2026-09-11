import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Chispa, BurbujaChispa } from "@/components/chispa";
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
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <Chispa estado={modo === "registro" ? "sorprendido" : "neutral"} size="lg" />
        <h1 className="text-2xl font-extrabold">
          {modo === "login" ? "¡Volviste!" : "Bienvenido a Chispa"}
        </h1>
        <BurbujaChispa>
          {modo === "login"
            ? "Entrá y seguimos donde quedamos."
            : "Creá tu cuenta y arrancamos con el primer tema."}
        </BurbujaChispa>
      </div>

      {avisoEmail ? (
        <div className="panel space-y-3 p-5 text-center">
          <p className="text-sm">
            Te mandé un mail a <strong>{email}</strong>. Confirmá tu cuenta desde ahí y volvé para
            iniciar sesión.
          </p>
          <Button variant="contorno" onClick={() => { setAvisoEmail(false); setModo("login"); }}>
            Ya confirmé, quiero entrar
          </Button>
        </div>
      ) : (
        <form onSubmit={enviar} className="panel space-y-4 p-5">
          {modo === "registro" && (
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="chispita99"
                autoComplete="nickname"
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
            />
          </div>
          <Button type="submit" variant="chispa" size="lg" className="w-full" disabled={cargando}>
            {cargando ? "Un segundo..." : modo === "login" ? "Entrar" : "Crear cuenta"}
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            o también
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="contorno"
            size="lg"
            className="w-full"
            disabled={cargando}
            onClick={async () => {
              setCargando(true);
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) throw result.error;
                if (result.redirected) return;
                navigate({ to: "/inicio", replace: true });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "No se pudo entrar con Google");
                setCargando(false);
              }
            }}
          >
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.65.75 3.89 3.25 2.03 6.85l3.66 2.84C6.62 7.01 9.03 5.04 12 5.04z"/>
              <path fill="#4285F4" d="M23.25 12.26c0-.92-.08-1.61-.26-2.31H12v4.39h6.44c-.13 1.07-.83 2.68-2.39 3.77l3.56 2.75c2.13-1.97 3.64-4.87 3.64-8.6z"/>
              <path fill="#FBBC05" d="M5.7 14.3a6.87 6.87 0 0 1 0-4.61L2.03 6.85a11.26 11.26 0 0 0 0 10.29L5.7 14.3z"/>
              <path fill="#34A853" d="M12 23.25c3.04 0 5.59-1 7.45-2.73l-3.56-2.75c-.95.66-2.23 1.12-3.89 1.12-2.97 0-5.38-1.97-6.31-4.66l-3.66 2.83c1.86 3.68 5.62 6.19 9.97 6.19z"/>
            </svg>
            Entrar con Google
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {modo === "login" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
        <button
          type="button"
          className="font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => { setModo(modo === "login" ? "registro" : "login"); setAvisoEmail(false); }}
        >
          {modo === "login" ? "Registrate" : "Iniciá sesión"}
        </button>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">Volver al inicio</Link>
      </p>
    </main>
  );
}
