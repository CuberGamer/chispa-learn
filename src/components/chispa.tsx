import { cn } from "@/lib/utils";

export type ChispaEstado =
  | "neutral"
  | "concentrado"
  | "emocionado"
  | "triste"
  | "sorprendido";

const tamanos = {
  sm: 64,
  md: 120,
  lg: 200,
  xl: 260,
} as const;

export type ChispaSkin = "clasico" | "violeta" | "cian";

export const SKINS: { id: ChispaSkin; nombre: string }[] = [
  { id: "clasico", nombre: "Clásico" },
  { id: "violeta", nombre: "Violeta" },
  { id: "cian", nombre: "Cian" },
];

const cuerpos: Record<ChispaSkin, string> = {
  clasico: "var(--primary)",
  violeta: "var(--violeta)",
  cian: "var(--cian)",
};

const auras: Record<ChispaSkin, string> = {
  clasico: "oklch(0.9 0.19 100 / 0.4)",
  violeta: "oklch(0.62 0.24 300 / 0.4)",
  cian: "oklch(0.82 0.14 200 / 0.4)",
};

/**
 * Chispa: la mascota. Flat design, contorno grueso y glow neón.
 * Las expresiones cambian con la prop `estado`.
 */
export function Chispa({
  estado = "neutral",
  size = "md",
  className,
  flotando = true,
  skin = "clasico",
}: {
  estado?: ChispaEstado;
  size?: keyof typeof tamanos;
  className?: string;
  flotando?: boolean;
  skin?: ChispaSkin;
}) {
  const px = tamanos[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div
        aria-hidden
        className="animate-pulso absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${
            estado === "triste" ? "oklch(0.62 0.24 300 / 0.35)" : auras[skin]
          }, transparent 65%)`,
        }}
      />
      <svg
        width={px}
        height={px}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Chispa, la mascota, en estado ${estado}`}
        className={cn("relative", flotando && "animate-flotar")}
      >
        {/* cuerpo de rayito */}
        <path
          d="M64 8H38L24 56h18l-8 38 38-50H50L64 8Z"
          fill={cuerpos[skin]}
          stroke="oklch(0.2 0.03 265)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* ojos */}
        {estado === "concentrado" ? (
          <>
            <path d="M36 30h7" stroke="oklch(0.2 0.03 265)" strokeWidth="4" strokeLinecap="round" />
            <path d="M48 28h7" stroke="oklch(0.2 0.03 265)" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : estado === "triste" ? (
          <>
            <circle cx="39" cy="31" r="3.2" fill="oklch(0.2 0.03 265)" />
            <circle cx="51" cy="29" r="3.2" fill="oklch(0.2 0.03 265)" />
            <path
              d="M35 25c2-3 6-3 8-1"
              stroke="oklch(0.2 0.03 265)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : estado === "sorprendido" ? (
          <>
            <circle cx="39" cy="30" r="4.4" fill="oklch(0.2 0.03 265)" />
            <circle cx="51" cy="28" r="4.4" fill="oklch(0.2 0.03 265)" />
          </>
        ) : (
          <>
            <circle cx="39" cy="30" r="3.2" fill="oklch(0.2 0.03 265)" />
            <circle cx="51" cy="28" r="3.2" fill="oklch(0.2 0.03 265)" />
          </>
        )}
        {/* boca */}
        {estado === "triste" ? (
          <path
            d="M40 41c2.5-3 6.5-3 9 0"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            transform="rotate(180 44.5 40)"
          />
        ) : estado === "emocionado" ? (
          <path
            d="M39 38c3 6 9 5.5 11 0"
            fill="oklch(0.2 0.03 265)"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="2"
          />
        ) : estado === "sorprendido" ? (
          <ellipse cx="44" cy="39" rx="3.4" ry="4.2" fill="oklch(0.2 0.03 265)" />
        ) : (
          <path
            d="M39 38c2.5 3.5 7.5 3.5 10 0"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {/* mejillas cuando está emocionado */}
        {estado === "emocionado" && (
          <>
            <circle cx="32" cy="37" r="2.6" fill="var(--cian)" opacity="0.9" />
            <circle cx="57" cy="33" r="2.6" fill="var(--cian)" opacity="0.9" />
          </>
        )}
      </svg>
    </div>
  );
}

export function BurbujaChispa({ children }: { children: React.ReactNode }) {
  return (
    <p className="panel inline-block px-4 py-2 text-sm text-foreground/90">
      {children}
    </p>
  );
}
