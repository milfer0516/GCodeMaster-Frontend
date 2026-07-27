// src/modules/tools/components/HerramientaForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · UN SOLO FORMULARIO PARA TRES MODOS.
//
//   modo="crear"  → alta de una herramienta física
//   modo="editar" → cambio de datos/estado de una pieza ya registrada
//   modo="ver"    → ficha en solo lectura
//
// SOLO PROPIEDADES PERMANENTES. Aquí se responde "qué herramientas tiene el
// taller", nada más. El voladizo, la posición de carrusel y el
// portaherramientas son decisiones de MONTAJE de un trabajo concreto (la misma
// barra sale 20 mm hoy y 45 mm mañana, en el alojamiento 4 o en el 12), así
// que se capturan en el paso de Operaciones, que es donde además se evalúa
// L/D. Los campos siguen existiendo en ToolInstance; aquí no se escriben.
//
// DOS BLOQUES, SEPARADOS A PROPÓSITO:
//   1. Lo que YA SABE el sistema  → ficha técnica de solo lectura (catálogo).
//      Al crear una herramienta que NO está en el catálogo, ese bloque pasa a
//      ser editable: es el único caso en que el operador describe geometría.
//   2. Lo que SOLO SABE EL OPERADOR → los datos de su pieza física.
//
// Los textos están en lenguaje de taller, no de sistema: el operador tiene que
// saber qué poner sin leer documentación.
//
// Aquí no hay ni un parámetro de corte (Vc, fz, RPM, avance): esos viven en el
// catálogo de materiales y en el motor CAM.
// ─────────────────────────────────────────────────────────────────────────────
import { Wrench, Package } from "lucide-react";
import {
  familiaLabel,
  MATERIALES_HERRAMIENTA,
  ESTADOS_INSTANCIA,
  ESTADO_LABEL,
} from "../../../services/toolingService";
import {
  camposDeFamilia,
  type AnchoCampo,
  type DefinicionCampo,
} from "../domain/camposFamilia";
import type { ValoresHerramienta } from "../domain/valoresHerramienta";
import { FichaTecnica } from "./FichaTecnica";
import { ListaDatos, type FilaDato } from "./ListaDatos";

/** Miles con separador local — un costo en crudo (1234567) no se lee. */
const miles = (v: string): string => {
  const n = Number(v);
  return Number.isFinite(n) ? new Intl.NumberFormat("es-CO").format(n) : v;
};

/** Los datos de la pieza física, en el MISMO lenguaje visual que la ficha. */
function filasPieza(v: ValoresHerramienta): FilaDato[] {
  return [
    { etiqueta: "Código", valor: v.codigo_interno },
    { etiqueta: "Costo", valor: v.costo_compra ? `${miles(v.costo_compra)} COP` : "" },
    { etiqueta: "Marca", valor: v.marca },
    { etiqueta: "Referencia", valor: v.referencia_fabricante },
    { etiqueta: "Estado", valor: ESTADO_LABEL[v.estado] ?? v.estado },
  ];
}

export type ModoFormulario = "crear" | "editar" | "ver";

interface Props {
  modo: ModoFormulario;
  valores: ValoresHerramienta;
  onCambiar: (parcial: Partial<ValoresHerramienta>) => void;
  /** true solo cuando el operador está definiendo una herramienta nueva. */
  definicionEditable?: boolean;
  familias: string[];
  campoConError?: keyof ValoresHerramienta | null;
  /** Ranura bajo la definición — la usa la búsqueda previa en el catálogo. */
  slotDefinicion?: React.ReactNode;
}

const inputCls =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent-blue disabled:cursor-default disabled:opacity-70";
const labelCls = "mb-1 block text-xs font-medium text-text-primary";
const ayudaCls = "mt-1 text-[11px] leading-snug text-text-muted";
const errorCls = "border-accent-red focus:border-accent-red";

/** Rejilla de 6 columnas; cada campo ocupa su anchura natural. */
const REJILLA = "grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-6";

const TRAMO: Record<AnchoCampo, string> = {
  corto: "col-span-1 sm:col-span-2",
  medio: "col-span-2 sm:col-span-3",
  largo: "col-span-2 sm:col-span-6 max-w-md",
};

const tramo = (ancho: AnchoCampo = "corto") => TRAMO[ancho];

function Seccion({
  titulo,
  icono,
  descripcion,
  insignia,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  descripcion?: string;
  insignia?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg-surface p-4">
      <header className="mb-3">
        <div className="flex items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            {icono}
            {titulo}
          </h3>
          {insignia && (
            <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
              {insignia}
            </span>
          )}
        </div>
        {descripcion && <p className="mt-0.5 text-xs text-text-muted">{descripcion}</p>}
      </header>
      {children}
    </section>
  );
}

