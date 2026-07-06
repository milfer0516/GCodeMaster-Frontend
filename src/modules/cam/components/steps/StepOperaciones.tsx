// src/modules/cam/components/steps/StepOperaciones.tsx
import { useEffect, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { WizardNavButtons } from "./WizardNavButtons";
import {
  Layers,
  Drill,
  Box,
  CircleDot,
  Wrench,
} from "lucide-react";

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

function tipoColor(tipo: string) {
  switch (tipo) {
    case "planeado":
      return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    case "taladrado":
      return "border-green-500/30 bg-green-500/10 text-green-400";
    case "cajera":
      return "border-purple-500/30 bg-purple-500/10 text-purple-400";
    case "contorneado_exterior":
      return "border-orange-500/30 bg-orange-500/10 text-orange-400";
    default:
      return "border-border bg-bg-elevated text-text-muted";
  }
}

export const StepOperaciones = () => {
  const {
    analisis,
    operaciones,
    setOperaciones,
    toggleOperacion,
    ordenSetups,
    setOrdenSetups,
    setStep,
    idJob,
    montajeConfig,
  } = useCamStore();

  const seleccionarTodas = () =>
    setOperaciones(operaciones.map((op) => ({ ...op, seleccionada: true })));

  const deseleccionarTodas = () =>
    setOperaciones(operaciones.map((op) => ({ ...op, seleccionada: false })));

  const [archivoAbierto, setArchivoAbierto] = useState(false);

  // ── ABRIR ARCHIVO AUTOMÁTICAMENTE AL MONTAR ──────────────────────────
  useEffect(() => {
    if (!idJob || archivoAbierto) return;

    const abrir = async () => {
      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("id_job", String(idJob));

        await fetch("http://20.237.194.126:8000/cam/open-in-freecad", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        setArchivoAbierto(true);
      } catch (err) {
        console.error("Error al abrir archivo en FreeCAD:", err);
      }
    };

    abrir();
  }, [idJob, archivoAbierto]);
  // ─────────────────────────────────────────────────────────────────────

  const dimensiones = analisis?.dimensiones ?? { x: 100, y: 100, z: 50 };
  const operacionesBackend = [
    ...(analisis?.lados?.lado_a?.operaciones ?? []),
    ...(analisis?.lados?.lado_b?.operaciones ?? []),
  ];

  // TEMP DEBUG - remove later
  useEffect(() => {
    console.log(
      "🔍 DEBUG: [StepOperaciones] operaciones detectadas (typed)",
      operaciones.map((op) => ({
        op_id: op.id,
        tipo: op.tipo,
        descripcion: op.descripcion,
        face_indices: op.face_indices,
      })),
    );
    console.log(
      "🔍 DEBUG: [StepOperaciones] operacionesBackend RAW (lado_a + lado_b)",
      operacionesBackend,
    );
  }, [operaciones]);

  const opsSetup1 = operaciones.filter((op) => op.setup === 1);
  const opsSetup2 = operaciones.filter((op) => op.setup === 2);
  const tieneAmbos = opsSetup1.length > 0 && opsSetup2.length > 0;
  const haySeleccionadas = operaciones.some((op) => op.seleccionada);
  const seleccionadas = operaciones
    .filter((op) => op.seleccionada)
    .map((op) => op.id);

  const renderOp = (op: (typeof operaciones)[0]) => (
    <button
      key={op.id}
      onClick={() => {
        // TEMP DEBUG - remove later
        console.log("🔍 DEBUG: [StepOperaciones] toggle desde lista (checkbox)", {
          op_id: op.id,
          tipo: op.tipo,
          descripcion: op.descripcion,
          face_indices: op.face_indices,
        });
        toggleOperacion(op.id);
      }}
      className={`w-full rounded-xl border p-3 min-h-[44px] text-left transition active:scale-[0.99] ${
        op.seleccionada
          ? "border-accent-blue/30 bg-accent-blue/5"
          : "border-border bg-bg-primary hover:border-accent-blue/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex-shrink-0 rounded-full border p-1.5 ${tipoColor(op.tipo)}`}
        >
          {tipoIcono(op.tipo)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {op.descripcion}
          </p>
          {op.herramienta_sugerida && (
            <p className="mt-0.5 text-xs text-text-muted">
              🔧 {op.herramienta_sugerida}
            </p>
          )}
        </div>
        <div
          className={`flex-shrink-0 h-6 w-6 md:h-5 md:w-5 rounded border-2 transition mt-0.5 ${
            op.seleccionada
              ? "border-accent-blue bg-accent-blue"
              : "border-border"
          }`}
        >
          {op.seleccionada && (
            <svg viewBox="0 0 12 12" className="h-full w-full text-white p-0.5">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Operaciones detectadas
        </h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Selecciona desde la lista o haz clic en la pieza 3D.{" "}
          <span className="text-accent-blue font-medium">
            {seleccionadas.length}
          </span>{" "}
          de <span className="font-medium">{operaciones.length}</span>{" "}
          seleccionadas.
        </p>
      </div>

      {/* Layout dos columnas */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* ── Viewer 3D ── */}
        <div className="w-full lg:w-2/3 rounded-xl border border-border bg-bg-primary overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 border-b border-border px-3 md:px-4 py-2">
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-text-muted">
              Leyenda:
            </p>
            {[
              { color: "bg-blue-400", label: "Planeado" },
              { color: "bg-green-400", label: "Taladrado" },
              { color: "bg-purple-400", label: "Cajera" },
              { color: "bg-orange-400", label: "Contorneado" },
              { color: "bg-yellow-400", label: "Seleccionada" },
            ].map(({ color, label }) => (
              <span
                key={label}
                className="flex items-center gap-1 text-[9px] md:text-[10px] text-text-muted"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${color}`}
                />
                {label}
              </span>
            ))}
          </div>

          <div className="h-[300px] md:h-[400px]">
            <CamViewer3D
              dimensiones={dimensiones}
              operaciones={operaciones}
              operacionesBackend={operacionesBackend}
              seleccionadas={seleccionadas}
              onToggle={toggleOperacion}
              faceIdDestacada={montajeConfig.face_id_apoyo}
              sujecionConfig={montajeConfig.sujecion_config}
            />
          </div>

          <p className="border-t border-border px-3 md:px-4 py-2 text-[9px] md:text-[10px] text-text-muted">
            🖱 Arrastra para rotar · Scroll para zoom · Doble clic en una cara
            para seleccionar la operación. Un clic muestra su dimensión.
          </p>
        </div>

        {/* ── Lista operaciones ── */}
        <div className="w-full lg:w-1/3 flex flex-col gap-3">
          {/* Acciones rápidas */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={seleccionarTodas}
              className="rounded-lg border border-border px-3 py-2.5 md:py-1.5 min-h-[44px] md:min-h-0 text-xs text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary"
            >
              Seleccionar todas
            </button>
            <button
              onClick={deseleccionarTodas}
              className="rounded-lg border border-border px-3 py-2.5 md:py-1.5 min-h-[44px] md:min-h-0 text-xs text-text-muted transition hover:border-red-500/30 hover:text-red-400"
            >
              Deseleccionar todas
            </button>
          </div>

          <div
            className="flex-1 space-y-4 overflow-y-auto pr-1"
            style={{ maxHeight: "420px" }}
          >
            {opsSetup1.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-xs font-semibold text-accent-blue">
                    Setup 1 — Cara Superior
                  </span>
                  <span className="text-xs text-text-muted">
                    {opsSetup1.filter((o) => o.seleccionada).length}/
                    {opsSetup1.length} sel.
                  </span>
                </div>
                {opsSetup1.map(renderOp)}
              </div>
            )}

            {opsSetup2.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400">
                    Setup 2 — Cara Inferior
                  </span>
                  <span className="text-xs text-text-muted">
                    {opsSetup2.filter((o) => o.seleccionada).length}/
                    {opsSetup2.length} sel.
                  </span>
                </div>
                {opsSetup2.map(renderOp)}
              </div>
            )}

            {tieneAmbos &&
              opsSetup1.some((o) => o.seleccionada) &&
              opsSetup2.some((o) => o.seleccionada) && (
                <div className="rounded-xl border border-border bg-bg-primary p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Orden de mecanizado
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        value: "superior_primero",
                        label: "Cara Superior primero (OP10 → OP20)",
                      },
                      {
                        value: "inferior_primero",
                        label: "Cara Inferior primero (OP10 → OP20)",
                      },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          onClick={() => setOrdenSetups(opt.value)}
                          className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition ${
                            ordenSetups === opt.value
                              ? "border-accent-blue bg-accent-blue"
                              : "border-border"
                          }`}
                        />
                        <span className="text-xs text-text-primary">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <div className="border-t border-border pt-2">
            <WizardNavButtons
              prevStep="montaje"
              nextStep="material"
              canAdvance={haySeleccionadas}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
