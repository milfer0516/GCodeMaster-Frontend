// src/modules/cam/components/montaje/hooksMontaje.ts
// Lecturas del store que comparten el panel de Montaje, sus secciones y el visor.
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCamStore } from "../../store/camStore";
import { sellarCaraApoyo } from "../../services/camService";
import { cajaDatumDe, estadoMontajeDe } from "../../store/selectoresMontaje";
import type { EstadoMontaje } from "../../domain/montaje";
import {
  puntoDelDatum,
  puntosDatumDeCaja,
  type PuntoDatum,
} from "../../domain/datum";

/** La foto que leen las reglas de las secciones (domain/montaje.ts). */
export function useEstadoMontaje(): EstadoMontaje {
  return useCamStore(useShallow(estadoMontajeDe));
}

/**
 * Cero de pieza. Los puntos elegibles salen de la caja envolvente del sólido
 * que mecaniza el motor (domain/datum.ts); lo elegido es lo que viaja en
 * datum_json.
 */
export function usePuntosDatum() {
  const cajaDatum = useCamStore(cajaDatumDe);
  const datumConfig = useCamStore((s) => s.datumConfig);
  const setDatumConfig = useCamStore((s) => s.setDatumConfig);
  const puntosDatum = useMemo(() => puntosDatumDeCaja(cajaDatum), [cajaDatum]);
  const puntoElegido = puntoDelDatum(puntosDatum, datumConfig);
  // Estable: el visor re-suscribe sus listeners si cambia.
  const elegirPuntoDatum = useCallback(
    (punto: PuntoDatum) => setDatumConfig(punto.datum),
    [setDatumConfig],
  );
  return { puntosDatum, puntoElegido, elegirPuntoDatum };
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
