import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "@tanstack/react-router";

import {
  PixelAnterior,
  PixelChispita,
  PixelEquis,
  PixelImagen,
  PixelNota,
  PixelPausa,
  PixelPlay,
  PixelSiguiente,
} from "@/components/pixel-icons";
import { BarraProgresoMusica, Onda } from "@/components/panel-musica";
import { formatearTiempo } from "@/lib/chispa";
import { useMusica } from "@/lib/musica";
import { useSesionActiva } from "@/lib/sesion-activa";
import { cn } from "@/lib/utils";

/**
 * Dynamic island de música: píldora flotante con prev/play/next que se
 * expande a la tarjeta completa al tocarla. Vive sobre todas las pantallas.
 */
export function DynamicIsland() {
  const {
    pistas,
    actual,
    sonando,
    alternar,
    siguiente,
    anterior,
    quitarTodo,
    pausar,
    reanudar,
  } = useMusica();
  const sesion = useSesionActiva();
  const location = useLocation();
  const [expandida, setExpandida] = useState(false);
  const sonabaRef = useRef(false);

  const enSesion = location.pathname === "/sesion";
  const activa = sesion.activa;
  const mostrarSesion = activa && !enSesion;

  /**
   * Al salir de la sesión, la música se pausa y solo queda la isla del tema.
   * Al volver a la sesión, la música se reanuda si estaba sonando.
   */
  useEffect(() => {
    if (mostrarSesion) {
      if (sonando) {
        sonabaRef.current = true;
        pausar();
      }
    } else if (sonabaRef.current) {
      sonabaRef.current = false;
      reanudar();
    }
  }, [mostrarSesion, sonando, pausar, reanudar]);


  if (mostrarSesion) {
    return (
      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
        <Link
          to="/sesion"
          search={{ tema: activa.temaId, minutos: activa.minutos }}
          className="glass flex items-center gap-3 rounded-full px-4 py-2.5 transition-transform hover:scale-105"
        >
          <span className={cn("text-primary", !sesion.pausado && "animate-pulso")}>
            <PixelChispita size={16} />
          </span>
          <span className="font-pixel text-[10px] text-foreground">
            {sesion.fase === "explicar" ? "EXPLICÁ" : formatearTiempo(sesion.restante)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {sesion.pausado ? "(pausa)" : sesion.fase === "explicar" ? "Terminó el tiempo" : "en curso"}
          </span>
          <button
            type="button"
            aria-label={sesion.pausado ? "Reanudar" : "Pausar"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              sesion.alternarPausa();
            }}
            className="rounded-full bg-primary/20 p-1.5 text-primary transition-transform hover:scale-105"
          >
            {sesion.pausado ? <PixelPlay size={12} /> : <PixelPausa size={12} />}
          </button>
        </Link>
      </div>
    );
  }

  if (!pistas.length || !actual) return null;

  if (!expandida) {
    /* ——— Modo compacto: píldora con controles ——— */
    return (
      <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
        <div className="glass flex items-center gap-2 rounded-full px-3 py-2">
          <span className={cn("text-primary", sonando && "animate-pulso")}>
            <PixelNota size={14} />
          </span>
          <button
            type="button"
            onClick={() => setExpandida(true)}
            className="font-pixel max-w-36 truncate text-[9px] text-foreground"
            title="Abrir reproductor"
          >
            {actual.nombre}
          </button>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button
              type="button"
              aria-label="Anterior"
              onClick={anterior}
              className="rounded-full p-1.5 transition-colors hover:text-primary"
            >
              <PixelAnterior size={12} />
            </button>
            <button
              type="button"
              aria-label={sonando ? "Pausar" : "Reproducir"}
              onClick={alternar}
              className="rounded-full bg-primary/20 p-1.5 text-primary transition-transform hover:scale-105"
            >
              {sonando ? <PixelPausa size={13} /> : <PixelPlay size={13} />}
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={siguiente}
              className="rounded-full p-1.5 transition-colors hover:text-primary"
            >
              <PixelSiguiente size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ——— Modo expandido: tarjeta completa ——— */
  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[min(92vw,380px)] -translate-x-1/2">
      <div className="glass space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="glass flex size-14 shrink-0 items-center justify-center text-muted-foreground">
            <PixelImagen size={22} />
          </span>
          <p className="font-pixel min-w-0 flex-1 truncate text-[10px] leading-relaxed">
            {actual.nombre}
          </p>
          <button
            type="button"
            aria-label="Cerrar reproductor"
            onClick={() => {
              quitarTodo();
              setExpandida(false);
            }}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <PixelEquis size={12} />
          </button>
        </div>
        <Onda sonando={sonando} className="justify-center" />
        <BarraProgresoMusica />
        <div className="flex items-center justify-center gap-6 text-foreground">
          <button
            type="button"
            aria-label="Anterior"
            onClick={anterior}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <PixelAnterior size={16} />
          </button>
          <button
            type="button"
            aria-label={sonando ? "Pausar" : "Reproducir"}
            onClick={alternar}
            className="flex size-12 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary glow-amarillo transition-transform hover:scale-105"
          >
            {sonando ? <PixelPausa size={18} /> : <PixelPlay size={18} />}
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={siguiente}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <PixelSiguiente size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setExpandida(false)}
          className="font-pixel block w-full text-center text-[8px] text-muted-foreground hover:text-foreground"
        >
          MINIMIZAR
        </button>
      </div>
    </div>
  );
}

/**
 * Versión en línea (no flotante) de la píldora compacta, para incrustar
 * dentro de una pantalla como la sesión.
 */
export function BarraMusicaMini({ className }: { className?: string }) {
  const { pistas, actual, sonando, alternar, siguiente, anterior } = useMusica();
  if (!pistas.length || !actual) return null;
  return (
    <div className={cn("glass mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2", className)}>
      <span className={cn("text-primary", sonando && "animate-pulso")}>
        <PixelNota size={13} />
      </span>
      <span className="font-pixel max-w-32 truncate text-[9px] text-muted-foreground">
        {actual.nombre}
      </span>
      <button
        type="button"
        aria-label="Anterior"
        onClick={anterior}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:text-primary"
      >
        <PixelAnterior size={12} />
      </button>
      <button
        type="button"
        aria-label={sonando ? "Pausar" : "Reproducir"}
        onClick={alternar}
        className="rounded-full bg-primary/20 p-1.5 text-primary transition-transform hover:scale-105"
      >
        {sonando ? <PixelPausa size={12} /> : <PixelPlay size={12} />}
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={siguiente}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:text-primary"
      >
        <PixelSiguiente size={12} />
      </button>
    </div>
  );
}
