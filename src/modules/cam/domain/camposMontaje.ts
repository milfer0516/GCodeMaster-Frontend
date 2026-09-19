// src/modules/cam/domain/camposMontaje.ts
// ─────────────────────────────────────────────────────────────────────────────
// DOMINIO PURO — convierte los `campos_montaje` del schema de una familia
// (GET /utillajes/familias/{familia}) en las dos mitades del sujecion_config
// que el backend espera en montaje_json. Sin React, sin fetch, sin store.
//
// Regla de reparto (contrato backend, docs/contrato_utillajes_frontend.md §4/§7,
// verificado en app/schemas/utillaje_familias.py:207-227 y
// app/routes/cam_routes.py:701-739):
//
//   - campo CON `medida_desde`  → sujecion_config.envolvente
//     (las cotas que el operario MIDE con calibre: part_bottom_z_mm,
//      part_top_z_mm, fixture_top_z_mm)
//   - cualquier otro campo      → sujecion_config.parametros_montaje
//     (cómo se usa el utillaje en ESTE trabajo; p.ej. en bridas,
//      `posiciones`: lista de {x_mm, y_mm})
//
// Las claves SIEMPRE son `campo.nombre`, tal como llegan del schema: aquí no
// hay ni un nombre de campo ni de familia escrito a mano, así que una familia
// nueva publicada en el backend no exige tocar este archivo.
// ─────────────────────────────────────────────────────────────────────────────
import type { CampoSchema } from "../services/utillajesService";
import type { EnvolventeMontaje } from "../store/camStore";

export type ValoresCampos = Record<string, unknown>;

export interface PuntoXY {
  x_mm: number;
  y_mm: number;
}

// ── Visibilidad (visible_si) ────────────────────────────────────────────────
// La condición viaja como dato en el schema justamente para que el frontend no
// tenga un `if familia === "generico"` escrito a mano. Si no se cumple, el
// campo no se pinta NI se envía (enviarlo es un 422 en el backend).
export function campoVisible(
  campo: CampoSchema,
  valores: ValoresCampos,
): boolean {
  if (!campo.visible_si) return true;
  return valores[campo.visible_si.campo] === campo.visible_si.igual_a;
}

export function camposVisibles(
  campos: CampoSchema[],
  valores: ValoresCampos,
): CampoSchema[] {
  return campos.filter((c) => campoVisible(c, valores));
}

