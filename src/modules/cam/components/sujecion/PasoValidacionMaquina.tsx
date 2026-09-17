// src/modules/cam/components/sujecion/PasoValidacionMaquina.tsx
import { ChevronLeft, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { Maquina } from "../../../../services/maquinasService";
import type { SujecionConfig } from "../../store/camStore";
import { alturaTotalDeclarada } from "../../domain/camposMontaje";

// Solo validaciones GENÉRICAS contra la máquina (espacio libre en Z, recorrido
// XY). Las reglas por familia (apertura de prensa, holgura de bridas,
// ferromagnetismo) ya no se codifican aquí: los campos y su obligatoriedad los
// define el schema de la familia (backend) y la validación fina la hace el
// gateway/motor contra ese mismo schema.

type Severidad = "ok" | "warn" | "error";

interface Validacion {
  label: string;
  detalle: string;
  severidad: Severidad;
}

function calcularValidaciones(
  cfg: SujecionConfig,
  maq: Maquina,
  dim: { x: number; y: number; z: number },
): Validacion[] {
  const resultado: Validacion[] = [];

  const largoHerramientaMax = maq.largo_herramienta_max_mm ?? 300;
  // Espacio libre seguro en Z = recorrido total − largo máx de herramienta.
  // La altura del montaje se DERIVA de las cotas medidas declaradas (lo más
  // alto entre la cara superior de la pieza y el punto más alto del amarre).
  const umbralZ = maq.recorrido_z_mm - largoHerramientaMax;
  const alturaTotal = alturaTotalDeclarada(cfg.envolvente);

  // R1 — Restricción espacio libre en Z (colisión husillo/ATC)
  if (alturaTotal > umbralZ) {
    resultado.push({
      label: "Espacio libre en Z",
      detalle: `El montaje compromete el espacio seguro para herramientas largas (Máx ${largoHerramientaMax}mm). Altura actual ${Math.round(alturaTotal)}mm supera el límite de ${umbralZ}mm (recorrido ${maq.recorrido_z_mm}mm − herramienta ${largoHerramientaMax}mm). Verifique las alturas de paralelas o mordazas.`,
      severidad: "warn",
    });
  } else {
    resultado.push({
      label: "Espacio libre en Z",
      detalle: `${Math.round(alturaTotal)}mm de montaje ≤ ${umbralZ}mm límite seguro (recorrido ${maq.recorrido_z_mm}mm − herramienta ${largoHerramientaMax}mm).`,
      severidad: "ok",
    });
  }

  // R2 — Dimensiones de pieza vs recorrido XY de la máquina
  if (dim.x > maq.recorrido_x_mm || dim.y > maq.recorrido_y_mm) {
    resultado.push({
      label: "Recorrido XY",
      detalle: `Pieza ${Math.round(dim.x)}×${Math.round(dim.y)}mm excede el recorrido ${maq.recorrido_x_mm}×${maq.recorrido_y_mm}mm de la máquina.`,
      severidad: "error",
    });
  } else {
    resultado.push({
      label: "Recorrido XY",
      detalle: `Pieza ${Math.round(dim.x)}×${Math.round(dim.y)}mm dentro del recorrido ${maq.recorrido_x_mm}×${maq.recorrido_y_mm}mm.`,
      severidad: "ok",
    });
  }

  return resultado;
}

const Icono: Record<Severidad, React.ReactNode> = {
  ok: <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />,
  warn: <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />,
  error: <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />,
};

const BgCls: Record<Severidad, string> = {
  ok: "bg-green-500/8 border-green-500/20",
  warn: "bg-yellow-500/10 border-yellow-500/30",
  error: "bg-red-500/10 border-red-500/30",
};

interface Props {
  config: SujecionConfig;
  maquina: Maquina;
  dimensiones: { x: number; y: number; z: number };
  onBack: () => void;
  onConfirm: (config: SujecionConfig) => void;
}

export const PasoValidacionMaquina = ({
  config,
  maquina,
  dimensiones,
  onBack,
  onConfirm,
}: Props) => {
  const validaciones = calcularValidaciones(config, maquina, dimensiones);
  const tieneErrores = validaciones.some((v) => v.severidad === "error");

  return (
    <div className="space-y-4">
      {/* Resumen de máquina */}
      <div className="rounded-xl border border-border bg-bg-primary px-4 py-3 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Máquina activa
        </p>
        <p className="text-sm font-semibold text-text-primary">{maquina.nombre}</p>
        <p className="text-xs text-text-muted">
          {maquina.marca} {maquina.modelo} · {maquina.controlador}{" "}
          {maquina.controlador_modelo}
        </p>
        <p className="text-xs text-text-muted">
          Recorrido: {maquina.recorrido_x_mm}×{maquina.recorrido_y_mm}×
          {maquina.recorrido_z_mm}mm &nbsp;·&nbsp; Z rápido:{" "}
          {(maquina.rapido_z_mmmin / 1000).toFixed(0)}m/min &nbsp;·&nbsp; Ø
          {maquina.diametro_herramienta_max_mm ?? "—"}mm max
        </p>
        <p className="text-xs font-medium text-text-primary pt-0.5">
          Sujeción: {config.nombre_utillaje ?? ""}
          {config.nombre_utillaje ? " · " : ""}
          {config.etiqueta_familia ?? config.familia}
        </p>
      </div>

      {/* Validaciones */}
      <div className="space-y-2">
        {validaciones.map((v, i) => (
          <div
            key={i}
            className={`flex gap-2.5 rounded-lg border px-3 py-2.5 ${BgCls[v.severidad]}`}
          >
            {Icono[v.severidad]}
            <div>
              <p className="text-xs font-semibold text-text-primary leading-tight">
                {v.label}
              </p>
              <p className="text-xs text-text-muted leading-snug mt-0.5">
                {v.detalle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {tieneErrores && (
        <p className="text-center text-xs text-red-400">
          Corrija los errores antes de continuar.
        </p>
      )}

      <div className="flex justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition"
        >
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>
        <button
          disabled={tieneErrores}
          onClick={() => onConfirm(config)}
          className="rounded-xl bg-accent-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Insertar en visor
        </button>
      </div>
    </div>
  );
};
