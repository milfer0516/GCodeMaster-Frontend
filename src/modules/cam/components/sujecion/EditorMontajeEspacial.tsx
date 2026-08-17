// src/modules/cam/components/sujecion/EditorMontajeEspacial.tsx
// ─────────────────────────────────────────────────────────────────────────────
// EDITOR DE DATOS DEL MONTAJE (formulario a escala real, sin lienzo propio).
//
// Es un EDITOR DE DATOS: el operador declara posiciones, alturas y orientación,
// y lo ÚNICO que se guarda son números en `montaje_espacial`. La representación
// espacial vive ahora en el visor 3D único (CamViewer3D): este componente ya no
// dibuja su propia superficie 2D (SVG). Se conservan intactos el modelo de datos,
// las mutaciones y el cableado onChange — solo se retiró la capa de dibujo/arrastre.
//
// Aquí NO se calcula ninguna Z de seguridad. El frontend solo transporta la
// geometría que el operador coloca; la holgura la decide el motor.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Plus, Trash2, RotateCw } from "lucide-react";
import type { Maquina } from "../../../../services/maquinasService";
import type {
  MontajeEspacial,
  ElementoFisico,
  ZonaSujecion,
  TipoElementoFisico,
  TipoZonaSujecion,
} from "../../store/camStore";

// Tamaños por defecto de cada elemento físico al añadirlo (mm). Son valores de
// partida editables por el operador, no medidas inventadas de una pieza real.
const DEFAULTS_ELEMENTO: Record<
  TipoElementoFisico,
  { ancho_mm: number; largo_mm: number; altura_sobre_mesa_mm: number; label: string }
> = {
  brida: { ancho_mm: 40, largo_mm: 80, altura_sobre_mesa_mm: 25, label: "Brida" },
  tornillo: { ancho_mm: 16, largo_mm: 16, altura_sobre_mesa_mm: 30, label: "Tornillo" },
  mordaza: { ancho_mm: 60, largo_mm: 120, altura_sobre_mesa_mm: 50, label: "Mordaza" },
  tope: { ancho_mm: 20, largo_mm: 20, altura_sobre_mesa_mm: 20, label: "Tope" },
};

const COLOR_ELEMENTO: Record<TipoElementoFisico, string> = {
  brida: "#f59e0b",
  tornillo: "#a78bfa",
  mordaza: "#38bdf8",
  tope: "#f472b6",
};

const TIPOS_ZONA: TipoZonaSujecion[] = [
  "brida",
  "tornillo",
  "mordaza",
  "tope",
  "apoyo",
];

interface Props {
  maquina: Maquina;
  // bbox de la pieza que el sistema ya calcula (mm).
  dimensiones: { x: number; y: number; z: number };
  // Conservada por compatibilidad de la firma (la silueta redonda/rectangular la
  // dibuja ahora el visor 3D); este componente ya no la usa para dibujar.
  esCilindrica: boolean;
  value: MontajeEspacial | null;
  onChange: (next: MontajeEspacial) => void;
}

let contadorId = 0;
const nuevoId = (tipo: string) => `${tipo}_${Date.now().toString(36)}_${contadorId++}`;

