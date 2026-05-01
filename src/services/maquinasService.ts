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
  recorrido_x_mm: number;
  recorrido_y_mm: number;
  recorrido_z_mm: number;
  num_herramientas_atc: number | null;
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
  return Array.isArray(data) ? data : [];
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
