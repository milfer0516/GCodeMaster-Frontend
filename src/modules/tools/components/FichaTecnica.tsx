// src/modules/tools/components/FichaTecnica.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · Ficha técnica del catálogo — SOLO LECTURA.
//
// Antes esto eran <input disabled>. Aunque no se pudieran editar, PARECÍAN
// editables: el operador hacía clic, no pasaba nada y se preguntaba por qué.
// Una tabla de especificación comunica de un vistazo "esto viene del catálogo,
// no lo tienes que escribir".
// ─────────────────────────────────────────────────────────────────────────────
import { BookLock } from "lucide-react";
import { familiaLabel } from "../../../services/toolingService";
import type { ValoresHerramienta } from "../domain/valoresHerramienta";
import { ListaDatos, type FilaDato } from "./ListaDatos";

interface Props {
  valores: ValoresHerramienta;
  /** De dónde salen los datos, para el pie de la ficha. */
  origen?: "catalogo" | "libreria";
}

/** Filas con dato. Lo que no existe NO se muestra: un "—" es ruido. */
function filasDe(v: ValoresHerramienta): FilaDato[] {
  const filas: FilaDato[] = [
    { etiqueta: "Familia", valor: familiaLabel(v.familia) },
    { etiqueta: "Material", valor: v.material },
    { etiqueta: "Diámetro", valor: v.diametro_mm ? `Ø${v.diametro_mm} mm` : "" },
  ];

  // Filos o plaquitas — nunca los dos: una indexable no tiene "filos".
  if (v.numero_insertos) {
    filas.push({ etiqueta: "Plaquitas", valor: `${v.numero_insertos}` });
  } else if (v.numero_filos) {
    filas.push({ etiqueta: "Filos", valor: `${v.numero_filos}` });
  }

  // Designación ISO: la de plaquita o la de rosca, según la familia.
  const iso = v.designacion_inserto || v.designacion_rosca;
  if (iso) filas.push({ etiqueta: "Designación ISO", valor: iso });

  filas.push({ etiqueta: "Recubrimiento", valor: v.recubrimiento });
  filas.push({ etiqueta: "Norma", valor: v.norma });

  return filas;
}

export function FichaTecnica({ valores, origen = "catalogo" }: Props) {
  return (
    <section className="rounded-xl border border-border bg-bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <BookLock className="h-4 w-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">
          Datos del catálogo
        </h3>
        <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
          Solo lectura
        </span>
      </header>

      <div className="px-4 py-3">
        {valores.nombre && (
          <p className="mb-3 text-sm font-medium leading-tight text-text-primary">
            {valores.nombre}
          </p>
        )}

        <ListaDatos filas={filasDe(valores)} />

        <p className="mt-3 border-t border-border pt-2 text-[11px] text-text-muted">
          {origen === "catalogo"
            ? "Vienen del catálogo global. No hace falta que los escribas."
            : "Vienen de la librería de tu empresa."}
        </p>
      </div>
    </section>
  );
}
