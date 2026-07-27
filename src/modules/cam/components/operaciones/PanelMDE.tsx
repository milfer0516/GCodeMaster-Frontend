// src/modules/cam/components/operaciones/PanelMDE.tsx
// ─────────────────────────────────────────────────────────────────────────────
// El MDE, hecho visible.
//
// TODO lo que se pinta aquí sale de `mde_recommendations` (el MDEOutput
// serializado por el motor) y del inventario del taller. Este componente NO
// razona: no elige herramienta, no puntúa confianza, no deduce un estado y no
// completa un campo ausente. Si el motor no lo dijo, aquí no aparece.
//
// LO QUE NO SE MUESTRA, Y POR QUÉ:
//   · Vida restante / % de desgaste — el seguimiento de desgaste está aplazado;
//     no hay dato real detrás. Un porcentaje inventado se convierte en una
//     decisión de taller.
//   · Tiempo estimado (total o por operación) — el MDE no lo calcula hoy. El
//     propio motor devuelve {"status":"not_evaluated","reason":"no_validated_model"}
//     para calidad superficial y productividad. Lo único que sí afirma sobre
//     tiempo es una DIRECCIÓN ("más tiempo") y, cuando es geometría pura, una
//     cota inferior de pasadas: eso se muestra tal cual, sin convertirlo a
//     minutos.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleSlash,
  Loader2,
  PlusCircle,
  RefreshCw,
  Wrench,
} from "lucide-react";
import {
  TEXTO_ESTADO,
  TEXTO_HECHO,
  TEXTO_LIMITACION,
  TEXTO_RIESGO,
  TEXTO_VENTAJA,
  alternativasDe,
  herramientaIdeal,
  impactoTiempo,
  limitacionPrincipal,
  nombreToolType,
  textoDe,
  type AlternativaMDE,
  type RecomendacionMDE,
} from "../../domain/mdeRecomendaciones";
import { tipoOperacionLabel, tipoOperacionPunto } from "../../domain/tiposOperacion";
import {
  buscarHerramientaFisica,
  numeroT,
  type HerramientaFisica,
} from "../../domain/herramientasOperacion";
import { HerramientaMDE3D } from "./HerramientaMDE3D";
import type { EstadoAnalisisMDE, Operacion } from "../../store/camStore";

interface Props {
  operacion: Operacion | null;
  recomendacion: RecomendacionMDE | null;
  inventario: HerramientaFisica[];
  estado: EstadoAnalisisMDE;
  error: string | null;
  /** Motivo que dio el motor cuando la consulta no se pudo hacer. */
  motivoNoDisponible: string | null;
  onSolicitarAnalisis: () => void;
  onUsarAlternativa: (herramienta: HerramientaFisica) => void;
  onRegistrarHerramienta: (toolType: string | null, diametroMm: number | null) => void;
  onIgnorarOperacion: () => void;
}