// ── Normalización de valores (los inputs trabajan con strings) ──────────────
export function numeroDe(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "string" && valor.trim() !== "") {
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Lista de puntos {x_mm, y_mm} ya normalizada; filas incompletas se descartan. */
export function puntosDeValor(valor: unknown): PuntoXY[] {
  if (!Array.isArray(valor)) return [];
  const puntos: PuntoXY[] = [];
  for (const fila of valor) {
    const x = numeroDe((fila as { x_mm?: unknown })?.x_mm);
    const y = numeroDe((fila as { y_mm?: unknown })?.y_mm);
    if (x !== null && y !== null) puntos.push({ x_mm: x, y_mm: y });
  }
  return puntos;
}

/** ¿El campo tiene un valor declarado por el operario? (por tipo de campo) */
export function valorPresente(campo: CampoSchema, valor: unknown): boolean {
  switch (campo.tipo) {
    case "numero":
      return numeroDe(valor) !== null;
    case "texto":
      return typeof valor === "string" && valor.trim() !== "";
    case "opcion":
      return typeof valor === "string" && valor !== "";
    case "opcion_multiple":
      return Array.isArray(valor) && valor.length > 0;
    case "puntos_xy":
      return puntosDeValor(valor).length > 0;
  }
}

/** Campos obligatorios y visibles que aún no tienen valor declarado. */
export function camposIncompletos(
  campos: CampoSchema[],
  valores: ValoresCampos,
): CampoSchema[] {
  return camposVisibles(campos, valores).filter(
    (c) => c.obligatorio && !valorPresente(c, valores[c.nombre]),
  );
}

// ── Normalización por TIPO de campo (inputs → valor del contrato) ───────────
/**
 * Convierte el valor crudo de un input en el valor que viaja en el JSON, según
 * el TIPO declarado en el schema. Devuelve `undefined` cuando el campo no está
 * declarado (vacío): "no declarado" es un estado legítimo que el backend
 * reporta, y un valor inventado aquí sería una medida que nadie tomó.
 *
 * Es la ÚNICA fuente de la conversión por tipo: la usan tanto el reparto del
 * montaje (construirParametrosYEnvolvente) como el alta de utillajes
 * (construirParametrosUtillaje), así un tipo nuevo del contrato se soporta en
 * un solo sitio.
 */
export function normalizarValorCampo(
  campo: CampoSchema,
  bruto: unknown,
): unknown {
  switch (campo.tipo) {
    case "numero": {
      const n = numeroDe(bruto);
      return n === null ? undefined : n;
    }
    case "texto":
      return typeof bruto === "string" && bruto.trim() !== ""
        ? bruto.trim()
        : undefined;
    case "opcion":
      return typeof bruto === "string" && bruto !== "" ? bruto : undefined;
    case "opcion_multiple":
      return Array.isArray(bruto) && bruto.length > 0 ? bruto : undefined;
    case "puntos_xy": {
      const puntos = puntosDeValor(bruto);
      return puntos.length > 0 ? puntos : undefined;
    }
  }
}

// ── Construcción del sujecion_config ────────────────────────────────────────
/**
 * Reparte los valores declarados entre `parametros_montaje` y `envolvente`
 * según `medida_desde` (ver cabecera). Un campo opcional sin valor NO se
 * envía: "no declarado" es un estado legítimo que el motor reporta, y un
 * valor inventado aquí sería una medida que nadie tomó.
 */
export function construirParametrosYEnvolvente(
  campos: CampoSchema[],
  valores: ValoresCampos,
): {
  parametros_montaje: Record<string, unknown>;
  envolvente: EnvolventeMontaje;
} {
  const parametros_montaje: Record<string, unknown> = {};
  const envolvente: Record<string, number> = {};

  for (const campo of camposVisibles(campos, valores)) {
    if (campo.medida_desde) {
      const n = numeroDe(valores[campo.nombre]);
      if (n !== null) envolvente[campo.nombre] = n;
      continue;
    }

    const valor = normalizarValorCampo(campo, valores[campo.nombre]);
    if (valor !== undefined) parametros_montaje[campo.nombre] = valor;
  }

  return {
    parametros_montaje,
    // Las claves las ponen los `medida_desde` del schema (contrato T2); el
    // reparto garantiza que son las de EnvolventeMontaje.
    envolvente: envolvente as unknown as EnvolventeMontaje,
  };
}

// ── Construcción de los `parametros` del ALTA de un utillaje ────────────────
/**
 * Aplana los valores de los `campos_utillaje` del schema de la familia en el
 * dict `parametros` que espera POST /utillajes/manual
 * (utillaje_schema.py:115-119). SIN reparto: aquí no hay envolvente, todas las
 * claves van al mismo objeto, con clave = `campo.nombre` tal como llega del
 * schema. Los campos no visibles (visible_si) y los no declarados no se
 * envían: enviarlos es un 422 en el backend.
 */
export function construirParametrosUtillaje(
  campos: CampoSchema[],
  valores: ValoresCampos,
): Record<string, unknown> {
  const parametros: Record<string, unknown> = {};
  for (const campo of camposVisibles(campos, valores)) {
    const valor = normalizarValorCampo(campo, valores[campo.nombre]);
    if (valor !== undefined) parametros[campo.nombre] = valor;
  }
  return parametros;
}

// ── Reparto de puntos alrededor de la pieza ─────────────────────────────────
/**
 * Reparte `n` puntos {x_mm, y_mm} alrededor de la huella de la pieza (esquinas
 * primero, luego centros de lados), con `holgura` mm de margen. Es un helper
 * del TIPO de campo `puntos_xy` —vale para cualquier familia que lo declare—,
 * no de una familia concreta. Coordenadas centradas en la pieza, como pide la
 * ayuda del schema ("coordenadas de la mesa", pieza centrada en el 0,0).
 */
export function distribuirPuntosAlrededor(
  n: number,
  dimX: number,
  dimY: number,
  holgura: number,
): PuntoXY[] {
  const mitadX = dimX / 2;
  const mitadY = dimY / 2;
  const esquinas: PuntoXY[] = [
    { x_mm: mitadX + holgura, y_mm: mitadY + holgura },
    { x_mm: -mitadX - holgura, y_mm: mitadY + holgura },
    { x_mm: -mitadX - holgura, y_mm: -mitadY - holgura },
    { x_mm: mitadX + holgura, y_mm: -mitadY - holgura },
  ];
  const centrosLados: PuntoXY[] = [
    { x_mm: 0, y_mm: mitadY + holgura },
    { x_mm: 0, y_mm: -mitadY - holgura },
    { x_mm: mitadX + holgura, y_mm: 0 },
    { x_mm: -mitadX - holgura, y_mm: 0 },
  ];
  return [...esquinas, ...centrosLados].slice(0, Math.max(0, n));
}

// ── Altura total declarada del montaje ──────────────────────────────────────
/**
 * Lo más alto que queda el conjunto sobre la mesa: el máximo de las cotas
 * medidas declaradas (cara superior de la pieza, punto más alto del amarre).
 * DERIVADO de lo medido —no se pide como campo aparte— y solo para validación
 * de espacio libre en Z y presentación. 0 si no hay nada declarado.
 */
export function alturaTotalDeclarada(
  envolvente: EnvolventeMontaje | null,
): number {
  if (!envolvente) return 0;
  return Math.max(
    envolvente.part_bottom_z_mm ?? 0,
    envolvente.part_top_z_mm ?? 0,
    envolvente.fixture_top_z_mm ?? 0,
  );
}
