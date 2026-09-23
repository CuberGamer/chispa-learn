import {
  Atom, BookOpen, Brain, Brush, Calculator, Camera, Cat, CircuitBoard,
  CloudSun, Code2, Compass, Cpu, Dna, Earth, FlaskConical, Flower2,
  Gamepad2, Gem, Globe2, GraduationCap, Guitar, HeartPulse, Landmark,
  Languages, Leaf, Lightbulb, Microscope, MoonStar, Mountain, Music2,
  Palette, PawPrint, Piano, Plane, Rocket, Scale, ScrollText, Shell,
  Sparkles, Telescope, TestTube2, Theater, TreePine, Users, Waves,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const TOPIC_ICONS: ReadonlyArray<{
  id: string;
  label: string;
  category: string;
  Icon: LucideIcon;
}> = [
  { id: "libro", label: "Libro", category: "Estudio", Icon: BookOpen },
  { id: "graduacion", label: "Graduación", category: "Estudio", Icon: GraduationCap },
  { id: "idea", label: "Idea", category: "Estudio", Icon: Lightbulb },
  { id: "cerebro", label: "Cerebro", category: "Estudio", Icon: Brain },
  { id: "idiomas", label: "Idiomas", category: "Estudio", Icon: Languages },
  { id: "calculo", label: "Cálculo", category: "Estudio", Icon: Calculator },
  { id: "codigo", label: "Código", category: "Tecnología", Icon: Code2 },
  { id: "chip", label: "Chip", category: "Tecnología", Icon: Cpu },
  { id: "circuito", label: "Circuito", category: "Tecnología", Icon: CircuitBoard },
  { id: "atomo", label: "Átomo", category: "Ciencia", Icon: Atom },
  { id: "microscopio", label: "Microscopio", category: "Ciencia", Icon: Microscope },
  { id: "laboratorio", label: "Laboratorio", category: "Ciencia", Icon: FlaskConical },
  { id: "prueba", label: "Experimento", category: "Ciencia", Icon: TestTube2 },
  { id: "adn", label: "ADN", category: "Ciencia", Icon: Dna },
  { id: "salud", label: "Salud", category: "Ciencia", Icon: HeartPulse },
  { id: "telescopio", label: "Telescopio", category: "Espacio", Icon: Telescope },
  { id: "cohete", label: "Cohete", category: "Espacio", Icon: Rocket },
  { id: "luna", label: "Luna", category: "Espacio", Icon: MoonStar },
  { id: "mundo", label: "Mundo", category: "Mundo", Icon: Earth },
  { id: "globo", label: "Geografía", category: "Mundo", Icon: Globe2 },
  { id: "brujula", label: "Brújula", category: "Mundo", Icon: Compass },
  { id: "viaje", label: "Viaje", category: "Mundo", Icon: Plane },
  { id: "historia", label: "Historia", category: "Humanidades", Icon: ScrollText },
  { id: "monumento", label: "Monumento", category: "Humanidades", Icon: Landmark },
  { id: "justicia", label: "Justicia", category: "Humanidades", Icon: Scale },
  { id: "sociedad", label: "Sociedad", category: "Humanidades", Icon: Users },
  { id: "pincel", label: "Pintura", category: "Arte", Icon: Brush },
  { id: "paleta", label: "Arte", category: "Arte", Icon: Palette },
  { id: "teatro", label: "Teatro", category: "Arte", Icon: Theater },
  { id: "camara", label: "Fotografía", category: "Arte", Icon: Camera },
  { id: "musica", label: "Música", category: "Música", Icon: Music2 },
  { id: "guitarra", label: "Guitarra", category: "Música", Icon: Guitar },
  { id: "piano", label: "Piano", category: "Música", Icon: Piano },
  { id: "hoja", label: "Naturaleza", category: "Naturaleza", Icon: Leaf },
  { id: "arbol", label: "Bosque", category: "Naturaleza", Icon: TreePine },
  { id: "flor", label: "Flor", category: "Naturaleza", Icon: Flower2 },
  { id: "montana", label: "Montaña", category: "Naturaleza", Icon: Mountain },
  { id: "olas", label: "Océano", category: "Naturaleza", Icon: Waves },
  { id: "concha", label: "Vida marina", category: "Naturaleza", Icon: Shell },
  { id: "clima", label: "Clima", category: "Naturaleza", Icon: CloudSun },
  { id: "animales", label: "Animales", category: "Naturaleza", Icon: PawPrint },
  { id: "gato", label: "Gato", category: "Naturaleza", Icon: Cat },
  { id: "videojuegos", label: "Videojuegos", category: "Cultura", Icon: Gamepad2 },
  { id: "gema", label: "Gema", category: "Cultura", Icon: Gem },
  { id: "chispa", label: "Chispa", category: "Cultura", Icon: Sparkles },
] as const;

export function TopicIcon({ icon, className, size = 32 }: { icon?: string | null | undefined; className?: string | undefined; size?: number | undefined }) {
  const item = TOPIC_ICONS.find((candidate) => candidate.id === icon);
  const Icon = item?.Icon ?? BookOpen;
  return <Icon aria-hidden className={cn("text-primary", className)} size={size} strokeWidth={2.4} />;
}