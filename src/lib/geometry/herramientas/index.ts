// src/lib/geometry/herramientas/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Registro de constructores de herramienta.
//
// Punto de entrada de la librería paramétrica. TODO lo que hay debajo son
// funciones puras: números entran, THREE.Object3D sale. No hay React, ni
// Zustand, ni props, ni fetch en ninguno de estos módulos — se pueden ejecutar
// desde un script plano:
//
//   import { construirHerramienta } from "@/lib/geometry/herramientas";
//   const obj = construirHerramienta("broca", { diametro_mm: 8, angulo_grados: 135 });
//   console.log(obj.children.length);
//
// Esa pureza es el requisito de reutilización: el paso de Montaje y el
// simulador van a llamar a estos mismos constructores para colocar y animar
// las herramientas, sin arrastrar nada de la pantalla de herramientas.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { crearMaterialesHerramienta, type MaterialesHerramienta } from "../materiales";
import { resolverParametros, type ParametrosHerramienta } from "./parametros";
import { portaherramientas } from "./comunes";

import { construirFresaPlana } from "./fresaPlana";
import { construirFresaEsferica } from "./fresaEsferica";
import { construirFresaRadio } from "./fresaRadio";
import { construirFresaPlaneadora } from "./fresaPlaneadora";
import { construirBroca } from "./broca";
import { construirBrocaCentros } from "./brocaCentros";
import { construirMachoRoscar } from "./machoRoscar";
import { construirFresaChaflan } from "./fresaChaflan";
import { construirEscariador } from "./escariador";
import { construirBarraMandrinar } from "./barraMandrinar";
import { construirCabezalMandrinado } from "./cabezalMandrinado";

export type ConstructorHerramienta = (
  parametros: ParametrosHerramienta,
  materiales?: MaterialesHerramienta,
) => THREE.Group;

/** Una entrada por familia del catálogo. Ninguna es un icono de relleno. */
export const CONSTRUCTORES: Record<string, ConstructorHerramienta> = {
  fresa_plana: construirFresaPlana,
  fresa_esferica: construirFresaEsferica,
  fresa_radio: construirFresaRadio,
  fresa_planeadora: construirFresaPlaneadora,
  broca: construirBroca,
  broca_centros: construirBrocaCentros,
  macho_roscar: construirMachoRoscar,
  fresa_chaflan: construirFresaChaflan,
  escariador: construirEscariador,
  barra_mandrinar: construirBarraMandrinar,
  cabezal_mandrinado: construirCabezalMandrinado,
};

export const FAMILIAS_CON_GEOMETRIA = Object.keys(CONSTRUCTORES);

/** Familias de ACOPLAMIENTO: no se sujetan con pinza, traen su propio amarre. */
const SIN_PINZA = new Set(["fresa_planeadora", "cabezal_mandrinado"]);

export function tieneGeometria(familia?: string | null): boolean {
  return !!familia && familia in CONSTRUCTORES;
}

export interface OpcionesConstruccion {
  /** Dibuja el portaherramientas cuando hay longitud útil medida. */
  conPortaherramientas?: boolean;
  materiales?: MaterialesHerramienta;
}

/**
 * Construye la herramienta de la familia indicada.
 *
 * Familia desconocida → se usa la fresa plana como forma representativa
 * (cilindro con filos): sigue siendo geometría paramétrica real, nunca un
 * icono de relleno.
 */
export function construirHerramienta(
  familia: string,
  parametros: Omit<ParametrosHerramienta, "familia"> = {},
  opciones: OpcionesConstruccion = {},
): THREE.Group {
  const p: ParametrosHerramienta = { ...parametros, familia };
  const constructor = CONSTRUCTORES[familia] ?? construirFresaPlana;
  const materiales =
    opciones.materiales ??
    crearMaterialesHerramienta({
      material: p.material,
      recubrimiento: p.recubrimiento,
    });

  const grupo = constructor(p, materiales);

  // El portaherramientas hace visible la longitud útil MEDIDA: una Ø12 con
  // 8 mm fuera del cono se ve achaparrada, y ese es todo el punto del preview.
  //
  // Solo se dibuja en herramientas DE MANGO. Las de acoplamiento traen su
  // propio amarre en el constructor (la planeadora va sobre árbol FMB, el
  // cabezal de mandrinado lleva vástago) y encajarles una pinza ER encima
  // sería inventar una herramienta que no existe.
  const r = resolverParametros(p);
  const esDeMango = !SIN_PINZA.has(familia);
  if (
    opciones.conPortaherramientas !== false &&
    r.tieneLongitudUtil &&
    esDeMango
  ) {
    grupo.add(portaherramientas(materiales, r.longitudExpuesta, r.dMango / 2));
  }

  return grupo;
}

export { resolverParametros };
export type { ParametrosHerramienta, MaterialesHerramienta };
export {
  construirFresaPlana,
  construirFresaEsferica,
  construirFresaRadio,
  construirFresaPlaneadora,
  construirBroca,
  construirBrocaCentros,
  construirMachoRoscar,
  construirFresaChaflan,
  construirEscariador,
  construirBarraMandrinar,
  construirCabezalMandrinado,
};
