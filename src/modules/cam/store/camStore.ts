// src/modules/cam/store/camStore.ts
import { create } from "zustand";
import type { MeshData } from "../services/camService";
import type { Maquina } from "../../../services/maquinasService";
import { computeSetup, type Setup } from "../utils/computeSetup";
import { deriveStockFaces, type StockFace } from "../utils/stockFaces";

export type { Setup };
export type { StockFace };

// DESPUÉS
export type CamStep =
  | "cargar"
  | "analisis"
  | "montaje"
  | "material"
  | "stock"
  | "operaciones"
  | "resumen"
  | "simulacion"
  | "resultado";

export interface Operacion {
  id: string;
  tipo: string;
  descripcion: string;
  setup: number;
  seleccionada: boolean;
  herramienta_sugerida?: string;
  face_indices?: number[];
}

export interface MaterialSeleccionado {
  id_material: number;
  nombre: string;
  grupo_iso: string;
  categoria: string;
}

export interface StockConfig {
  tipo: "rectangular" | "cilindrico";

  // Stock rectangular (placa/bloque) — RAW measured dimensions the operator has
  ancho_bruto_mm: number;      // X raw (overall block dimension)
  largo_bruto_mm: number;      // Y raw (overall block dimension)
  alto_bruto_mm: number;       // Z raw (overall block dimension)

  // Stock cilíndrico (disco/eje) — RAW measured dimensions the operator has
  diametro_bruto_mm: number;   // raw diameter
  longitud_bruta_mm: number;   // raw length

  // StockFaces: per-face raw stock distribution (rectangular only). The operator
  // measures how much raw material sits on each face with a caliper. Raw stock
  // is almost never centered: a 120mm block for a 104mm part has 16mm extra, but
  // rarely 8mm on each side. This is REAL DATA, not a computed allowance. The
  // 'allowance' field carries the per-face raw material measurement. Both overall
  // dims AND per-face distribution are sent to the engine — they complement each
  // other (what the operator bought vs. how the excess actually sits).
  stockFaces: StockFace[];
}

export interface DatumConfig {
  x: number;
  y: number;
  z: number;
}

export type TipoSujecion =
  | "prensa"
  | "bridas"
  | "mesa_magnetica"
  | "copa_torno"
  | null;

export interface SujecionConfig {
  tipo: TipoSujecion;
  // Prensa
  ancho_mordaza_mm?: number;
  apertura_mm?: number;
  altura_mordaza_mm?: number;
  // Común (elevar pieza con paralelas)
  altura_paralelas_mm: number;
  // Bridas
  cantidad_bridas?: number;
  posicion_automatica?: boolean;
  posiciones_bridas?: Array<{ x: number; y: number }>;
  // Copa de torno
  diametro_copa_mm?: number;
  tipo_garras?: 3 | 4;
  profundidad_agarre_mm?: number;
  // Mesa magnética
  es_material_ferromagnetico?: boolean;
  // Altura total del montaje: sujeción + paralelas + pieza (validación Z)
  altura_total_montaje_mm: number | null;
  // Envoltura 3D en coords de pieza (para colisiones y CAM)
  envolvente: {
    x_min: number; x_max: number;
    y_min: number; y_max: number;
    z_min: number; z_max: number;
    z_apoyo_mm: number;
  } | null;
}

export interface MontajeConfig {
  tipo_sujecion: TipoSujecion;
  sujecion_config: SujecionConfig | null;
  id_maquina: number | null;
  face_id_apoyo: number | null;
  face_normal_apoyo: number[] | null;
  wcs: "G54" | "G55" | "G56" | "G57";
  notas: string;
}

export interface SetupResultado {
  nombre: string;
  gcode: string;
  ops: string[];
}

interface CamState {
  // Navegación
  step: CamStep;

  // Paso 1 — Archivo
  archivo: File | null;
  nombreArchivo: string;

  // Paso 2 — Análisis
  idJob: number | null;
  analisis: Record<string, any> | null;

  montajeConfig: MontajeConfig;

  // Setup persistente (montaje confirmado) — fuente de verdad en frame OCC/máquina.
  // Se crea en confirmMontaje() y se invalida al cambiar cara/sujeción/mesh.
  setup: Setup | null;

  // Paso 3 — Operaciones
  operaciones: Operacion[];