export function PanelMDE({
  operacion,
  recomendacion,
  inventario,
  estado,
  error,
  motivoNoDisponible,
  onSolicitarAnalisis,
  onUsarAlternativa,
  onRegistrarHerramienta,
  onIgnorarOperacion,
}: Props) {
  const [porQueAbierto, setPorQueAbierto] = useState(false);

  if (!operacion) {
    return (
      <Aviso icono={<Wrench className="h-5 w-5" />}>
        Elige una operación en la lista o haz doble clic en una cara de la pieza.
      </Aviso>
    );
  }

  const ideal = herramientaIdeal(recomendacion);
  const alternativas = alternativasDe(recomendacion);
  const fisicaIdeal = buscarHerramientaFisica(
    inventario,
    ideal?.tipo,
    ideal?.diametro_mm,
  );

  return (
    <div className="space-y-3 p-3">
      {/* ── Operación enfocada ── */}
      <div>
        <p className="break-words text-sm font-semibold leading-snug text-text-primary">
          {operacion.descripcion}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-[10px] text-text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${tipoOperacionPunto(operacion.tipo)}`} />
            {tipoOperacionLabel(operacion.tipo)}
          </span>
          <span className="rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-[10px] text-text-muted">
            Setup {operacion.setup}
          </span>
          {recomendacion && (
            <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-2 py-0.5 text-[10px] text-accent-blue">
              {TEXTO_ESTADO[recomendacion.status]}
              {" · "}
              {Math.round(recomendacion.confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* ── Sin análisis: se dice, no se rellena ── */}
      {!recomendacion && (
        <EstadoSinRecomendacion
          estado={estado}
          error={error}
          motivoNoDisponible={motivoNoDisponible}
          onSolicitarAnalisis={onSolicitarAnalisis}
        />
      )}

      {recomendacion && (
        <>
          {/* ── Herramienta recomendada ── */}
          <section className="rounded-xl border border-border bg-bg-primary p-2.5">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Herramienta recomendada
            </h4>

            {!ideal ? (
              <p className="text-[11px] text-text-muted">
                El motor no reportó herramienta ideal para esta operación.
              </p>
            ) : (
              <>
                <div className="flex gap-2.5">
                  <HerramientaMDE3D
                    toolType={ideal.tipo ?? ideal.familias[0]}
                    diametroMm={ideal.diametro_mm}
                    longitudUtilMm={fisicaIdeal?.longitud_util_real_mm}
                    className="h-24 w-24 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words text-[12px] font-medium text-text-primary">
                      {nombreToolType(ideal.tipo ?? ideal.familias[0])}
                    </p>
                    {ideal.diametro_mm != null && (
                      <p className="font-mono text-[11px] text-text-muted">
                        Ø{ideal.diametro_mm} mm
                      </p>
                    )}
                    {fisicaIdeal?.longitud_util_real_mm != null && (
                      <p className="font-mono text-[11px] text-text-muted">
                        Longitud útil {fisicaIdeal.longitud_util_real_mm} mm
                      </p>
                    )}
                    <Disponibilidad ideal={ideal} fisica={fisicaIdeal} />
                  </div>
                </div>

                {ideal.familias.length > 1 && (
                  <p className="mt-2 text-[10px] text-text-muted">
                    Familias válidas:{" "}
                    {ideal.familias.map((f) => nombreToolType(f)).join(" · ")}
                  </p>
                )}

                {ideal.disponibilidad !== "disponible" && (
                  <button
                    onClick={() =>
                      onRegistrarHerramienta(
                        ideal.tipo ?? ideal.familias[0] ?? null,
                        ideal.diametro_mm ?? null,
                      )
                    }
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-blue px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-accent-blue/90"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Registrar herramienta
                  </button>
                )}
              </>
            )}
          </section>

          {/* ── Alternativas ── */}
          {alternativas.length > 0 && (
            <section className="space-y-1.5">
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                Alternativas
              </h4>
              {alternativas.map((alt, i) => (
                <FichaAlternativa
                  key={`${alt.tool_type}-${alt.diameter_mm}-${i}`}
                  alternativa={alt}
                  fisica={buscarHerramientaFisica(
                    inventario,
                    alt.tool_type,
                    alt.diameter_mm,
                  )}
                  onUsar={onUsarAlternativa}
                />
              ))}
            </section>
          )}

          {/* ── ¿Por qué? — la evidencia estructurada, tal cual ── */}
          <section className="rounded-xl border border-border bg-bg-primary">
            <button
              onClick={() => setPorQueAbierto((v) => !v)}
              aria-expanded={porQueAbierto}
              className="flex w-full items-center justify-between px-2.5 py-2 text-[11px] font-medium text-text-primary"
            >
              <span>¿Por qué?</span>
              <span className="flex items-center gap-1 text-text-muted">
                {recomendacion.evidence.length} hecho
                {recomendacion.evidence.length === 1 ? "" : "s"}
                {porQueAbierto ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </span>
            </button>

            {porQueAbierto && (
              <div className="space-y-2 border-t border-border px-2.5 py-2">
                {recomendacion.was_conflict && (
                  <p className="rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-2 py-1 text-[10px] text-accent-amber">
                    Dos reglas discreparon; el motor resolvió el conflicto.
                  </p>
                )}
                {recomendacion.evidence.map((hecho, i) => (
                  <div key={`${hecho.rule_id}-${i}`} className="space-y-0.5">
                    <p className="break-words text-[11px] text-text-primary">
                      {textoDe(TEXTO_HECHO, hecho.code)}
                    </p>
                    <p className="font-mono text-[9px] text-text-muted/80">
                      {hecho.rule_id}
                    </p>
                    <DatosHecho datos={hecho.data} />
                  </div>
                ))}
                {recomendacion.evidence.length === 0 && (
                  <p className="text-[10px] text-text-muted">
                    El motor no adjuntó evidencia a esta recomendación.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Acciones ── */}
          <div className="flex gap-1.5">
            <button
              onClick={() =>
                onRegistrarHerramienta(
                  ideal?.tipo ?? ideal?.familias[0] ?? null,
                  ideal?.diametro_mm ?? null,
                )
              }
              className="flex-1 rounded-lg border border-border px-2 py-1.5 text-[10px] text-text-muted transition hover:border-accent-blue/50 hover:text-text-primary"
            >
              Registrar herramienta
            </button>
            <button
              onClick={onIgnorarOperacion}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[10px] text-text-muted transition hover:border-accent-red/50 hover:text-accent-red"
            >
              <CircleSlash className="h-3 w-3" />
              Ignorar operación
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Piezas internas ─────────────────────────────────────────────────────────

function Aviso({
  icono,
  children,
}: {
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-text-muted">
      {icono}
      <p className="text-[11px] leading-relaxed">{children}</p>
    </div>
  );
}

function EstadoSinRecomendacion({
  estado,
  error,
  motivoNoDisponible,
  onSolicitarAnalisis,
}: {
  estado: EstadoAnalisisMDE;
  error: string | null;
  motivoNoDisponible: string | null;
  onSolicitarAnalisis: () => void;
}) {
  if (estado === "analizando") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-primary p-3 text-[11px] text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analizando con el MDE…
      </div>
    );
  }

  // El motor respondió, pero su consulta al MDE no se pudo hacer. Se muestra SU
  // motivo, literal: es información de diagnóstico real.
  if (motivoNoDisponible) {
    return (
      <div className="space-y-2 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent-amber">
          <AlertTriangle className="h-3.5 w-3.5" />
          El motor no pudo consultar al MDE
        </p>
        <p className="break-words text-[10px] text-text-muted">{motivoNoDisponible}</p>
        <BotonAnalizar onClick={onSolicitarAnalisis} etiqueta="Reintentar análisis" />
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div className="space-y-2 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent-red">
          <AlertTriangle className="h-3.5 w-3.5" />
          No se pudo obtener el análisis
        </p>
        {error && <p className="break-words text-[10px] text-text-muted">{error}</p>}
        <BotonAnalizar onClick={onSolicitarAnalisis} etiqueta="Reintentar análisis" />
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-bg-primary p-3">
      <p className="text-[11px] text-text-primary">
        Todavía no hay análisis del MDE para esta operación.
      </p>
      <p className="text-[10px] leading-relaxed text-text-muted">
        Sin él no se muestra herramienta recomendada ni alternativas: el paso no
        rellena lo que el motor no ha dicho.
      </p>
      <BotonAnalizar onClick={onSolicitarAnalisis} etiqueta="Analizar con el MDE" />
    </div>
  );
}

function BotonAnalizar({
  onClick,
  etiqueta,
}: {
  onClick: () => void;
  etiqueta: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent-blue/40 px-3 py-1.5 text-[11px] font-medium text-accent-blue transition hover:bg-accent-blue/10"
    >
      <RefreshCw className="h-3.5 w-3.5" />
      {etiqueta}
    </button>
  );
}

function Disponibilidad({
  ideal,
  fisica,
}: {
  ideal: NonNullable<ReturnType<typeof herramientaIdeal>>;
  fisica: HerramientaFisica | null;
}) {
  const t = numeroT(fisica);

  if (ideal.disponibilidad === "disponible") {
    return (
      <p className="text-[10px] text-accent-green">
        Disponible
        {t && <span className="font-mono text-text-primary"> · {t}</span>}
        {!t && fisica && " · sin alojamiento en el carrusel"}
      </p>
    );
  }
  if (ideal.disponibilidad === "en_mantenimiento") {
    return (
      <p className="text-[10px] text-accent-amber">
        En mantenimiento
        {ideal.diametros_mantenimiento?.length
          ? ` · Ø${ideal.diametros_mantenimiento.join(" / Ø")} mm`
          : ""}
      </p>
    );
  }
  return <p className="text-[10px] text-accent-red">No disponible en el taller</p>;
}

function FichaAlternativa({
  alternativa,
  fisica,
  onUsar,
}: {
  alternativa: AlternativaMDE;
  fisica: HerramientaFisica | null;
  onUsar: (herramienta: HerramientaFisica) => void;
}) {
  const limitacion = limitacionPrincipal(alternativa);
  const tiempo = impactoTiempo(alternativa);
  const t = numeroT(fisica);

  return (
    <div className="rounded-xl border border-border bg-bg-primary p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-[11px] font-medium text-text-primary">
            {nombreToolType(alternativa.tool_type)}
          </p>
          <p className="font-mono text-[10px] text-text-muted">
            Ø{alternativa.diameter_mm} mm
          </p>
        </div>
        <div className="shrink-0 text-right">
          {fisica ? (
            <p className="text-[10px] text-accent-green">
              En inventario
              {t && <span className="font-mono text-text-primary"> · {t}</span>}
            </p>
          ) : (
            <p className="text-[10px] text-text-muted">No está en el inventario</p>
          )}
        </div>
      </div>

      {/* La limitación, en UNA línea — la que reportó el motor. */}
      {limitacion && (
        <p className="mt-1 break-words text-[10px] text-accent-amber">{limitacion}</p>
      )}

      {alternativa.advantages?.length > 0 && (
        <p className="mt-1 break-words text-[10px] text-text-muted">
          {alternativa.advantages
            .map((c) => textoDe(TEXTO_VENTAJA, c))
            .join(" · ")}
        </p>
      )}

      {alternativa.risks?.length > 0 && (
        <p className="mt-1 break-words text-[10px] text-accent-red/90">
          {alternativa.risks.map((c) => textoDe(TEXTO_RIESGO, c)).join(" · ")}
        </p>
      )}

      {/* Dirección del impacto en tiempo, nunca minutos. */}
      {tiempo && <p className="mt-1 text-[10px] text-text-muted">{tiempo}</p>}

      {alternativa.limitations?.length > 1 && (
        <p className="mt-1 break-words text-[9px] text-text-muted/80">
          {alternativa.limitations
            .slice(1)
            .map((c) => textoDe(TEXTO_LIMITACION, c))
            .join(" · ")}
        </p>
      )}

      {fisica && (
        <button
          onClick={() => onUsar(fisica)}
          className="mt-2 w-full rounded-lg border border-accent-blue/40 px-2 py-1.5 text-[10px] font-medium text-accent-blue transition hover:bg-accent-blue/10"
        >
          Usar esta alternativa
        </button>
      )}
    </div>
  );
}

/**
 * Los datos crudos del hecho, en pares clave/valor. Se muestran tal cual los
 * mandó el motor: son la trazabilidad, y reescribirlos sería reinterpretar la
 * evidencia. Los objetos anidados (p. ej. `alternative`) se omiten aquí porque
 * ya tienen su propia ficha arriba.
 */
function DatosHecho({ datos }: { datos: Record<string, any> }) {
  const pares = Object.entries(datos ?? {}).filter(
    ([clave, valor]) =>
      clave !== "operation" && valor !== null && typeof valor !== "object",
  );
  if (pares.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
      {pares.map(([clave, valor]) => (
        <div key={clave} className="col-span-2 flex gap-1.5">
          <dt className="shrink-0 font-mono text-[9px] text-text-muted/80">{clave}</dt>
          <dd className="break-all font-mono text-[9px] text-text-primary">
            {String(valor)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
