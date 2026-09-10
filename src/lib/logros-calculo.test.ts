import { describe, expect, it } from "vitest";
import {
  calcularEstadisticas,
  cumpleLogro,
  logrosNuevos,
  type Estadisticas,
} from "./logros-calculo";

const statsVacias: Estadisticas = {
  sesiones: 0,
  temasDistintos: 0,
  minutos: 0,
  rachaActual: 0,
  rachaMaxima: 0,
  explicacionMasLarga: 0,
};

describe("calcularEstadisticas", () => {
  // CASO CORRECTO: datos normales y completos
  it("suma minutos, cuenta temas distintos y toma la explicación más larga", () => {
    const stats = calcularEstadisticas(
      [
        { topic_id: "a", duration_minutes: 15, explanation_text: "hola" },
        { topic_id: "a", duration_minutes: 30, explanation_text: "explicación larga" },
        { topic_id: "b", duration_minutes: 5, explanation_text: "x" },
      ],
      { current_streak: 3, longest_streak: 9 },
    );

    expect(stats).toEqual({
      sesiones: 3,
      temasDistintos: 2,
      minutos: 50,
      rachaActual: 3,
      rachaMaxima: 9,
      explicacionMasLarga: "explicación larga".length,
    });
  });

  // CASO CON DATOS INVÁLIDOS: nulos donde deberían venir números o texto
  it("trata los campos nulos como cero sin romperse", () => {
    const stats = calcularEstadisticas(
      [
        { topic_id: null, duration_minutes: null, explanation_text: null },
        { topic_id: "a", duration_minutes: 10, explanation_text: null },
      ],
      null,
    );

    expect(stats.minutos).toBe(10);
    expect(stats.explicacionMasLarga).toBe(0);
    expect(stats.rachaActual).toBe(0);
    expect(stats.rachaMaxima).toBe(0);
  });

  // CASO LÍMITE: sin sesiones ni racha
  it("devuelve todo en cero cuando no hay sesiones", () => {
    expect(calcularEstadisticas([], null)).toEqual(statsVacias);
    expect(calcularEstadisticas(undefined, null)).toEqual(statsVacias);
  });
});

describe("cumpleLogro", () => {
  // CASO CORRECTO
  it("desbloquea 'Primera chispa' con una sesión", () => {
    expect(cumpleLogro("Primera chispa", { ...statsVacias, sesiones: 1 })).toBe(true);
  });

  // CASO INVÁLIDO: nombre de logro inexistente
  it("devuelve false para un logro desconocido", () => {
    expect(cumpleLogro("Logro inventado", { ...statsVacias, sesiones: 99 })).toBe(false);
  });

  // CASO LÍMITE: justo por debajo y justo en el umbral
  it("respeta el umbral exacto de 'Maratón' (300 minutos)", () => {
    expect(cumpleLogro("Maratón", { ...statsVacias, minutos: 299 })).toBe(false);
    expect(cumpleLogro("Maratón", { ...statsVacias, minutos: 300 })).toBe(true);
  });

  it("desbloquea 'Racha de 7' tanto por racha actual como por la máxima", () => {
    expect(cumpleLogro("Racha de 7", { ...statsVacias, rachaActual: 7 })).toBe(true);
    expect(cumpleLogro("Racha de 7", { ...statsVacias, rachaMaxima: 7 })).toBe(true);
    expect(cumpleLogro("Racha de 7", { ...statsVacias, rachaMaxima: 6 })).toBe(false);
  });
});

describe("logrosNuevos", () => {
  const catalogo = [
    { id: "1", name: "Primera chispa" },
    { id: "2", name: "Maratón" },
    { id: "3", name: "Diez temas" },
  ];

  // CASO CORRECTO
  it("devuelve solo los logros cumplidos que el usuario todavía no tiene", () => {
    const stats = { ...statsVacias, sesiones: 4, minutos: 400 };
    expect(logrosNuevos(catalogo, ["1"], stats)).toEqual([
      { id: "2", name: "Maratón" },
    ]);
  });

  // CASO INVÁLIDO: catálogo nulo
  it("devuelve una lista vacía si no hay catálogo de logros", () => {
    expect(logrosNuevos(null, [], statsVacias)).toEqual([]);
  });

  // CASO LÍMITE: ya tiene todos los logros cumplidos
  it("no repite logros ya obtenidos", () => {
    const stats = { ...statsVacias, sesiones: 4, minutos: 400, temasDistintos: 10 };
    expect(logrosNuevos(catalogo, ["1", "2", "3"], stats)).toEqual([]);
  });
});
