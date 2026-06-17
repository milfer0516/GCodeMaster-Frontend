// src/modules/cam/components/steps/StepMaterial.tsx
import { useEffect, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { WizardNavButtons } from "./WizardNavButtons";
import {
  getMateriales,
  asignarMaterialJob,
  type MaterialGlobal,
} from "../../services/camService";
import { Loader2, Package } from "lucide-react";

export const StepMaterial = () => {
  // Selectores individuales para evitar re-renders (patrón StepMontaje)
  const material = useCamStore((s) => s.material);
  const setMaterial = useCamStore((s) => s.setMaterial);
  const idJob = useCamStore((s) => s.idJob);
  const setStep = useCamStore((s) => s.setStep);

  const [materiales, setMateriales] = useState<MaterialGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cargar catálogo de materiales al montar
  useEffect(() => {
    const fetchMateriales = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMateriales();
        setMateriales(data);
      } catch (err) {
        console.error("Error cargando materiales:", err);
        setError("No se pudo cargar el catálogo de materiales");
      } finally {
        setLoading(false);
      }
    };

    fetchMateriales();
  }, []);

  // Agrupar materiales por categoría
  const materialesPorCategoria = materiales.reduce(
    (acc, mat) => {
      const cat = mat.categoria || "Otros";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(mat);
      return acc;
    },
    {} as Record<string, MaterialGlobal[]>,
  );

  const handleSelectMaterial = (mat: MaterialGlobal) => {
    setMaterial({
      id_material: mat.id_material,
      nombre: mat.nombre,
      grupo_iso: mat.grupo_iso,
      categoria: mat.categoria,
    });
  };

  const handleNext = async () => {
    if (!material || !idJob) return;

    try {
      setSaving(true);
      await asignarMaterialJob(idJob, material.id_material);
      setStep("maquina");
    } catch (err) {
      console.error("Error asignando material:", err);
      setError("No se pudo asignar el material al trabajo");
      setSaving(false);
    }
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 md:py-24">
        <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-accent-blue mb-4" />
        <p className="text-sm md:text-base text-text-muted">
          Cargando catálogo de materiales...
        </p>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 md:p-6 text-center">
          <p className="text-sm md:text-base text-accent-red font-medium">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-accent-red px-4 py-2 text-sm text-white hover:bg-accent-red/90 transition min-h-[44px]"
          >
            Reintentar
          </button>
        </div>
        <WizardNavButtons
          prevStep="operaciones"
          nextStep="maquina"
          canAdvance={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base md:text-lg font-bold text-text-primary">
          Selecciona el Material
        </h2>
        <p className="mt-1 text-xs md:text-sm text-text-muted">
          Elige el material de la pieza para calcular velocidades de corte
        </p>
      </div>

      {/* Material seleccionado */}
      {material && (
        <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/10 p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 md:h-5 md:w-5 text-accent-blue" />
            <div>
              <p className="text-xs md:text-sm font-medium text-text-primary">
                Material seleccionado:
              </p>
              <p className="text-sm md:text-base font-bold text-accent-blue">
                {material.nombre}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Catálogo por categorías */}
      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
        {Object.entries(materialesPorCategoria)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([categoria, mats]) => (
            <div key={categoria}>
              {/* Título de categoría */}
              <h3 className="mb-3 text-sm md:text-base font-semibold text-text-secondary border-b border-border pb-2">
                {categoria}
              </h3>

              {/* Grid de materiales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {mats.map((mat) => {
                  const isSelected =
                    material?.id_material === mat.id_material;

                  return (
                    <button
                      key={mat.id_material}
                      onClick={() => handleSelectMaterial(mat)}
                      className={`group relative rounded-xl border-2 p-4 text-left transition min-h-[80px] ${
                        isSelected
                          ? "border-accent-blue bg-accent-blue/10"
                          : "border-border bg-bg-elevated hover:border-accent-blue/50 hover:bg-bg-surface"
                      }`}
                    >
                      {/* Checkmark si está seleccionado */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue text-white">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Nombre del material */}
                      <p
                        className={`text-sm md:text-base font-semibold mb-2 pr-6 ${
                          isSelected
                            ? "text-accent-blue"
                            : "text-text-primary group-hover:text-accent-blue"
                        }`}
                      >
                        {mat.nombre}
                      </p>

                      {/* Badge grupo ISO */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block rounded-md bg-bg-surface border border-border px-2 py-0.5 text-[10px] md:text-xs font-medium text-text-muted">
                          {mat.grupo_iso}
                        </span>

                        {/* Velocidad de corte */}
                        <span className="text-[10px] md:text-xs text-text-muted">
                          Vc: {mat.vc_min}–{mat.vc_max} m/min
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* Navegación */}
      <WizardNavButtons
        prevStep="operaciones"
        nextStep="maquina"
        canAdvance={!!material && !saving}
        onNext={handleNext}
      />

      {/* Indicador de guardado */}
      {saving && (
        <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Guardando material...</span>
        </div>
      )}
    </div>
  );
};
