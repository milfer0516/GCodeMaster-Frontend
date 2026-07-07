// src/modules/cam/components/steps/StepMaterial.tsx
import { useEffect, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { WizardNavButtons } from "./WizardNavButtons";
import {
  getMateriales,
  asignarMaterialJob,
  type MaterialGlobal,
} from "../../services/camService";
import { Loader2 } from "lucide-react";

// ISO 513 color coding per material group
type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

const ISO_GROUP_STYLES: Record<
  IsoGroup,
  { bg: string; text: string; label: string; ring: string }
> = {
  P: { bg: "bg-blue-600", text: "text-white", label: "Aceros", ring: "ring-blue-600/40" },
  M: { bg: "bg-yellow-500", text: "text-neutral-900", label: "Inoxidables", ring: "ring-yellow-500/40" },
  K: { bg: "bg-red-600", text: "text-white", label: "Fundición", ring: "ring-red-600/40" },
  N: { bg: "bg-green-600", text: "text-white", label: "No ferrosos", ring: "ring-green-600/40" },
  S: { bg: "bg-orange-700", text: "text-white", label: "Superaleaciones", ring: "ring-orange-700/40" },
  H: { bg: "bg-zinc-500", text: "text-white", label: "Templados", ring: "ring-zinc-500/40" },
};

const ISO_GROUP_ORDER: IsoGroup[] = ["P", "M", "K", "N", "S", "H"];

function parseIsoGroup(grupo_iso: string): IsoGroup | null {
  const normalized = grupo_iso.trim().toUpperCase();
  if (ISO_GROUP_ORDER.includes(normalized as IsoGroup)) {
    return normalized as IsoGroup;
  }
  return null;
}

// Subcomponents
function IsoLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-surface px-3.5 py-2.5">
      <span className="mr-0.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
        ISO 513
      </span>
      {ISO_GROUP_ORDER.map((g) => (
        <div key={g} className="flex items-center gap-1.5">
          <span className={`h-3.5 w-3.5 rounded ${ISO_GROUP_STYLES[g].bg}`} />
          <span className="text-xs font-semibold text-text-primary">{g}</span>
          <span className="text-[11px] text-text-muted">{ISO_GROUP_STYLES[g].label}</span>
        </div>
      ))}
    </div>
  );
}

function SelectedMaterialBar({ material }: { material: MaterialGlobal | null }) {
  const isoGroup = material ? parseIsoGroup(material.grupo_iso) : null;
  const style = isoGroup ? ISO_GROUP_STYLES[isoGroup] : null;

  return (
    <div className="mb-6 flex items-center gap-3.5 rounded-xl border border-violet-500/30 bg-violet-500/[0.08] px-4 py-3.5">
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md ${
          style ? style.bg : "bg-bg-elevated"
        }`}
      >
        <span className={`font-mono text-base font-extrabold ${style ? style.text : "text-text-muted"}`}>
          {isoGroup || "—"}
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Material seleccionado
        </div>
        <div className="mt-0.5 text-lg font-bold text-text-primary">
          {material ? material.nombre : "Ninguno"}
        </div>
      </div>
      <div className="ml-auto flex-shrink-0 text-right">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Vc</div>
        <div className="mt-0.5 font-mono text-[15px] font-bold text-text-primary">
          {material ? `${material.vc_min}–${material.vc_max}` : "—"} m/min
        </div>
      </div>
    </div>
  );
}

function MaterialCard({
  material,
  selected,
  onSelect,
}: {
  material: MaterialGlobal;
  selected: boolean;
  onSelect: (mat: MaterialGlobal) => void;
}) {
  const isoGroup = parseIsoGroup(material.grupo_iso);
  const style = isoGroup ? ISO_GROUP_STYLES[isoGroup] : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(material)}
      aria-pressed={selected}
      className={`group relative flex flex-1 basis-[240px] flex-col overflow-hidden rounded-xl border text-left transition-colors
        ${
          selected
            ? "border-violet-500 bg-violet-950/40 ring-2 ring-violet-500/25"
            : "border-border bg-bg-surface hover:border-border/60 hover:bg-bg-elevated"
        }`}
    >
      <div className={`h-[5px] w-full flex-shrink-0 ${style ? style.bg : "bg-bg-elevated"}`} />

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
              {material.categoria}
            </div>
            <div
              className={`mt-0.5 text-[17px] font-bold leading-tight ${
                selected ? "text-violet-300" : "text-text-primary"
              }`}
            >
              {material.nombre}
            </div>
          </div>
          {selected && (
            <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-violet-500 ring-[3px] ring-violet-500/20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2">
          {isoGroup && (
            <span
              className={`flex h-[22px] w-[26px] flex-shrink-0 items-center justify-center rounded-md font-mono text-[13px] font-extrabold ${style!.bg} ${style!.text}`}
            >
              {isoGroup}
            </span>
          )}
          <span className="font-mono text-[13px] font-semibold text-text-muted">
            Vc {material.vc_min}–{material.vc_max}
          </span>
          <span className="font-mono text-[11px] text-text-muted/60">m/min</span>
        </div>
      </div>
    </button>
  );
}

function CategorySection({
  category,
  materials,
  selectedId,
  onSelect,
}: {
  category: string;
  materials: MaterialGlobal[];
  selectedId: number | null;
  onSelect: (mat: MaterialGlobal) => void;
}) {
  return (
    <div className="mb-7">
      <div className="mb-3 flex items-baseline gap-2.5 border-b border-border pb-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">
          {category}
        </h2>
        <span className="text-xs text-text-muted">{materials.length} materiales</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {materials.map((m) => (
          <MaterialCard
            key={m.id_material}
            material={m}
            selected={m.id_material === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

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
      setStep("stock");
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
          prevStep="montaje"
          nextStep="stock"
          canAdvance={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with ISO Legend */}
      <div className="flex flex-wrap items-start justify-between gap-4 md:gap-6">
        <div>
          <h2 className="text-base md:text-lg font-bold text-text-primary">
            Selecciona el Material
          </h2>
          <p className="mt-1 text-xs md:text-sm text-text-muted">
            Catálogo agrupado por categoría · código de color ISO 513 por grupo de material
          </p>
        </div>
        <IsoLegend />
      </div>

      {/* Selected Material Bar */}
      <SelectedMaterialBar material={material} />

      {/* Catálogo por categorías */}
      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
        {Object.entries(materialesPorCategoria)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([categoria, mats]) => (
            <CategorySection
              key={categoria}
              category={categoria}
              materials={mats}
              selectedId={material?.id_material || null}
              onSelect={handleSelectMaterial}
            />
          ))}
      </div>

      {/* Navegación */}
      <WizardNavButtons
        prevStep="montaje"
        nextStep="stock"
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
