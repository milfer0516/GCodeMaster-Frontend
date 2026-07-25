import { api } from "./api";

export async function getCatalogoGlobal() {
  const { data } = await api.get("/maquinas/catalogo/global");
  return data.catalogo;
}

export async function registrarMaquinaDesdeCatalogo(id_maquina_global: number) {
  const { data } = await api.post("/maquinas/desde-catalogo", {
    id_maquina_global,
  });
  return data;
}

export async function registrarMaquinaManual(payload: Record<string, unknown>) {
  const { data } = await api.post("/maquinas/manual", payload);
  return data;
}

// Las herramientas del onboarding se registran contra /tooling/* (ver
// services/toolingService.ts). Aquí ya no queda nada del modelo legacy.

export async function completarSetup() {
  const { data } = await api.post("/empresas/me/completar-setup");
  return data;
}
