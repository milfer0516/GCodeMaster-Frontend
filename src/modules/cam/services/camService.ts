// src/modules/cam/services/camService.ts
import { api } from "../../../services/api";
import type { StockConfig, ContextoFabricacion } from "../store/camStore";
import { cylTotals, type StockFaceDirection } from "../utils/stockFaces";

export interface MaterialGlobal {
  id_material: number;
  nombre: string;
  grupo_iso: string;
  categoria: string;
  dureza_hb: number | null;
  vc_min: number;
  vc_max: number;
  fz_min: number;
  fz_max: number;
}

// ── Tipos del mesh OCC ────────────────────────────────────────────────────

export interface FeatureInfo {
  op_id: string | null;
  op_tipo: string | null;
  tipo: string | null;
  // Campos de dimensión que ahora envía el backend (todos opcionales)
  diametro_mm?: number;
  profundidad_mm?: number;
  dim_largo_mm?: number;
  dim_ancho_mm?: number;
  area_mm2?: number;
  angulo_grados?: number;
  radio_menor_mm?: number;
}

export interface FaceMetadata {
  face_id: number;
  start: number;
  count: number;
  surface_type: string;
  feature: FeatureInfo | null;
  face_normal: [number, number, number];
}

export interface MeshData {
  positions: number[]; // flat [x,y,z, ...]
  normals: number[]; // flat [nx,ny,nz, ...]
  indices: number[]; // flat [i,i,i, ...]
  faces: FaceMetadata[]; // metadata por cara para picking
  bounding_box: {
    min: number[];
    max: number[];
    center: number[];
  };
  stats: {
    total_faces: number;
    total_vertices: number;
    total_triangles: number;
    total_indices: number;
  };
}

