// src/services/herramientasService.ts
import { api } from "./api";

export interface Herramienta {
  id_herramienta: number;
  nombre: string;
  tipo: string;
  diametro_mm: number;
  largo_total: number | null;
  filos: number;
  material_herramienta: string;
  recubrimiento: string | null;
  estado: string;
}

export interface HerramientaDetalle extends Herramienta {
  vida_util_horas: number | null;
  horas_usado: number;
  costo_unitario: number | null;
}

export interface TipoHerramienta {
  tipo: string;
  nombre: string;
  operacion: string;
}

export interface HerramientaCreatePayload {
  nombre: string;
  tipo: string;
  diametro_mm: number;
  filos: number;
  material_herramienta: string;
  largo_total?: number;
  recubrimiento?: string;
  vida_util_horas?: number;
  costo_unitario?: number;
}

export interface HerramientaUpdatePayload {
  nombre?: string;
  tipo?: string;
  diametro_mm?: number;
  filos?: number;
  material_herramienta?: string;
  largo_total?: number;
  recubrimiento?: string;
  vida_util_horas?: number;
  costo_unitario?: number;
  estado?: string;
}

export async function getHerramientas(filtros?: {
  tipo?: string;
  diametro_max?: number;
}): Promise<Herramienta[]> {
  const params = new URLSearchParams();
  if (filtros?.tipo) params.append("tipo", filtros.tipo);
  if (filtros?.diametro_max)
    params.append("diametro_max", String(filtros.diametro_max));
  const { data } = await api.get(`/herramientas/?${params.toString()}`);
  return data.herramientas ?? [];
}

export async function getTiposHerramienta(): Promise<TipoHerramienta[]> {
  const { data } = await api.get("/herramientas/tipos");
  return data.tipos ?? [];
}

export async function crearHerramienta(
  payload: HerramientaCreatePayload,
): Promise<{ id_herramienta: number; nombre: string }> {
  const { data } = await api.post("/herramientas/", payload);
  return data;
}

export async function actualizarHerramienta(
  id: number,
  payload: HerramientaUpdatePayload,
): Promise<void> {
  await api.put(`/herramientas/${id}`, payload);
}

export async function desactivarHerramienta(id: number): Promise<void> {
  await api.delete(`/herramientas/${id}`);
}
