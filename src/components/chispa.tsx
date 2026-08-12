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

/**
 * Chispa: la mascota. Flat design, contorno grueso y glow neón.
 * Las expresiones cambian con la prop `estado`.
 */
export function Chispa({
  estado = "neutral",
  size = "md",
  className,
  flotando = true,
}: {
  estado?: ChispaEstado;
  size?: keyof typeof tamanos;
  className?: string;
  flotando?: boolean;
}) {
  const px = tamanos[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div
        aria-hidden
        className="animate-pulso absolute inset-0 rounded-full"
        style={{
          background:
            estado === "triste"
              ? "radial-gradient(circle, oklch(0.62 0.24 300 / 0.35), transparent 65%)"
              : "radial-gradient(circle, oklch(0.9 0.19 100 / 0.4), transparent 65%)",
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
          d="M56 6 22 54h20l-8 40 34-50H48l8-38Z"
          fill="var(--primary)"
          stroke="oklch(0.2 0.03 265)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* ojos */}
        {estado === "concentrado" ? (
          <>
            <path d="M33 47h9" stroke="oklch(0.2 0.03 265)" strokeWidth="4" strokeLinecap="round" />
            <path d="M48 44h9" stroke="oklch(0.2 0.03 265)" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : estado === "triste" ? (
          <>
            <circle cx="37" cy="49" r="3.4" fill="oklch(0.2 0.03 265)" />
            <circle cx="52" cy="46" r="3.4" fill="oklch(0.2 0.03 265)" />
            <path
              d="M33 43c2-3 6-3 8-1"
              stroke="oklch(0.2 0.03 265)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : estado === "sorprendido" ? (
          <>
            <circle cx="37" cy="48" r="5" fill="oklch(0.2 0.03 265)" />
            <circle cx="53" cy="45" r="5" fill="oklch(0.2 0.03 265)" />
          </>
        ) : (
          <>
            <circle cx="37" cy="48" r="3.6" fill="oklch(0.2 0.03 265)" />
            <circle cx="52" cy="45" r="3.6" fill="oklch(0.2 0.03 265)" />
          </>
        )}
        {/* boca */}
        {estado === "triste" ? (
          <path
            d="M38 62c3-3 8-3 11 0"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            transform="rotate(180 43.5 61)"
          />
        ) : estado === "emocionado" ? (
          <path
            d="M36 57c4 8 12 7 15 0"
            fill="oklch(0.2 0.03 265)"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="2"
          />
        ) : estado === "sorprendido" ? (
          <ellipse cx="44" cy="59" rx="4" ry="5" fill="oklch(0.2 0.03 265)" />
        ) : (
          <path
            d="M37 58c3 4 9 4 12 0"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {/* mejillas cuando está emocionado */}
        {estado === "emocionado" && (
          <>
            <circle cx="29" cy="55" r="3" fill="var(--cian)" opacity="0.9" />
            <circle cx="60" cy="52" r="3" fill="var(--cian)" opacity="0.9" />
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