  // Paso 3 — Mesh OCC real (teselación)
  meshData: MeshData | null;
  meshLoading: boolean;
  meshError: string | null;

  // Paso 4 — Material
  material: MaterialSeleccionado | null;

  // Paso 5 — Máquina/Stock/Datum
  maquina: Maquina | null;
  stockConfig: StockConfig;
  datumConfig: DatumConfig;
  ordenSetups: string;

  // Paso 7 — Resultado
  gcodeSetups: SetupResultado[];

  // Engine response (plan de mecanizado, parametros de corte, errores de validacion)
  engineResponse: {
    plan_mecanizado?: any;
    parametros_corte?: any;
    stock?: any;
    error?: string;
  } | null;

  // Acciones
  setStep: (step: CamStep) => void;
  setArchivo: (archivo: File | null) => void;
  setAnalisis: (idJob: number, analisis: Record<string, any>) => void;
  setMontajeConfig: (config: Partial<MontajeConfig>) => void;
  confirmMontaje: () => void;
  invalidateSetup: () => void;
  setOperaciones: (ops: Operacion[]) => void;
  toggleOperacion: (id: string) => void;
  setMaterial: (material: MaterialSeleccionado) => void;
  setMaquina: (maquina: Maquina) => void;
  setStockConfig: (config: StockConfig) => void;
  setDatumConfig: (config: DatumConfig) => void;
  setOrdenSetups: (orden: string) => void;
  setGcodeSetups: (setups: SetupResultado[]) => void;
  setEngineResponse: (response: any) => void;
  setMeshData: (data: MeshData) => void;
  setMeshLoading: (loading: boolean) => void;
  setMeshError: (error: string | null) => void;
  reset: () => void;
}

const STOCK_INICIAL: StockConfig = {
  tipo: "rectangular",

  // Rectangular raw measured
  ancho_bruto_mm: 100,
  largo_bruto_mm: 100,
  alto_bruto_mm: 25,

  // Cilíndrico raw measured
  diametro_bruto_mm: 100,
  longitud_bruta_mm: 50,

  // StockFaces for viewer presentation only (vacío hasta confirmar montaje)
  stockFaces: [],
};

const MONTAJE_INICIAL: MontajeConfig = {
  tipo_sujecion: null,
  sujecion_config: null,
  id_maquina: null,
  face_id_apoyo: null,
  face_normal_apoyo: null,
  wcs: "G54",
  notas: "",
};

const DATUM_INICIAL: DatumConfig = { x: 0, y: 0, z: 0 };

