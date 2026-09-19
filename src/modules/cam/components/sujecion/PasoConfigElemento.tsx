// src/modules/cam/components/sujecion/PasoConfigElemento.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Paso 2 del modal de sujeción: el formulario del MONTAJE.
//
// NO hay ni un campo escrito a mano por familia. Se pide el schema de la
// familia del utillaje elegido (GET /utillajes/familias/{familia}) y se pinta
// lo que venga en `campos_montaje` con el renderizador COMPARTIDO
// (CamposSchemaForm): tipo numero/opcion/opcion_multiple/texto/puntos_xy, con
// visible_si, ayuda y advertencia incluidos. Una familia nueva publicada en el
// backend aparece aquí sola, sin tocar el frontend.
//
// Al confirmar, domain/camposMontaje reparte los valores:
//   campos con medida_desde → envolvente (cotas medidas, contrato T2)
//   el resto                → parametros_montaje (claves = nombre del campo;
//                             puntos_xy → lista de {x_mm, y_mm})
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Maquina } from "../../../../services/maquinasService";
import type { SujecionConfig } from "../../store/camStore";
import {
  getFamiliaSchema,
  type FamiliaSchema,
  type UtillajeResumen,
} from "../../services/utillajesService";
import {
  camposIncompletos,
  camposVisibles,
  construirParametrosYEnvolvente,
  distribuirPuntosAlrededor,
  type ValoresCampos,
} from "../../domain/camposMontaje";
import { CamposSchemaForm } from "./CamposSchemaForm";

interface Props {
  utillaje: UtillajeResumen;
  dimensiones: { x: number; y: number; z: number };
  maquina: Maquina;
  onBack: () => void;
  onConfirm: (config: Partial<SujecionConfig>) => void;
}

export const PasoConfigElemento = ({
  utillaje,
  dimensiones,
  maquina,
  onBack,
  onConfirm,
}: Props) => {
  const [schema, setSchema] = useState<FamiliaSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [valores, setValores] = useState<ValoresCampos>({});

  useEffect(() => {
    let vivo = true;
    getFamiliaSchema(utillaje.familia)
      .then((s) => {
        if (vivo) setSchema(s);
      })
      .catch(() => {
        if (vivo)
          setError(
            `No se pudo cargar el schema de la familia '${utillaje.familia}'.`,
          );
      });
    return () => {
      vivo = false;
    };
  }, [utillaje.familia]);

  const setValor = (nombre: string, valor: unknown) =>
    setValores((v) => ({ ...v, [nombre]: valor }));

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition"
        >
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>
      </div>
    );
  }

  if (!schema) {
    return (
      <p className="text-sm text-text-muted">
        Cargando formulario de la familia…
      </p>
    );
  }

  const campos = camposVisibles(schema.campos_montaje, valores);
  const incompletos = camposIncompletos(schema.campos_montaje, valores);

  const holguraPieza =
    Math.ceil((maquina.diametro_herramienta_max_mm ?? 80) / 2) + 5;

  const handleConfirm = () => {
    const { parametros_montaje, envolvente } = construirParametrosYEnvolvente(
      schema.campos_montaje,
      valores,
    );
    onConfirm({
      familia: schema.familia,
      id_utillaje: utillaje.id_utillaje,
      nombre_utillaje: utillaje.nombre,
      etiqueta_familia: schema.etiqueta,
      parametros_montaje,
      envolvente,
      obstaculos: [],
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-bg-primary px-4 py-3">
        <p className="text-sm font-semibold text-text-primary">
          {utillaje.nombre}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{schema.descripcion}</p>
      </div>

      {schema.advertencias.map((a, i) => (
        <div
          key={i}
          className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500"
        >
          {a}
        </div>
      ))}

      <CamposSchemaForm
        campos={campos}
        valores={valores}
        onCambiarValor={setValor}
        accionesPuntosXY={({ filas, setFilas }) => (
          <button
            type="button"
            onClick={() =>
              setFilas(
                distribuirPuntosAlrededor(
                  filas.length > 0 ? filas.length : 4,
                  dimensiones.x,
                  dimensiones.y,
                  holguraPieza,
                ).map((p) => ({ x_mm: String(p.x_mm), y_mm: String(p.y_mm) })),
              )
            }
            className="flex-1 rounded-lg border border-border py-2 text-xs text-text-muted transition hover:border-accent-blue/50 hover:text-accent-blue"
          >
            Repartir {filas.length > 0 ? filas.length : 4} alrededor de la
            pieza (holgura {holguraPieza}mm)
          </button>
        )}
      />

      {incompletos.length > 0 && (
        <p className="text-xs text-text-muted">
          Faltan campos obligatorios:{" "}
          {incompletos.map((c) => c.etiqueta).join(", ")}.
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
          onClick={handleConfirm}
          disabled={incompletos.length > 0}
          className="rounded-xl bg-accent-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};
