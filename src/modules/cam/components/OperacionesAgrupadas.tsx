// src/modules/cam/components/OperacionesAgrupadas.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Operaciones detectadas AGRUPADAS POR TIPO — presentación, nada de lógica.
//
// El backend ya entrega cada operación con su `tipo` (planeado, taladrado,
// cajera…). Antes se pintaban en una lista plana dentro de cada tarjeta de
// Setup; aquí solo cambia CÓMO se recorren los mismos datos:
//
//   · Desktop: una fila horizontal de botones (uno por tipo, con su contador).
//     El activo se distingue por fondo/borde y debajo se despliegan SOLO las
//     operaciones de ese tipo. Si no caben, la fila hace scroll horizontal.
//   · Mobile: los tipos se apilan como acordeones; cada cabecera expande o
//     contrae sus operaciones y varios pueden estar abiertos a la vez.
//
// REGLAS que este archivo respeta:
//   · No se inventan tipos: se agrupa por `op.tipo` TAL CUAL llega del motor.
//     La etiqueta legible sale de la tabla de dominio (tipoOperacionLabel),
//     que para un tipo desconocido devuelve el texto crudo.
//   · No se pierde información: cada operación se pinta con la MISMA fila de
//     siempre (insignia con icono + tipo crudo + descripción completa con
//     coordenadas, diámetro, pasante/ciego…).
//   · Una operación SIN tipo no se fuerza a ningún grupo: queda en la sección
//     "Sin categoría", al final y siempre visible.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import {
  Box,
  ChevronDown,
  CircleDot,
  Drill,
  Layers,
  Wrench,
} from "lucide-react";
import { tipoOperacionLabel } from "../domain/tiposOperacion";

// Mismos colores e iconos que usaba la lista plana — se mantienen idénticos.
export function tipoColor(tipo: string) {
  switch (tipo) {
    case "planeado":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "taladrado":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "cajera":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "contorneado_exterior":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    default:
      return "bg-bg-elevated text-text-muted border-border";
  }
}

export function tipoIcono(tipo: string) {
  switch (tipo) {
    case "planeado":
      return <Layers className="h-3.5 w-3.5" />;
    case "taladrado":
      return <Drill className="h-3.5 w-3.5" />;
    case "cajera":
      return <Box className="h-3.5 w-3.5" />;
    case "contorneado_exterior":
      return <CircleDot className="h-3.5 w-3.5" />;
    default:
      return <Wrench className="h-3.5 w-3.5" />;
  }
}

interface Grupo {
  /** `tipo` crudo, tal como lo reporta el backend. */
  tipo: string;
  ops: any[];
}

/**
 * Agrupa por `op.tipo` en orden de primera aparición (el orden en que el
 * motor las entregó). Las operaciones sin tipo NO entran a ningún grupo.
 */
function agruparPorTipo(ops: any[]): { grupos: Grupo[]; sinCategoria: any[] } {
  const grupos: Grupo[] = [];
  const indice = new Map<string, Grupo>();
  const sinCategoria: any[] = [];

  for (const op of ops ?? []) {
    const tipo = op?.tipo;
    if (tipo == null || tipo === "") {
      sinCategoria.push(op);
      continue;
    }
    let grupo = indice.get(tipo);
    if (!grupo) {
      grupo = { tipo, ops: [] };
      indice.set(tipo, grupo);
      grupos.push(grupo);
    }
    grupo.ops.push(op);
  }
  return { grupos, sinCategoria };
}

