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
