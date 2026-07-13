// src/modules/cam/components/steps/StepStock.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { WizardNavButtons } from "./WizardNavButtons";
import {
  Package,
  Box,
  Cylinder,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Lock,
  X,
} from "lucide-react";
import type { StockConfig } from "../../store/camStore";
import {
  deriveStockFaces,
  resolveStockFace,
  stockFacesByBoxIndex,
  setFaceAllowance,
  setAxisTotal,
  totalOnAxis,
  axisOfDirection,
  roleLabel,
  type StockAxis,
  type StockFace,
  type StockFaceDirection,
} from "../../utils/stockFaces";

// Form field (per-axis raw TOTAL) ↔ machine axis. The total is DERIVED from the
// per-face excess; these fields are the operator-facing view of that total.
const AXIS_FIELD: Record<StockAxis, "ancho_bruto_mm" | "largo_bruto_mm" | "alto_bruto_mm"> = {
  x: "ancho_bruto_mm",
  y: "largo_bruto_mm",
  z: "alto_bruto_mm",
};

// Etiquetas posicionales (presentación) para las caras 'libre' del resumen y el
// popover. Los roles apoyo/mecanizado vienen del dominio (roleLabel).
const DIRECTION_LABEL: Record<StockFaceDirection, string> = {
  x_pos: "Derecha (X+)",
  x_neg: "Izquierda (X−)",
  y_pos: "Atrás (Y+)",
  y_neg: "Frente (Y−)",
  z_pos: "Superior (Z+)",
  z_neg: "Inferior (Z−)",
};

function faceSummaryLabel(f: StockFace): string {
  return f.role === "libre" ? DIRECTION_LABEL[f.direction] : roleLabel(f.role);
}

