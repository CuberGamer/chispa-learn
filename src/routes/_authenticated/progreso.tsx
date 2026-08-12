import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Flame,
  Library,
  Lock,
  Pen,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { Chispa, BurbujaChispa } from "@/components/chispa";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkin } from "@/hooks/use-skin";
import { supabase } from "@/integrations/supabase/client";
import { getEstadisticas, type Logro } from "@/lib/logros";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/progreso")({
  head: () => ({
    meta: [
      { title: "Tu progreso — Chispa" },
      {
        name: "description",
        content: "Racha, minutos de estudio, promedio de la IA y logros desbloqueados.",
      },
      { property: "og:title", content: "Tu progreso — Chispa" },
      {
        property: "og:description",
        content: "Mirá cuánto avanzaste y qué logros te faltan desbloquear.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Progreso,
});

const iconos: Record<string, typeof Zap> = {
  zap: Zap,
  library: Library,
  flame: Flame,
  clock: Clock,
  pen: Pen,
  sparkles: Sparkles,
};

function Progreso() {
  const datos = useQuery({
    queryKey: ["progreso"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");

      const [stats, { data: logros, error }, { data: mios }] = await Promise.all([
        getEstadisticas(userId),
        supabase.from("achievements").select("id, name, description, icon").order("name"),
        supabase.from("user_achievements").select("achievement_id, unlocked_at"),
      ]);
      if (error) throw error;

      const desbloqueados = new Map(
        (mios ?? []).map((m) => [m.achievement_id, m.unlocked_at]),
      );
      return {
        stats,
        logros: ((logros ?? []) as Logro[]).map((l) => ({
          ...l,
          unlockedAt: desbloqueados.get(l.id) ?? null,
        })),
      };
    },
  });

  const s = datos.data?.stats;
  const logrados = datos.data?.logros.filter((l) => l.unlockedAt).length ?? 0;
  const totalLogros = datos.data?.logros.length ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 pb-16">
      <div className="flex items-center gap-4">
        <Chispa skin={skin} estado={logrados > 0 ? "emocionado" : "neutral"} size="sm" flotando={false} />
        <div>
          <h1 className="text-2xl font-extrabold">Tu progreso</h1>
          <p className="text-sm text-muted-foreground">
            Todo lo que fuiste construyendo, sesión por sesión.
          </p>
        </div>
      </div>

      {datos.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Metrica icono={Flame} valor={s?.rachaActual ?? 0} label="racha actual" tono="primary" />
            <Metrica icono={Trophy} valor={s?.rachaMaxima ?? 0} label="mejor racha" tono="violeta" />
            <Metrica icono={Library} valor={s?.temasDistintos ?? 0} label="temas distintos" tono="cian" />
            <Metrica icono={Zap} valor={s?.sesiones ?? 0} label="sesiones" tono="primary" />
            <Metrica
              icono={Clock}
              valor={s ? `${Math.floor(s.minutos / 60)}h ${s.minutos % 60}m` : "0h"}
              label="tiempo investigando"
              tono="cian"
            />
            <Metrica
              icono={Target}
              valor={s?.promedioScore != null ? `${s.promedioScore}` : "—"}
              label="promedio de la IA"
              tono="violeta"
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-bold">Logros</h2>
              <p className="text-xs text-muted-foreground">
                {logrados} de {totalLogros} desbloqueados
              </p>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${totalLogros ? (logrados / totalLogros) * 100 : 0}%`,
                }}
              />
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {datos.data?.logros.map((l) => {
                const Icono = iconos[l.icon] ?? Sparkles;
                const activo = Boolean(l.unlockedAt);
                return (
                  <li
                    key={l.id}
                    className={cn(
                      "panel flex items-start gap-3 p-4",
                      activo ? "border-primary/60" : "opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full border-2",
                        activo
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {activo ? <Icono className="size-5" /> : <Lock className="size-4" />}
                    </span>
                    <div className="space-y-1">
                      <p className="font-semibold leading-snug">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.description}</p>
                      {activo && (
                        <p className="text-[10px] uppercase tracking-wide text-primary">
                          Desbloqueado el{" "}
                          {new Date(l.unlockedAt as string).toLocaleDateString("es-AR")}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {s?.sesiones === 0 && (
            <div className="panel flex flex-col items-center gap-4 p-8 text-center">
              <Chispa skin={skin} estado="sorprendido" size="md" />
              <BurbujaChispa>
                Todavía no hay nada para mostrar. Hacé tu primera sesión y arrancamos.
              </BurbujaChispa>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Metrica({
  icono: Icono,
  valor,
  label,
  tono,
}: {
  icono: typeof Zap;
  valor: string | number;
  label: string;
  tono: "primary" | "violeta" | "cian";
}) {
  const color =
    tono === "primary" ? "text-primary" : tono === "violeta" ? "text-violeta" : "text-cian";
  return (
    <div className="panel flex items-center gap-3 p-4">
      <Icono className={cn("size-5 shrink-0", color)} />
      <div>
        <p className={cn("font-pixel text-base", color)}>{valor}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
