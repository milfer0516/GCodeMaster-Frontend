// src/modules/cam/components/montaje/SeccionColocacion.tsx
//
// "Colocación en la mesa" — sección opcional del paso Montaje (editor espacial).
// Solo aparece con máquina registrada (regla `visible` en domain/montaje.ts).
import { useCamStore } from "../../store/camStore";
import { EditorMontajeEspacial } from "../sujecion/EditorMontajeEspacial";

export function SeccionColocacion() {
  const analisis = useCamStore((s) => s.analisis);
  const montajeEspacial = useCamStore((s) => s.montajeConfig.montaje_espacial);
  const setMontajeEspacial = useCamStore((s) => s.setMontajeEspacial);
  const maquinaActiva = useCamStore((s) => s.maquina);

  const dimensiones = analisis?.dimensiones ?? { x: 0, y: 0, z: 0 };

  // Silueta de la pieza en el editor espacial: círculo si la pieza es
  // cilíndrica, si no rectángulo. Es SOLO presentación (el modelo de datos —
  // pos/altura/orientación — es idéntico para ambas formas), así que el bbox
  // manda y esta heurística no puede corromper ningún número serializado.
  const esCilindrica = /cil|redond|torn|revol/i.test(
    String(analisis?.tipo_pieza ?? ""),
  );

  if (!maquinaActiva) return null;

  return (
    <>
      <p className="mb-3 text-xs text-text-muted">
        Arrastra la pieza y los elementos físicos a su posición real sobre la
        mesa. Marca dónde agarra cada elemento (zona de sujeción). Solo se
        guardan las posiciones y alturas, no el dibujo.
      </p>
      <EditorMontajeEspacial
        maquina={maquinaActiva}
        dimensiones={dimensiones}
        esCilindrica={esCilindrica}
        value={montajeEspacial}
        onChange={setMontajeEspacial}
      />
    </>
  );
}
