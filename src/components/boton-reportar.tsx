import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { PixelBandera } from "@/components/pixel-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const motivos = [
  "Contenido ofensivo",
  "Spam o publicidad",
  "Información falsa",
  "Acoso a otra persona",
  "Otro",
];

/** Denuncia una explicación pública: guarda motivo y detalle en `content_reports`. */
export function BotonReportar({ sessionId }: { sessionId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState(motivos[0]!);
  const [detalle, setDetalle] = useState("");

  const enviar = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sesión expirada");
      const { error } = await supabase.from("content_reports").insert({
        session_id: sessionId,
        reporter_id: userId,
        reason: motivo,
        details: detalle.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAbierto(false);
      setDetalle("");
      toast.success("Gracias, ya lo revisamos 🛡️");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error && e.message.includes("duplicate")
          ? "Ya reportaste esta explicación"
          : "No pude enviar el reporte",
      ),
  });

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="font-pixel text-[10px] text-muted-foreground">
          <PixelBandera />
          REPORTAR
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-white/15">
        <DialogHeader>
          <DialogTitle className="font-pixel text-xs text-primary">REPORTAR CONTENIDO</DialogTitle>
          <DialogDescription>
            Contanos qué pasa con esta explicación. Nadie se entera de que fuiste vos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {motivos.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              className={cn(
                "rounded-full border-2 px-3 py-1.5 text-xs transition-colors",
                motivo === m
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-white/15 bg-white/5 text-muted-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <Textarea
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Detalle (opcional)"
          rows={3}
          maxLength={500}
        />

        <Button
          variant="chispa"
          className="font-pixel text-[10px]"
          disabled={enviar.isPending}
          onClick={() => enviar.mutate()}
        >
          ENVIAR REPORTE
        </Button>
      </DialogContent>
    </Dialog>
  );
}
