// src/modules/cam/components/steps/StepAnalisis.tsx
import { useCamStore } from "../../store/camStore";
import {
  Ruler,
  Layers,
  Drill,
  CircleDot,
  Box,
  Wrench,
} from "lucide-react";
import { WizardNavButtons } from "./WizardNavButtons";

// ── HELPERS ───────────────────────────────────────────────────────────────

function tipoColor(tipo: string) {
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

function tipoIcono(tipo: string) {
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

// ── COMPONENTE ────────────────────────────────────────────────────────────

export const StepAnalisis = () => {
  const analisis = useCamStore((s) => s.analisis);
  const nombreArchivo = useCamStore((s) => s.nombreArchivo);

  if (!analisis) return null;

  const { dimensiones, resumen, operaciones: opsBackend } = analisis;
  const opsSetup1 = (opsBackend ?? []).filter((op: any) => op.setup === 1);
  const opsSetup2 = (opsBackend ?? []).filter((op: any) => op.setup === 2);
  const totalOps = (opsBackend ?? []).length;

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Análisis geométrico
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          <span className="font-medium text-text-primary">{nombreArchivo}</span>{" "}
          — {totalOps} operaciones detectadas
        </p>
      </div>

      {/* Dimensiones */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Largo X", value: `${dimensiones?.x ?? 0} mm` },
          { label: "Ancho Y", value: `${dimensiones?.y ?? 0} mm` },
          { label: "Alto Z", value: `${dimensiones?.z ?? 0} mm` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-bg-primary p-3 text-center"
          >
            <p className="text-xs text-text-muted">{label}</p>
            <p className="mt-1 text-lg font-bold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Caras planas",
            value: resumen?.caras_planas ?? 0,
            icon: <Layers className="h-4 w-4" />,
          },
          {
            label: "Agujeros",
            value: resumen?.agujeros ?? 0,
            icon: <Drill className="h-4 w-4" />,
          },
          {
            label: "Escalonados",
            value: resumen?.escalonados ?? 0,
            icon: <Box className="h-4 w-4" />,
          },
          {
            label: "Perfiles ext.",
            value: resumen?.perfiles_ext ?? 0,
            icon: <CircleDot className="h-4 w-4" />,
          },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-bg-primary p-3"
          >
            <div className="flex items-center gap-2 text-text-muted">
              {icon}
              <span className="text-xs">{label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Setups */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { setup: 1, label: "Cara Superior", ops: opsSetup1 },
          { setup: 2, label: "Cara Inferior", ops: opsSetup2 },
        ]
          .filter((s) => s.ops.length > 0)
          .map((lado) => (
            <div
              key={lado.setup}
              className="rounded-xl border border-border bg-bg-primary p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  Setup {lado.setup} — {lado.label}
                </h3>
                <span className="text-xs text-text-muted">
                  {lado.ops.length} op{lado.ops.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {lado.ops.map((op: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium flex-shrink-0 ${tipoColor(op.tipo)}`}
                    >
                      {tipoIcono(op.tipo)}
                      {op.tipo}
                    </span>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {op.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Navegación */}
      <WizardNavButtons
        prevStep="cargar"
        nextStep="montaje"
        nextLabel="Configurar montaje"
      />
    </div>
  );
};
