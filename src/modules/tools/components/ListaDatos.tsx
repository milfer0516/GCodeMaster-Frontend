// src/modules/tools/components/ListaDatos.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · Presentación de datos en SOLO LECTURA — pares etiqueta/valor.
//
// Es el único lenguaje visual de "esto no se edita" en el módulo. Lo comparten
// la ficha del catálogo y la ficha de la pieza física en modo ver, para que el
// operador no tenga que aprender dos formas distintas de leer lo mismo.
//
// Un <input disabled> NO vale para esto: parece editable, invita a hacer clic
// y no responde. Ese fue justo el problema que se quitó de la definición.
// ─────────────────────────────────────────────────────────────────────────────

export interface FilaDato {
  etiqueta: string;
  valor: string;
}

/** Deja fuera lo que no tiene valor: una columna de guiones es ruido. */
export function filasConDato(filas: FilaDato[]): FilaDato[] {
  return filas.filter((f) => f.valor.trim() !== "" && f.valor !== "—");
}

export function ListaDatos({ filas }: { filas: FilaDato[] }) {
  const visibles = filasConDato(filas);
  if (visibles.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 sm:grid-cols-[auto_1fr_auto_1fr]">
      {visibles.map((f) => (
        <div key={f.etiqueta} className="contents">
          <dt className="text-xs text-text-muted">{f.etiqueta}</dt>
          <dd className="text-xs font-medium tabular-nums text-text-primary">
            {f.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}
