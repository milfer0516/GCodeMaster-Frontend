// src/modules/cam/components/resumen/BloqueSeccion.tsx
// Una sección de la hoja de setup: icono, título, pares etiqueta/valor y, si la
// sección la tiene, una tabla (p. ej. sobremedidas por cara). En móvil la
// etiqueta va encima del valor; desde `sm` comparten fila. Solo iconos: la
// hoja no dibuja máquinas ni utillajes.
import type { LucideIcon } from "lucide-react";
import type { SeccionHoja, TablaHoja } from "./hojaSetup";
import { ValorHoja } from "./ValorHoja";

function TablaSeccion({ tabla, idTabla }: { tabla: TablaHoja; idTabla: string }) {
  const ultima = tabla.encabezados.length - 1;
  return (
    <div className="mt-3 min-w-0">
      <p id={idTabla} className="mb-1.5 text-xs font-semibold text-text-primary md:text-sm">
        {tabla.titulo}
      </p>
      <table
        aria-labelledby={idTabla}
        className="w-full table-fixed border-collapse text-xs"
      >
        <thead>
          <tr className="border-b border-border">
            {tabla.encabezados.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`px-1.5 py-1 text-left font-medium text-text-muted ${
                  i === ultima ? "w-1/2" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabla.filas.map((fila) => (
            <tr key={fila.clave} className="border-b border-border/60 last:border-b-0">
              {fila.celdas.map((celda, i) =>
                i === 0 ? (
                  <th
                    key={i}
                    scope="row"
                    className="break-words px-1.5 py-1 text-left font-medium text-text-primary"
                  >
                    {celda}
                  </th>
                ) : (
                  <td key={i} className="break-words px-1.5 py-1 text-text-primary">
                    {celda}
                  </td>
                ),
              )}
              <td className="min-w-0 px-1.5 py-1">
                <ValorHoja valor={fila.valor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BloqueSeccion({
  seccion,
  icono: Icono,
  className = "",
}: {
  seccion: SeccionHoja;
  icono: LucideIcon;
  className?: string;
}) {
  const idTitulo = `hoja-${seccion.id}`;
  return (
    <section
      aria-labelledby={idTitulo}
      className={`min-w-0 rounded-xl border border-border bg-bg-elevated p-4 md:p-5 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue">
          <Icono className="h-4 w-4" aria-hidden />
        </span>
        <h3 id={idTitulo} className="min-w-0 text-sm font-semibold text-text-primary md:text-base">
          {seccion.titulo}
        </h3>
      </div>
      {seccion.nota && (
        <p className="mb-3 rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-primary">
          {seccion.nota}
        </p>
      )}
      <dl className="space-y-2 text-xs md:text-sm">
        {seccion.filas.map((fila) => (
          <div
            key={fila.etiqueta}
            className="flex flex-col gap-0.5 border-b border-border/60 pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
          >
            <dt className="text-text-muted">{fila.etiqueta}</dt>
            <dd className="min-w-0 sm:text-right">
              <ValorHoja valor={fila.valor} />
            </dd>
          </div>
        ))}
      </dl>
      {seccion.tabla && (
        <TablaSeccion tabla={seccion.tabla} idTabla={`${idTitulo}-tabla`} />
      )}
    </section>
  );
}