// ── Analizar archivo STEP ─────────────────────────────────────────────────
export async function analyzeStep(archivo: File, idProyecto?: number) {
  const form = new FormData();
  form.append("file", archivo);
  if (idProyecto) form.append("id_proyecto", String(idProyecto));

  const { data } = await api.post("/cam/analyze", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── Teselar archivo STEP → mesh OCC real ─────────────────────────────────
// Se llama después de analyzeStep, usando el mismo archivo en memoria.
// El backend FastAPI reenvía al contenedor FreeCAD /tessellate.
export async function tessellateStep(
  archivo: File,
  idJob: number,
): Promise<MeshData> {
  const form = new FormData();
  form.append("file", archivo);
  form.append("id_job", String(idJob));

  const { data } = await api.post("/cam/tessellate", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data as MeshData;
}

// ── Transform frontend StockConfig to engine's bruto_medido payload ──────
// SINGLE SOURCE OF TRUTH = per-region offsets. The overall totals the engine
// requires (x/y/z or Ø/length) are DERIVED here from part dims + offsets — they
// are a result, never an operator input. The gateway forwards this dict to the
// engine VERBATIM, so the keys must be exactly what cam_builder expects:
//   rectangular → x_mm/y_mm/z_mm (required, >0) + por_cara (per-face override)
//   cilindrico  → diametro_mm/longitud_mm (required, >0)
// partDims = the part's post-montaje bbox (setup.rotatedBBox width/depth/height).
export function buildStockPayload(
  stockConfig: StockConfig,
  partDims: { x: number; y: number; z: number },
  partCylinderOD?: number | null,
  partCylinderLen?: number | null,
): object {
  if (stockConfig.tipo === "rectangular") {
    const off = (dir: StockFaceDirection): number =>
      stockConfig.stockFaces.find((f) => f.direction === dir)?.allowance ?? 0;

    // Derived totals (part + both offsets on the axis). The engine subtracts the
    // part; por_cara then pins each face to the operator's exact measured offset,
    // so the asymmetric distribution is preserved (never assumed centered). The
    // support face (z_neg) is 0 — the engine also forces it to 0.
    return {
      tipo: "bruto_medido",
      forma: "rectangular",
      x_mm: partDims.x + off("x_pos") + off("x_neg"),
      y_mm: partDims.y + off("y_pos") + off("y_neg"),
      z_mm: partDims.z + off("z_pos") + off("z_neg"),
      por_cara: {
        x_pos: off("x_pos"),
        x_neg: off("x_neg"),
        y_pos: off("y_pos"),
        y_neg: off("y_neg"),
        z_pos: off("z_pos"),
        z_neg: off("z_neg"),
      },
    };
  }

  // Cilíndrico: derived Ø/length from part + region offsets. The Ø uses the REAL
  // dominant cylinder (P8), not the inflated bbox, so the engine's radial removal
  // (Ø_raw − Ø_final)/2 is correct — an inflated Ø_final would under-report the
  // removal and eat the tool. The engine computes radial removal per side = radial
  // offset, axial removal = machining offset.
  const { diameter, length } = cylTotals(
    { width: partDims.x, depth: partDims.y, height: partDims.z },
    stockConfig.cyl,
    partCylinderOD,
    partCylinderLen,
  );
  return {
    tipo: "bruto_medido",
    forma: "cilindrico",
    diametro_mm: diameter,
    longitud_mm: length,
  };
}

// ── El trabajo, tal como lo recibe el motor ───────────────────────────────
/**
 * Todo lo que define un trabajo para el motor. Lo consumen las DOS rutas que
 * hablan con él sobre el mismo trabajo: `/cam/generate` (genera) y
 * `/cam/mde-recommendations` (consulta asesora del MDE, antes de generar).
 */
export interface TrabajoPayload {
  archivo: File;
  idJob: number;
  operaciones: any[];
  herramientas: any[];
  materialKey: string;
  stockConfig: StockConfig;
  // Part's post-montaje bbox (setup.rotatedBBox width/depth/height). Required to
  // derive the stock totals the engine expects from the per-region offsets.
  partDims: { x: number; y: number; z: number };
  // Dominant external cylinder Ø and axial length (setup.partCylinderOD /
  // partCylinderLen) for cylindrical stock — the real Ø, not the inflated bbox
  // (P8). Null/omitted for parts with no dominant cylinder (falls back to bbox).
  partCylinderOD?: number | null;
  partCylinderLen?: number | null;
  datumConfig: object;
  montajeConfig: object;
  // Declaración del operador en el paso Contexto. Viaja SIEMPRE (por defecto
  // DESCONOCIDO) para que el adaptador del motor construya el ManufacturingContext
  // real en vez de fijarlo a DESCONOCIDO. El frontend solo transporta el valor:
  // no interpreta ni anticipa lo que el MDE hará con él.
  contextoFabricacion: ContextoFabricacion;
  ordenSetups?: string;
  // Identidad de la máquina para el backend y el motor: la PK de la fila de
  // `maquinas`, nunca su `nombre` (eso es presentación). El backend resuelve la
  // máquina real de la empresa por este id, verifica pertenencia y manda la fila
  // entera al motor.
  idMaquina?: number | null;
}

/**
 * Arma el multipart del trabajo. ÚNICO sitio donde se construye ese formulario.
 *
 * Lo comparten `/cam/generate` y `/cam/mde-recommendations` a propósito, igual
 * que el backend comparte su `_construir_payload_motor()`: si cada ruta armara
 * el suyo, el MDE podría estar asesorando sobre un trabajo distinto al que
 * después va a la máquina. Cualquier campo nuevo se agrega AQUÍ y lo reciben
 * las dos.
 *
 * Los nombres de los campos son el contrato del gateway (cam_routes.py); no se
 * renombran ni se normalizan valores: el motor es el dueño de su interpretación.
 */
export function construirFormularioTrabajo(payload: TrabajoPayload): FormData {
  const form = new FormData();
  form.append("step_file", payload.archivo);
  form.append("id_job", String(payload.idJob));
  form.append("operaciones_json", JSON.stringify(payload.operaciones));
  form.append("herramientas_json", JSON.stringify(payload.herramientas));
  form.append("material_key", payload.materialKey);
  // Transform to engine's bruto_medido format
  const stockPayload = buildStockPayload(
    payload.stockConfig,
    payload.partDims,
    payload.partCylinderOD,
    payload.partCylinderLen,
  );
  form.append("stock_json", JSON.stringify(stockPayload));
  form.append("datum_json", JSON.stringify(payload.datumConfig));
  form.append("montaje_json", JSON.stringify(payload.montajeConfig));
  form.append(
    "contexto_json",
    JSON.stringify({
      proceso_origen: payload.contextoFabricacion.proceso_origen,
    }),
  );
  form.append("orden_setups", payload.ordenSetups ?? "superior_primero");
  // `!= null` y no truthiness: el id es numérico y un chequeo laxo descartaría
  // silenciosamente un id válido que valiera 0.
  if (payload.idMaquina != null)
    form.append("id_maquina", String(payload.idMaquina));
  return form;
}

// ── Generar G-Code ────────────────────────────────────────────────────────
export async function generateGcode(payload: TrabajoPayload) {
  const { data } = await api.post(
    "/cam/generate",
    construirFormularioTrabajo(payload),
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

// ── Obtener materiales globales ───────────────────────────────────────────
export async function getMateriales(): Promise<MaterialGlobal[]> {
  const { data } = await api.get("/materiales");
  return data;
}

// ── Obtener materiales por grupo ISO ─────────────────────────────────────
export async function getMaterialesPorGrupo(
  grupoIso: string,
): Promise<MaterialGlobal[]> {
  const { data } = await api.get(`/materiales/grupo/${grupoIso}`);
  return data;
}

// ── Asignar material al job ───────────────────────────────────────────────
export async function asignarMaterialJob(idJob: number, idMaterial: number) {
  const { data } = await api.put(`/cam/job/${idJob}/material`, {
    id_material: idMaterial,
  });
  return data;
}
