// src/modules/cam/components/sujecion/PasoConfigElemento.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Paso 2 del modal de sujeción: el formulario del MONTAJE.
//
// NO hay ni un campo escrito a mano por familia. Se pide el schema de la
// familia del utillaje elegido (GET /utillajes/familias/{familia}) y se pinta
// lo que venga en `campos_montaje`: tipo numero/opcion/opcion_multiple/texto/
// puntos_xy, con visible_si, ayuda y advertencia incluidos. Una familia nueva
// publicada en el backend aparece aquí sola, sin tocar el frontend.
//
// Al confirmar, domain/camposMontaje reparte los valores:
//   campos con medida_desde → envolvente (cotas medidas, contrato T2)
//   el resto                → parametros_montaje (claves = nombre del campo;
//                             puntos_xy → lista de {x_mm, y_mm})
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import type { Maquina } from "../../../../services/maquinasService";
import type { SujecionConfig } from "../../store/camStore";
import {
  getFamiliaSchema,
  type CampoSchema,
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

interface Props {
  utillaje: UtillajeResumen;
  dimensiones: { x: number; y: number; z: number };
  maquina: Maquina;
  onBack: () => void;
  onConfirm: (config: Partial<SujecionConfig>) => void;
}

type FilaPunto = { x_mm: string; y_mm: string };

const inputCls =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none";

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

  // ── Editor del tipo puntos_xy (lista de {x_mm, y_mm}) ──────────────────
  const renderPuntosXY = (campo: CampoSchema) => {
    const filas = (valores[campo.nombre] as FilaPunto[] | undefined) ?? [];

    const setFilas = (nuevas: FilaPunto[]) => setValor(campo.nombre, nuevas);

    const repartir = () => {
      const n = filas.length > 0 ? filas.length : 4;
      setFilas(
        distribuirPuntosAlrededor(
          n,
          dimensiones.x,
          dimensiones.y,
          holguraPieza,
        ).map((p) => ({ x_mm: String(p.x_mm), y_mm: String(p.y_mm) })),
      );
    };

    return (
      <div className="space-y-2">
        {filas.map((fila, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              value={fila.x_mm}
              onChange={(e) =>
                setFilas(
                  filas.map((f, j) =>
                    j === i ? { ...f, x_mm: e.target.value } : f,
                  ),
                )
              }
              placeholder="x_mm"
              aria-label={`${campo.etiqueta} — punto ${i + 1} x_mm`}
              className={inputCls}
            />
            <input
              type="number"
              value={fila.y_mm}
              onChange={(e) =>
                setFilas(
                  filas.map((f, j) =>
                    j === i ? { ...f, y_mm: e.target.value } : f,
                  ),
                )
              }
              placeholder="y_mm"
              aria-label={`${campo.etiqueta} — punto ${i + 1} y_mm`}
              className={inputCls}
            />
            <button
              onClick={() => setFilas(filas.filter((_, j) => j !== i))}
              aria-label={`Quitar punto ${i + 1}`}
              className="shrink-0 rounded-lg p-2 text-text-muted hover:text-red-400 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            onClick={() => setFilas([...filas, { x_mm: "", y_mm: "" }])}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-text-muted transition hover:border-accent-blue/50 hover:text-accent-blue"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir punto
          </button>
          <button
            onClick={repartir}
            className="flex-1 rounded-lg border border-border py-2 text-xs text-text-muted transition hover:border-accent-blue/50 hover:text-accent-blue"
          >
            Repartir {filas.length > 0 ? filas.length : 4} alrededor de la
            pieza (holgura {holguraPieza}mm)
          </button>
        </div>
      </div>
    );
  };

  // ── Un campo del schema → su control ─────────────────────────────────────
  const renderCampo = (campo: CampoSchema) => {
    const id = `campo-${campo.nombre}`;
    const valor = valores[campo.nombre];

    let control: React.ReactNode;
    switch (campo.tipo) {
      case "numero":
        control = (
          <input
            id={id}
            type="number"
            value={(valor as string) ?? ""}
            min={campo.minimo ?? undefined}
            max={campo.maximo ?? undefined}
            onChange={(e) => setValor(campo.nombre, e.target.value)}
            className={inputCls}
          />
        );
        break;
      case "texto":
        control = (
          <input
            id={id}
            type="text"
            value={(valor as string) ?? ""}
            onChange={(e) => setValor(campo.nombre, e.target.value)}
            className={inputCls}
          />
        );
        break;
      case "opcion":
        control = (
          <select
            id={id}
            value={(valor as string) ?? ""}
            onChange={(e) => setValor(campo.nombre, e.target.value)}
            className={inputCls}
          >
            <option value="">Seleccionar…</option>
            {(campo.opciones ?? []).map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        );
        break;
      case "opcion_multiple": {
        const elegidas = (valor as string[] | undefined) ?? [];
        control = (
          <div className="flex gap-2" role="group" aria-label={campo.etiqueta}>
            {(campo.opciones ?? []).map((op) => {
              const activa = elegidas.includes(op);
              return (
                <button
                  key={op}
                  aria-pressed={activa}
                  onClick={() =>
                    setValor(
                      campo.nombre,
                      activa
                        ? elegidas.filter((e) => e !== op)
                        : [...elegidas, op],
                    )
                  }
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    activa
                      ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                      : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/40"
                  }`}
                >
                  {op}
                </button>
              );
            })}
          </div>
        );
        break;
      }
      case "puntos_xy":
        control = renderPuntosXY(campo);
        break;
    }

    return (
      <div key={campo.nombre}>
        <label
          htmlFor={campo.tipo === "puntos_xy" ? undefined : id}
          className="text-xs font-medium text-text-primary block mb-1"
        >
          {campo.etiqueta}
          {campo.unidad ? ` (${campo.unidad})` : ""}
          {campo.obligatorio ? "" : " — opcional"}
        </label>
        {control}
        {campo.ayuda && (
          <p className="text-xs text-text-muted mt-0.5">{campo.ayuda}</p>
        )}
        {campo.advertencia && (
          <div className="mt-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">
            {campo.advertencia}
          </div>
        )}
      </div>
    );
  };

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

      {campos.map(renderCampo)}

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
