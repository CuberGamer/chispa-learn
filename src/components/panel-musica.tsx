import { useRef, useState } from "react";

import {
  PixelAnterior,
  PixelEquis,
  PixelImagen,
  PixelLista,
  PixelLupa,
  PixelMas,
  PixelNota,
  PixelPausa,
  PixelPlay,
  PixelSiguiente,
} from "@/components/pixel-icons";
import { useMusica } from "@/lib/musica";
import { cn } from "@/lib/utils";

/** Barra decorativa de "onda" tipo ecualizador. */
export function Onda({ sonando, className }: { sonando: boolean; className?: string }) {
  const alturas = [3, 6, 9, 5, 11, 7, 4, 10, 6, 8, 3, 9, 5, 7, 4, 10, 6, 3, 8, 5, 9, 4, 7, 3];
  return (
    <div
      className={cn(
        "flex h-6 items-end gap-[3px] text-primary/70",
        sonando && "animate-pulso",
        className,
      )}
      aria-hidden
    >
      {alturas.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-current"
          style={{ height: `${h * 2}px` }}
        />
      ))}
    </div>
  );
}

export function BarraProgresoMusica({ className }: { className?: string }) {
  const { progreso, irA } = useMusica();
  return (
    <button
      type="button"
      aria-label="Posición de la pista"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        irA((e.clientX - r.left) / r.width);
      }}
      className={cn("group relative h-2 w-full rounded-full bg-white/10", className)}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${progreso * 100}%` }}
      />
      <span
        className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-primary shadow"
        style={{ left: `calc(${progreso * 100}% - 6px)` }}
      />
    </button>
  );
}

function Controles({ grande = false }: { grande?: boolean }) {
  const { sonando, alternar, siguiente, anterior, pistas } = useMusica();
  const tam = grande ? 22 : 14;
  return (
    <div className="flex items-center justify-center gap-5 text-foreground">
      <button
        type="button"
        aria-label="Anterior"
        onClick={anterior}
        disabled={!pistas.length}
        className="text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
      >
        <PixelAnterior size={tam} />
      </button>
      <button
        type="button"
        aria-label={sonando ? "Pausar" : "Reproducir"}
        onClick={alternar}
        disabled={!pistas.length}
        className={cn(
          "flex items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary glow-amarillo transition-transform hover:scale-105 disabled:opacity-40",
          grande ? "size-14" : "size-10",
        )}
      >
        {sonando ? <PixelPausa size={tam} /> : <PixelPlay size={tam} />}
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={siguiente}
        disabled={!pistas.length}
        className="text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
      >
        <PixelSiguiente size={tam} />
      </button>
    </div>
  );
}

/**
 * Panel de música con navegación interna (mockup: reproduciendo / buscar /
 * sin música, movidos con la barra inferior X · nota · lista+).
 */
export function PanelMusica({ className }: { className?: string }) {
  const m = useMusica();
  const [vista, setVista] = useState<"actual" | "lista">("lista");
  const [busqueda, setBusqueda] = useState("");
  const inputArchivo = useRef<HTMLInputElement>(null);

  const filtradas = m.pistas.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  return (
    <section
      className={cn("glass flex flex-col gap-4 p-4", className)}
      aria-label="Panel de música"
    >
      <input
        ref={inputArchivo}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) m.agregarArchivos(e.target.files);
          e.target.value = "";
          setVista("actual");
        }}
      />

      <div className="min-h-64 flex-1">
        {m.pistas.length === 0 && vista === "actual" ? (
          /* ——— Estado "sin música" ——— */
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
            <span className="flex size-28 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary glow-amarillo">
              <PixelNota size={48} />
            </span>
            <p className="font-pixel text-[10px] text-muted-foreground">SIN MÚSICA</p>
            <button
              type="button"
              onClick={() => inputArchivo.current?.click()}
              className="font-pixel inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[9px] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <PixelMas size={11} />
              SUBIR AUDIO
            </button>
          </div>
        ) : vista === "actual" && m.actual ? (
          /* ——— Reproduciendo ——— */
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="glass flex size-16 shrink-0 items-center justify-center text-muted-foreground">
                <PixelImagen size={26} />
              </span>
              <p className="font-pixel min-w-0 truncate text-[10px] leading-relaxed">
                {m.actual.nombre}
              </p>
            </div>
            <Onda sonando={m.sonando} className="justify-center" />
            <BarraProgresoMusica />
            <Controles grande />
          </div>
        ) : (
          /* ——— Buscar / lista ——— */
          <div className="flex h-full flex-col gap-3">
            <label className="glass flex items-center gap-2 px-3 py-2">
              <PixelLupa size={13} className="shrink-0 text-muted-foreground" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="buscar..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {filtradas.map((p) => {
                const i = m.pistas.indexOf(p);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        m.reproducir(i);
                        setVista("actual");
                      }}
                      className={cn(
                        "glass glass-hover flex w-full items-center gap-3 p-2.5 text-left",
                        i === m.indice && "border-primary/50",
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/5 text-muted-foreground">
                        <PixelImagen size={16} />
                      </span>
                      <span className="min-w-0 truncate text-xs">{p.nombre}</span>
                      {i === m.indice && m.sonando && (
                        <PixelNota size={12} className="ml-auto shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
              {!filtradas.length && (
                <li className="py-6 text-center text-xs text-muted-foreground">
                  {m.pistas.length ? "Sin resultados." : "Todavía no subiste música."}
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => inputArchivo.current?.click()}
              className="font-pixel mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-border px-4 py-2.5 text-[9px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <PixelMas size={11} />
              AGREGAR DESDE TU DISPOSITIVO
            </button>
          </div>
        )}
      </div>

      {/* Barra de navegación interna del panel */}
      <div className="mx-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1.5">
        <button
          type="button"
          aria-label="Quitar música"
          title="Quitar música"
          onClick={() => {
            m.quitarTodo();
            setVista("actual");
          }}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <PixelEquis size={13} />
        </button>
        <button
          type="button"
          aria-label="Reproduciendo ahora"
          title="Reproduciendo ahora"
          onClick={() => setVista("actual")}
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition-colors",
            vista === "actual"
              ? "bg-primary/20 text-primary glow-amarillo"
              : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
          )}
        >
          <PixelNota size={16} />
        </button>
        <button
          type="button"
          aria-label="Buscar y agregar"
          title="Buscar y agregar"
          onClick={() => setVista("lista")}
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-colors",
            vista === "lista"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
          )}
        >
          <PixelLista size={13} />
        </button>
      </div>
    </section>
  );
}
