// src/modules/cam/domain/herramientasOperacion.ts
// ─────────────────────────────────────────────────────────────────────────────
// DOMINIO PURO — cruce entre lo que dice el MDE y lo que hay en el cajón.
//
// El MDE razona sobre familia y diámetro (mde/types.py: `Tool` solo tiene
// tool_type, diameter_mm, usable_length_mm y availability). No sabe —ni tiene
// por qué— en qué alojamiento del carrusel está la pieza física ni qué código
// interno le puso el taller. Eso vive en el inventario (Tier 3, toolingService).
//
// Este módulo SOLO empareja: busca en el inventario la pieza física que encaja
// con la herramienta que nombró el MDE. No decide, no ordena por criterio propio
// y no rellena lo que no encuentra: si no hay pieza, devuelve null y la pantalla
// muestra la recomendación sin alojamiento, que es la verdad.
//
// Sin React, sin fetch: recibe la lista ya cargada.
// ─────────────────────────────────────────────────────────────────────────────
import { familiaDeToolType } from "./mdeRecomendaciones";

/**
 * Lo que este módulo necesita de una herramienta física. Estructural a
 * propósito: acepta una `Instancia` de toolingService sin acoplarse a ella.
 */
export interface HerramientaFisica {
  id_herramienta_instancia: number;
  familia: string | null;
  nombre: string | null;
  diametro_mm: number | null;
  posicion_carrusel: number | null;
  estado: string;
  longitud_util_real_mm: number | null;
  codigo_interno: string | null;
  material: string | null;
}

/**
 * Misma tolerancia que usa el motor para decir "es el mismo tamaño"
 * (mde/tooling.py: DIAMETER_MATCH_TOL_MM). Se copia el valor, no el criterio:
 * si el motor la cambia, aquí se actualiza — no se inventa una propia.
 */
export const TOLERANCIA_DIAMETRO_MM = 0.05;

/**
 * La pieza física que encarna una herramienta nombrada por el MDE.
 *
 * `toolType` es el vocabulario del motor (p. ej. "fresa_planeado"); se traduce a
 * la familia del catálogo antes de comparar, porque los dos nombres no siempre
 * coinciden. Entre varias candidatas gana la que está DISPONIBLE, y a igualdad
 * la de menor alojamiento de carrusel: determinista, sin desempates al azar.
 */
export function buscarHerramientaFisica(
  inventario: readonly HerramientaFisica[],
  toolType?: string | null,
  diametroMm?: number | null,
): HerramientaFisica | null {
  const familia = familiaDeToolType(toolType);
  if (!familia || diametroMm == null) return null;

  const candidatas = inventario.filter(
    (h) =>
      h.familia === familia &&
      h.diametro_mm != null &&
      Math.abs(h.diametro_mm - diametroMm) <= TOLERANCIA_DIAMETRO_MM,
  );
  if (candidatas.length === 0) return null;

  const ordenadas = [...candidatas].sort((a, b) => {
    const disponible = (h: HerramientaFisica) => (h.estado === "disponible" ? 0 : 1);
    if (disponible(a) !== disponible(b)) return disponible(a) - disponible(b);
    return (a.posicion_carrusel ?? Infinity) - (b.posicion_carrusel ?? Infinity);
  });
  return ordenadas[0];
}

export function porId(
  inventario: readonly HerramientaFisica[],
  id: number | undefined,
): HerramientaFisica | null {
  if (id == null) return null;
  return inventario.find((h) => h.id_herramienta_instancia === id) ?? null;
}

/**
 * Número de herramienta del taller: T3, T5… Es el ALOJAMIENTO DEL CARRUSEL de
 * la pieza física. Si la herramienta no está montada en el carrusel no tiene
 * número, y entonces no se muestra ninguno — un "T—" o un "T0" inventado se
 * teclearía tal cual en la máquina.
 */
export function numeroT(herramienta: HerramientaFisica | null): string | null {
  if (!herramienta || herramienta.posicion_carrusel == null) return null;
  return `T${herramienta.posicion_carrusel}`;
}

/**
 * Cambios de herramienta de una secuencia: cuántas veces hay que parar a
 * cambiar recorriendo las operaciones EN EL ORDEN EN QUE SE MUESTRAN. Es un
 * conteo sobre datos reales (la herramienta asignada a cada operación), no una
 * estimación.
 *
 * Devuelve null si alguna operación de la secuencia no tiene herramienta: con
 * un hueco, el número sería falso, y un total falso en el pie es peor que
 * ninguno.
 */
export function cambiosDeHerramienta(
  secuencia: readonly (HerramientaFisica | null)[],
): number | null {
  if (secuencia.length === 0) return 0;
  if (secuencia.some((h) => h === null)) return null;

  let cambios = 1; // montar la primera ya es un cambio
  for (let i = 1; i < secuencia.length; i++) {
    if (
      secuencia[i]!.id_herramienta_instancia !==
      secuencia[i - 1]!.id_herramienta_instancia
    ) {
      cambios++;
    }
  }
  return cambios;
}