export const useCamStore = create<CamState>((set) => ({
  // DESPUÉS — agrega montajeConfig después de datumConfig
  step: "cargar",
  archivo: null,
  nombreArchivo: "",
  idJob: null,
  analisis: null,
  operaciones: [],
  meshData: null,
  meshLoading: false,
  meshError: null,
  material: null,
  maquina: null,
  stockConfig: STOCK_INICIAL,
  datumConfig: DATUM_INICIAL,
  montajeConfig: MONTAJE_INICIAL,
  setup: null,
  ordenSetups: "superior_primero",
  gcodeSetups: [],
  engineResponse: null,

  setStep: (step) => set({ step }),
  setArchivo: (archivo) => set({ archivo, nombreArchivo: archivo?.name ?? "" }),
  setAnalisis: (idJob, analisis) => {
    const ops = convertirOperaciones(analisis);
    set((state) => ({
      idJob,
      analisis,
      operaciones: ops,
      meshData: null,
      meshError: null,
      setup: null,
      // Cascade: sin Setup no hay StockFaces válidas.
      stockConfig: { ...state.stockConfig, stockFaces: [] },
    }));
  },
  setOperaciones: (operaciones) => set({ operaciones }),
  toggleOperacion: (id) =>
    set((state) => ({
      operaciones: state.operaciones.map((op) =>
        op.id === id ? { ...op, seleccionada: !op.seleccionada } : op,
      ),
    })),
  setMontajeConfig: (config) =>
    set((state) => {
      // Cambiar la cara de apoyo o la sujeción invalida el Setup confirmado:
      // no debe quedar un Setup obsoleto (con orientación vieja) filtrándose
      // hacia Stock/operaciones. face_id_apoyo/sujecion_config son las entradas
      // de las que depende computeSetup.
      const cambiaCara =
        "face_id_apoyo" in config &&
        config.face_id_apoyo !== state.montajeConfig.face_id_apoyo;
      const cambiaSujecion =
        "sujecion_config" in config &&
        config.sujecion_config !== state.montajeConfig.sujecion_config;
      const invalidar = state.setup !== null && (cambiaCara || cambiaSujecion);

      return {
        montajeConfig: { ...state.montajeConfig, ...config },
        // Cascade Setup → StockFaces: invalidar el Setup limpia las StockFaces
        // para que no queden sobre-materiales huérfanos en un frame que ya no
        // existe (se regeneran en el próximo confirmMontaje).
        ...(invalidar
          ? {
              setup: null,
              stockConfig: { ...state.stockConfig, stockFaces: [] },
            }
          : {}),
      };
    }),
  confirmMontaje: () =>
    set((state) => {
      const faceId = state.montajeConfig.face_id_apoyo;
      if (!state.meshData || faceId === null) {
        console.warn(
          "[camStore] confirmMontaje: falta meshData o cara de apoyo; no se crea Setup.",
        );
        return { setup: null };
      }
      const setup = computeSetup(
        state.meshData,
        faceId,
        state.analisis,
        state.montajeConfig.sujecion_config,
      );
      if (!setup) {
        return {
          setup: null,
          stockConfig: { ...state.stockConfig, stockFaces: [] },
        };
      }
      // Cascade Setup → StockFaces: regenerar las 6 caras desde el nuevo Setup,
      // reasignando roles y RESETEANDO los sobre-materiales a 0 (los antiguos
      // referían un frame que ya no existe — no se arrastran).
      const stockFaces = deriveStockFaces(setup);
      return {
        setup,
        stockConfig: { ...state.stockConfig, stockFaces },
      };
    }),
  invalidateSetup: () =>
    set((state) => ({
      setup: null,
      stockConfig: { ...state.stockConfig, stockFaces: [] },
    })),
  setMaterial: (material) => set({ material }),
  setMaquina: (maquina) => set({ maquina }),
  setStockConfig: (stockConfig) => set({ stockConfig }),
  setDatumConfig: (datumConfig) => set({ datumConfig }),
  setOrdenSetups: (ordenSetups) => set({ ordenSetups }),
  setGcodeSetups: (gcodeSetups) => set({ gcodeSetups }),
  setEngineResponse: (engineResponse) => set({ engineResponse }),
  setMeshData: (meshData) =>
    // Cargar una geometría nueva invalida cualquier Setup previo (y sus StockFaces).
    set((state) => ({
      meshData,
      meshLoading: false,
      meshError: null,
      setup: null,
      stockConfig: { ...state.stockConfig, stockFaces: [] },
    })),
  setMeshLoading: (meshLoading) => set({ meshLoading }),
  setMeshError: (meshError) => set({ meshError, meshLoading: false }),
  reset: () =>
    set({
      step: "cargar",
      archivo: null,
      nombreArchivo: "",
      idJob: null,
      analisis: null,
      operaciones: [],
      meshData: null,
      meshLoading: false,
      meshError: null,
      material: null,
      maquina: null,
      stockConfig: STOCK_INICIAL,
      datumConfig: DATUM_INICIAL,
      montajeConfig: MONTAJE_INICIAL,
      setup: null,
      ordenSetups: "superior_primero",
      gcodeSetups: [],
      engineResponse: null,
    }),
}));

const convertirOperaciones = (analisis: Record<string, any>): Operacion[] => {
  const opsBackend = analisis?.operaciones ?? [];

  const ops = opsBackend.map((op: any, idx: number) => ({
    id: op.op_id ?? `setup${op.setup}_${op.tipo}_${idx}`,
    tipo: op.tipo,
    descripcion: op.descripcion,
    setup: op.setup ?? 1,
    seleccionada: false,
    herramienta_sugerida: op.fresa_max_mm
      ? `Máx Ø${op.fresa_max_mm}mm`
      : op.diametro_mm
        ? `Ø${op.diametro_mm}mm`
        : undefined,
    face_indices: op.face_indices,
  }));

  console.log(
    "OP IDs generados:",
    ops.map((o: Operacion) => o.id),
  );
  console.log("Operaciones backend RAW:", opsBackend);

  return ops;
};
