import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Clock, Mic, Flame } from "lucide-react";

import { Chispa } from "@/components/chispa";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chispa — aprendé cualquier tema y explicalo" },
      {
        name: "description",
        content:
          "Un tema por día, un cronómetro para investigarlo y tu explicación al final. Entrená el aprendizaje autodidacta con Chispa.",
      },
      { property: "og:title", content: "Chispa — aprendé cualquier tema y explicalo" },
      {
        property: "og:description",
        content: "Investigá contra reloj y explicá lo que aprendiste. Rachas, temas y gamificación.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8">
      <header className="flex items-center justify-between">
        <span className="font-pixel text-sm text-primary text-glow-amarillo">CHISPA</span>
        <Button asChild variant="contorno" size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 py-14 text-center">
        <Chispa estado="emocionado" size="xl" />
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            Aprendé un tema.{" "}
            <span className="text-gradient-neon">Explicalo</span> y no te lo olvides más.
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            Yo te tiro un tema, arrancás el cronómetro y lo investigás por tu cuenta. Cuando suena
            la alarma, me contás todo lo que aprendiste: escribiendo o dictando.
          </p>
        </div>
        <Button asChild variant="chispa" size="xl">
          <Link to="/auth">Empezar gratis</Link>
        </Button>
      </section>

      <section className="grid gap-4 pb-10 sm:grid-cols-3">
        {[
          { icon: Clock, title: "Cronómetro", text: "5, 15 o 30 minutos para investigar sin distracciones." },
          { icon: Mic, title: "Explicá o dictá", text: "Escribí tu explicación o dictala y la transcribo." },
          { icon: Flame, title: "Rachas", text: "Volvé cada día y mantené tu racha encendida." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="panel p-5 text-left">
            <Icon className="mb-3 text-primary" />
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