export const StepStock = () => {
  const analisis = useCamStore((s) => s.analisis);
  const meshData = useCamStore((s) => s.meshData);
  const stockConfig = useCamStore((s) => s.stockConfig);
  const setStockConfig = useCamStore((s) => s.setStockConfig);
  const setStep = useCamStore((s) => s.setStep);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  // Setup persistente = ÚNICA fuente de la orientación de montaje (frame máquina).
  const setup = useCamStore((s) => s.setup);

  // Popover contextual: cara de stock activa (índice de BoxGeometry) + posición
  // en pantalla (proyectada por el visor) para anclarlo a la cara.
  const [popover, setPopover] = useState<{
    faceIndex: number;
    x: number;
    y: number;
  } | null>(null);

  const closePopover = () => setPopover(null);

  // Inicializar StockFaces una vez por Setup (id). NO auto-fill raw dimensions —
  // the operator enters what they physically measured with a caliper. The system
  // NEVER GUESSES raw stock.
  const initedSetupId = useRef<string | null>(null);
  useEffect(() => {
    if (!analisis || !setup) return;
    if (initedSetupId.current === setup.id) return;
    initedSetupId.current = setup.id;

    const tipoPieza = analisis.tipo_pieza || "placa";
    const tipoStock = tipoPieza === "disco" ? "cilindrico" : "rectangular";

    const stockFaces =
      stockConfig.stockFaces.length === 6
        ? stockConfig.stockFaces
        : deriveStockFaces(setup);

    // Only set tipo and stockFaces. DO NOT auto-fill raw dimensions.
    const newConfig: StockConfig = {
      ...stockConfig,
      tipo: tipoStock,
      stockFaces,
    };
    setStockConfig(newConfig);
  }, [analisis, setup, stockConfig, setStockConfig]);

  const handleTipoChange = (tipo: "rectangular" | "cilindrico") => {
    closePopover();
    setStockConfig({ ...stockConfig, tipo });
  };

  const handleInputChange = (field: keyof StockConfig, value: number) => {
    setStockConfig({ ...stockConfig, [field]: value });
  };

  // FORM → FACES. Typing a per-axis TOTAL in the form immediately converts it to
  // per-face excess (the single source of truth) AND stores the typed total on
  // the matching form field. The wireframe updates because it reads the faces;
  // the popover updates because it reads the same faces. One value, two views.
  const handleAxisTotalChange = (axis: StockAxis, total: number) => {
    if (!setup) return;
    setStockConfig({
      ...stockConfig,
      stockFaces: setAxisTotal(stockConfig.stockFaces, setup, axis, total),
      [AXIS_FIELD[axis]]: total,
    });
  };

  // Editar el material bruto que sobresale en una cara específica (dato REAL
  // medido por el operador con calibre, NO un cálculo). El raw stock casi nunca
  // está centrado: un bloque de 120mm para una pieza de 104mm tiene 16mm extra,
  // pero raramente 8mm en cada lado. El operador sabe la distribución real porque
  // la midió. Capturarla por cara es DATO REAL — asumir que está centrado sería
  // adivinar, lo cual este sistema nunca hace.
  const updateRawStockOnFace = (direction: StockFaceDirection, value: number) => {
    if (!setup) return;
    // FACES → FORM. Editing one face in the popover changes that face's excess
    // (source of truth). Recompute the axis TOTAL (part + this face + the
    // opposite face) and write it to the matching form field so the form always
    // shows the correct total. Only the touched axis is updated — the other axes
    // stay as measured (empty until the operator captures them).
    const stockFaces = setFaceAllowance(stockConfig.stockFaces, direction, value);
    const axis = axisOfDirection(direction);
    setStockConfig({
      ...stockConfig,
      stockFaces,
      [AXIS_FIELD[axis]]: totalOnAxis(stockFaces, setup, axis),
    });
  };

  // Face-picking habilitado para rectangular (el operador apunta a la cara física)
  const facePickingEnabled = stockConfig.tipo === "rectangular";

  // 6 StockFaces en orden de índice de BoxGeometry para el visor (memo estable).
  const boxIndexFaces = useMemo(
    () =>
      setup && stockConfig.stockFaces.length === 6
        ? stockFacesByBoxIndex(stockConfig.stockFaces)
        : null,
    [setup, stockConfig.stockFaces],
  );

  const onStockFaceClick = (
    faceIndex: number,
    screen: { x: number; y: number },
  ) => {
    // Abrir popover anclado a la cara. El dominio decide si es editable (rol).
    setPopover({ faceIndex, x: screen.x, y: screen.y });
  };

  // Raw stock dimensions (what the operator entered)
  const getRawStockDims = (): { x: number; y: number; z: number } | { d: number; len: number } | null => {
    if (!setup) return null;
    if (stockConfig.tipo === "rectangular") {
      return {
        x: stockConfig.ancho_bruto_mm,
        y: stockConfig.largo_bruto_mm,
        z: stockConfig.alto_bruto_mm,
      };
    }
    return {
      d: stockConfig.diametro_bruto_mm,
      len: stockConfig.longitud_bruta_mm,
    };
  };

  // Final part dimensions (for comparison display)
  const getFinalPartDims = (): { x: number; y: number; z: number } | { d: number; len: number } | null => {
    if (!setup) return null;
    const { width, depth, height } = setup.rotatedBBox;
    if (stockConfig.tipo === "rectangular") {
      return { x: width, y: depth, z: height };
    }
    const piezaDiamRadial = Math.max(width, depth);
    return { d: piezaDiamRadial, len: height };
  };

  const getStockDimensionsDisplay = (): string => {
    const raw = getRawStockDims();
    if (!raw) return "";
    if (stockConfig.tipo === "rectangular" && 'x' in raw) {
      return `${raw.x} × ${raw.y} × ${raw.z} mm`;
    }
    if ('d' in raw) {
      return `Ø${raw.d} × ${raw.len} mm`;
    }
    return "";
  };

  const getPartDimensionsDisplay = (): string => {
    const part = getFinalPartDims();
    if (!part) return "";
    if (stockConfig.tipo === "rectangular" && 'x' in part) {
      return `${part.x} × ${part.y} × ${part.z} mm`;
    }
    if ('d' in part) {
      return `Ø${part.d} × ${part.len} mm`;
    }
    return "";
  };

  // Validation: operator must enter raw dimensions before advancing. Do NOT
  // validate feasibility (raw >= part) — the engine does that and returns a
  // Spanish error. Only block if EMPTY (not entered at all).
  const hasRawDimensions = (): boolean => {
    if (stockConfig.tipo === "rectangular") {
      return stockConfig.ancho_bruto_mm > 0 &&
             stockConfig.largo_bruto_mm > 0 &&
             stockConfig.alto_bruto_mm > 0;
    } else {
      return stockConfig.diametro_bruto_mm > 0 &&
             stockConfig.longitud_bruta_mm > 0;
    }
  };

  if (!analisis || !meshData) {
    return (
      <div className="text-center py-8 text-text-muted">
        Cargando análisis de pieza...
      </div>
    );
  }

  // Sin Setup confirmado no hay orientación de montaje (panel Phase 2A-1).
  if (!setup) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 md:p-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm md:text-base font-semibold text-amber-300">
              Falta confirmar el montaje
            </p>
            <p className="mt-1 text-xs md:text-sm text-amber-200/80">
              El stock se calcula a partir de la orientación de montaje
              (cara de apoyo). Vuelve al paso de Montaje y confírmalo antes de
              configurar el material bruto.
            </p>
            <button
              onClick={() => setStep("montaje")}
              className="mt-3 rounded-xl border border-amber-500/60 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/30 transition"
            >
              ← Volver a Montaje
            </button>
          </div>
        </div>
      </div>
    );
  }

  const faces = stockConfig.stockFaces;

  // Cara resuelta para el popover (dirección/rol/bloqueo) — mapeo PURO del
  // dominio a partir del índice reportado por el visor.
  const activeResolved =
    popover !== null ? resolveStockFace(popover.faceIndex, setup) : null;
  const activeRawStock =
    activeResolved !== null
      ? (faces.find((f) => f.direction === activeResolved.direction)
          ?.allowance ?? 0)
      : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Material Bruto Disponible
        </h2>
        <p className="mt-1 text-xs md:text-sm text-text-muted">
          {facePickingEnabled
            ? "Ingresa las dimensiones generales del bloque y haz clic en cada cara para capturar el material bruto que sobresale (medido con calibre)"
            : "Ingresa las dimensiones del material bruto que tienes (medidas con calibre)"}
        </p>
      </div>

      {/* Layout responsive: columna en móvil, 2 columnas en desktop */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Visor 3D + popover contextual + resumen por-cara */}
        <div className="flex-1 space-y-3">
          <div className="relative h-[400px] lg:h-[600px]">
            <CamViewer3D
              dimensiones={{
                x: meshData.bounding_box.max[0] - meshData.bounding_box.min[0],
                y: meshData.bounding_box.max[1] - meshData.bounding_box.min[1],
                z: meshData.bounding_box.max[2] - meshData.bounding_box.min[2],
              }}
              stockConfig={stockConfig}
              faceIdDestacada={montajeConfig.face_id_apoyo}
              sujecionConfig={montajeConfig.sujecion_config}
              stockFacesByBoxIndex={boxIndexFaces}
              activeStockFaceIndex={
                facePickingEnabled ? (popover?.faceIndex ?? null) : null
              }
              onStockFaceClick={facePickingEnabled ? onStockFaceClick : undefined}
            />

            {/* Popover contextual anclado a la cara pinchada */}
            {facePickingEnabled && popover && activeResolved && (
              <div
                className="absolute z-20 w-64"
                style={{
                  left: popover.x,
                  top: popover.y,
                  transform: "translate(-50%, 12px)",
                }}
              >
                <div className="rounded-xl border border-border bg-bg-elevated p-3 shadow-2xl">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text-primary">
                      {faceSummaryLabel(activeResolved)}
                    </span>
                    <button
                      onClick={closePopover}
                      className="text-text-muted hover:text-text-primary"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {activeResolved.locked ? (
                    <div className="flex items-center gap-2 rounded-lg bg-bg-base/60 px-2 py-2 text-xs text-text-muted">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Cara de apoyo: bloqueada en 0 mm (no hay material bruto
                        contra la sujeción).
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-text-muted mb-2">
                        Cuánto material bruto sobresale en esta cara (medido con
                        calibre). El bloque casi nunca está centrado: captura la
                        distribución real.
                      </p>
                      <InputField
                        label="Material bruto en esta cara"
                        value={activeRawStock}
                        onChange={(v) =>
                          updateRawStockOnFace(activeResolved.direction, v)
                        }
                        unit="mm"
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Resumen READ-ONLY: rol + raw stock por cara */}
          {facePickingEnabled && faces.length === 6 && (
            <div className="flex flex-wrap gap-1.5">
              {faces.map((f) => (
                <span
                  key={f.direction}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
                    f.role === "mecanizado"
                      ? "border-green-500/40 bg-green-500/10 text-green-300"
                      : f.role === "apoyo"
                        ? "border-slate-500/40 bg-slate-500/10 text-slate-300"
                        : "border-border bg-bg-elevated text-text-secondary"
                  }`}
                >
                  {f.locked && <Lock className="h-3 w-3" />}
                  {faceSummaryLabel(f)} {f.allowance}mm
                  {f.locked && " · bloqueado"}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="flex-1 space-y-4 md:space-y-5">
          {/* Tipo de stock (forma del material que tiene el operador) */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-text-secondary mb-2">
              Forma del Material Bruto
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTipoChange("rectangular")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 md:p-4 min-h-[44px] transition ${
                  stockConfig.tipo === "rectangular"
                    ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                    : "border-border bg-bg-elevated text-text-muted hover:border-accent-blue/50"
                }`}
              >
                <Box className="h-4 w-4" />
                <span className="text-sm font-medium">Rectangular</span>
              </button>
              <button
                onClick={() => handleTipoChange("cilindrico")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 md:p-4 min-h-[44px] transition ${
                  stockConfig.tipo === "cilindrico"
                    ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                    : "border-border bg-bg-elevated text-text-muted hover:border-accent-blue/50"
                }`}
              >
                <Cylinder className="h-4 w-4" />
                <span className="text-sm font-medium">Cilíndrico</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] md:text-xs text-text-muted">
              Selecciona la forma del material que tienes en el almacén (independiente de la forma de la pieza final)
            </p>
          </div>

          {/* Dimensiones de la pieza final (referencia) */}
          <div className="rounded-xl border border-border bg-bg-elevated/50 p-3 md:p-4">
            <p className="text-xs font-medium text-text-secondary mb-1">
              Dimensiones de la pieza final:
            </p>
            <p className="text-sm font-mono text-text-primary">
              {getPartDimensionsDisplay()}
            </p>
          </div>

          {/* Inputs de dimensiones RAW medidas */}
          <div className="space-y-3">
            {stockConfig.tipo === "rectangular" ? (
              <>
                <InputField
                  label="Ancho bruto (X)"
                  value={stockConfig.ancho_bruto_mm}
                  onChange={(v) => handleAxisTotalChange("x", v)}
                  unit="mm"
                />
                <InputField
                  label="Largo bruto (Y)"
                  value={stockConfig.largo_bruto_mm}
                  onChange={(v) => handleAxisTotalChange("y", v)}
                  unit="mm"
                />
                <InputField
                  label="Alto bruto (Z)"
                  value={stockConfig.alto_bruto_mm}
                  onChange={(v) => handleAxisTotalChange("z", v)}
                  unit="mm"
                />
              </>
            ) : (
              <>
                <InputField
                  label="Diámetro bruto"
                  value={stockConfig.diametro_bruto_mm}
                  onChange={(v) => handleInputChange("diametro_bruto_mm", v)}
                  unit="mm"
                />
                <InputField
                  label="Longitud bruta"
                  value={stockConfig.longitud_bruta_mm}
                  onChange={(v) => handleInputChange("longitud_bruta_mm", v)}
                  unit="mm"
                />
              </>
            )}
          </div>

          {/* Resumen del material bruto ingresado */}
          <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/10 p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-accent-blue" />
              <div>
                <p className="text-xs md:text-sm font-medium text-text-primary">
                  Material bruto ingresado:
                </p>
                <p className="text-sm md:text-base font-bold text-accent-blue">
                  {getStockDimensionsDisplay()}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Navegación */}
      <WizardNavButtons
        prevStep="material"
        nextStep="operaciones"
        canAdvance={hasRawDimensions()}
      />
    </div>
  );
};

// Componente helper para inputs
interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  help?: string;
  disabled?: boolean;
}

// Paso del spinner (flechas ↑/↓). Solo aplica a los botones: escribir a mano
// acepta cualquier decimal (72.3, 108.24), no se restringe a múltiplos de 0.5.
const STEP = 0.5;

function InputField({
  label,
  value,
  onChange,
  unit,
  help,
  disabled = false,
}: InputFieldProps) {
  // Estado de texto local: permite estados intermedios al teclear ("72.",
  // "108.2") sin que el value numérico controlado los recorte. El input es
  // type="text" + inputMode="decimal" para que NO haya validación de step
  // nativa que bloquee decimales arbitrarios.
  // EMPTY STATE: cuando value es 0 (no entrado), mostramos string vacío.
  const [text, setText] = useState(value === 0 ? "" : String(value));

  // Re-sincronizar el texto cuando el value externo cambia (init, flechas)
  // y difiere numéricamente de lo que hay escrito.
  useEffect(() => {
    const parsed = parseFloat(text);
    // Si value es 0 y text no está vacío, limpiar a vacío (estado inicial)
    if (value === 0 && text !== "") {
      setText("");
      return;
    }
    if (parsed !== value && !(Number.isNaN(parsed) && value === 0)) {
      setText(String(value));
    }
    // Solo depende de value: no queremos re-sincronizar en cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleText = (raw: string) => {
    setText(raw);
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) onChange(n);
    else if (raw.trim() === "") onChange(0);
    // Estados intermedios como "72." o "-" no emiten onChange hasta ser válidos.
  };

  const bump = (delta: number) => {
    if (disabled) return;
    const base = Number.isNaN(parseFloat(text)) ? 0 : parseFloat(text);
    // Redondeo a 2 decimales para evitar 79.49999… al sumar/restar 0.5.
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    setText(String(next));
    onChange(next);
  };

  return (
    <div>
      <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => handleText(e.target.value)}
          placeholder="Medir con calibre"
          disabled={disabled}
          className={`w-full rounded-xl border border-border bg-bg-elevated px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] pr-16 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20 ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />
        <span className="absolute right-9 top-1/2 -translate-y-1/2 text-xs text-text-muted">
          {unit}
        </span>
        {/* Spinner ±0.5 — solo mueve por 0.5; teclear acepta cualquier decimal */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Aumentar ${label} 0.5`}
            onClick={() => bump(STEP)}
            disabled={disabled}
            className={`flex h-5 w-6 items-center justify-center rounded text-text-muted hover:text-accent-blue ${
              disabled ? "opacity-30 cursor-not-allowed" : ""
            }`}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Disminuir ${label} 0.5`}
            onClick={() => bump(-STEP)}
            disabled={disabled}
            className={`flex h-5 w-6 items-center justify-center rounded text-text-muted hover:text-accent-blue ${
              disabled ? "opacity-30 cursor-not-allowed" : ""
            }`}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {help && (
        <p className="mt-1 text-[10px] md:text-xs text-text-muted">{help}</p>
      )}
    </div>
  );
}