export const EditorMontajeEspacial = ({
  maquina,
  dimensiones,
  value,
  onChange,
}: Props) => {
  // Mesa a escala: usa mesa_x/y_mm si el backend las envía; si no, cae a los
  // recorridos (mejor tener un área útil que no tener ninguna).
  const mesaX = maquina.mesa_x_mm ?? maquina.recorrido_x_mm;
  const mesaY = maquina.mesa_y_mm ?? maquina.recorrido_y_mm;

  // Elemento al que se enlazará la próxima zona de sujeción creada.
  const [elementoParaZona, setElementoParaZona] = useState<string>("");

  // Inicializa el modelo la PRIMERA vez con la pieza centrada. `altura_total_pieza_mm`
  // se SIEMBRA desde el bbox del STEP como sugerencia inicial, pero es un dato
  // FÍSICO que declara/confirma el operario: una vez creado NO se vuelve a
  // sobrescribir aunque cambie dimensiones.z. La altura declarada es independiente
  // de cómo se sujete la pieza (no reintroducimos la semántica que quitamos de
  // z_apoyo/z_base).
  useEffect(() => {
    if (mesaX <= 0 || mesaY <= 0) return;
    if (value === null) {
      onChange({
        pieza: {
          altura_total_pieza_mm: dimensiones.z, // solo semilla inicial
          pos_x_mm: Math.round(mesaX / 2),
          pos_y_mm: Math.round(mesaY / 2),
          orientacion_fisica_deg: 0,
        },
        zonas_sujecion: [],
        elementos_fisicos: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mesaX, mesaY]);

  if (!value) return null;
  const { pieza, elementos_fisicos, zonas_sujecion } = value;

  // ── Mutaciones ──────────────────────────────────────────────────────────────
  const añadirElemento = (tipo: TipoElementoFisico) => {
    const d = DEFAULTS_ELEMENTO[tipo];
    const el: ElementoFisico = {
      id: nuevoId(tipo),
      tipo,
      pos_x_mm: Math.round(mesaX / 2),
      pos_y_mm: Math.round(mesaY / 4),
      ancho_mm: d.ancho_mm,
      largo_mm: d.largo_mm,
      altura_sobre_mesa_mm: d.altura_sobre_mesa_mm,
    };
    onChange({ ...value, elementos_fisicos: [...elementos_fisicos, el] });
    if (!elementoParaZona) setElementoParaZona(el.id);
  };

  const editarElemento = (id: string, campo: keyof ElementoFisico, v: number) =>
    onChange({
      ...value,
      elementos_fisicos: elementos_fisicos.map((el) =>
        el.id === id ? { ...el, [campo]: v } : el,
      ),
    });

  const borrarElemento = (id: string) =>
    onChange({
      ...value,
      elementos_fisicos: elementos_fisicos.filter((el) => el.id !== id),
      // Una zona sin elemento referenciado quedaría huérfana: se elimina también.
      zonas_sujecion: zonas_sujecion.filter((z) => z.elemento_ref !== id),
    });

  const añadirZona = () => {
    if (!elementoParaZona) return;
    const ref = elementos_fisicos.find((el) => el.id === elementoParaZona);
    const tipo: TipoZonaSujecion =
      ref && (TIPOS_ZONA as string[]).includes(ref.tipo)
        ? (ref.tipo as TipoZonaSujecion)
        : "apoyo";
    const zona: ZonaSujecion = {
      pos_x_mm: ref ? ref.pos_x_mm : Math.round(mesaX / 2),
      pos_y_mm: ref ? ref.pos_y_mm : Math.round(mesaY / 2),
      tipo,
      elemento_ref: elementoParaZona,
    };
    onChange({ ...value, zonas_sujecion: [...zonas_sujecion, zona] });
  };

  const editarZonaTipo = (idx: number, tipo: TipoZonaSujecion) =>
    onChange({
      ...value,
      zonas_sujecion: zonas_sujecion.map((z, i) =>
        i === idx ? { ...z, tipo } : z,
      ),
    });

  const borrarZona = (idx: number) =>
    onChange({
      ...value,
      zonas_sujecion: zonas_sujecion.filter((_, i) => i !== idx),
    });

  const rotarPieza = (deg: number) =>
    onChange({
      ...value,
      pieza: { ...pieza, orientacion_fisica_deg: ((deg % 360) + 360) % 360 },
    });

  // Edita un campo numérico de la pieza. Incluye `altura_total_pieza_mm`, que es
  // el dato físico que el operario declara/confirma (no una medida derivada de
  // la sujeción).
  const editarPieza = (campo: keyof typeof pieza, v: number) =>
    onChange({ ...value, pieza: { ...pieza, [campo]: v } });

  const inputCls =
    "w-16 rounded border border-border bg-bg-primary px-1.5 py-1 text-xs text-text-primary focus:border-accent-blue focus:outline-none";

  return (
    <div className="space-y-3">
      {/* Barra de herramientas: añadir elementos */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-text-muted">Añadir elemento:</span>
        {(Object.keys(DEFAULTS_ELEMENTO) as TipoElementoFisico[]).map((tipo) => (
          <button
            key={tipo}
            onClick={() => añadirElemento(tipo)}
            className="flex items-center gap-1 rounded-lg border border-border bg-bg-primary px-2.5 py-1.5 text-xs font-medium text-text-primary transition hover:border-accent-blue/50"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: COLOR_ELEMENTO[tipo] }}
            />
            {DEFAULTS_ELEMENTO[tipo].label}
          </button>
        ))}
      </div>

      {/* Escala de la mesa */}
      <div className="text-xs text-text-muted">
        Mesa {Math.round(mesaX)}×{Math.round(mesaY)}mm
        {maquina.mesa_x_mm == null && " (recorrido — mesa no declarada)"}
      </div>

      {/* Inspector de la PIEZA: X/Y, orientación y altura total FÍSICA declarada
          por el operario. */}
      <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-2.5 py-2">
        <p className="mb-1.5 text-xs font-medium text-text-primary">Pieza</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] text-text-muted">
            pos X (mm)
            <input
              type="number"
              value={pieza.pos_x_mm}
              min={0}
              max={Math.round(mesaX)}
              onChange={(e) => editarPieza("pos_x_mm", Number(e.target.value))}
              className={inputCls}
            />
          </label>
          <label className="text-[11px] text-text-muted">
            pos Y (mm)
            <input
              type="number"
              value={pieza.pos_y_mm}
              min={0}
              max={Math.round(mesaY)}
              onChange={(e) => editarPieza("pos_y_mm", Number(e.target.value))}
              className={inputCls}
            />
          </label>
          <label className="text-[11px] text-text-muted">
            orientación (°)
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={pieza.orientacion_fisica_deg}
                onChange={(e) =>
                  rotarPieza(Number(e.target.value))
                }
                className={inputCls}
              />
              <button
                onClick={() => rotarPieza(pieza.orientacion_fisica_deg + 15)}
                className="rounded border border-border p-1 hover:border-accent-blue/50"
                title="+15°"
              >
                <RotateCw className="h-3 w-3 text-text-muted" />
              </button>
            </div>
          </label>
          <label className="text-[11px] text-text-muted">
            altura total (mm)
            <input
              type="number"
              value={pieza.altura_total_pieza_mm}
              min={0}
              onChange={(e) =>
                editarPieza("altura_total_pieza_mm", Number(e.target.value))
              }
              className={`${inputCls} w-20`}
            />
          </label>
          <span className="pb-1 text-[10px] text-text-muted/70">
            altura sugerida por bbox: {Math.round(dimensiones.z)}mm — confírmala o
            corrígela
          </span>
        </div>
      </div>

      {/* Inspector de elementos */}
      {elementos_fisicos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-primary">Elementos físicos</p>
          {elementos_fisicos.map((el) => (
            <div
              key={el.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-primary px-2.5 py-1.5"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: COLOR_ELEMENTO[el.tipo] }}
              />
              <span className="w-16 text-xs font-medium text-text-primary">{el.tipo}</span>
              <label className="text-[11px] text-text-muted">
                pos X
                <input
                  type="number"
                  value={el.pos_x_mm}
                  min={0}
                  max={Math.round(mesaX)}
                  onChange={(e) => editarElemento(el.id, "pos_x_mm", Number(e.target.value))}
                  className={inputCls}
                />
              </label>
              <label className="text-[11px] text-text-muted">
                pos Y
                <input
                  type="number"
                  value={el.pos_y_mm}
                  min={0}
                  max={Math.round(mesaY)}
                  onChange={(e) => editarElemento(el.id, "pos_y_mm", Number(e.target.value))}
                  className={inputCls}
                />
              </label>
              <label className="text-[11px] text-text-muted">
                ancho
                <input
                  type="number"
                  value={el.ancho_mm}
                  min={1}
                  onChange={(e) => editarElemento(el.id, "ancho_mm", Number(e.target.value))}
                  className={inputCls}
                />
              </label>
              <label className="text-[11px] text-text-muted">
                largo
                <input
                  type="number"
                  value={el.largo_mm}
                  min={1}
                  onChange={(e) => editarElemento(el.id, "largo_mm", Number(e.target.value))}
                  className={inputCls}
                />
              </label>
              <label className="text-[11px] text-text-muted">
                alt. mesa
                <input
                  type="number"
                  value={el.altura_sobre_mesa_mm}
                  min={0}
                  onChange={(e) =>
                    editarElemento(el.id, "altura_sobre_mesa_mm", Number(e.target.value))
                  }
                  className={inputCls}
                />
              </label>
              <button
                onClick={() => borrarElemento(el.id)}
                className="ml-auto rounded p-1 text-text-muted hover:text-red-400"
                title="Eliminar elemento"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Zonas de sujeción */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-primary">Zonas de sujeción</p>
          <div className="flex items-center gap-1.5">
            <select
              value={elementoParaZona}
              onChange={(e) => setElementoParaZona(e.target.value)}
              className="rounded border border-border bg-bg-primary px-1.5 py-1 text-xs text-text-primary focus:border-accent-blue focus:outline-none"
            >
              <option value="">Elemento…</option>
              {elementos_fisicos.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.tipo} · {el.id.slice(0, 10)}
                </option>
              ))}
            </select>
            <button
              onClick={añadirZona}
              disabled={!elementoParaZona}
              className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-text-primary transition hover:border-accent-blue/50 disabled:opacity-40"
            >
              <Plus className="h-3 w-3" /> Zona
            </button>
          </div>
        </div>
        {zonas_sujecion.length === 0 ? (
          <p className="text-[11px] text-text-muted">
            Marca dónde un elemento agarra la pieza (distinto del elemento en sí).
          </p>
        ) : (
          zonas_sujecion.map((z, i) => {
            const ref = elementos_fisicos.find((el) => el.id === z.elemento_ref);
            return (
              <div
                key={`zr${i}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-primary px-2.5 py-1.5"
              >
                <span className="inline-block h-2.5 w-2.5 shrink-0 rotate-45 bg-yellow-400" />
                <span className="text-[11px] text-text-muted">
                  X={Math.round(z.pos_x_mm)} Y={Math.round(z.pos_y_mm)}mm
                </span>
                <select
                  value={z.tipo}
                  onChange={(e) => editarZonaTipo(i, e.target.value as TipoZonaSujecion)}
                  className="rounded border border-border bg-bg-primary px-1.5 py-1 text-xs text-text-primary focus:border-accent-blue focus:outline-none"
                >
                  {TIPOS_ZONA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-text-muted">
                  → {ref ? `${ref.tipo}` : z.elemento_ref}
                </span>
                <button
                  onClick={() => borrarZona(i)}
                  className="ml-auto rounded p-1 text-text-muted hover:text-red-400"
                  title="Eliminar zona"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
