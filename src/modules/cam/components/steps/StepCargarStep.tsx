// src/modules/cam/components/steps/StepCargarStep.tsx
import { useRef, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { analyzeStep } from "../../services/camService";
import { UploadCloud, FileCheck, AlertCircle, Loader2 } from "lucide-react";

export const StepCargarStep = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { archivo, setArchivo, setAnalisis, setStep } = useCamStore();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setError("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".step") || file.name.endsWith(".stp"))) {
      setArchivo(file);
      setError("");
    } else {
      setError("Solo se aceptan archivos .STEP o .STP");
    }
  };

  const handleUpload = async () => {
    if (!archivo) return;
    setCargando(true);
    setError("");
    // En StepCargarStep.tsx, antes de setAnalisis
    /* const result = await analyzeStep(archivo);
    console.log("RESULT COMPLETO:", JSON.stringify(result, null, 2)); // ← agrega
    setAnalisis(result.id_job, result.analisis); */

    try {
      const result = await analyzeStep(archivo);
      /* #console.log("RESULT COMPLETO:", JSON.stringify(result, null, 2)); */
      setAnalisis(result.id_job, result.analisis);
      setStep("analisis");
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
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Cargar archivo STEP
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Sube tu archivo CAD en formato STEP o STP para comenzar el análisis
          geométrico.
        </p>
      </div>

      {/* Zona de carga */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !archivo && fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center rounded-2xl border-2 border-dashed
          p-10 transition cursor-pointer
          ${
            archivo
              ? "border-accent-green bg-green-500/5 cursor-default"
              : "border-border bg-bg-primary hover:border-accent-blue hover:bg-accent-blue/5"
          }
        `}
      >
        {archivo ? (
          <>
            <FileCheck className="h-12 w-12 text-green-400 mb-3" />
            <p className="font-semibold text-text-primary">{archivo.name}</p>
            <p className="mt-1 text-xs text-text-muted">
              {(archivo.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-3 text-xs text-text-muted hover:text-accent-blue transition underline"
            >
              Cambiar archivo
            </button>
          </>
        ) : (
          <>
            <UploadCloud className="h-12 w-12 text-text-muted mb-3" />
            <p className="font-medium text-text-primary">
              Arrastra tu archivo aquí
            </p>
            <p className="mt-1 text-sm text-text-muted">
              o haz clic para seleccionar
            </p>
            <p className="mt-2 text-xs text-text-muted">
              Formatos: .STEP, .STP
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".step,.stp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Botón */}
      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={!archivo || cargando}
          className="flex items-center gap-2 rounded-xl bg-accent-blue px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
  );
};
