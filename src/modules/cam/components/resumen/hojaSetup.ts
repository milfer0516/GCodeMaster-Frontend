// src/modules/cam/components/resumen/hojaSetup.ts
// ─────────────────────────────────────────────────────────────────────────────
// HOJA DE SETUP del paso Resumen — modelo PURO de lo que ya tienen los pasos
// anteriores, ANTES de generar. Nada de la respuesta de generación (parámetros
// de corte, resultados por setup) entra aquí: eso es del paso de resultado.
//
// Aquí no se calcula ni se inventa ningún valor de fabricación: cada fila LEE
// un dato que ya existe (store, respuesta de sellado, MDE, máquina registrada)
// y lo formatea. Si el dato falta, la fila lo dice, nunca con un hueco:
//   · "no disponible" — el sistema debería tenerlo y no lo tiene.
//   · "no declarado"  — es una decisión del operario que aún no tomó. Si el
//     store ya tiene un valor inicial que viajará igual, se muestra al lado:
//     "no declarado (valor inicial: G54)". Un valor inicial nunca se presenta
//     como una decisión.
//
// Crecimiento por extensión: cada sección es una FILA de SECCIONES_HOJA. Una
// sección nueva es una fila nueva; la pantalla no cambia.
//
// Sin React: recibe una foto del store (CamState).
// ─────────────────────────────────────────────────────────────────────────────
import type { CamState, OperacionSellada } from "../../store/camStore";
import { etiquetaDatumDe } from "../../store/selectoresCero";
import { buildStockPayload } from "../../services/camService";
import { ESTADOS_PIEZA, FORMA_LABEL } from "../../domain/contextoFabricacion";
import {
  consultaFallida,
  herramientaIdeal,
  indexarRecomendaciones,
  nombreToolType,
  recomendacionDe,
  type RecomendacionMDE,
} from "../../domain/mdeRecomendaciones";
import { tipoOperacionLabel } from "../../domain/tiposOperacion";
import {
  ALL_DIRECTIONS,
  CYL_REGION_BY_INDEX,
  cylRegionLabel,
  cylRegionLocked,
  getCylOffset,
  roleLabel,
  type StockFaceDirection,
} from "../../utils/stockFaces";
import { formatMm } from "../../../../utils/format";

// ── Valor de una fila ───────────────────────────────────────────────────────

export const NO_DISPONIBLE = "no disponible";
export const NO_DECLARADO = "no declarado";

/**
 * `dato`: lo que existe, formateado. `falta`: una de las dos palabras de
 * ausencia y, si lo hay, el valor inicial que viajará igual. `aviso`: un dato
 * real que el operario debe mirar.
 */
export type Valor =
  | { clase: "dato"; texto: string }
  | {
      clase: "falta";
      texto: typeof NO_DISPONIBLE | typeof NO_DECLARADO;
      valorInicial?: string;
    }
  | { clase: "aviso"; texto: string };

const dato = (texto: string): Valor => ({ clase: "dato", texto });
const aviso = (texto: string): Valor => ({ clase: "aviso", texto });
export const VALOR_NO_DISPONIBLE: Valor = { clase: "falta", texto: NO_DISPONIBLE };
export const VALOR_NO_DECLARADO: Valor = { clase: "falta", texto: NO_DECLARADO };

/** Decisión no tomada cuyo valor inicial del store viajará igual. */
const noDeclaradoCon = (valorInicial: string): Valor => ({
  clase: "falta",
  texto: NO_DECLARADO,
  valorInicial,
});

/** El texto que ve el operario para un Valor. */
export function textoDeValor(v: Valor): string {
  return v.clase === "falta" && v.valorInicial
    ? `${v.texto} (valor inicial: ${v.valorInicial})`
    : v.texto;
}

