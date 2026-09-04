// src/modules/cam/components/steps/StepCargarStep.tsx
// Paso 1 del wizard: "Archivo y Análisis".
//
// Contiene el flujo completo que antes se repartía entre los pasos Archivo y
// Análisis: seleccionar el STEP → POST /cam/analyze → mostrar el resultado en
// ESTA MISMA pantalla → continuar a Configuración de Montaje. La llamada al
// backend (endpoint, payload, respuesta) no cambió; tampoco el momento de la
// teselación: /cam/tessellate sigue disparándose en el visor de Montaje.
import { useRef, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { analyzeStep } from "../../services/camService";
import { WizardNavButtons } from "./WizardNavButtons";
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Loader2,
  Box,
  Layers,
  Drill,
  CircleDot,
  Wrench,
} from "lucide-react";

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

// Etiqueta de sección — mismo patrón visual que las cabeceras de panel de
// LayoutPasoVisor (text-[11px] uppercase tracking-widest).
function EtiquetaSeccion({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
      {children}
    </p>
  );
}

// ── COMPONENTE ────────────────────────────────────────────────────────────

export const StepCargarStep = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    archivo,
    analisis,
    nombreArchivo,
    setArchivo,
    setAnalisis,
    setMeshData,
    setMeshError,
  } = useCamStore();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Validación compartida de archivo: extensión y tamaño
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const validateFile = (file: File): string | null => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".step") && !name.endsWith(".stp")) {
      return "Solo se permiten archivos .step o .stp";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "El archivo supera el tamaño máximo de 5 MB";
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (cargando) return;
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setArchivo(file);
      setError("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (cargando) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setArchivo(file);
    setError("");
  };

  // Misma llamada de siempre: POST /cam/analyze con el archivo en multipart.
  // La única diferencia respecto al flujo anterior es que NO navega a otro
  // paso: el resultado se muestra aquí mismo (ver `mostrarAnalisis`).
  const handleUpload = async () => {
    if (!archivo) return;
    setCargando(true);
    setError("");

    try {
      const result = await analyzeStep(archivo);
      setMeshData(null as any);
      setMeshError(null);
      setAnalisis(result.id_job, result.analisis);
    } catch (err: any) {
      console.error("ERROR COMPLETO:", err);
      console.error("RESPONSE:", err?.response?.data);
      console.error("STATUS:", err?.response?.status);
      console.error("DETAIL:", JSON.stringify(err?.response?.data?.detail));
      setError(
        err?.response?.data?.detail
          ? Array.isArray(err.response.data.detail)
            ? err.response.data.detail.join(", ")
            : String(err.response.data.detail)
          : "Error al analizar el archivo. Verifica que sea un STEP válido.",
      );
    } finally {
      setCargando(false);
    }
  };

  // Volver a la vista de carga para elegir otro archivo. El análisis anterior
  // queda reemplazado (con sus cascadas del store) en cuanto se analice el
  // nuevo archivo; mientras tanto no se muestra porque no hay archivo activo.
  const handleRetry = () => {
    setError("");
    setArchivo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // El análisis solo se presenta junto al archivo que lo produjo. Si el
  // operador pulsa "Cargar otro archivo" (archivo → null), la pantalla vuelve
  // a la vista de carga aunque el store aún conserve el análisis anterior.
  const mostrarAnalisis = Boolean(analisis && archivo);

  // ── Vista A: resultados del análisis (mismo paso, después de analizar) ──
  if (mostrarAnalisis) {
    const { dimensiones, resumen, operaciones: opsBackend } = analisis!;
    const opsSetup1 = (opsBackend ?? []).filter((op: any) => op.setup === 1);
    const opsSetup2 = (opsBackend ?? []).filter((op: any) => op.setup === 2);
    const totalOps = (opsBackend ?? []).length;

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Identificación del paso */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Archivo y análisis
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            <span className="font-medium text-text-primary">{nombreArchivo}</span>{" "}
            — {totalOps} operaciones detectadas
          </p>
        </div>

        {/* Composición 62/38: operaciones como contenido principal; archivo y
            resumen geométrico agrupados en el panel lateral. Los datos son
            EXACTAMENTE los que devuelve /cam/analyze; solo cambia su
            agrupación y jerarquía. */}
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Operaciones detectadas — contenido principal */}
          <div className="order-2 lg:order-1 lg:w-[62%] space-y-3">
            <EtiquetaSeccion>Operaciones detectadas</EtiquetaSeccion>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
          </div>

          {/* Panel lateral: archivo → dimensiones → resumen geométrico */}
          <div className="order-1 lg:order-2 lg:w-[38%] space-y-4">
            <div className="space-y-3">
              <EtiquetaSeccion>Archivo</EtiquetaSeccion>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-primary p-3">
                <FileCheck className="h-5 w-5 flex-shrink-0 text-green-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {nombreArchivo}
                  </p>
                  <p className="text-xs text-text-muted">
                    {((archivo?.size ?? 0) / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={handleRetry}
                  className="flex-shrink-0 px-2 py-1 min-h-[44px] text-xs text-text-muted hover:text-accent-blue transition underline"
                >
                  Cambiar archivo
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <EtiquetaSeccion>Dimensiones</EtiquetaSeccion>
              <div className="grid grid-cols-3 gap-2">
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
                    <p className="mt-1 text-base md:text-lg font-bold text-text-primary">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <EtiquetaSeccion>Resumen geométrico</EtiquetaSeccion>
              <div className="grid grid-cols-2 gap-2">
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
                    <p className="mt-1 text-2xl font-bold text-text-primary">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navegación: es el primer paso del wizard — no hay "Atrás". */}
        <WizardNavButtons nextStep="montaje" nextLabel="Configurar montaje" />
      </div>
    );
  }

  // ── Vista B: selección de archivo y disparo del análisis ────────────────
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Archivo y análisis
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Sube tu archivo CAD en formato STEP o STP y revisa el análisis
          geométrico en esta misma pantalla.
        </p>
      </div>

      {/* Composición 62/38: panel de estado (vacío / listo / procesando) +
          panel de carga. El análisis se muestra después en este mismo paso;
          el modelo 3D aparece más adelante, en Montaje. */}
      <div className="flex flex-col-reverse lg:flex-row gap-4 lg:h-[calc(100vh-19rem)] lg:min-h-[480px]">
        {/* Panel de estado */}
        <div className="flex h-[220px] lg:h-full lg:w-[62%] items-center justify-center rounded-xl border border-border bg-[#0d1117] p-6">
          {cargando ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 text-center"
            >
              <Loader2 className="h-10 w-10 animate-spin text-accent-blue" />
              <p className="text-sm font-medium text-text-primary">
                Analizando archivo…
              </p>
              <p className="text-xs text-text-muted">
                Esto puede tardar unos segundos
              </p>
            </div>
          ) : archivo ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <FileCheck className="h-10 w-10 text-green-400" />
              <p className="text-sm font-medium text-text-primary px-2">
                {archivo.name}
              </p>
              <p className="text-xs text-text-muted">
                Archivo listo. Pulsa «Analizar STEP» para procesarlo.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <Box className="h-10 w-10 text-text-muted" />
              <p className="text-sm font-medium text-text-primary">
                Análisis del modelo
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                Al analizar el archivo verás aquí mismo el resumen geométrico
                de tu pieza: dimensiones, características y operaciones
                detectadas.
              </p>
            </div>
          )}
        </div>

        {/* Panel de carga */}
        <div className="lg:w-[38%] space-y-4 lg:overflow-y-auto lg:pr-1">
          {/* Zona de carga */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !archivo && fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center rounded-xl md:rounded-2xl border-2 border-dashed
              p-6 md:p-8 transition cursor-pointer min-h-[200px]
              ${
                archivo
                  ? cargando
                    ? "border-accent-blue bg-accent-blue/5 cursor-default"
                    : "border-accent-green bg-green-500/5 cursor-default"
                  : "border-border bg-bg-primary hover:border-accent-blue hover:bg-accent-blue/5"
              }
            `}
          >
            {archivo ? (
              cargando ? (
                <>
                  <Loader2 className="h-10 md:h-12 w-10 md:w-12 text-accent-blue mb-3 animate-spin" />
                  <p className="font-semibold text-text-primary text-sm md:text-base text-center px-2">{archivo.name}</p>
                  <p className="mt-1 text-sm text-accent-blue">
                    Analizando archivo…
                  </p>
                </>
              ) : (
                <>
                  <FileCheck className="h-10 md:h-12 w-10 md:w-12 text-green-400 mb-3" />
                  <p className="font-semibold text-text-primary text-sm md:text-base text-center px-2">{archivo.name}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {(archivo.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-3 px-4 py-2 min-h-[44px] text-sm text-text-muted hover:text-accent-blue transition underline"
                  >
                    Cambiar archivo
                  </button>
                </>
              )
            ) : (
              <>
                <UploadCloud className="h-10 md:h-12 w-10 md:w-12 text-text-muted mb-3" />
                <p className="font-medium text-text-primary text-sm md:text-base">
                  <span className="hidden md:inline">Arrastra tu archivo aquí</span>
                  <span className="md:hidden">Seleccionar archivo STEP</span>
                </p>
                <p className="mt-1 text-sm text-text-muted hidden md:block">
                  o haz clic para seleccionar
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  Formatos: .STEP, .STP
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4 md:hidden px-6 py-3 min-h-[60px] bg-accent-blue text-white rounded-xl font-medium text-base"
                >
                  Seleccionar archivo STEP
                </button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Error con opción de reintentar */}
          {error && (
            <div className="rounded-xl border-2 border-red-500 bg-red-500/10 px-4 md:px-6 py-4 space-y-3">
              <div className="flex items-start gap-2 text-sm text-red-400">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p className="flex-1">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="w-full md:w-auto px-4 py-2.5 min-h-[44px] rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium text-sm transition active:scale-[0.98]"
              >
                Cargar otro archivo
              </button>
            </div>
          )}

          {/* Botón */}
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!archivo || cargando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-6 py-3 min-h-[60px] md:min-h-[44px] text-base md:text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {cargando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                "Analizar STEP →"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
