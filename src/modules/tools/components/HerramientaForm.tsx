// src/modules/tools/components/HerramientaForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · UN SOLO FORMULARIO PARA TRES MODOS.
//
//   modo="crear"  → alta de una herramienta física
//   modo="editar" → re-medida / cambio de estado de una pieza ya registrada
//   modo="ver"    → ficha en solo lectura
//
// No hay tres componentes: hay uno que cambia de modo. `definicionEditable`
// separa además las dos rutas de alta — desde el catálogo la definición es
// intocable (viene del catálogo global), en una herramienta nueva la escribe
// el operador. En modo "ver" TODO es solo lectura, sin excepción.
//
// Los campos técnicos NO están escritos a mano: salen de camposDeFamilia(), así
// que una broca no muestra radio de esquina y un macho sí muestra paso.
//
// Aquí no hay ni un parámetro de corte (Vc, fz, RPM, avance): esos viven en el
// catálogo de materiales y en el motor CAM.
// ─────────────────────────────────────────────────────────────────────────────
import { Ruler, Wrench, Package, Info } from "lucide-react";
import {
  familiaLabel,
  MATERIALES_HERRAMIENTA,
  ESTADOS_INSTANCIA,
  ESTADO_LABEL,
} from "../../../services/toolingService";
import { camposDeFamilia, type DefinicionCampo } from "../domain/camposFamilia";
import type { ValoresHerramienta } from "../domain/valoresHerramienta";

export type ModoFormulario = "crear" | "editar" | "ver";

interface Props {
  modo: ModoFormulario;
  valores: ValoresHerramienta;
  onCambiar: (parcial: Partial<ValoresHerramienta>) => void;
  /** true solo cuando el operador está definiendo una herramienta nueva. */
  definicionEditable?: boolean;
  familias: string[];
  /** Campo señalado por la validación. */
  campoConError?: keyof ValoresHerramienta | null;
  /** Ranura bajo la definición — la usa la búsqueda previa en el catálogo. */
  slotDefinicion?: React.ReactNode;
}

const inputCls =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent-blue disabled:cursor-default disabled:opacity-70";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";
const errorCls = "border-accent-red focus:border-accent-red";