function esNumero(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function esTexto(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

/** Primer texto no vacío, o null. */
function primerTexto(...valores: unknown[]): string | null {
  const t = valores.find(esTexto);
  return t ? t.trim() : null;
}

/** Une las partes que existen con " · ". Cadena vacía si no hay ninguna. */
function unir(partes: unknown[]): string {
  return partes
    .filter(esTexto)
    .map((p) => p.trim())
    .join(" · ");
}

function texto(v: unknown, falta: Valor): Valor {
  return esTexto(v) ? dato(v.trim()) : falta;
}

function mm(v: unknown, falta: Valor): Valor {
  return esNumero(v) ? dato(`${formatMm(v)} mm`) : falta;
}

// ── Secciones de la hoja ────────────────────────────────────────────────────

export interface FilaHoja {
  etiqueta: string;
  valor: Valor;
}

/**
 * Tabla dentro de una sección (p. ej. las sobremedidas por cara). Cada fila
 * tiene tantas `celdas` de texto como encabezados menos uno; la última columna
 * es siempre el Valor. La primera celda identifica la fila.
 */
export interface TablaHoja {
  titulo: string;
  encabezados: string[];
  filas: Array<{ clave: string; celdas: string[]; valor: Valor }>;
}

/** Secciones de la hoja. La pantalla elige su icono por este id. */
export type IdSeccion = "pieza" | "material" | "maquina" | "montaje" | "cero";

export interface SeccionHoja {
  id: IdSeccion;
  titulo: string;
  /** Aclaración visible de la sección (p. ej. de dónde sale el dato). */
  nota?: string;
  filas: FilaHoja[];
  tabla?: TablaHoja;
}

/** Medidas que devolvió el motor al sellar (marco de mecanizado), o null. */
export function dimensionesSelladas(
  e: CamState,
): { x: number; y: number; z: number } | null {
  const d = e.orientacionSellada?.dimensiones_marco;
  return d && esNumero(d.x) && esNumero(d.y) && esNumero(d.z) ? d : null;
}

function filasPieza(e: CamState): FilaHoja[] {
  // Medidas de la pieza ya orientada, tal como las devolvió el motor al sellar.
  const d = dimensionesSelladas(e);
  const dimensiones = d
    ? dato(`${formatMm(d.x)} × ${formatMm(d.y)} × ${formatMm(d.z)} mm`)
    : VALOR_NO_DISPONIBLE;

  // Sin responder, viaja igual el estado inicial ("No estoy seguro").
  const tituloLlegada = ESTADOS_PIEZA.find(
    (c) => c.id === e.contextoFabricacion.estado,
  )?.titulo;
  const llegada = e.contextoRespondido
    ? texto(tituloLlegada, VALOR_NO_DISPONIBLE)
    : esTexto(tituloLlegada)
      ? noDeclaradoCon(tituloLlegada)
      : VALOR_NO_DECLARADO;

  return [
    {
      etiqueta: "Archivo",
      valor: texto(e.nombreArchivo || e.archivo?.name, VALOR_NO_DISPONIBLE),
    },
    { etiqueta: "Dimensiones (X × Y × Z)", valor: dimensiones },
    { etiqueta: "Estado de la pieza", valor: llegada },
  ];
}

/** "x_pos" → "X+", "y_neg" → "Y−" (U+2212). Solo da formato a la clave. */
function etiquetaDireccion(d: StockFaceDirection): string {
  return `${d[0].toUpperCase()}${d.endsWith("_pos") ? "+" : "−"}`;
}

/**
 * Una sobremedida. La cara de apoyo está bloqueada por regla (no es decisión
 * del operario ni un valor por defecto); las demás solo son dato si el
 * operario las declaró (StockFace.declarada / CylStock.declaradas).
 */
function valorSobremedida(
  valor: unknown,
  bloqueada: boolean,
  declarada: boolean,
): Valor {
  if (!esNumero(valor)) return VALOR_NO_DISPONIBLE;
  const t = `${formatMm(valor)} mm`;
  if (bloqueada) return dato(`${t} · bloqueada (cara de apoyo)`);
  return declarada ? dato(t) : noDeclaradoCon(t);
}

export const TITULO_SOBREMEDIDAS = "Sobremedidas (por cara)";

/**
 * Las sobremedidas, una fila por cara (rectangular) o región (cilíndrico).
 * null cuando todavía no existen caras (rectangular sin Setup confirmado): la
 * sección lo dice con una fila "no disponible".
 */
function tablaSobremedidas(e: CamState): TablaHoja | null {
  const { tipo, stockFaces, cyl } = e.stockConfig;
  if (tipo === "cilindrico") {
    return {
      titulo: TITULO_SOBREMEDIDAS,
      encabezados: ["Región", "Sobremedida"],
      filas: CYL_REGION_BY_INDEX.map((kind) => ({
        clave: kind,
        celdas: [cylRegionLabel(kind)],
        valor: valorSobremedida(
          getCylOffset(cyl, kind),
          cylRegionLocked(kind),
          cyl.declaradas?.[kind] === true,
        ),
      })),
    };
  }
  // Sin Setup confirmado no hay caras: las seis se crean al salir de Montaje.
  if (stockFaces.length === 0) return null;
  return {
    titulo: TITULO_SOBREMEDIDAS,
    encabezados: ["Cara", "Rol", "Sobremedida"],
    filas: ALL_DIRECTIONS.map((direction) => {
      const cara = stockFaces.find((f) => f.direction === direction);
      return {
        clave: direction,
        celdas: [
          etiquetaDireccion(direction),
          cara ? roleLabel(cara.role) : NO_DISPONIBLE,
        ],
        valor: cara
          ? valorSobremedida(cara.allowance, cara.locked, cara.declarada === true)
          : VALOR_NO_DISPONIBLE,
      };
    }),
  };
}

/** ¿Alguna sobremedida editable sigue en su valor inicial sin declarar? */
function haySobremedidaNoDeclarada(e: CamState): boolean {
  const { tipo, stockFaces, cyl } = e.stockConfig;
  if (tipo === "cilindrico") {
    return CYL_REGION_BY_INDEX.some(
      (kind) => !cylRegionLocked(kind) && cyl.declaradas?.[kind] !== true,
    );
  }
  return stockFaces.some((f) => !f.locked && f.declarada !== true);
}

/**
 * El bruto que se enviará al motor: el resultado de `buildStockPayload`, la
 * MISMA función que construye `stock_json`. Aquí no se suma nada: se lee su
 * resultado. Sin Setup (o sin caras, en rectangular) no se llama, porque la
 * función rellenaría con 0 lo que nadie midió.
 */
function brutoQueSeEnvia(e: CamState): Valor {
  const s = e.setup;
  if (!s) return VALOR_NO_DISPONIBLE;
  if (e.stockConfig.tipo === "rectangular" && e.stockConfig.stockFaces.length === 0) {
    return VALOR_NO_DISPONIBLE;
  }
  const p = buildStockPayload(
    e.stockConfig,
    { x: s.rotatedBBox.width, y: s.rotatedBBox.depth, z: s.rotatedBBox.height },
    s.partCylinderOD,
    s.partCylinderLen,
  ) as Record<string, unknown>;

  let medidas: string | null = null;
  if (p.forma === "cilindrico") {
    const diametro = p.diametro_mm;
    const longitud = p.longitud_mm;
    if (esNumero(diametro) && esNumero(longitud)) {
      medidas = `Ø${formatMm(diametro)} × ${formatMm(longitud)} mm`;
    }
  } else {
    const x = p.x_mm;
    const y = p.y_mm;
    const z = p.z_mm;
    if (esNumero(x) && esNumero(y) && esNumero(z)) {
      medidas = `${formatMm(x)} × ${formatMm(y)} × ${formatMm(z)} mm (X × Y × Z)`;
    }
  }
  if (medidas === null) return VALOR_NO_DISPONIBLE;
  return haySobremedidaNoDeclarada(e)
    ? aviso(`${medidas} · incluye sobremedidas no declaradas`)
    : dato(medidas);
}

export const ETIQUETA_BRUTO = "Dimensiones del bruto (se enviará al motor)";

function filasMaterialYBruto(e: CamState): FilaHoja[] {
  const m = e.material;
  const textoMaterial = m
    ? unir([m.nombre, esTexto(m.grupo_iso) ? `ISO ${m.grupo_iso}` : null, m.categoria])
    : "";
  const forma = FORMA_LABEL[e.stockConfig.tipo];
  return [
    {
      etiqueta: "Material",
      valor: !m
        ? VALOR_NO_DECLARADO
        : textoMaterial
          ? dato(textoMaterial)
          : VALOR_NO_DISPONIBLE,
    },
    {
      etiqueta: "Forma del bruto",
      valor: e.formaDeclarada
        ? texto(forma, VALOR_NO_DISPONIBLE)
        : esTexto(forma)
          ? noDeclaradoCon(forma)
          : VALOR_NO_DECLARADO,
    },
    {
      etiqueta: ETIQUETA_BRUTO,
      valor: brutoQueSeEnvia(e),
    },
    // Sin caras todavía: la tabla no existe y se dice aquí.
    ...(tablaSobremedidas(e) === null
      ? [{ etiqueta: TITULO_SOBREMEDIDAS, valor: VALOR_NO_DISPONIBLE }]
      : []),
  ];
}

function filasMaquina(e: CamState): FilaHoja[] {
  const m = e.maquina;
  const marcaModelo = unir([m?.marca, m?.modelo]);
  const control = unir([m?.controlador, m?.controlador_modelo]);
  const rpmMax: unknown = m?.rpm_max_husillo;
  const avanceMax: unknown = m?.avance_max_mmmin;
  return [
    { etiqueta: "Máquina", valor: texto(m?.nombre, VALOR_NO_DISPONIBLE) },
    {
      etiqueta: "Marca y modelo",
      valor: marcaModelo ? dato(marcaModelo) : VALOR_NO_DISPONIBLE,
    },
    { etiqueta: "Control", valor: control ? dato(control) : VALOR_NO_DISPONIBLE },
    {
      etiqueta: "Husillo máximo",
      valor: esNumero(rpmMax) ? dato(`${formatMm(rpmMax)} rpm`) : VALOR_NO_DISPONIBLE,
    },
    {
      etiqueta: "Avance máximo",
      valor: esNumero(avanceMax)
        ? dato(`${formatMm(avanceMax)} mm/min`)
        : VALOR_NO_DISPONIBLE,
    },
  ];
}

/**
 * La cara de apoyo en palabras del operario, nunca su número interno. Se lee
 * de la entrada de `caras_planas` que devolvió el SELLADO (análisis en el
 * marco de mecanizado) para esa cara: hacia dónde mira (`apunta_abajo` /
 * `apunta_arriba`, los mismos campos que lee SeccionCaraApoyo) y su área. Sin
 * esa entrada, se dice que el motor no la describió.
 */
function caraDeApoyo(e: CamState): Valor {
  const caraId = e.montajeConfig.face_id_apoyo;
  if (e.estadoOrientacion !== "sellada" || caraId === null) return VALOR_NO_DECLARADO;

  const caras: unknown = e.orientacionSellada?.analisis?.caras_planas;
  const cara = Array.isArray(caras)
    ? (caras as Array<Record<string, unknown>>).find((c) => c?.face_index === caraId)
    : undefined;

  const lado = !cara
    ? null
    : cara.apunta_abajo === true
      ? "inferior"
      : cara.apunta_arriba === true
        ? "superior"
        : cara.apunta_abajo === false && cara.apunta_arriba === false
          ? "lateral"
          : null;
  const area = cara && esNumero(cara.area_mm2) ? `${formatMm(cara.area_mm2)} mm²` : null;

  if (!lado && !area) {
    return aviso("Establecida · el motor no devolvió su descripción");
  }
  return dato(unir([lado ? `Cara plana ${lado}` : "Cara plana", area, "establecida"]));
}

function filasMontaje(e: CamState): FilaHoja[] {
  const cfg = e.montajeConfig.sujecion_config;
  const env = cfg?.envolvente ?? null;
  const nombreUtillaje = cfg
    ? primerTexto(cfg.nombre_utillaje) ??
      (esNumero(cfg.id_utillaje) ? `Utillaje #${cfg.id_utillaje}` : null)
    : null;
  const familia = cfg ? primerTexto(cfg.etiqueta_familia, cfg.familia) : null;

  return [
    { etiqueta: "Cara de apoyo", valor: caraDeApoyo(e) },
    {
      etiqueta: "Utillaje",
      valor: !cfg
        ? VALOR_NO_DECLARADO
        : nombreUtillaje
          ? dato(nombreUtillaje)
          : VALOR_NO_DISPONIBLE,
    },
    {
      etiqueta: "Familia del utillaje",
      valor: !cfg ? VALOR_NO_DECLARADO : familia ? dato(familia) : VALOR_NO_DISPONIBLE,
    },
    // Cotas que el operario mide con calibre: sin medir, no están declaradas.
    {
      etiqueta: "Mesa → cara inferior de la pieza",
      valor: mm(env?.part_bottom_z_mm, VALOR_NO_DECLARADO),
    },
    {
      etiqueta: "Mesa → cara superior de la pieza",
      valor: mm(env?.part_top_z_mm, VALOR_NO_DECLARADO),
    },
    {
      etiqueta: "Mesa → punto más alto del amarre",
      valor: mm(env?.fixture_top_z_mm, VALOR_NO_DECLARADO),
    },
    {
      etiqueta: "Notas de montaje",
      valor: texto(e.montajeConfig.notas, VALOR_NO_DECLARADO),
    },
  ];
}

/**
 * El cero que declaró el operario (datum + corrector). El Z0 que calcula el
 * motor NO llega en ninguna respuesta (anexo cam-generate-2026-11-16 §1): aquí
 * solo se muestra lo declarado.
 */
function filasCero(e: CamState): FilaHoja[] {
  const etiqueta = etiquetaDatumDe(e);
  const origen = e.datumConfig.origen;
  const wcs = e.montajeConfig.wcs;
  return [
    {
      etiqueta: "Punto del cero (Z0)",
      // Declarado pero sin punto dibujable: se muestra el código que viaja,
      // nunca "no declarado".
      valor: etiqueta ? dato(etiqueta) : origen ? dato(origen) : VALOR_NO_DECLARADO,
    },
    {
      etiqueta: "Corrector de origen",
      valor: !esTexto(wcs)
        ? VALOR_NO_DISPONIBLE
        : e.wcsDeclarado
          ? dato(wcs)
          : noDeclaradoCon(wcs),
    },
    // datum_json solo lleva `origen` (domain/datum.ts): ningún paso declara la
    // altura del Z0 y ninguna respuesta la devuelve.
    { etiqueta: "Altura del Z0", valor: VALOR_NO_DECLARADO },
  ];
}

/**
 * Corrector sin elegir: el valor inicial del store (montajeConfig.wcs) viaja
 * igual, y la sección lo dice con todas las letras.
 */
function notaCero(e: CamState): string | undefined {
  const wcs = e.montajeConfig.wcs;
  if (e.wcsDeclarado || !esTexto(wcs)) return undefined;
  return `No eligió corrector de origen: se enviará ${wcs.trim()} (valor inicial).`;
}

interface DefSeccion {
  id: IdSeccion;
  titulo: string;
  nota?: (e: CamState) => string | undefined;
  filas: (e: CamState) => FilaHoja[];
  tabla?: (e: CamState) => TablaHoja | null;
}

/** Las secciones de la hoja, en orden. Una sección nueva = una fila nueva. */
export const SECCIONES_HOJA: readonly DefSeccion[] = [
  { id: "pieza", titulo: "Información de la pieza", filas: filasPieza },
  {
    id: "material",
    titulo: "Material y stock (bruto)",
    filas: filasMaterialYBruto,
    tabla: tablaSobremedidas,
  },
  {
    id: "maquina",
    titulo: "Máquina CNC",
    // CamWizardPage carga la primera máquina registrada al entrar; ningún paso
    // del asistente la elige.
    nota: () => "El asistente carga la primera máquina registrada; aquí no se elige.",
    filas: filasMaquina,
  },
  { id: "montaje", titulo: "Montaje y sujeción", filas: filasMontaje },
  {
    id: "cero",
    titulo: "Cero de pieza (Z0) y marco de referencia",
    nota: notaCero,
    filas: filasCero,
  },
];

export function hojaDeSetup(e: CamState): SeccionHoja[] {
  return SECCIONES_HOJA.map((s) => {
    const nota = s.nota?.(e);
    const tabla = s.tabla?.(e) ?? null;
    return {
      id: s.id,
      titulo: s.titulo,
      ...(nota ? { nota } : {}),
      filas: s.filas(e),
      ...(tabla ? { tabla } : {}),
    };
  });
}

// ── Operaciones seleccionadas ───────────────────────────────────────────────

/**
 * Por qué S y F de cada operación no tienen valor antes de generar: el MDE no
 * los devuelve (su recomendación no los trae) y el motor los envía por
 * herramienta después de generar (anexo cam-generate-2026-11-16 §1).
 */
export const NOTA_S_F =
  "S y F no están disponibles antes de generar: el motor los envía por herramienta después de generar el programa.";

/**
 * La elección de herramienta del operario (camStore.herramientaPorOperacion)
 * no está en el formulario que se envía al motor (construirFormularioTrabajo).
 */
export const AVISO_ELECCION_NO_SE_ENVIA =
  "Hoy esta elección no se envía al motor.";

export interface FilaOperacion {
  opId: string;
  descripcion: string;
  tipo: string;
  setup: Valor;
  /** La herramienta que nombró el MDE para el tipo de operación del setup. */
  herramienta: Valor;
  /** Anulación del operario en Operaciones; null si no eligió otra. */
  eleccionOperario: Valor | null;
  s: Valor;
  f: Valor;
}

export interface OperacionesHoja {
  filas: FilaOperacion[];
  /** Operaciones del análisis sellado (seleccionadas o no). */
  total: number;
  /** Por qué no hay herramienta del MDE, cuando es por la consulta entera. */
  avisoMDE: string | null;
}

/** Lo que dijo el MDE de la herramienta, sin completar nada. */
function herramientaDelMDE(rec: RecomendacionMDE | null): Valor {
  const ideal = herramientaIdeal(rec);
  if (!ideal) return VALOR_NO_DISPONIBLE;
  const familias = ideal.familias.map((f) => nombreToolType(f)).join(" / ");

  if (ideal.disponibilidad === "disponible") {
    const nombre = ideal.tipo ? nombreToolType(ideal.tipo) : familias;
    if (!nombre) return VALOR_NO_DISPONIBLE;
    return dato(
      esNumero(ideal.diametro_mm) ? `${nombre} Ø${formatMm(ideal.diametro_mm)} mm` : nombre,
    );
  }
  if (ideal.disponibilidad === "en_mantenimiento") {
    return aviso(`${familias || "Herramienta ideal"} · en mantenimiento`);
  }
  return aviso(`Sin herramienta en el taller${familias ? ` (${familias})` : ""}`);
}

function filaOperacion(
  op: OperacionSellada,
  herramienta: Valor,
  anulacion: number | undefined,
): FilaOperacion {
  return {
    opId: op.op_id,
    descripcion: esTexto(op.descripcion) ? op.descripcion : op.op_id,
    tipo: tipoOperacionLabel(op.tipo),
    setup: esNumero(op.setup) ? dato(`Setup ${op.setup}`) : VALOR_NO_DISPONIBLE,
    herramienta,
    eleccionOperario:
      anulacion != null ? dato(`Herramienta del inventario #${anulacion}`) : null,
    s: VALOR_NO_DISPONIBLE,
    f: VALOR_NO_DISPONIBLE,
  };
}

export function operacionesDeLaHoja(e: CamState): OperacionesHoja {
  const elegidas = new Set(e.operacionesSeleccionadas);
  const indice = indexarRecomendaciones(e.mdeRecomendaciones, e.ordenSetups);
  const fallo = consultaFallida(e.mdeRecomendaciones);

  // Orden del análisis sellado; solo las que marcó el operario.
  const filas = e.operaciones
    .filter((op) => elegidas.has(op.op_id))
    .map((op) =>
      filaOperacion(
        op,
        herramientaDelMDE(recomendacionDe(indice, op)),
        e.herramientaPorOperacion[op.op_id],
      ),
    );

  const avisoMDE =
    e.mdeRecomendaciones === null
      ? "Sin análisis del MDE: la herramienta de cada operación no está disponible. Pídalo en el paso Operaciones."
      : fallo
        ? `El motor no pudo consultar al MDE${esTexto(fallo.reason) ? `: ${fallo.reason}` : "."}`
        : null;

  return { filas, total: e.operaciones.length, avisoMDE };
}
