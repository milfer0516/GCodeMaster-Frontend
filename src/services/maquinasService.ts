// src/services/maquinasService.ts
import { api } from "./api";

export interface Maquina {
  id_maquina: number;
  nombre: string;
  modelo: string | null;
  marca: string | null;
  tipo: string;
  controlador: string;
  controlador_modelo: string | null;
  rpm_min_husillo: number;
  rpm_max_husillo: number;
  potencia_husillo_kw: number | null;
  cono_husillo: string | null;
  avance_max_mmmin: number;
  rapido_x_mmmin: number;
  rapido_y_mmmin: number;
  rapido_z_mmmin: number;
  recorrido_x_mm: number;
  recorrido_y_mm: number;
  recorrido_z_mm: number;
  // Nombres físicos crudos de la mesa tal como los expone /maquinas (columnas
  // reales de BD). Se mapean a los ejes del editor en getMaquinas().
  mesa_largo_mm?: number | null;
  mesa_ancho_mm?: number | null;
  // Dimensiones de la mesa YA en los ejes del editor de montaje espacial
  // (mesa_x_mm ← mesa_largo_mm, mesa_y_mm ← mesa_ancho_mm; ver getMaquinas).
  // Opcionales: si el backend aún no las envía, el editor cae a recorrido_x/y_mm.
  mesa_x_mm?: number | null;
  mesa_y_mm?: number | null;
  num_herramientas_atc: number | null;
  diametro_herramienta_max_mm: number | null;
  largo_herramienta_max_mm: number | null;
  peso_herramienta_max_kg: number | null;
  refrigeracion: string | null;
  descripcion: string | null;
}

export interface LimiteMaquinas {
  maquinas_permitidas: number;
  maquinas_actuales: number;
  puede_agregar: boolean;
  mensaje: string;
}

export async function getMaquinas(): Promise<Maquina[]> {
  const { data } = await api.get("/maquinas/");
  if (!Array.isArray(data)) return [];
  // Mapea los nombres físicos crudos de la mesa a los ejes que consume el editor.
  // Mapeo DEMOSTRADO: el largo de la mesa va en X y el ancho en Y.
  //   Evidencia: app_models_job.py:149-150 ("Largo ... en X" / "Ancho ... en Y")
  //   y migración 9a1c2e7d4f6b (mesa_largo ← recorrido_x, mesa_ancho ← recorrido_y).
  //   ⇒ mesa_largo_mm → X, mesa_ancho_mm → Y.
  return (data as Maquina[]).map((m) => ({
    ...m,
    mesa_x_mm: m.mesa_x_mm ?? m.mesa_largo_mm ?? null,
    mesa_y_mm: m.mesa_y_mm ?? m.mesa_ancho_mm ?? null,
  }));
}

export async function getLimiteMaquinas(): Promise<LimiteMaquinas> {
  const { data } = await api.get("/maquinas/limite/permisos");
  return data;
}

export interface MaquinaGlobalCatalogo {
  id_maquina_global: number;
  nombre: string;
  modelo: string | null;
  marca: string | null;
  tipo: string;
  controlador: string;
  controlador_modelo: string | null;
  rpm_min: number;
  rpm_max: number;
  potencia_kw: number | null;
  cono: string | null;
  avance_max: number;
  recorrido_x: number;
  recorrido_y: number;
  recorrido_z: number;
  atc_slots: number | null;
}

export async function getCatalogoMaquinas(): Promise<MaquinaGlobalCatalogo[]> {
  const { data } = await api.get("/maquinas/catalogo/global");
  return Array.isArray(data.catalogo) ? data.catalogo : [];
}

export async function registrarDesdeCatalogo(
  id_maquina_global: number,
): Promise<{ id_maquina: number; nombre: string }> {
  const { data } = await api.post("/maquinas/desde-catalogo", {
    id_maquina_global,
  });
  return data;
}

export async function registrarManual(payload: {
  nombre: string;
  marca?: string;
  modelo?: string;
  tipo: string;
  controlador: string;
  controlador_modelo?: string;
  rpm_min_husillo: number;
  rpm_max_husillo: number;
  potencia_husillo_kw?: number;
  cono_husillo?: string;
  avance_max_mmmin: number;
  rapido_x_mmmin?: number;
  rapido_y_mmmin?: number;
  rapido_z_mmmin?: number;
  recorrido_x_mm: number;
  recorrido_y_mm: number;
  recorrido_z_mm: number;
  num_herramientas_atc?: number;
  descripcion?: string;
}): Promise<{ id_maquina: number; nombre: string }> {
  const { data } = await api.post("/maquinas/manual", payload);
  return data;
}
