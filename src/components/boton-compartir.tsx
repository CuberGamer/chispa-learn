import { useState } from "react";
import { toast } from "sonner";

import { PixelGlobo } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Link público de una explicación compartida. */
export function linkExplicacion(id: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/e/${id}`;
}

type Destino = { nombre: string; href: (url: string, texto: string) => string };

const destinos: Destino[] = [
  {
    nombre: "WHATSAPP",
    href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
  },
  {
    nombre: "TELEGRAM",
    href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    nombre: "X / TWITTER",
    href: (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    nombre: "FACEBOOK",
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    nombre: "MAIL",
    href: (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}`,
  },
];

/**
 * Botón de compartir: usa el menú nativo del sistema cuando existe y siempre
 * ofrece copiar el link y mandarlo a otras apps.
 */
export function BotonCompartir({
  id,
  titulo,
  etiqueta = "COMPARTIR",
  variante = "contorno",
}: {
  id: string;
  titulo: string;
  etiqueta?: string;
  variante?: "contorno" | "chispa" | "ghost" | "neon";
}) {
  const [abierto, setAbierto] = useState(false);
  const url = linkExplicacion(id);
  const texto = `Mirá cómo expliqué "${titulo}" en Chispa`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("¡Link copiado! Pegalo donde quieras 🔗");
    } catch {
      toast.error("No pude copiar el link");
    }
    setAbierto(false);
  }

  async function nativo() {
    if (typeof navigator === "undefined" || !navigator.share) {
      await copiar();
      return;
    }
    try {
      await navigator.share({ title: "Chispa", text: texto, url });
      setAbierto(false);
    } catch {
      /* el usuario canceló */
    }
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button variant={variante} size="sm" className="font-pixel text-[10px]">
          <PixelGlobo />
          {etiqueta}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="glass w-64 space-y-1 border-white/15 p-2" align="start">
        <p className="font-pixel px-2 py-1 text-[9px] text-muted-foreground">COMPARTIR EN…</p>
        <Button
          variant="ghost"
          size="sm"
          className="font-pixel w-full justify-start text-[9px]"
          onClick={nativo}
        >
          OTRAS APPS
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="font-pixel w-full justify-start text-[9px]"
          onClick={copiar}
        >
          COPIAR LINK
        </Button>
        <div className="my-1 h-px bg-white/10" />
        {destinos.map((d) => (
          <Button
            key={d.nombre}
            asChild
            variant="ghost"
            size="sm"
            className="font-pixel w-full justify-start text-[9px]"
          >
            <a
              href={d.href(url, texto)}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => setAbierto(false)}
            >
              {d.nombre}
            </a>
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