function Seccion({
  titulo,
  icono,
  descripcion,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg-surface p-4">
      <header className="mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          {icono}
          {titulo}
        </h3>
        {descripcion && (
          <p className="mt-0.5 text-xs text-text-muted">{descripcion}</p>
        )}
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
  // La definición pertenece al catálogo / a la librería: solo se escribe al
  // crear una herramienta nueva, nunca al editar una pieza física.
  const defBloqueada = soloLectura || !definicionEditable;

  const set = (parcial: Partial<ValoresHerramienta>) => {
    if (soloLectura) return;
    onCambiar(parcial);
  };

  const clsDe = (campo: keyof ValoresHerramienta) =>
    `${inputCls} ${campoConError === campo ? errorCls : ""}`;

  const renderCampoTecnico = (campo: DefinicionCampo) => {
    const valor = valores[campo.clave];
    const comun = {
      className: clsDe(campo.clave),
      disabled: defBloqueada,
      value: valor,
    };

    return (
      <div key={campo.clave}>
        <label className={labelCls}>
          {campo.etiqueta}
          {campo.requerido && !defBloqueada && " *"}
        </label>

        {campo.tipo === "opciones" && campo.opciones ? (
          <select
            {...comun}
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
            {...comun}
            type={campo.tipo === "numero" ? "number" : "text"}
            step={campo.paso}
            min={campo.min}
            placeholder={campo.marcador}
            onChange={(e) => set({ [campo.clave]: e.target.value } as any)}
          />
        )}

        {campo.ayuda && !defBloqueada && (
          <p className="mt-1 text-[11px] text-text-muted">{campo.ayuda}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── DEFINICIÓN ───────────────────────────────────────────────── */}
      <Seccion
        titulo="Definición"
        icono={<Wrench className="h-4 w-4 text-accent-blue" />}
        descripcion={
          defBloqueada
            ? "Datos técnicos de la definición. No se editan aquí."
            : "Describe la herramienta una sola vez: quedará en la librería de tu empresa."
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Familia {!defBloqueada && "*"}</label>
            {defBloqueada ? (
              <input
                className={inputCls}
                disabled
                value={familiaLabel(valores.familia)}
              />
            ) : (
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
            )}
          </div>

          <div>
            <label className={labelCls}>Material {!defBloqueada && "*"}</label>
            <select
              className={clsDe("material")}
              disabled={defBloqueada}
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

          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre {!defBloqueada && "*"}</label>
            <input
              className={clsDe("nombre")}
              disabled={defBloqueada}
              value={valores.nombre}
              placeholder="Ej: Fresa plana Ø14 3F carburo"
              onChange={(e) => set({ nombre: e.target.value })}
            />
          </div>

          {camposDeFamilia(valores.familia).map(renderCampoTecnico)}

          <div>
            <label className={labelCls}>Recubrimiento</label>
            <input
              className={inputCls}
              disabled={defBloqueada}
              value={valores.recubrimiento}
              placeholder="TiAlN, TiN... (opcional)"
              onChange={(e) => set({ recubrimiento: e.target.value })}
            />
          </div>
        </div>

        {slotDefinicion}
      </Seccion>

      {/* ── PIEZA FÍSICA ─────────────────────────────────────────────── */}
      <Seccion
        titulo="Tu herramienta física"
        icono={<Package className="h-4 w-4 text-accent-blue" />}
        descripcion="Datos de ESTA pieza concreta del taller, no de la definición."
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              <Ruler className="h-4 w-4 text-accent-blue" />
              Longitud útil medida (mm) {modo !== "ver" && "*"}
            </label>
            {modo !== "ver" && (
              <p className="mb-2 text-xs text-text-muted">
                Es el largo que queda fuera del portaherramientas. Varía en cada
                pieza según cómo esté montada y el desgaste, por eso nadie puede
                calcularla por ti. El render de al lado usa este valor.
              </p>
            )}
            <input
              className={clsDe("longitud_util_real_mm")}
              disabled={soloLectura}
              type="number"
              min={0.1}
              step={0.1}
              value={valores.longitud_util_real_mm}
              placeholder="Ej: 42.5"
              onChange={(e) =>
                set({ longitud_util_real_mm: e.target.value })
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Código interno</label>
              <input
                className={inputCls}
                disabled={soloLectura}
                value={valores.codigo_interno}
                placeholder="Opcional — ej: H-014"
                onChange={(e) => set({ codigo_interno: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Posición en carrusel</label>
              <input
                className={inputCls}
                disabled={soloLectura}
                type="number"
                min={0}
                value={valores.posicion_carrusel}
                placeholder="Opcional"
                onChange={(e) => set({ posicion_carrusel: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Portaherramientas</label>
              <input
                className={inputCls}
                disabled={soloLectura}
                value={valores.portaherramienta_real}
                placeholder="Opcional — ej: BT40 ER32"
                onChange={(e) => set({ portaherramienta_real: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Costo de compra</label>
              <input
                className={clsDe("costo_compra")}
                disabled={soloLectura}
                type="number"
                min={0}
                step={1000}
                value={valores.costo_compra}
                placeholder="Opcional — COP"
                onChange={(e) => set({ costo_compra: e.target.value })}
              />
              {modo !== "ver" && (
                <p className="mt-1 text-[11px] text-text-muted">
                  Lo que pagaste por esta pieza. Permitirá imputar el gasto real
                  de herramienta por trabajo.
                </p>
              )}
            </div>

            {modo !== "crear" && (
              <div>
                <label className={labelCls}>Estado</label>
                <select
                  className={inputCls}
                  disabled={soloLectura}
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

            <div className="sm:col-span-2">
              <label className={labelCls}>Notas</label>
              <input
                className={inputCls}
                disabled={soloLectura}
                value={valores.notas}
                placeholder="Opcional"
                onChange={(e) => set({ notas: e.target.value })}
              />
            </div>
          </div>

          {modo === "crear" && (
            <p className="flex items-start gap-2 rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ¿Tienes dos herramientas iguales? Regístralas por separado: cada
              pieza física lleva su propia longitud medida y su propio costo.
            </p>
          )}
        </div>
      </Seccion>
    </div>
  );
}
