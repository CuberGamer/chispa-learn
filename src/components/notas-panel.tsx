import { useState, type ReactNode } from "react";
import { Copy, Download, Maximize2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PixelMas } from "@/components/pixel-icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type Pestana = { id: string; nombre: string; texto: string };

type Props = {
  pestanas: Pestana[];
  setPestanas: (fn: (l: Pestana[]) => Pestana[]) => void;
  activa: string;
  setActiva: (id: string) => void;
  titulo?: string;
  pie?: ReactNode;
  alto?: string;
};

function nuevaPestana(l: Pestana[]): Pestana {
  return { id: crypto.randomUUID(), nombre: `Pestaña ${l.length + 1}`, texto: "" };
}

export function NotasPanel({ pestanas, setPestanas, activa, setActiva, titulo = "NOTAS", pie, alto = "min-h-[22rem]" }: Props) {
  const [expandido, setExpandido] = useState(false);
  const nota = pestanas.find((p) => p.id === activa) ?? pestanas[0]!;

  const ops = {
    agregar() {
      let id = "";
      setPestanas((l) => {
        const n = nuevaPestana(l);
        id = n.id;
        return [...l, n];
      });
      setTimeout(() => id && setActiva(id));
    },
    renombrar(p: Pestana) {
      const nombre = window.prompt("Nombre de la pestaña", p.nombre)?.trim();
      if (nombre) setPestanas((l) => l.map((x) => (x.id === p.id ? { ...x, nombre } : x)));
    },
    eliminar(p: Pestana) {
      if (p.texto.trim() && !window.confirm(`¿Eliminar "${p.nombre}"?`)) return;
      setPestanas((l) => {
        const resto = l.filter((x) => x.id !== p.id);
        const final = resto.length ? resto : [{ id: crypto.randomUUID(), nombre: "Pestaña 1", texto: "" }];
        if (p.id === activa) setTimeout(() => setActiva(final[0]!.id));
        return final;
      });
    },
    escribir(texto: string) {
      setPestanas((l) => l.map((x) => (x.id === nota.id ? { ...x, texto } : x)));
    },
    async copiar() {
      await navigator.clipboard.writeText(nota.texto);
      toast.success("Nota copiada");
    },
    descargar() {
      const todo = pestanas.map((p) => `# ${p.nombre}\n${p.texto}`).join("\n\n");
      const url = URL.createObjectURL(new Blob([todo], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "notas-chispa.txt";
      a.click();
      URL.revokeObjectURL(url);
    },
  };

  const pestanasUI = (vertical: boolean) => (
    <div className={cn("flex gap-1.5", vertical ? "flex-col" : "flex-wrap items-center")}>
      {pestanas.map((p) => (
        <div
          key={p.id}
          className={cn(
            "group flex items-center gap-1 rounded-full pr-1 text-[11px] transition-colors",
            vertical && "rounded-lg",
            p.id === nota.id ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground hover:text-foreground",
          )}
        >
          <button
            type="button"
            onClick={() => setActiva(p.id)}
            onDoubleClick={() => ops.renombrar(p)}
            className={cn("truncate px-3 py-1.5 text-left", vertical && "flex-1 py-2")}
          >
            {p.nombre}
          </button>
          {(vertical || p.id === nota.id) && (
            <>
              <button type="button" aria-label={`Renombrar ${p.nombre}`} onClick={() => ops.renombrar(p)} className="p-1 hover:text-foreground">
                <Pencil className="size-3" />
              </button>
              <button type="button" aria-label={`Eliminar ${p.nombre}`} onClick={() => ops.eliminar(p)} className="p-1 hover:text-destructive">
                <Trash2 className="size-3" />
              </button>
            </>
          )}
        </div>
      ))}
      <button
        type="button"
        aria-label="Nueva pestaña"
        onClick={ops.agregar}
        className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-primary"
      >
        <PixelMas size={10} />
      </button>
    </div>
  );

  const palabras = nota.texto.trim() ? nota.texto.trim().split(/\s+/).length : 0;

  return (
    <section className="glass flex h-fit flex-col gap-3 p-4 lg:sticky lg:top-32">
      <div className="flex items-center gap-2">
        <h2 className="font-pixel text-[9px] text-primary text-glow-amarillo">{titulo}</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">Se guardan solas</span>
        <button
          type="button"
          aria-label="Expandir notas"
          onClick={() => setExpandido(true)}
          className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-primary"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {pestanasUI(false)}

      <Textarea
        value={nota.texto}
        onChange={(e) => ops.escribir(e.target.value)}
        placeholder="Anotá ideas, datos y palabras clave…"
        className={cn("resize-y bg-transparent p-3 text-sm leading-relaxed", alto)}
      />
      {pie}

      <Dialog open={expandido} onOpenChange={setExpandido}>
        <DialogContent className="glass max-w-5xl border-white/10 p-0 sm:max-w-5xl">
          <div className="grid min-h-[70vh] md:grid-cols-[220px_1fr]">
            <aside className="flex flex-col gap-3 border-b border-white/10 p-4 md:border-b-0 md:border-r">
              <DialogTitle className="font-pixel text-[10px] text-primary text-glow-amarillo">MIS NOTAS</DialogTitle>
              {pestanasUI(true)}
              <button
                type="button"
                onClick={ops.descargar}
                className="font-pixel mt-auto flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[8px] text-muted-foreground hover:text-primary"
              >
                <Download className="size-3.5" /> DESCARGAR TODO
              </button>
            </aside>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2 pr-8">
                <button type="button" onClick={() => ops.renombrar(nota)} className="font-pixel truncate text-[11px] text-foreground hover:text-primary">
                  {nota.nombre.toUpperCase()}
                </button>
                <span className="ml-auto text-[11px] text-muted-foreground">{palabras} palabras</span>
                <button
                  type="button"
                  aria-label="Copiar nota"
                  onClick={ops.copiar}
                  className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:text-primary"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <Textarea
                value={nota.texto}
                onChange={(e) => ops.escribir(e.target.value)}
                placeholder="Escribí con espacio de sobra…"
                className="flex-1 resize-none bg-transparent p-4 text-base leading-relaxed"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
