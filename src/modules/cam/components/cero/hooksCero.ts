// src/modules/cam/components/cero/hooksCero.ts
// Lecturas del store del cero de pieza que comparten la sección y el visor.
import { useCallback, useMemo } from "react";
import { useCamStore } from "../../store/camStore";
import {
  cajaDatumDe,
  etiquetaDatumDe,
  haySobremedidaDe,
} from "../../store/selectoresCero";
import {
  puntoDelDatum,
  puntosDatumDeCaja,
  resumenCeroDePieza,
  type PuntoDatum,
} from "../../domain/datum";

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

/** La línea de resumen del cero (regla pura en domain/datum.ts). */
export function useResumenCero(): string {
  const etiqueta = useCamStore(etiquetaDatumDe);
  const wcs = useCamStore((s) => s.montajeConfig.wcs);
  return resumenCeroDePieza(etiqueta, wcs);
}

/** ¿El stock tiene sobre-material? (para el aviso de la sección). */
export function useHaySobremedida(): boolean {
  return useCamStore(haySobremedidaDe);
}