/** La fila de operación de SIEMPRE: insignia con icono + tipo + descripción. */
function FilaOperacion({ op, idx }: { op: any; idx: number }) {
  return (
    <div key={idx} className="flex items-start gap-2">
      <span
        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium flex-shrink-0 ${tipoColor(op.tipo)}`}
      >
        {tipoIcono(op.tipo)}
        {op.tipo ?? "sin tipo"}
      </span>
      <p className="text-xs text-text-muted leading-relaxed">
        {op.descripcion}
      </p>
    </div>
  );
}

export function OperacionesAgrupadas({ ops }: { ops: any[] }) {
  const { grupos, sinCategoria } = useMemo(() => agruparPorTipo(ops), [ops]);

  // Desktop: un solo tipo desplegado. Por defecto, el primero detectado; si el
  // tipo activo deja de existir (cambio de archivo), se vuelve al primero.
  const [tipoActivo, setTipoActivo] = useState<string | null>(null);
  const activo =
    tipoActivo != null && grupos.some((g) => g.tipo === tipoActivo)
      ? tipoActivo
      : (grupos[0]?.tipo ?? null);

  // Mobile: acordeones independientes — varios abiertos a la vez. Se siembra
  // con el primer tipo abierto para que la información no quede oculta.
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(
    () => new Set(grupos[0] ? [grupos[0].tipo] : []),
  );

  const alternarAcordeon = (tipo: string) => {
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(tipo)) siguiente.delete(tipo);
      else siguiente.add(tipo);
      return siguiente;
    });
  };

  const opsActivas = grupos.find((g) => g.tipo === activo)?.ops ?? [];

  return (
    <div>
      {/* ── Desktop: botones en fila con scroll horizontal suave ── */}
      <div className="hidden md:block">
        <div
          role="tablist"
          aria-label="Tipos de operación"
          className="flex gap-2 overflow-x-auto scroll-smooth pb-1"
        >
          {grupos.map((g) => {
            const esActivo = g.tipo === activo;
            return (
              <button
                key={g.tipo}
                type="button"
                role="tab"
                aria-selected={esActivo}
                onClick={() => setTipoActivo(g.tipo)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  esActivo
                    ? `${tipoColor(g.tipo)} ring-1 ring-current`
                    : "border-border bg-bg-primary text-text-muted hover:bg-bg-elevated hover:text-text-primary"
                }`}
              >
                {tipoIcono(g.tipo)}
                {tipoOperacionLabel(g.tipo)}
                <span
                  className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                    esActivo ? "bg-black/25" : "bg-bg-elevated"
                  }`}
                >
                  {g.ops.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Debajo, SOLO las operaciones del tipo activo, una debajo de otra,
            con el mismo formato de la lista plana de siempre. */}
        <div className="mt-3 space-y-2">
          {opsActivas.map((op, idx) => (
            <FilaOperacion key={idx} op={op} idx={idx} />
          ))}
        </div>
      </div>

      {/* ── Mobile: acordeones verticales, varios abiertos a la vez ── */}
      <div className="space-y-2 md:hidden">
        {grupos.map((g) => {
          const abierto = abiertos.has(g.tipo);
          return (
            <div
              key={g.tipo}
              className="overflow-hidden rounded-lg border border-border"
            >
              <button
                type="button"
                onClick={() => alternarAcordeon(g.tipo)}
                aria-expanded={abierto}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition ${
                  abierto
                    ? tipoColor(g.tipo)
                    : "bg-bg-primary text-text-muted hover:bg-bg-elevated hover:text-text-primary"
                }`}
              >
                {tipoIcono(g.tipo)}
                {tipoOperacionLabel(g.tipo)}
                <span
                  className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                    abierto ? "bg-black/25" : "bg-bg-elevated"
                  }`}
                >
                  {g.ops.length}
                </span>
                <ChevronDown
                  className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                    abierto ? "rotate-180" : ""
                  }`}
                />
              </button>
              {abierto && (
                <div className="space-y-2 border-t border-border p-2">
                  {g.ops.map((op, idx) => (
                    <FilaOperacion key={idx} op={op} idx={idx} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Sin categoría: operaciones sin tipo, siempre visibles al final ── */}
      {sinCategoria.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Sin categoría
          </p>
          <div className="space-y-2">
            {sinCategoria.map((op, idx) => (
              <FilaOperacion key={idx} op={op} idx={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
