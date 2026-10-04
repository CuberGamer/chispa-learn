import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { TopicIcon } from "@/components/topic-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import {
  COLORES_MATERIA,
  calcularEnlaces,
  cargarDatosGrafo,
  clavePar,
  colorMateria,
  type Enlace,
  type NodoTema,
} from "@/lib/grafo";
import { cn } from "@/lib/utils";

const ForceGraph2D = lazy(() => import("react-force-graph-2d"));

const CLAVE_ESTADO = "chispa-grafo-estado";
type EstadoGuardado = {
  zoom?: number;
  centro?: { x: number; y: number };
  seleccionado?: string | null;
  umbral?: number;
  materiasOff?: string[];
  tagsOff?: string[];
  local?: boolean;
  posiciones?: Record<string, { x: number; y: number }>;
};
const leerEstado = (): EstadoGuardado => {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_ESTADO) ?? "{}");
  } catch {
    return {};
  }
};

const db = supabase as any;
const idDe = (v: unknown) => (typeof v === "object" && v ? (v as { id: string }).id : (v as string));

function useDatosGrafo() {
  return useQuery({
    queryKey: ["grafo"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Sin sesión");
      return { userId: data.user.id, ...(await cargarDatosGrafo(data.user.id)) };
    },
  });
}

function useMedida<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [m, setM] = useState({ w: 300, h: 300 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setM({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, m] as const;
}

function dibujarNodo(n: any, ctx: CanvasRenderingContext2D, escala: number, opts: { tenue: boolean; resaltado: boolean; etiqueta: boolean }) {
  const r = 3 + Math.sqrt(n.grado) * 2.2;
  ctx.globalAlpha = opts.tenue ? 0.15 : 1;
  if (opts.resaltado) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, r + 4, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(250,204,21,0.25)";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
  ctx.fillStyle = colorMateria(n.materia);
  ctx.fill();
  if (opts.etiqueta && escala > 0.9) {
    ctx.font = `${11 / escala}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(240,240,240,0.85)";
    ctx.fillText(n.titulo, n.x, n.y + r + 10 / escala);
  }
  ctx.globalAlpha = 1;
}

/* ---------------- Mini (inicio) ---------------- */

export function GrafoMini() {
  const datos = useDatosGrafo();
  const [ref, m] = useMedida<HTMLDivElement>();
  const graph = useMemo(() => {
    if (!datos.data) return { nodes: [], links: [] };
    const enlaces = calcularEnlaces(datos.data.nodos, datos.data.conexiones).filter((e) => e.fuerza >= 3);
    const grado = new Map<string, number>();
    enlaces.forEach((e) => {
      grado.set(e.source, (grado.get(e.source) ?? 0) + 1);
      grado.set(e.target, (grado.get(e.target) ?? 0) + 1);
    });
    return {
      nodes: datos.data.nodos.map((n) => ({ ...n, grado: grado.get(n.id) ?? 0 })),
      links: enlaces.map((e) => ({ ...e })),
    };
  }, [datos.data]);

  return (
    <section className="glass relative overflow-hidden p-0">
      <Link
        to="/grafo"
        aria-label="Expandir grafo de temas"
        className="absolute right-3 top-3 z-10 rounded-md bg-background/70 px-2 py-1 font-pixel text-[8px] text-primary hover:bg-primary/15"
      >
        ⤢ EXPANDIR
      </Link>
      <div ref={ref} className="h-56 w-full bg-background/40">
        {graph.nodes.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
            {datos.isLoading ? "Cargando grafo…" : "Tu grafo aparece cuando estudies temas."}
          </p>
        ) : (
          <Suspense fallback={null}>
            <ForceGraph2D
              graphData={graph}
              width={m.w}
              height={m.h}
              backgroundColor="rgba(0,0,0,0)"
              enableZoomInteraction={false}
              enablePanInteraction={false}
              enableNodeDrag={false}
              cooldownTicks={80}
              nodeLabel="titulo"
              linkColor={() => "rgba(255,255,255,0.15)"}
              nodeCanvasObject={(n: any, ctx, k) => dibujarNodo(n, ctx, k, { tenue: false, resaltado: false, etiqueta: true })}
            />
          </Suspense>
        )}
      </div>
    </section>
  );
}

/* ---------------- Vista completa ---------------- */

export function GrafoTemas() {
  const datos = useDatosGrafo();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fgRef = useRef<any>(null);
  const [ref, m] = useMedida<HTMLDivElement>();
  const inicial = useMemo(leerEstado, []);

  const [umbral, setUmbral] = useState(inicial.umbral ?? 3);
  const [seleccionado, setSeleccionado] = useState<string | null>(inicial.seleccionado ?? null);
  const [materiasOff, setMateriasOff] = useState<string[]>(inicial.materiasOff ?? []);
  const [tagsOff, setTagsOff] = useState<string[]>(inicial.tagsOff ?? []);
  const [local, setLocal] = useState(inicial.local ?? false);
  const [busqueda, setBusqueda] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [modoConectar, setModoConectar] = useState(false);
  const [origen, setOrigen] = useState<string | null>(null);
  const [nueva, setNueva] = useState<{ a: string; b: string } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [fuerzaManual, setFuerzaManual] = useState(6);
  const [enlaceSel, setEnlaceSel] = useState<Enlace | null>(null);
  const vista = useRef({ zoom: inicial.zoom, centro: inicial.centro });
  const restaurado = useRef(false);

  const nodosPorId = useMemo(() => new Map((datos.data?.nodos ?? []).map((n) => [n.id, n])), [datos.data]);
  const todosEnlaces = useMemo(
    () => (datos.data ? calcularEnlaces(datos.data.nodos, datos.data.conexiones) : []),
    [datos.data],
  );
  const materias = useMemo(() => [...new Set((datos.data?.nodos ?? []).map((n) => n.materia))].sort(), [datos.data]);
  const tags = useMemo(() => [...new Set((datos.data?.nodos ?? []).flatMap((n) => n.tags))].sort(), [datos.data]);

  // Posiciones persistidas entre visitas
  const posiciones = useRef<Record<string, { x: number; y: number }>>(inicial.posiciones ?? {});

  const graph = useMemo(() => {
    let nodos = (datos.data?.nodos ?? []).filter(
      (n) => !materiasOff.includes(n.materia) && !(n.tags.length && n.tags.every((t) => tagsOff.includes(t))),
    );
    let ids = new Set(nodos.map((n) => n.id));
    let enlaces = todosEnlaces.filter((e) => (e.manual || e.fuerza >= umbral) && ids.has(e.source) && ids.has(e.target));
    if (local && seleccionado && ids.has(seleccionado)) {
      const vecinos = new Set([seleccionado]);
      enlaces.forEach((e) => {
        if (e.source === seleccionado) vecinos.add(e.target);
        if (e.target === seleccionado) vecinos.add(e.source);
      });
      nodos = nodos.filter((n) => vecinos.has(n.id));
      ids = vecinos;
      enlaces = enlaces.filter((e) => e.source === seleccionado || e.target === seleccionado);
    }
    const grado = new Map<string, number>();
    enlaces.forEach((e) => {
      grado.set(e.source, (grado.get(e.source) ?? 0) + 1);
      grado.set(e.target, (grado.get(e.target) ?? 0) + 1);
    });
    return {
      nodes: nodos.map((n) => ({ ...n, grado: grado.get(n.id) ?? 0, ...(posiciones.current[n.id] ?? {}) })),
      links: enlaces.map((e) => ({ ...e })),
    };
  }, [datos.data, todosEnlaces, umbral, materiasOff, tagsOff, local, seleccionado]);

  const vecinosSel = useMemo(() => {
    if (!seleccionado) return null;
    const s = new Set<string>([seleccionado]);
    graph.links.forEach((l: any) => {
      const a = idDe(l.source);
      const b = idDe(l.target);
      if (a === seleccionado) s.add(b);
      if (b === seleccionado) s.add(a);
    });
    return s;
  }, [graph, seleccionado]);

  const conectados = useMemo(() => {
    if (!seleccionado) return [];
    return todosEnlaces
      .filter((e) => e.source === seleccionado || e.target === seleccionado)
      .map((e) => ({ enlace: e, nodo: nodosPorId.get(e.source === seleccionado ? e.target : e.source)! }))
      .filter((x) => x.nodo)
      .sort((a, b) => b.enlace.fuerza - a.enlace.fuerza);
  }, [seleccionado, todosEnlaces, nodosPorId]);

  // Persistir estado
  useEffect(() => {
    sessionStorage.setItem(
      CLAVE_ESTADO,
      JSON.stringify({
        ...vista.current,
        seleccionado,
        umbral,
        materiasOff,
        tagsOff,
        local,
        posiciones: posiciones.current,
      } satisfies EstadoGuardado),
    );
  }, [seleccionado, umbral, materiasOff, tagsOff, local]);

  const guardarVista = () => {
    const fg = fgRef.current;
    if (!fg) return;
    vista.current = { zoom: fg.zoom(), centro: fg.centerAt() };
    graph.nodes.forEach((n: any) => {
      if (typeof n.x === "number") posiciones.current[n.id] = { x: n.x, y: n.y };
    });
    const actual = leerEstado();
    sessionStorage.setItem(CLAVE_ESTADO, JSON.stringify({ ...actual, ...vista.current, posiciones: posiciones.current }));
  };

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("link")?.strength((l: any) => Math.min(1, 0.08 + l.fuerza * 0.08));
    fg.d3Force("charge")?.strength(-90);
  });

  function buscar(texto: string) {
    setBusqueda(texto);
    const q = texto.trim().toLowerCase();
    if (!q) return;
    const n: any = graph.nodes.find((x: any) => x.titulo.toLowerCase().includes(q));
    if (n && fgRef.current && typeof n.x === "number") {
      fgRef.current.centerAt(n.x, n.y, 600);
      fgRef.current.zoom(2.5, 600);
    }
  }

  async function clickNodo(n: any) {
    setEnlaceSel(null);
    if (!modoConectar) {
      setSeleccionado((s) => (s === n.id ? null : n.id));
      return;
    }
    if (!origen) return setOrigen(n.id);
    if (origen === n.id) return setOrigen(null);
    setNueva({ a: origen, b: n.id });
    setOrigen(null);
    setMotivo("");
    setFuerzaManual(6);
  }

  async function crearConexion() {
    if (!nueva || !datos.data) return;
    const [a, b] = clavePar(nueva.a, nueva.b).split("|");
    const { error } = await db.from("topic_links").upsert(
      { user_id: datos.data.userId, topic_a: a, topic_b: b, kind: "manual", label: motivo.trim() || null, strength: fuerzaManual },
      { onConflict: "user_id,topic_a,topic_b,kind" },
    );
    if (error) return toast.error("No se pudo guardar la conexión");
    // Si estaba ignorada, la reactivamos
    await db.from("topic_links").delete().eq("user_id", datos.data.userId).eq("topic_a", a).eq("topic_b", b).eq("kind", "ignorada");
    setNueva(null);
    toast.success("Conexión creada");
    qc.invalidateQueries({ queryKey: ["grafo"] });
  }

  async function borrarOIgnorar(e: Enlace) {
    if (!datos.data) return;
    const [a, b] = clavePar(e.source, e.target).split("|");
    if (e.manual && e.linkId) {
      await db.from("topic_links").delete().eq("id", e.linkId);
      toast.success("Conexión manual eliminada");
    } else {
      const { error } = await db
        .from("topic_links")
        .insert({ user_id: datos.data.userId, topic_a: a, topic_b: b, kind: "ignorada", strength: 1 });
      if (error) return toast.error("No se pudo ignorar la asociación");
      toast.success("Asociación ignorada");
    }
    setEnlaceSel(null);
    qc.invalidateQueries({ queryKey: ["grafo"] });
  }

  const toggle = (lista: string[], set: (v: string[]) => void, v: string) =>
    set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const sel = seleccionado ? nodosPorId.get(seleccionado) : null;
  const q = busqueda.trim().toLowerCase();

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
      {/* Controles */}
      <aside className="glass space-y-5 p-5 lg:self-start">
        <div className="space-y-2">
          <p className="font-pixel text-[9px] text-primary">BUSCAR</p>
          <Input value={busqueda} onChange={(e) => buscar(e.target.value)} placeholder="Nombre del tema" />
        </div>

        <div className="space-y-3">
          <p className="font-pixel text-[9px] text-primary">FUERZA MÍNIMA: {umbral}</p>
          <Slider min={1} max={10} step={1} value={[umbral]} onValueChange={([v]) => setUmbral(v)} />
          <p className="text-[11px] text-muted-foreground">Oculta las conexiones débiles. Las manuales siempre se ven.</p>
        </div>

        <div className="flex gap-2">
          {[false, true].map((v) => (
            <Button
              key={String(v)}
              size="sm"
              variant={local === v ? "chispa" : "secondary"}
              className="font-pixel flex-1 text-[8px]"
              onClick={() => setLocal(v)}
              disabled={v && !seleccionado}
            >
              {v ? "LOCAL" : "GLOBAL"}
            </Button>
          ))}
        </div>

        <Button
          variant={modoConectar ? "chispa" : "secondary"}
          className="font-pixel w-full text-[9px]"
          onClick={() => {
            setModoConectar((v) => !v);
            setOrigen(null);
          }}
        >
          {modoConectar ? "SALIR DE CONECTAR" : "CONECTAR TEMAS"}
        </Button>
        {modoConectar && (
          <p className="text-[11px] text-muted-foreground">
            {origen ? `Elegí el segundo tema para unir con “${nodosPorId.get(origen)?.titulo}”.` : "Tocá un tema y después otro para unirlos. Tocá una línea para borrarla o ignorarla."}
          </p>
        )}

        <div className="space-y-2">
          <p className="font-pixel text-[9px] text-primary">MATERIAS</p>
          <div className="flex flex-wrap gap-1.5">
            {materias.map((mat) => (
              <button
                key={mat}
                onClick={() => toggle(materiasOff, setMateriasOff, mat)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]",
                  materiasOff.includes(mat) && "opacity-35 line-through",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: COLORES_MATERIA[mat] }} />
                {mat}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="space-y-2">
            <p className="font-pixel text-[9px] text-primary">ETIQUETAS</p>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(tagsOff, setTagsOff, t)}
                  className={cn("rounded-full bg-secondary px-2.5 py-1 text-[11px]", tagsOff.includes(t) && "opacity-35 line-through")}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p>━ Línea sólida amarilla: conexión manual</p>
          <p>┅ Línea punteada: detectada por Chispa</p>
        </div>
      </aside>

      {/* Lienzo */}
      <section ref={ref} className="glass relative h-[70vh] min-h-[480px] overflow-hidden p-0">
        {datos.isLoading ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando grafo…</p>
        ) : graph.nodes.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Todavía no hay temas para mostrar. Estudiá algunos y tu grafo va a crecer.
          </p>
        ) : (
          <Suspense fallback={null}>
            <ForceGraph2D
              ref={fgRef}
              graphData={graph}
              width={m.w}
              height={m.h}
              backgroundColor="rgba(0,0,0,0)"
              nodeLabel={(n: any) => n.titulo}
              cooldownTicks={120}
              onEngineStop={() => {
                if (!restaurado.current) {
                  restaurado.current = true;
                  const { zoom, centro } = vista.current;
                  if (zoom && centro) {
                    fgRef.current?.zoom(zoom);
                    fgRef.current?.centerAt(centro.x, centro.y);
                  } else fgRef.current?.zoomToFit(400, 40);
                }
                guardarVista();
              }}
              onZoomEnd={guardarVista}
              onNodeDragEnd={(n: any) => {
                n.fx = n.x;
                n.fy = n.y;
                guardarVista();
              }}
              onNodeHover={(n: any) => setHover(n?.id ?? null)}
              onNodeClick={clickNodo}
              onLinkClick={(l: any) => {
                if (!modoConectar) return;
                setEnlaceSel(todosEnlaces.find((e) => clavePar(e.source, e.target) === clavePar(idDe(l.source), idDe(l.target))) ?? null);
              }}
              onBackgroundClick={() => {
                if (!modoConectar) setSeleccionado(null);
                setEnlaceSel(null);
              }}
              linkWidth={(l: any) => (l.manual ? 2.5 : 0.6 + l.fuerza * 0.25)}
              linkLineDash={(l: any) => (l.manual ? null : [3, 3])}
              linkHoverPrecision={8}
              linkColor={(l: any) => {
                const toca = !vecinosSel || idDe(l.source) === seleccionado || idDe(l.target) === seleccionado;
                if (l.manual) return toca ? "rgba(250,204,21,0.9)" : "rgba(250,204,21,0.12)";
                return toca ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.05)";
              }}
              nodeCanvasObject={(n: any, ctx, k) =>
                dibujarNodo(n, ctx, k, {
                  tenue: !!vecinosSel && !vecinosSel.has(n.id),
                  resaltado: n.id === seleccionado || n.id === origen || n.id === hover || (!!q && n.titulo.toLowerCase().includes(q)),
                  etiqueta: true,
                })
              }
              nodePointerAreaPaint={(n: any, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(n.x, n.y, 6 + Math.sqrt(n.grado) * 2.2, 0, 2 * Math.PI);
                ctx.fill();
              }}
            />
          </Suspense>
        )}

        {nueva && (
          <div className="glass absolute left-1/2 top-4 w-[min(92%,360px)] -translate-x-1/2 space-y-3 p-4">
            <p className="font-pixel text-[9px] text-primary">NUEVA CONEXIÓN</p>
            <p className="text-xs">
              {nodosPorId.get(nueva.a)?.titulo} ↔ {nodosPorId.get(nueva.b)?.titulo}
            </p>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={120} placeholder="Motivo (opcional)" />
            <p className="text-[11px] text-muted-foreground">Fuerza: {fuerzaManual}</p>
            <Slider min={1} max={10} step={1} value={[fuerzaManual]} onValueChange={([v]) => setFuerzaManual(v)} />
            <div className="flex gap-2">
              <Button variant="chispa" size="sm" className="font-pixel flex-1 text-[8px]" onClick={crearConexion}>
                CONECTAR
              </Button>
              <Button variant="secondary" size="sm" className="font-pixel text-[8px]" onClick={() => setNueva(null)}>
                CANCELAR
              </Button>
            </div>
          </div>
        )}

        {enlaceSel && (
          <div className="glass absolute bottom-4 left-1/2 w-[min(92%,360px)] -translate-x-1/2 space-y-3 p-4">
            <p className="font-pixel text-[9px] text-primary">{enlaceSel.manual ? "CONEXIÓN MANUAL" : "CONEXIÓN AUTOMÁTICA"}</p>
            <p className="text-xs">
              {nodosPorId.get(enlaceSel.source)?.titulo} ↔ {nodosPorId.get(enlaceSel.target)?.titulo}
            </p>
            <ul className="text-[11px] text-muted-foreground">
              {enlaceSel.motivos.map((mo) => (
                <li key={mo}>• {mo}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="font-pixel flex-1 text-[8px]" onClick={() => borrarOIgnorar(enlaceSel)}>
                {enlaceSel.manual ? "BORRAR" : "IGNORAR ASOCIACIÓN"}
              </Button>
              <Button variant="ghost" size="sm" className="font-pixel text-[8px]" onClick={() => setEnlaceSel(null)}>
                CERRAR
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Panel del tema */}
      <aside className="glass space-y-4 p-5 lg:self-start">
        {sel ? (
          <PanelTema
            nodo={sel}
            conectados={conectados}
            onElegir={(id) => setSeleccionado(id)}
            onVer={() => {
              guardarVista();
              navigate({ to: "/e/$id", params: { id: sel.sesionId }, search: { desde: "grafo" } });
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Tocá un tema del grafo para ver sus conexiones.</p>
        )}
      </aside>
    </div>
  );
}

function PanelTema({
  nodo,
  conectados,
  onElegir,
  onVer,
}: {
  nodo: NodoTema;
  conectados: { enlace: Enlace; nodo: NodoTema }[];
  onElegir: (id: string) => void;
  onVer: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TopicIcon icon={nodo.icon} size={30} />
        </span>
        <div>
          <h2 className="text-lg font-semibold leading-tight">{nodo.titulo}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: colorMateria(nodo.materia) }} />
            {nodo.materia}
          </p>
        </div>
      </div>
      {nodo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {nodo.tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-[11px]">
              #{t}
            </span>
          ))}
        </div>
      )}
      <Button variant="chispa" className="font-pixel w-full text-[9px]" onClick={onVer}>
        VER EXPLICACIÓN
      </Button>
      <div className="space-y-2">
        <p className="font-pixel text-[9px] text-primary">CONECTADO CON ({conectados.length})</p>
        <ul className="max-h-[45vh] space-y-1.5 overflow-y-auto">
          {conectados.map(({ enlace, nodo: n }) => (
            <li key={n.id}>
              <button
                onClick={() => onElegir(n.id)}
                className="w-full rounded-lg border border-border px-3 py-2 text-left hover:border-primary/50"
              >
                <span className="flex items-center justify-between gap-2 text-sm">
                  {n.titulo}
                  <span className={cn("font-pixel text-[8px]", enlace.manual ? "text-primary" : "text-muted-foreground")}>
                    {enlace.fuerza}
                  </span>
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{enlace.motivos.join(" · ")}</span>
              </button>
            </li>
          ))}
          {conectados.length === 0 && <li className="text-xs text-muted-foreground">Sin conexiones todavía.</li>}
        </ul>
      </div>
    </>
  );
}
