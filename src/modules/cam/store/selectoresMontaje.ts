// src/modules/cam/store/selectoresMontaje.ts
// ─────────────────────────────────────────────────────────────────────────────
// Selectores PUROS del paso Montaje sobre una foto del store.
//
// Solo importa el TIPO del store: domain/pasos.ts los usa y el store importa
// domain/pasos.ts, así que importar aquí el store en valor crearía un ciclo.
// ─────────────────────────────────────────────────────────────────────────────
import type { CamState } from "./camStore";
import type { EstadoMontaje } from "../domain/montaje";

/** Foto plana (solo primitivos: apta para useShallow) que leen las reglas. */
export function estadoMontajeDe(s: CamState): EstadoMontaje {
  const cfg = s.montajeConfig.sujecion_config;
  const env = cfg?.envolvente ?? null;
  return {
    // Sin responder, nada aparece elegido (aunque por debajo viaje DESCONOCIDO).
    estadoPieza: s.contextoRespondido ? s.contextoFabricacion.estado : null,
    forma: s.formaDeclarada ? s.stockConfig.tipo : null,
    faceIdApoyo: s.montajeConfig.face_id_apoyo,
    caraSellada: s.estadoOrientacion === "sellada",
    nombreUtillaje: cfg
      ? (cfg.nombre_utillaje ?? cfg.etiqueta_familia ?? cfg.familia)
      : null,
    alturaInferiorMm: env?.part_bottom_z_mm ?? null,
    alturaSuperiorMm: env?.part_top_z_mm ?? null,
    alturaAmarreMm: env?.fixture_top_z_mm ?? null,
    hayMaquina: s.maquina !== null,
    elementosColocados:
      s.montajeConfig.montaje_espacial?.elementos_fisicos.length ?? null,
    notas: s.montajeConfig.notas,
  };
}
