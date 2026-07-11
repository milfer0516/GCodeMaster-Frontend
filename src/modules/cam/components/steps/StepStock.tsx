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
  finalRectDims,
  validateStockFaces,
  roleLabel,
  type StockFace,
  type StockFaceDirection,
} from "../../utils/stockFaces";

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

  // Inicializar defaults una vez por Setup (id). Preserva las StockFaces que el
  // store ya derivó en confirmMontaje; si faltan, las deriva aquí.
  const initedSetupId = useRef<string | null>(null);
  useEffect(() => {
    if (!analisis || !setup) return;
    if (initedSetupId.current === setup.id) return;
    initedSetupId.current = setup.id;

    const tipoPieza = analisis.tipo_pieza || "placa";
    const { width, depth, height } = setup.rotatedBBox;
    const tipoStock = tipoPieza === "disco" ? "cilindrico" : "rectangular";
    const sobreRadial = 2;
    const sobreAxial = 3;

    const stockFaces =
      stockConfig.stockFaces.length === 6
        ? stockConfig.stockFaces
        : deriveStockFaces(setup);

    const newConfig: StockConfig = {
      ...stockConfig,
      tipo: tipoStock,
      modo: "sobrematerial",
      ancho_mm: Math.round(width),
      largo_mm: Math.round(depth),
      alto_mm: Math.round(height),
      diametro_mm: Math.round(Math.max(width, depth) + 2 * sobreRadial),
      longitud_mm: Math.round(height + 2 * sobreAxial),
      stockFaces,
      sobre_radial_mm: sobreRadial,
      sobre_axial_mm: sobreAxial,
    };
    setStockConfig(newConfig);
  }, [analisis, setup, stockConfig, setStockConfig]);

  const handleTipoChange = (tipo: "rectangular" | "cilindrico") => {
    closePopover();
    setStockConfig({ ...stockConfig, tipo });
  };

  const handleModoChange = (modo: "dimensiones" | "sobrematerial") => {
    closePopover();
    setStockConfig({ ...stockConfig, modo });
  };

  const handleInputChange = (field: keyof StockConfig, value: number) => {
    setStockConfig({ ...stockConfig, [field]: value });
  };

  // Editar el allowance de una cara (dominio: bloqueadas quedan en 0, clamp >=0).
  const updateAllowance = (direction: StockFaceDirection, value: number) => {
    setStockConfig({
      ...stockConfig,
      stockFaces: setFaceAllowance(stockConfig.stockFaces, direction, value),
    });
  };

  // ¿Modo edición por-cara sobre el visor? (rectangular + sobre-material)
  const editingPorCara =
    stockConfig.tipo === "rectangular" && stockConfig.modo === "sobrematerial";

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

  // Dimensiones finales rectangulares (dominio para sobre-material).
  const getRectStockDims = (): { x: number; y: number; z: number } | null => {
    if (!setup) return null;
    if (stockConfig.modo === "dimensiones") {
      return {
        x: stockConfig.ancho_mm,
        y: stockConfig.largo_mm,
        z: stockConfig.alto_mm,
      };
    }
    return finalRectDims(setup, stockConfig.stockFaces);
  };

  const getCylStockDims = (): { d: number; len: number } | null => {
    if (!setup) return null;
    const { width, depth, height } = setup.rotatedBBox;
    if (stockConfig.modo === "dimensiones") {
      return { d: stockConfig.diametro_mm, len: stockConfig.longitud_mm };
    }
    const piezaDiamRadial = Math.max(width, depth);
    return {
      d: piezaDiamRadial + 2 * stockConfig.sobre_radial_mm,
      len: height + 2 * stockConfig.sobre_axial_mm,
    };
  };

  // Validación (decimal-aware). Sobre-material rectangular delega en el dominio.
  const validateStockDimensions = (): { valid: boolean; warnings: string[] } => {
    if (!setup) return { valid: true, warnings: [] };
    const { width, depth, height } = setup.rotatedBBox;
    const warnings: string[] = [];

    if (stockConfig.tipo === "rectangular") {
      if (stockConfig.modo === "dimensiones") {
        const d = getRectStockDims();
        if (!d) return { valid: true, warnings: [] };
        if (d.x < width)
          warnings.push(
            `Ancho (${Math.round(d.x)}mm) es menor que la pieza (${Math.round(width)}mm)`,
          );
        if (d.y < depth)
          warnings.push(
            `Largo (${Math.round(d.y)}mm) es menor que la pieza (${Math.round(depth)}mm)`,
          );
        if (d.z < height)
          warnings.push(
            `Alto (${Math.round(d.z)}mm) es menor que la pieza (${Math.round(height)}mm)`,
          );
      } else {
        // Sobre-material >= 0 ⇒ stock >= pieza siempre; solo integridad de datos.
        return validateStockFaces(stockConfig.stockFaces);
      }
    } else {
      const d = getCylStockDims();
      if (!d) return { valid: true, warnings: [] };
      const piezaDiamRadial = Math.max(width, depth);
      if (d.d < piezaDiamRadial)
        warnings.push(
          `Diámetro (${Math.round(d.d)}mm) es menor que la pieza (${Math.round(piezaDiamRadial)}mm)`,
        );
      if (d.len < height)
        warnings.push(
          `Longitud (${Math.round(d.len)}mm) es menor que la pieza (${Math.round(height)}mm)`,
        );
    }

    return { valid: warnings.length === 0, warnings };
  };

  const getStockDimensions = (): string => {
    if (!setup) return "";
    if (stockConfig.tipo === "rectangular") {
      const d = getRectStockDims();
      if (!d) return "";
      return `${Math.round(d.x)} × ${Math.round(d.y)} × ${Math.round(d.z)} mm`;
    }
    const d = getCylStockDims();
    if (!d) return "";
    return `Ø${Math.round(d.d)} × ${Math.round(d.len)} mm`;
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

  const validation = validateStockDimensions();
  const faces = stockConfig.stockFaces;

  // Cara resuelta para el popover (dirección/rol/bloqueo) — mapeo PURO del
  // dominio a partir del índice reportado por el visor.
  const activeResolved =
    popover !== null ? resolveStockFace(popover.faceIndex, setup) : null;
  const activeAllowance =
    activeResolved !== null
      ? (faces.find((f) => f.direction === activeResolved.direction)
          ?.allowance ?? 0)
      : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Configurar Stock (Material Bruto)
        </h2>
        <p className="mt-1 text-xs md:text-sm text-text-muted">
          {editingPorCara
            ? "Haz clic en una cara del stock para editar su sobre-material"
            : "Define las dimensiones del material bruto antes de mecanizar"}
        </p>
      </div>

      {/* Layout responsive: columna en móvil, 2 columnas en desktop */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Visor 3D + popover contextual + resumen por-cara */}
        <div className="flex-1 space-y-3">
          <div className="relative min-h-[300px] lg:min-h-[500px]">
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
                editingPorCara ? (popover?.faceIndex ?? null) : null
              }
              onStockFaceClick={editingPorCara ? onStockFaceClick : undefined}
            />

            {/* Popover contextual anclado a la cara pinchada */}
            {editingPorCara && popover && activeResolved && (
              <div
                className="absolute z-20 w-52"
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
                        Cara de apoyo: bloqueada en 0 mm (no se añade material
                        contra la sujeción).
                      </span>
                    </div>
                  ) : (
                    <InputField
                      label="Sobre-material"
                      value={activeAllowance}
                      onChange={(v) =>
                        updateAllowance(activeResolved.direction, v)
                      }
                      unit="mm"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Resumen READ-ONLY: rol + allowance por cara */}
          {editingPorCara && faces.length === 6 && (
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
          {/* Tipo de stock */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-text-secondary mb-2">
              Tipo de Stock
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
          </div>

          {/* Modo de entrada */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-text-secondary mb-2">
              Método de Entrada
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModoChange("dimensiones")}
                className={`rounded-xl border-2 p-2 md:p-3 min-h-[44px] text-xs md:text-sm font-medium transition ${
                  stockConfig.modo === "dimensiones"
                    ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                    : "border-border bg-bg-elevated text-text-muted hover:border-accent-blue/50"
                }`}
              >
                Dimensiones exactas
              </button>
              <button
                onClick={() => handleModoChange("sobrematerial")}
                className={`rounded-xl border-2 p-2 md:p-3 min-h-[44px] text-xs md:text-sm font-medium transition ${
                  stockConfig.modo === "sobrematerial"
                    ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                    : "border-border bg-bg-elevated text-text-muted hover:border-accent-blue/50"
                }`}
              >
                Por sobre-material
              </button>
            </div>
          </div>

          {/* Inputs según tipo y modo */}
          <div className="space-y-3">
            {stockConfig.tipo === "rectangular" ? (
              <>
                {stockConfig.modo === "dimensiones" ? (
                  <>
                    <InputField
                      label="Ancho (X)"
                      value={stockConfig.ancho_mm}
                      onChange={(v) => handleInputChange("ancho_mm", v)}
                      unit="mm"
                    />
                    <InputField
                      label="Largo (Y)"
                      value={stockConfig.largo_mm}
                      onChange={(v) => handleInputChange("largo_mm", v)}
                      unit="mm"
                    />
                    <InputField
                      label="Alto (Z)"
                      value={stockConfig.alto_mm}
                      onChange={(v) => handleInputChange("alto_mm", v)}
                      unit="mm"
                    />
                  </>
                ) : (
                  <div className="rounded-xl border border-border bg-bg-elevated/50 p-3 text-xs text-text-muted">
                    Edita el sobre-material haciendo <b>clic en cada cara</b> del
                    stock en el visor. La cara{" "}
                    <span className="text-green-300">de mecanizado</span> es el
                    objetivo primario; la cara{" "}
                    <span className="text-slate-300">de apoyo</span> está
                    bloqueada en 0.
                  </div>
                )}
              </>
            ) : (
              <>
                {stockConfig.modo === "dimensiones" ? (
                  <>
                    <InputField
                      label="Diámetro"
                      value={stockConfig.diametro_mm}
                      onChange={(v) => handleInputChange("diametro_mm", v)}
                      unit="mm"
                    />
                    <InputField
                      label="Longitud"
                      value={stockConfig.longitud_mm}
                      onChange={(v) => handleInputChange("longitud_mm", v)}
                      unit="mm"
                    />
                  </>
                ) : (
                  <>
                    <InputField
                      label="Sobre-material radial"
                      value={stockConfig.sobre_radial_mm}
                      onChange={(v) => handleInputChange("sobre_radial_mm", v)}
                      unit="mm"
                      help="Material extra en el radio (uniforme en el OD)"
                    />
                    <InputField
                      label="Sobre-material axial"
                      value={stockConfig.sobre_axial_mm}
                      onChange={(v) => handleInputChange("sobre_axial_mm", v)}
                      unit="mm"
                      help="Material extra en la dirección de la cara de mecanizado"
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* Resumen del stock */}
          <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/10 p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-accent-blue" />
              <div>
                <p className="text-xs md:text-sm font-medium text-text-primary">
                  Stock calculado:
                </p>
                <p className="text-sm md:text-base font-bold text-accent-blue">
                  {getStockDimensions()}
                </p>
              </div>
            </div>
          </div>

          {/* Validación: advertir si el stock es menor que la pieza */}
          {!validation.valid && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 md:p-4">
              <p className="text-xs md:text-sm font-semibold text-red-400 mb-1">
                ⚠️ Stock insuficiente
              </p>
              <ul className="text-xs text-red-300 space-y-0.5">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
              <p className="text-[10px] md:text-xs text-red-300/80 mt-2">
                El stock debe ser mayor o igual que las dimensiones de la pieza
                en su orientación de montaje (después de la rotación).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navegación */}
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
  const [text, setText] = useState(String(value));

  // Re-sincronizar el texto cuando el value externo cambia (init, flechas)
  // y difiere numéricamente de lo que hay escrito.
  useEffect(() => {
    const parsed = parseFloat(text);
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
          disabled={disabled}
          className={`w-full rounded-xl border border-border bg-bg-elevated px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] pr-16 text-sm text-text-primary focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20 ${
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
