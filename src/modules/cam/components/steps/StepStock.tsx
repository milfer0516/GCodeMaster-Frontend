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
  Link2,
  X,
} from "lucide-react";
import { formatMm } from "../../../../utils/format";
import {
  resolveStockFace,
  resolveCylRegion,
  stockFacesByBoxIndex,
  cylRegionsByIndex,
  setFaceAllowance,
  getAllowance,
  setCylOffset,
  getCylOffset,
  totalOnAxis,
  cylTotals,
  cylPartDims,
  cylRegionLabel,
  cylRegionRole,
  cylRegionLocked,
  CYL_REGION_BY_INDEX,
  oppositeDirection,
  axisOfDirection,
  roleLabel,
  type StockAxis,
  type StockFace,
  type StockFaceRole,
  type StockFaceDirection,
  type CylRegionKind,
} from "../../utils/stockFaces";

// Estilo de chip según rol (resumen read-only).
function roleChipClass(role: StockFaceRole): string {
  return role === "mecanizado"
    ? "border-green-500/40 bg-green-500/10 text-green-300"
    : role === "apoyo"
      ? "border-slate-500/40 bg-slate-500/10 text-slate-300"
      : "border-border bg-bg-elevated text-text-secondary";
}

// Etiquetas posicionales (presentación) para las caras del resumen y el popover.
// Los roles apoyo/mecanizado vienen del dominio (roleLabel).
const DIRECTION_LABEL: Record<StockFaceDirection, string> = {
  x_pos: "Derecha (X+)",
  x_neg: "Izquierda (X−)",
  y_pos: "Atrás (Y+)",
  y_neg: "Frente (Y−)",
  z_pos: "Superior (Z+)",
  z_neg: "Inferior (Z−)",
};

