// src/modules/tools/components/CoincidenciasCatalogo.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · BUSCAR EN EL CATÁLOGO ANTES DE CREAR.
//
// En cuanto el operador elige familia y escribe el diámetro, se consulta el
// catálogo global con una tolerancia de ±5 % y se le muestran las candidatas:
// "¿es alguna de estas?". Adoptar una del catálogo evita una definición
// duplicada en la librería de la empresa y le ahorra escribir la geometría.
//
// Solo si no reconoce ninguna sigue creando: el aviso no bloquea el formulario.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Search, Check, X } from "lucide-react";
import {
  getCatalogo,
  familiaLabel,
  type DefinicionResumen,
} from "../../../services/toolingService";

interface Props {
  familia: string;
  /** Diámetro tal cual está escrito en el formulario. */
  diametro: string;
  /** El operador reconoce una: se adopta esa definición del catálogo. */
  onAdoptar: (definicion: DefinicionResumen) => void;
}

/** Tolerancia de búsqueda alrededor del diámetro escrito. */
const TOLERANCIA = 0.05;

export function CoincidenciasCatalogo({ familia, diametro, onAdoptar }: Props) {
  const [coincidencias, setCoincidencias] = useState<DefinicionResumen[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [descartado, setDescartado] = useState(false);

  const d = Number(diametro);
  const consultable = !!familia && Number.isFinite(d) && d > 0;

  // Cada cambio de familia vuelve a abrir el aviso: es otra búsqueda distinta.
  useEffect(() => {
    setDescartado(false);
  }, [familia]);

  useEffect(() => {
    if (!consultable) {
      setCoincidencias([]);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(() => {
      getCatalogo({
        familia,
        diametro_min: d * (1 - TOLERANCIA),
        diametro_max: d * (1 + TOLERANCIA),
      })
        .then((defs) => setCoincidencias(defs.slice(0, 6)))
        .catch(() => setCoincidencias([]))
        .finally(() => setBuscando(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [familia, d, consultable]);

  if (!consultable || descartado) return null;

  if (buscando && coincidencias.length === 0) {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-text-muted">
        <Search className="h-3.5 w-3.5 animate-pulse" />
        Buscando {familiaLabel(familia)} de Ø{diametro} en el catálogo...
      </p>
    );
  }

  if (coincidencias.length === 0) {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-lg border border-accent-green/25 bg-accent-green/5 px-3 py-2 text-xs text-accent-green">
        <Check className="h-3.5 w-3.5 shrink-0" />
        No hay nada parecido en el catálogo. Sigue creando tu definición.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-accent-amber">
            ¿Es alguna de estas?
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Ya están en el catálogo global. Si eliges una, no tienes que escribir
            la geometría y evitas duplicar la definición.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDescartado(true)}
          className="shrink-0 rounded-lg p-1 text-text-muted transition hover:text-text-primary"
          title="Ninguna, sigo creando"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {coincidencias.map((def) => (
          <button
            key={def.id_herramienta_global}
            type="button"
            onClick={() => onAdoptar(def)}
            className="rounded-lg border border-border bg-bg-primary p-2.5 text-left transition hover:border-accent-amber"
          >
            <p className="text-xs font-medium leading-tight text-text-primary">
              {def.nombre}
            </p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Ø{def.diametro_mm} mm
              {def.numero_filos ? ` · ${def.numero_filos} filos` : ""} ·{" "}
              {def.material}
              {def.recubrimiento ? ` · ${def.recubrimiento}` : ""}
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDescartado(true)}
        className="mt-2 text-[11px] text-text-muted underline-offset-2 hover:underline"
      >
        Ninguna es la mía — seguir creando
      </button>
    </div>
  );
}
