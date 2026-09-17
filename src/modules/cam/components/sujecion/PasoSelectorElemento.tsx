// src/modules/cam/components/sujecion/PasoSelectorElemento.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Paso 1 del modal de sujeción: elegir CON QUÉ se amarra la pieza.
//
// La lista sale del PARQUE de la empresa (GET /utillajes/) — ya no de una
// lista de familias escrita a mano. La FAMILIA no se elige aparte: sale de la
// fila registrada, y el paso 2 pinta el formulario con el schema de ESA
// familia (GET /utillajes/familias/{familia}).
//
// Por qué el utillaje y no solo la familia: el backend rechaza con 400 un
// `parametros_montaje` sin `id_utillaje` (cam_routes.py:507-514) — la
// geometría del amarre la resuelve él desde la fila del parque.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import {
  getUtillajes,
  getFamiliasUtillaje,
  type UtillajeResumen,
} from "../../services/utillajesService";

interface Props {
  onSelect: (utillaje: UtillajeResumen) => void;
}

export const PasoSelectorElemento = ({ onSelect }: Props) => {
  const [utillajes, setUtillajes] = useState<UtillajeResumen[] | null>(null);
  const [etiquetas, setEtiquetas] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([getUtillajes(), getFamiliasUtillaje()])
      .then(([lista, familias]) => {
        if (!vivo) return;
        setUtillajes(lista);
        setEtiquetas(
          Object.fromEntries(familias.map((f) => [f.familia, f.etiqueta])),
        );
      })
      .catch(() => {
        if (vivo) setError("No se pudo cargar el parque de utillajes.");
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (utillajes === null) {
    return (
      <p className="text-sm text-text-muted">Cargando parque de utillajes…</p>
    );
  }

  if (utillajes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-primary px-4 py-3 text-sm text-text-muted">
        No hay utillajes registrados en el parque de la empresa. Registre el
        utillaje (prensa, bridas, copa…) en el módulo de utillajes para poder
        declarar el montaje: el amarre se calcula con las medidas registradas,
        no con valores escritos a mano aquí.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Selecciona el utillaje con el que se va a amarrar la pieza.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {utillajes.map((u) => (
          <button
            key={u.id_utillaje}
            onClick={() => onSelect(u)}
            className="flex flex-col gap-1.5 rounded-xl border border-border bg-bg-primary p-4 text-left transition hover:border-accent-blue/60 hover:bg-accent-blue/5 active:scale-[0.98]"
          >
            <span className="text-sm font-semibold text-text-primary leading-tight">
              {u.nombre}
            </span>
            <span className="text-xs text-accent-blue/80">
              {etiquetas[u.familia] ?? u.familia}
            </span>
            {u.notas && (
              <span className="text-xs text-text-muted leading-snug">
                {u.notas}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
