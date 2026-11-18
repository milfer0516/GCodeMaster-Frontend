// src/modules/cam/components/resumen/ListaOperacionesHoja.tsx
// Tabla "Operaciones seleccionadas": las que marcó el operario, en el orden del
// análisis, cada una con su estrategia, la herramienta que nombró el MDE y sus
// parámetros de corte (S y F). Nada se completa aquí: lo que no existe se ve
// como "no disponible". La herramienta que eligió el operario se muestra con
// un aviso: hoy no viaja al motor.
//
// Una sola tabla para todos los anchos: desde `md` es una tabla normal; por
// debajo cada fila se apila como una tarjeta y cada celda lleva su rótulo
// (los encabezados se ocultan), así cabe en 360 px sin desplazamiento lateral.
import { Layers } from "lucide-react";
import type { ReactNode } from "react";
import {
  AVISO_ELECCION_NO_SE_ENVIA,
  NOTA_S_F,
  type OperacionesHoja,
} from "./hojaSetup";
import { ValorHoja } from "./ValorHoja";

export const TITULO_OPERACIONES = "Operaciones seleccionadas";

export const COLUMNAS_OPERACIONES = [
  "#",
  "Operación",
  "Estrategia",
  "Herramienta (MDE)",
  "Parámetros de corte",
] as const;

const CELDA = "block min-w-0 align-top md:table-cell md:px-3 md:py-3";

/** Rótulo de la celda, visible solo cuando la tabla se apila (móvil). */
function RotuloMovil({ children }: { children: ReactNode }) {
  return (
    <span className="mb-0.5 block text-[11px] font-medium text-text-muted md:hidden">
      {children}
    </span>
  );
}

export function ListaOperacionesHoja({ hoja }: { hoja: OperacionesHoja }) {
  return (
    <section
      aria-labelledby="hoja-operaciones"
      className="min-w-0 rounded-xl border border-border bg-bg-elevated p-4 md:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue">
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <h3
            id="hoja-operaciones"
            className="min-w-0 text-sm font-semibold text-text-primary md:text-base"
          >
            {TITULO_OPERACIONES}
          </h3>
        </div>
        <span className="rounded-md border border-border px-2 py-0.5 text-xs text-text-primary">
          {hoja.filas.length} de {hoja.total}
        </span>
      </div>

      {hoja.avisoMDE && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-accent-amber/70 bg-accent-amber/10 px-3 py-2 text-xs text-text-primary"
        >
          {hoja.avisoMDE}
        </p>
      )}

      {hoja.filas.length === 0 ? (
        <p className="text-xs text-text-primary">Ninguna operación seleccionada.</p>
      ) : (
        <table
          aria-labelledby="hoja-operaciones"
          className="block w-full text-left text-xs md:table md:border-collapse md:text-sm"
        >
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-border">
              {COLUMNAS_OPERACIONES.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-3 py-2 font-medium text-text-muted"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block space-y-2 md:table-row-group md:space-y-0">
            {hoja.filas.map((op, i) => (
              <tr
                key={op.opId}
                className="block space-y-2 rounded-lg border border-border bg-bg-primary p-3 md:table-row md:space-y-0 md:rounded-none md:border-0 md:border-b md:bg-transparent md:p-0 md:last:border-b-0"
              >
                <td className={`${CELDA} font-mono text-text-muted`}>
                  <RotuloMovil>#</RotuloMovil>
                  {i + 1}
                </td>
                <td className={CELDA}>
                  <RotuloMovil>Operación</RotuloMovil>
                  <span className="break-words font-medium text-text-primary">
                    {op.descripcion}
                  </span>
                  <span className="mt-1 block text-xs">
                    <ValorHoja valor={op.setup} />
                  </span>
                </td>
                <td className={`${CELDA} text-text-primary`}>
                  <RotuloMovil>Estrategia</RotuloMovil>
                  {op.tipo}
                </td>
                <td className={CELDA}>
                  <RotuloMovil>Herramienta (MDE)</RotuloMovil>
                  <ValorHoja valor={op.herramienta} />
                  {op.eleccionOperario && (
                    <div className="mt-2 text-xs">
                      <dl>
                        <div className="flex flex-col gap-0.5">
                          <dt className="text-text-muted">Elegida por el operario</dt>
                          <dd>
                            <ValorHoja valor={op.eleccionOperario} />
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-1 rounded-md border border-accent-amber/70 bg-accent-amber/10 px-2 py-1 text-text-primary">
                        {AVISO_ELECCION_NO_SE_ENVIA}
                      </p>
                    </div>
                  )}
                </td>
                <td className={CELDA}>
                  <RotuloMovil>Parámetros de corte</RotuloMovil>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="min-w-0">
                      <dt className="text-text-muted">S (rpm)</dt>
                      <dd>
                        <ValorHoja valor={op.s} />
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-text-muted">F (mm/min)</dt>
                      <dd>
                        <ValorHoja valor={op.f} />
                      </dd>
                    </div>
                  </dl>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-3 text-xs text-text-muted">{NOTA_S_F}</p>
    </section>
  );
}
