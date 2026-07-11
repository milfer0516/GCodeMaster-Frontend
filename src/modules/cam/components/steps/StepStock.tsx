// src/modules/cam/components/steps/StepStock.tsx
import { useEffect, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { WizardNavButtons } from "./WizardNavButtons";
import { Package, Box, Cylinder, AlertTriangle } from "lucide-react";
import type { StockConfig } from "../../store/camStore";

export const StepStock = () => {
  const analisis = useCamStore((s) => s.analisis);
  const meshData = useCamStore((s) => s.meshData);
  const stockConfig = useCamStore((s) => s.stockConfig);
  const setStockConfig = useCamStore((s) => s.setStockConfig);
  const setStep = useCamStore((s) => s.setStep);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  // Setup persistente = ÚNICA fuente de la orientación de montaje (frame máquina).
  // StepStock ya NO recalcula el bounding box rotado: lo lee de aquí.
  const setup = useCamStore((s) => s.setup);

  const [initialized, setInitialized] = useState(false);

  // Inicializar stock por defecto a partir de las dimensiones POST-ROTACIÓN que
  // vienen del Setup (setup.rotatedBBox), NO recalculando desde la geometría.
  useEffect(() => {
    if (initialized || !analisis || !setup) return;

    const tipoPieza = analisis.tipo_pieza || "placa";

    // Dimensiones POST-ROTACIÓN leídas directamente del Setup (frame máquina).
    // width = X, depth = Y, height = Z (vertical).
    const { width, depth, height } = setup.rotatedBBox;

    console.log("🔍 [StepStock] Dimensiones desde Setup.rotatedBBox:", {
      supportFaceId: setup.supportFace.faceId,
      width,
      depth,
      height,
    });

    const tipoStock = tipoPieza === "disco" ? "cilindrico" : "rectangular";

    // Sobre-material cilíndrico por defecto (rectangular arranca en 0 por cara).
    const sobreRadial = 2;
    const sobreAxial = 3;

    const newConfig: StockConfig = {
      tipo: tipoStock,
      modo: "sobrematerial",

      // Rectangular exacto (default = pieza exacta, dimensiones POST-ROTACIÓN)
      ancho_mm: Math.round(width),
      largo_mm: Math.round(depth),
      alto_mm: Math.round(height),

      // Cilíndrico (dimensiones POST-ROTACIÓN)
      diametro_mm: Math.round(Math.max(width, depth) + 2 * sobreRadial),
      longitud_mm: Math.round(height + 2 * sobreAxial),

      // Seis offsets por cara (frame del Setup), todos en 0.
      sobre_x_pos_mm: 0,
      sobre_x_neg_mm: 0,
      sobre_y_pos_mm: 0,
      sobre_y_neg_mm: 0,
      sobre_z_pos_mm: 0,
      sobre_z_neg_mm: 0,

      // Cilíndrico
      sobre_radial_mm: sobreRadial,
      sobre_axial_mm: sobreAxial,
    };

    setStockConfig(newConfig);
    setInitialized(true);
  }, [analisis, setup, initialized, setStockConfig]);

  const handleTipoChange = (tipo: "rectangular" | "cilindrico") => {
    setStockConfig({ ...stockConfig, tipo });
  };

  const handleModoChange = (modo: "dimensiones" | "sobrematerial") => {
    setStockConfig({ ...stockConfig, modo });
  };

  const handleInputChange = (field: keyof StockConfig, value: number) => {
    setStockConfig({ ...stockConfig, [field]: value });
  };

  // Dimensiones finales del stock rectangular a partir de rotatedBBox + los seis
  // offsets por cara (independientes positivo/negativo por eje del Setup).
  const getRectStockDims = (): { x: number; y: number; z: number } | null => {
    if (!setup) return null;
    const { width, depth, height } = setup.rotatedBBox;
    if (stockConfig.modo === "dimensiones") {
      return {
        x: stockConfig.ancho_mm,
        y: stockConfig.largo_mm,
        z: stockConfig.alto_mm,
      };
    }
    return {
      x: width + stockConfig.sobre_x_pos_mm + stockConfig.sobre_x_neg_mm,
      y: depth + stockConfig.sobre_y_pos_mm + stockConfig.sobre_y_neg_mm,
      z: height + stockConfig.sobre_z_pos_mm + stockConfig.sobre_z_neg_mm,
    };
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

  // Validar que el stock sea >= pieza en cada eje (frame del Setup).
  const validateStockDimensions = (): { valid: boolean; warnings: string[] } => {
    if (!setup) return { valid: true, warnings: [] };

    const { width, depth, height } = setup.rotatedBBox;
    const warnings: string[] = [];

    if (stockConfig.tipo === "rectangular") {
      const dims = getRectStockDims();
      if (!dims) return { valid: true, warnings: [] };

      // Comparación por eje (cada par +/- suma sobre la dimensión de la pieza).
      if (dims.x < width) {
        warnings.push(
          `Ancho (${Math.round(dims.x)}mm) es menor que la pieza (${Math.round(width)}mm)`,
        );
      }
      if (dims.y < depth) {
        warnings.push(
          `Largo (${Math.round(dims.y)}mm) es menor que la pieza (${Math.round(depth)}mm)`,
        );
      }
      if (dims.z < height) {
        warnings.push(
          `Alto (${Math.round(dims.z)}mm) es menor que la pieza (${Math.round(height)}mm)`,
        );
      }
    } else {
      const dims = getCylStockDims();
      if (!dims) return { valid: true, warnings: [] };
      const piezaDiamRadial = Math.max(width, depth);
      if (dims.d < piezaDiamRadial) {
        warnings.push(
          `Diámetro (${Math.round(dims.d)}mm) es menor que la pieza (${Math.round(piezaDiamRadial)}mm)`,
        );
      }
      if (dims.len < height) {
        warnings.push(
          `Longitud (${Math.round(dims.len)}mm) es menor que la pieza (${Math.round(height)}mm)`,
        );
      }
    }

    return { valid: warnings.length === 0, warnings };
  };

  // Texto resumen del stock calculado.
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

  // Sin Setup confirmado no hay orientación de montaje: el stock no puede
  // derivarse. Pedir volver a confirmar el montaje en lugar de caer a la
  // geometría cruda (que ignoraría la cara de apoyo elegida).
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Configurar Stock (Material Bruto)
        </h2>
        <p className="mt-1 text-xs md:text-sm text-text-muted">
          Define las dimensiones del material bruto antes de mecanizar
        </p>
      </div>

      {/* Layout responsive: columna en móvil, 2 columnas en desktop */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Visor 3D */}
        <div className="flex-1 min-h-[300px] lg:min-h-[500px]">
          <CamViewer3D
            dimensiones={{
              x: meshData.bounding_box.max[0] - meshData.bounding_box.min[0],
              y: meshData.bounding_box.max[1] - meshData.bounding_box.min[1],
              z: meshData.bounding_box.max[2] - meshData.bounding_box.min[2],
            }}
            stockConfig={stockConfig}
            faceIdDestacada={montajeConfig.face_id_apoyo}
            sujecionConfig={montajeConfig.sujecion_config}
          />
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
                  /* ── UI TEMPORAL (Phase 2A-1): seis campos planos para validar
                       el flujo de datos. La interacción centrada en el visor
                       (click-cara → editar su sobre-material) llega en 2A-2. ── */
                  <div className="space-y-3">
                    <p className="text-[10px] md:text-xs text-text-muted">
                      Sobre-material por cara (frame del Setup). UI temporal de
                      validación — la versión final será sobre el visor.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <InputField
                        label="X+"
                        value={stockConfig.sobre_x_pos_mm}
                        onChange={(v) => handleInputChange("sobre_x_pos_mm", v)}
                        unit="mm"
                      />
                      <InputField
                        label="X−"
                        value={stockConfig.sobre_x_neg_mm}
                        onChange={(v) => handleInputChange("sobre_x_neg_mm", v)}
                        unit="mm"
                      />
                      <InputField
                        label="Y+"
                        value={stockConfig.sobre_y_pos_mm}
                        onChange={(v) => handleInputChange("sobre_y_pos_mm", v)}
                        unit="mm"
                      />
                      <InputField
                        label="Y−"
                        value={stockConfig.sobre_y_neg_mm}
                        onChange={(v) => handleInputChange("sobre_y_neg_mm", v)}
                        unit="mm"
                      />
                      <InputField
                        label="Z+"
                        value={stockConfig.sobre_z_pos_mm}
                        onChange={(v) => handleInputChange("sobre_z_pos_mm", v)}
                        unit="mm"
                      />
                      <InputField
                        label="Z− (apoyo)"
                        value={stockConfig.sobre_z_neg_mm}
                        onChange={() => {}}
                        unit="mm"
                        disabled
                        help="Cara de apoyo: no se añade material contra la sujeción."
                      />
                    </div>
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

function InputField({
  label,
  value,
  onChange,
  unit,
  help,
  disabled = false,
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          className={`w-full rounded-xl border border-border bg-bg-elevated px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] text-sm text-text-primary focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20 ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          step="0.1"
          min="0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
          {unit}
        </span>
      </div>
      {help && (
        <p className="mt-1 text-[10px] md:text-xs text-text-muted">{help}</p>
      )}
    </div>
  );
}
