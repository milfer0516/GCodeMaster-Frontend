// src/modules/cam/components/montaje/hooksMontaje.ts
// Lecturas del store que comparten la barra de Montaje y sus secciones.
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCamStore } from "../../store/camStore";
import { sellarCaraApoyo } from "../../services/camService";
import { estadoMontajeDe } from "../../store/selectoresMontaje";
import type { EstadoMontaje } from "../../domain/montaje";

/** La foto que leen las reglas de las secciones (domain/montaje.ts). */
export function useEstadoMontaje(): EstadoMontaje {
  return useCamStore(useShallow(estadoMontajeDe));
}

/**
 * Sellar la cara de apoyo: el motor orienta la pieza sobre ella
 * (/cam/analyze-setup) y el store pasa por sellando → sellada | editando.
 */
export function useSellarCaraApoyo() {
  const iniciarSellado = useCamStore((s) => s.iniciarSellado);
  const completarSellado = useCamStore((s) => s.completarSellado);
  const fallarSellado = useCamStore((s) => s.fallarSellado);
  return useCallback(
    async (archivo: File, idJob: number, faceIdApoyo: number) => {
      iniciarSellado();
      try {
        const respuesta = await sellarCaraApoyo(archivo, idJob, faceIdApoyo);
        completarSellado(respuesta, faceIdApoyo, idJob);
      } catch (err: any) {
        fallarSellado(
          err?.message ?? "No se pudo establecer la cara de apoyo.",
        );
      }
    },
    [iniciarSellado, completarSellado, fallarSellado],
  );
}
