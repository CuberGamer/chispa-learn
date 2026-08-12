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
            <path d="M34 38h8" stroke="oklch(0.2 0.03 265)" strokeWidth="4" strokeLinecap="round" />
            <path d="M47 35h8" stroke="oklch(0.2 0.03 265)" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : estado === "triste" ? (
          <>
            <circle cx="38" cy="40" r="3.2" fill="oklch(0.2 0.03 265)" />
            <circle cx="50" cy="37" r="3.2" fill="oklch(0.2 0.03 265)" />
            <path
              d="M34 34c2-3 6-3 8-1"
              stroke="oklch(0.2 0.03 265)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : estado === "sorprendido" ? (
          <>
            <circle cx="38" cy="39" r="4.4" fill="oklch(0.2 0.03 265)" />
            <circle cx="50" cy="36" r="4.4" fill="oklch(0.2 0.03 265)" />
          </>
        ) : (
          <>
            <circle cx="38" cy="39" r="3.2" fill="oklch(0.2 0.03 265)" />
            <circle cx="50" cy="36" r="3.2" fill="oklch(0.2 0.03 265)" />
          </>
        )}
        {/* boca */}
        {estado === "triste" ? (
          <path
            d="M39 49c2.5-3 6.5-3 9 0"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            transform="rotate(180 43.5 48)"
          />
        ) : estado === "emocionado" ? (
          <path
            d="M38 45c3 6 9 5.5 11 0"
            fill="oklch(0.2 0.03 265)"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="2"
          />
        ) : estado === "sorprendido" ? (
          <ellipse cx="43" cy="47" rx="3.4" ry="4.2" fill="oklch(0.2 0.03 265)" />
        ) : (
          <path
            d="M38 45c2.5 3.5 7.5 3.5 10 0"
            stroke="oklch(0.2 0.03 265)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {/* mejillas cuando está emocionado */}
        {estado === "emocionado" && (
          <>
            <circle cx="31" cy="44" r="2.6" fill="var(--cian)" opacity="0.9" />
            <circle cx="57" cy="40" r="2.6" fill="var(--cian)" opacity="0.9" />
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
