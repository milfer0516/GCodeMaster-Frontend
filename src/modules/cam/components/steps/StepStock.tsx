// src/modules/cam/components/steps/StepStock.tsx
import { useEffect, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { WizardNavButtons } from "./WizardNavButtons";
import { Package, Box, Cylinder } from "lucide-react";
import type { StockConfig } from "../../store/camStore";

export const StepStock = () => {
  const analisis = useCamStore((s) => s.analisis);
  const meshData = useCamStore((s) => s.meshData);
  const stockConfig = useCamStore((s) => s.stockConfig);
  const setStockConfig = useCamStore((s) => s.setStockConfig);
  const setStep = useCamStore((s) => s.setStep);

  const [initialized, setInitialized] = useState(false);

  // Inicializar stock por defecto basado en tipo_pieza y bounding box
  useEffect(() => {
    if (initialized || !analisis || !meshData) return;

    const tipoPieza = analisis.tipo_pieza || "placa";
    const bb = meshData.bounding_box;
    const bbMin = bb.min;
    const bbMax = bb.max;

    const piezaWidth = bbMax[0] - bbMin[0];
    const piezaDepth = bbMax[1] - bbMin[1];
    const piezaHeight = bbMax[2] - bbMin[2];

    const tipoStock = tipoPieza === "disco" ? "cilindrico" : "rectangular";

    // Sobre-material por defecto
    const sobreXY = 2;
    const sobreZ = 2;
    const sobreRadial = 2;
    const sobreAxial = 3;

    const newConfig: StockConfig = {
      tipo: tipoStock,
      modo: "sobrematerial",

      // Rectangular
      ancho_mm: Math.round(piezaWidth + 2 * sobreXY),
      largo_mm: Math.round(piezaDepth + 2 * sobreXY),
      alto_mm: Math.round(piezaHeight + 2 * sobreZ),

      // Cilíndrico
      diametro_mm: Math.round(Math.max(piezaWidth, piezaDepth) + 2 * sobreRadial),
      longitud_mm: Math.round(piezaHeight + 2 * sobreAxial),

      // Sobre-material
      sobre_radial_mm: sobreRadial,
      sobre_axial_mm: sobreAxial,
      sobre_xy_mm: sobreXY,
      sobre_z_mm: sobreZ,
    };

    setStockConfig(newConfig);
    setInitialized(true);
  }, [analisis, meshData, initialized, setStockConfig]);

  const handleTipoChange = (tipo: "rectangular" | "cilindrico") => {
    setStockConfig({ ...stockConfig, tipo });
  };

  const handleModoChange = (modo: "dimensiones" | "sobrematerial") => {
    setStockConfig({ ...stockConfig, modo });
  };

  const handleInputChange = (field: keyof StockConfig, value: number) => {
    setStockConfig({ ...stockConfig, [field]: value });
  };

  // Calcular dimensiones reales del stock para mostrar resumen
  const getStockDimensions = (): string => {
    if (!meshData || !stockConfig) return "";

    const bb = meshData.bounding_box;
    const bbMin = bb.min;
    const bbMax = bb.max;

    const piezaWidth = bbMax[0] - bbMin[0];
    const piezaDepth = bbMax[1] - bbMin[1];
    const piezaHeight = bbMax[2] - bbMin[2];

    if (stockConfig.tipo === "rectangular") {
      let w, l, h;
      if (stockConfig.modo === "dimensiones") {
        w = stockConfig.ancho_mm;
        l = stockConfig.largo_mm;
        h = stockConfig.alto_mm;
      } else {
        w = piezaWidth + 2 * stockConfig.sobre_xy_mm;
        l = piezaDepth + 2 * stockConfig.sobre_xy_mm;
        h = piezaHeight + 2 * stockConfig.sobre_z_mm;
      }
      return `${Math.round(w)} × ${Math.round(l)} × ${Math.round(h)} mm`;
    } else {
      let d, len;
      if (stockConfig.modo === "dimensiones") {
        d = stockConfig.diametro_mm;
        len = stockConfig.longitud_mm;
      } else {
        const piezaDiamRadial = Math.max(piezaWidth, piezaDepth);
        d = piezaDiamRadial + 2 * stockConfig.sobre_radial_mm;
        len = piezaHeight + 2 * stockConfig.sobre_axial_mm;
      }
      return `Ø${Math.round(d)} × ${Math.round(len)} mm`;
    }
  };

  if (!analisis || !meshData) {
    return (
      <div className="text-center py-8 text-text-muted">
        Cargando análisis de pieza...
      </div>
    );
  }

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
                  <>
                    <InputField
                      label="Sobre-material XY"
                      value={stockConfig.sobre_xy_mm}
                      onChange={(v) => handleInputChange("sobre_xy_mm", v)}
                      unit="mm"
                      help="Material extra en cada lado (X, Y)"
                    />
                    <InputField
                      label="Sobre-material Z"
                      value={stockConfig.sobre_z_mm}
                      onChange={(v) => handleInputChange("sobre_z_mm", v)}
                      unit="mm"
                      help="Material extra arriba y abajo"
                    />
                  </>
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
                      help="Material extra en el radio"
                    />
                    <InputField
                      label="Sobre-material axial"
                      value={stockConfig.sobre_axial_mm}
                      onChange={(v) => handleInputChange("sobre_axial_mm", v)}
                      unit="mm"
                      help="Material extra en la longitud"
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
}

function InputField({ label, value, onChange, unit, help }: InputFieldProps) {
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
          className="w-full rounded-xl border border-border bg-bg-elevated px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] text-sm text-text-primary focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
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
