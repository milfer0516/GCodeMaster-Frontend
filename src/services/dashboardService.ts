// src/services/dashboardService.ts
import { api } from "./api";

export interface MaquinaDashboard {
  id_maquina: number;
  nombre: string;
  modelo: string | null;
  marca: string | null;
  controlador: string;
  controlador_modelo: string | null;
  rpm_max_husillo: number;
  recorrido_x_mm: number;
  recorrido_y_mm: number;
  recorrido_z_mm: number;
  num_herramientas_atc: number | null;
  cono_husillo: string | null;
}

export interface HerramientaDashboard {
  id_herramienta: number;
  nombre: string;
  tipo: string;
  diametro_mm: number;
  filos: number;
  material_herramienta: string;
  largo_total: number | null;
  estado: string;
  activo: boolean;
}

export async function getMaquinas(): Promise<MaquinaDashboard[]> {
  const { data } = await api.get("/maquinas/");
  return data;
}

export async function getHerramientas(): Promise<HerramientaDashboard[]> {
  const { data } = await api.get("/herramientas/");
  // El backend retorna {herramientas: [...]} o similar
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.herramientas)) return data.herramientas;
  if (Array.isArray(data.data)) return data.data;
  return data.herramientas ?? [];
}

export async function getSetupStatus() {
  const { data } = await api.get("/empresas/me/setup-status");
  return data;
}