// Ejes rectangulares (cada uno con su cara + y −).
const RECT_AXES: { axis: StockAxis; label: string }[] = [
  { axis: "x", label: "Eje X" },
  { axis: "y", label: "Eje Y" },
  { axis: "z", label: "Eje Z" },
];

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

  // Popover contextual: región de stock activa (índice de material del visor) +
  // posición en pantalla (proyectada por el visor) para anclarlo a la región.
  const [popover, setPopover] = useState<{
    faceIndex: number;
    x: number;
    y: number;
  } | null>(null);

  const closePopover = () => setPopover(null);

  // Default de FORMA de stock (una sola vez por Setup): sugerencia según la pieza,
  // pero el operador la cambia libremente (declara la forma del bruto de forma
  // independiente a la pieza). Los offsets ya los deriva el store (todos en 0) al
  // confirmar montaje — aquí NO se inventa ninguna medida.
  const initedSetupId = useRef<string | null>(null);
  useEffect(() => {
    if (!analisis || !setup) return;
    if (initedSetupId.current === setup.id) return;
    initedSetupId.current = setup.id;
    const tipoPieza = analisis.tipo_pieza || "placa";
    const tipoDefault = tipoPieza === "disco" ? "cilindrico" : "rectangular";
    if (stockConfig.tipo !== tipoDefault) {
      setStockConfig({ ...stockConfig, tipo: tipoDefault });
    }
  }, [analisis, setup, stockConfig, setStockConfig]);

  const handleTipoChange = (tipo: "rectangular" | "cilindrico") => {
    closePopover();
    setStockConfig({ ...stockConfig, tipo });
  };

  // ── FORM ↔ POPOVER: una sola fuente de verdad = offsets por región ──────────
  // No hay conversión, ni reparto, ni total editable. El formulario y el popover
  // editan LITERALMENTE el mismo campo, así que desincronizarse es imposible.

  // RECTANGULAR: editar el offset de una cara. Si el eje tiene "uniforme"
  // activado y se edita la cara +, se copia el valor a la cara − (como SolidWorks).
  const setFaceOffset = (direction: StockFaceDirection, value: number) => {
    let faces = setFaceAllowance(stockConfig.stockFaces, direction, value);
    const axis = axisOfDirection(direction);
    if (stockConfig.uniform[axis] && direction.endsWith("_pos")) {
      faces = setFaceAllowance(faces, oppositeDirection(direction), value);
    }
    setStockConfig({ ...stockConfig, stockFaces: faces });
  };

  // CILÍNDRICO: editar el offset de una región (radial / mecanizado; apoyo bloqueado).
  const setCylRegionOffset = (kind: CylRegionKind, value: number) => {
    setStockConfig({
      ...stockConfig,
      cyl: setCylOffset(stockConfig.cyl, kind, value),
    });
  };

  // Toggle "uniforme" por eje: al activarlo, copia el offset + al −.
  const toggleUniform = (axis: StockAxis) => {
    const on = !stockConfig.uniform[axis];
    let faces = stockConfig.stockFaces;
    if (on) {
      const posDir = `${axis}_pos` as StockFaceDirection;
      const negDir = `${axis}_neg` as StockFaceDirection;
      faces = setFaceAllowance(faces, negDir, getAllowance(faces, posDir));
    }
    setStockConfig({
      ...stockConfig,
      uniform: { ...stockConfig.uniform, [axis]: on },
      stockFaces: faces,
    });
  };

  // ¿El eje contiene la cara de apoyo (bloqueada)? Entonces no hay 'uniforme'
  // (no se puede espejar sobre una cara que debe quedar en 0).
  const axisHasLockedFace = (axis: StockAxis): boolean =>
    stockConfig.stockFaces.some(
      (f) => axisOfDirection(f.direction) === axis && f.locked,
    );

  // Una cara está bloqueada si es la de apoyo O es la cara − espejo de 'uniforme'.
  const isFaceLocked = (dir: StockFaceDirection): boolean => {
    const f = stockConfig.stockFaces.find((x) => x.direction === dir);
    if (f?.locked) return true;
    if (stockConfig.uniform[axisOfDirection(dir)] && dir.endsWith("_neg"))
      return true;
    return false;
  };

  // Regiones pickables por índice de material para el visor (6 caras rect / 3 cil).
  const regionsByIndex = useMemo(() => {
    if (!setup) return null;
    if (stockConfig.tipo === "cilindrico")
      return cylRegionsByIndex(stockConfig.cyl);
    return stockConfig.stockFaces.length === 6
      ? stockFacesByBoxIndex(stockConfig.stockFaces)
      : null;
  }, [setup, stockConfig.tipo, stockConfig.stockFaces, stockConfig.cyl]);

  const facePickingEnabled = regionsByIndex !== null;

  const onStockFaceClick = (
    faceIndex: number,
    screen: { x: number; y: number },
  ) => {
    setPopover({ faceIndex, x: screen.x, y: screen.y });
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
  const isRect = stockConfig.tipo === "rectangular";

  // Popover model — resuelto del índice de material reportado por el visor. Edita
  // LITERALMENTE el mismo offset que el formulario; imposible desincronizar.
  const popoverModel = (() => {
    if (!popover) return null;
    if (isRect) {
      const rf = resolveStockFace(popover.faceIndex, setup);
      if (!rf) return null;
      const dir = rf.direction;
      const support = faces.find((f) => f.direction === dir)?.locked ?? false;
      const uniformMirror =
        !support &&
        stockConfig.uniform[axisOfDirection(dir)] &&
        dir.endsWith("_neg");
      return {
        shape: "rect" as const,
        direction: dir,
        label: faceSummaryLabel(rf),
        locked: support || uniformMirror,
        lockReason: support
          ? ("support" as const)
          : uniformMirror
            ? ("uniform" as const)
            : null,
        value: getAllowance(faces, dir),
      };
    }
    const rr = resolveCylRegion(popover.faceIndex);
    if (!rr) return null;
    return {
      shape: "cyl" as const,
      kind: rr.kind,
      label: rr.label,
      locked: rr.locked,
      value: getCylOffset(stockConfig.cyl, rr.kind),
    };
  })();

  // Dimensiones de la pieza (referencia) y stock RESULTANTE (DERIVADO, read-only).
  const partDimsDisplay = isRect
    ? `${formatMm(setup.rotatedBBox.width)} × ${formatMm(setup.rotatedBBox.depth)} × ${formatMm(setup.rotatedBBox.height)} mm`
    : (() => {
        const { partOD, partLen } = cylPartDims(
          setup.rotatedBBox,
          setup.partCylinderOD,
          setup.partCylinderLen,
        );
        return `Ø${formatMm(partOD)} × ${formatMm(partLen)} mm`;
      })();

  const resultanteDisplay = isRect
    ? `${formatMm(totalOnAxis(faces, setup, "x"))} × ${formatMm(
        totalOnAxis(faces, setup, "y"),
      )} × ${formatMm(totalOnAxis(faces, setup, "z"))} mm`
    : (() => {
        const { diameter, length } = cylTotals(
          setup.rotatedBBox,
          stockConfig.cyl,
          setup.partCylinderOD,
          setup.partCylinderLen,
        );
        return `Ø${formatMm(diameter)} × ${formatMm(length)} mm`;
      })();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Material Bruto Disponible
        </h2>
        <p className="mt-1 text-xs md:text-sm text-text-muted">
          Haz clic en cada cara/región del sólido, o usa los campos, para capturar
          el sobre-material que sobresale (medido con calibre). Todo empieza vacío
          — el sistema nunca inventa una medida. El tamaño resultante se calcula
          solo.
        </p>
      </div>

      {/* Layout responsive: columna en móvil, 2 columnas en desktop */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Visor 3D + popover contextual + resumen por-región */}
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
              stockFacesByBoxIndex={regionsByIndex}
              activeStockFaceIndex={
                facePickingEnabled ? (popover?.faceIndex ?? null) : null
              }
              onStockFaceClick={facePickingEnabled ? onStockFaceClick : undefined}
            />

            {/* Popover contextual anclado a la región pinchada */}
            {facePickingEnabled && popover && popoverModel && (
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
                      {popoverModel.label}
                    </span>
                    <button
                      onClick={closePopover}
                      className="text-text-muted hover:text-text-primary"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {popoverModel.locked ? (
                    <div className="flex items-center gap-2 rounded-lg bg-bg-base/60 px-2 py-2 text-xs text-text-muted">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {popoverModel.shape === "rect" &&
                        popoverModel.lockReason === "uniform"
                          ? "Espejo del lado + (uniforme activado): edita el lado +."
                          : "Cara de apoyo: bloqueada en 0 mm (no hay material contra la sujeción)."}
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-text-muted mb-2">
                        Sobre-material que sobresale en esta región (medido con
                        calibre).
                      </p>
                      <InputField
                        label="Sobre-material"
                        value={popoverModel.value}
                        onChange={(v) =>
                          popoverModel.shape === "rect"
                            ? setFaceOffset(popoverModel.direction, v)
                            : setCylRegionOffset(popoverModel.kind, v)
                        }
                        unit="mm"
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Resumen READ-ONLY: offset por región */}
          <div className="flex flex-wrap gap-1.5">
            {isRect
              ? faces.map((f) => (
                  <span
                    key={f.direction}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${roleChipClass(
                      f.role,
                    )}`}
                  >
                    {f.locked && <Lock className="h-3 w-3" />}
                    {faceSummaryLabel(f)} {formatMm(f.allowance)}mm
                    {f.locked && " · bloqueado"}
                  </span>
                ))
              : CYL_REGION_BY_INDEX.map((kind) => (
                  <span
                    key={kind}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${roleChipClass(
                      cylRegionRole(kind),
                    )}`}
                  >
                    {cylRegionLocked(kind) && <Lock className="h-3 w-3" />}
                    {cylRegionLabel(kind)}{" "}
                    {formatMm(getCylOffset(stockConfig.cyl, kind))}mm
                    {cylRegionLocked(kind) && " · bloqueado"}
                  </span>
                ))}
          </div>
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
              {partDimsDisplay}
            </p>
          </div>

          {/* Offsets por región (sobre-material medido por cara/región) */}
          {isRect ? (
            <div className="space-y-3">
              {RECT_AXES.map(({ axis, label }) => {
                const posDir = `${axis}_pos` as StockFaceDirection;
                const negDir = `${axis}_neg` as StockFaceDirection;
                const hasSupport = axisHasLockedFace(axis);
                const uniformOn = stockConfig.uniform[axis];
                return (
                  <div
                    key={axis}
                    className="rounded-xl border border-border bg-bg-elevated/40 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        {label}
                      </span>
                      {!hasSupport && (
                        <button
                          type="button"
                          onClick={() => toggleUniform(axis)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition ${
                            uniformOn
                              ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                              : "border-border text-text-muted hover:border-accent-blue/50"
                          }`}
                        >
                          <Link2 className="h-3 w-3" /> Uniforme
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <InputField
                        label={DIRECTION_LABEL[posDir]}
                        value={getAllowance(faces, posDir)}
                        onChange={(v) => setFaceOffset(posDir, v)}
                        unit="mm"
                        disabled={isFaceLocked(posDir)}
                      />
                      <InputField
                        label={DIRECTION_LABEL[negDir]}
                        value={getAllowance(faces, negDir)}
                        onChange={(v) => setFaceOffset(negDir, v)}
                        unit="mm"
                        disabled={isFaceLocked(negDir)}
                      />
                    </div>
                    {hasSupport && (
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-text-muted">
                        <Lock className="h-3 w-3" /> La cara de apoyo queda
                        bloqueada en 0 (contra la sujeción).
                      </p>
                    )}
                    {uniformOn && !hasSupport && (
                      <p className="mt-1.5 text-[10px] text-text-muted">
                        El lado − refleja el lado +.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <InputField
                label="Radial (Ø · por lado)"
                value={getCylOffset(stockConfig.cyl, "radial")}
                onChange={(v) => setCylRegionOffset("radial", v)}
                unit="mm"
              />
              <InputField
                label="Cara de mecanizado (axial)"
                value={getCylOffset(stockConfig.cyl, "axial_machining")}
                onChange={(v) => setCylRegionOffset("axial_machining", v)}
                unit="mm"
              />
              <InputField
                label="Cara de apoyo (axial)"
                value={0}
                onChange={() => {}}
                unit="mm"
                disabled
              />
              <p className="flex items-center gap-1 text-[10px] text-text-muted">
                <Lock className="h-3 w-3" /> La cara de apoyo queda bloqueada en 0
                (contra la sujeción).
              </p>
            </div>
          )}

          {/* Material bruto RESULTANTE — derivado (resultado, no un dato editable) */}
          <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/10 p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-accent-blue" />
              <div>
                <p className="text-xs md:text-sm font-medium text-text-primary">
                  Material bruto resultante:
                </p>
                <p className="text-sm md:text-base font-bold text-accent-blue">
                  {resultanteDisplay}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Calculado desde la pieza + offsets. Es un resultado, no un campo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación — sin offsets es válido (p.ej. una brida a solo taladrar): el
          stock coincide con la pieza. El motor valida raw ≥ pieza y devuelve su
          error en español; aquí nunca se envía un stock físicamente imposible
          porque los offsets no pueden ser negativos. */}
      <WizardNavButtons
        prevStep="material"
        nextStep="operaciones"
        canAdvance={true}
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
  const [text, setText] = useState(value === 0 ? "" : formatMm(value));

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
      setText(formatMm(value));
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