export function HerramientaForm({
  modo,
  valores,
  onCambiar,
  definicionEditable = false,
  familias,
  campoConError = null,
  slotDefinicion,
}: Props) {
  const soloLectura = modo === "ver";
  const set = (parcial: Partial<ValoresHerramienta>) => {
    if (soloLectura) return;
    onCambiar(parcial);
  };

  const clsDe = (campo: keyof ValoresHerramienta) =>
    `${inputCls} ${campoConError === campo ? errorCls : ""}`;

  const renderCampoTecnico = (campo: DefinicionCampo) => (
    <div key={campo.clave} className={tramo(campo.ancho)}>
      <label className={labelCls}>
        {campo.etiqueta}
        {campo.requerido && " *"}
      </label>
      {campo.tipo === "opciones" && campo.opciones ? (
        <select
          className={clsDe(campo.clave)}
          value={valores[campo.clave]}
          onChange={(e) => set({ [campo.clave]: e.target.value } as any)}
        >
          <option value="">—</option>
          {campo.opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={clsDe(campo.clave)}
          type={campo.tipo === "numero" ? "number" : "text"}
          step={campo.paso}
          min={campo.min}
          placeholder={campo.marcador}
          value={valores[campo.clave]}
          onChange={(e) => set({ [campo.clave]: e.target.value } as any)}
        />
      )}
      {campo.ayuda && <p className={ayudaCls}>{campo.ayuda}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── 1 · LO QUE YA SABE EL SISTEMA ───────────────────────────────── */}
      {definicionEditable ? (
        <Seccion
          titulo="¿Qué herramienta es?"
          icono={<Wrench className="h-4 w-4 text-accent-blue" />}
          descripcion="No está en el catálogo, así que la describes una vez y queda en la librería de tu empresa."
        >
          <div className={REJILLA}>
            <div className={tramo("medio")}>
              <label className={labelCls}>Familia *</label>
              <select
                className={clsDe("familia")}
                value={valores.familia}
                onChange={(e) => set({ familia: e.target.value })}
              >
                <option value="">Selecciona...</option>
                {familias.map((f) => (
                  <option key={f} value={f}>
                    {familiaLabel(f)}
                  </option>
                ))}
              </select>
            </div>

            <div className={tramo("medio")}>
              <label className={labelCls}>Material *</label>
              <select
                className={clsDe("material")}
                value={valores.material}
                onChange={(e) => set({ material: e.target.value })}
              >
                <option value="">Selecciona...</option>
                {MATERIALES_HERRAMIENTA.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className={tramo("largo")}>
              <label className={labelCls}>Nombre *</label>
              <input
                className={clsDe("nombre")}
                value={valores.nombre}
                placeholder="Ej: Fresa plana Ø14 3F carburo"
                onChange={(e) => set({ nombre: e.target.value })}
              />
            </div>

            {camposDeFamilia(valores.familia).map(renderCampoTecnico)}

            <div className={tramo("medio")}>
              <label className={labelCls}>Recubrimiento</label>
              <input
                className={inputCls}
                value={valores.recubrimiento}
                placeholder="TiAlN, TiN... (opcional)"
                onChange={(e) => set({ recubrimiento: e.target.value })}
              />
            </div>
          </div>

          {slotDefinicion}
        </Seccion>
      ) : (
        <FichaTecnica
          valores={valores}
          origen={modo === "crear" ? "catalogo" : "libreria"}
        />
      )}

      {/* ── 2 · LO QUE SOLO SABE EL OPERADOR ────────────────────────────── */}
      {soloLectura ? (
        // En modo ver NO se pintan inputs deshabilitados: mismo lenguaje
        // visual que la ficha del catálogo, pares etiqueta/valor.
        <Seccion
          titulo="Tu herramienta"
          icono={<Package className="h-4 w-4 text-accent-blue" />}
          insignia="Solo lectura"
        >
          <ListaDatos filas={filasPieza(valores)} />
        </Seccion>
      ) : (
      <Seccion
        titulo="Tu herramienta"
        icono={<Package className="h-4 w-4 text-accent-blue" />}
        descripcion="Datos de la pieza que tienes en el taller. Todos opcionales."
      >
        <div className="space-y-4">
          <div className={REJILLA}>
            <div className={tramo("medio")}>
              <label className={labelCls}>
                ¿La tienen marcada con algún código?
              </label>
              <input
                className={inputCls}
                value={valores.codigo_interno}
                placeholder="Ej: H-014 (opcional)"
                onChange={(e) => set({ codigo_interno: e.target.value })}
              />
            </div>

            <div className={tramo("corto")}>
              <label className={labelCls}>¿Cuánto costó?</label>
              <input
                className={clsDe("costo_compra")}
                type="number"
                min={0}
                step={1000}
                value={valores.costo_compra}
                placeholder="COP (opcional)"
                onChange={(e) => set({ costo_compra: e.target.value })}
              />
            </div>

            <div className={tramo("corto")}>
              <label className={labelCls}>Marca</label>
              <input
                className={inputCls}
                value={valores.marca}
                placeholder="Ej: Iscar (opcional)"
                onChange={(e) => set({ marca: e.target.value })}
              />
            </div>

            <div className={tramo("medio")}>
              <label className={labelCls}>Referencia del fabricante</label>
              <input
                className={inputCls}
                value={valores.referencia_fabricante}
                placeholder="Ej: EC-A4 12-26C12 (opcional)"
                onChange={(e) =>
                  set({ referencia_fabricante: e.target.value })
                }
              />
              <p className={ayudaCls}>Para volver a pedir la misma.</p>
            </div>

            {/* El estado es control de vida de la pieza, no alta de datos:
                solo aparece cuando la herramienta YA existe. */}
            {modo !== "crear" && (
              <div className={tramo("medio")}>
                <label className={labelCls}>Estado</label>
                <select
                  className={inputCls}
                  value={valores.estado}
                  onChange={(e) => set({ estado: e.target.value })}
                >
                  {ESTADOS_INSTANCIA.map((e) => (
                    <option key={e} value={e}>
                      {ESTADO_LABEL[e]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </Seccion>
      )}
    </div>
  );
}
