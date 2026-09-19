// src/modules/utillajes/components/RegistroUtillaje.tsx
// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO DE UN UTILLAJE EN EL PARQUE — componente reutilizable con DOS vías:
//
//   a) "Usar plantilla": selección en DOS pasos — primero la familia (tarjetas
//      agrupadas del propio catálogo, con su etiqueta y cuántas plantillas
//      tiene), luego solo las plantillas de ESA familia, con vuelta atrás.
//      Se le pone nombre y se copia con POST /utillajes/desde-plantilla. NO se
//      envía `parametros`: sin él el backend copia las medidas de la plantilla
//      tal cual (utillajes_routes.py:284), que es exactamente lo que pide la vía.
//
//   b) "Manual": se elige la familia, se pide su schema
//      (GET /utillajes/familias/{familia}) y se pintan los `campos_utillaje`
//      con el MISMO renderizador del formulario de montaje
//      (CamposSchemaForm) — ni un campo escrito a mano por familia. Se envía
//      POST /utillajes/manual con { nombre, familia, parametros, notas? }.
//
// ESCALABILIDAD: una familia nueva publicada en el backend aparece sola en el
// selector y su formulario se genera del schema. CERO cambios de frontend.
//
// ERRORES (contrato trazado en el código del backend):
//   422 parámetros: detail = { mensaje, familia, errores: [{campo, motivo}] }
//                   (utillajes_routes.py:94-102) → se pinta junto a cada campo.
//   422 envoltura:  detail = [{loc, msg, type}] (Pydantic) → mensaje general.
//   404/400:        detail = string → mensaje general.
//
// MONTAJE: se monta inline en UtillajesPage y en un modal desde el aviso de
// "parque vacío" del wizard. En ambos casos `onRegistrado` se invoca con el
// MensajeUtillaje (201) para que el contenedor refresque el parque.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CopyPlus, Wrench } from "lucide-react";
import {
  crearUtillajeDesdePlantilla,
  crearUtillajeManual,
  getCatalogoGlobal,
  getFamiliasUtillaje,
  getFamiliaSchema,
  type CatalogoGlobal,
  type ErrorCampoUtillaje,
  type FamiliaResumen,
  type FamiliaSchema,
  type MensajeUtillaje,
  type PlantillaGlobal,
} from "../../cam/services/utillajesService";
import {
  camposIncompletos,
  camposVisibles,
  construirParametrosUtillaje,
  type ValoresCampos,
} from "../../cam/domain/camposMontaje";
import { CamposSchemaForm } from "../../cam/components/sujecion/CamposSchemaForm";

interface Props {
  /** 201 del backend: el utillaje ya existe en el parque. */
  onRegistrado?: (resultado: MensajeUtillaje) => void;
  onCancelar?: () => void;
  /** Vía activa al abrir (por defecto "plantilla"). Las dos pestañas siguen
   *  disponibles; solo cambia con cuál arranca. */
  modoInicial?: Modo;
}

type Modo = "plantilla" | "manual";

const inputCls =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none";

// ── Traducción del error HTTP al contrato del backend ────────────────────────
function describirError(e: unknown): {
  mensaje: string;
  errores: ErrorCampoUtillaje[];
} {
  const detail = (e as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;

  // 422 de validación de parámetros contra el schema de la familia.
  if (
    detail &&
    typeof detail === "object" &&
    !Array.isArray(detail) &&
    Array.isArray((detail as { errores?: unknown }).errores)
  ) {
    const d = detail as { mensaje?: string; errores: ErrorCampoUtillaje[] };
    return {
      mensaje: d.mensaje ?? "Los parámetros no cumplen el schema de la familia.",
      errores: d.errores,
    };
  }
  // 404 / 400 con mensaje de texto.
  if (typeof detail === "string") return { mensaje: detail, errores: [] };
  // 422 de la envoltura Pydantic (nombre/familia mal formados).
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((it) =>
        typeof it === "object" && it !== null && "msg" in it
          ? String((it as { msg: unknown }).msg)
          : null,
      )
      .filter((m): m is string => !!m);
    return {
      mensaje: msgs.join(" · ") || "La solicitud no es válida.",
      errores: [],
    };
  }
  return { mensaje: "No se pudo registrar el utillaje.", errores: [] };
}

export const RegistroUtillaje = ({
  onRegistrado,
  onCancelar,
  modoInicial = "plantilla",
}: Props) => {
  const [modo, setModo] = useState<Modo>(modoInicial);

  // ── Estado compartido ────────────────────────────────────────────────────
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>(
    {},
  );

  // ── Vía USAR PLANTILLA ───────────────────────────────────────────────────
  const [catalogo, setCatalogo] = useState<CatalogoGlobal | null>(null);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [plantilla, setPlantilla] = useState<PlantillaGlobal | null>(null);
  // Paso 1 → paso 2: familia elegida dentro del catálogo (null = eligiendo).
  const [familiaSel, setFamiliaSel] = useState<string | null>(null);

  // ── Vía MANUAL ───────────────────────────────────────────────────────────
  const [familias, setFamilias] = useState<FamiliaResumen[] | null>(null);
  const [errorFamilias, setErrorFamilias] = useState<string | null>(null);
  const [familia, setFamilia] = useState<string | null>(null);
  const [schema, setSchema] = useState<FamiliaSchema | null>(null);
  const [valores, setValores] = useState<ValoresCampos>({});

  // Carga perezosa por vía: el catálogo solo se pide al entrar en su pestaña,
  // y una sola vez. Las familias se piden al montar: la pestaña "Usar
  // plantilla" las usa para ETIQUETAR los grupos del catálogo (etiqueta del
  // backend, no texto escrito a mano) y la manual para su selector.
  useEffect(() => {
    let vivo = true;
    if (modo === "plantilla" && catalogo === null && !errorCatalogo) {
      getCatalogoGlobal()
        .then((c) => {
          if (vivo) setCatalogo(c);
        })
        .catch(() => {
          if (vivo)
            setErrorCatalogo("No se pudo cargar el catálogo de plantillas.");
        });
    }
    if (familias === null && !errorFamilias) {
      getFamiliasUtillaje()
        .then((f) => {
          if (vivo) setFamilias(f);
        })
        .catch(() => {
          if (vivo)
            setErrorFamilias("No se pudieron cargar las familias de utillaje.");
        });
    }
    return () => {
      vivo = false;
    };
  }, [modo, catalogo, errorCatalogo, familias, errorFamilias]);

  // Al cambiar de familia se pide su schema y se reinician los valores: las
  // claves de `parametros` son las de ESTA familia, no de la anterior.
  useEffect(() => {
    if (!familia) {
      setSchema(null);
      return;
    }
    let vivo = true;
    setSchema(null);
    setValores({});
    getFamiliaSchema(familia)
      .then((s) => {
        if (vivo) setSchema(s);
      })
      .catch(() => {
        if (vivo)
          setErrorGeneral(
            `No se pudo cargar el schema de la familia '${familia}'.`,
          );
      });
    return () => {
      vivo = false;
    };
  }, [familia]);

  const limpiarErrores = () => {
    setErrorGeneral(null);
    setErroresCampos({});
  };

  const cambiarModo = (m: Modo) => {
    setModo(m);
    limpiarErrores();
  };

  // ── Catálogo agrupado por familia (derivado, nada hardcodeado) ──────────
  // Si el backend publica una plantilla o una familia nueva, aparece sola.
  const plantillasPorFamilia = useMemo(() => {
    const mapa = new Map<string, PlantillaGlobal[]>();
    for (const p of catalogo?.catalogo ?? []) {
      const lista = mapa.get(p.familia) ?? [];
      lista.push(p);
      mapa.set(p.familia, lista);
    }
    return mapa;
  }, [catalogo]);

  // Etiqueta de la familia: la del backend (GET /utillajes/familias) si la
  // tenemos; si no, la clave tal cual. Nunca un texto escrito a mano.
  const etiquetaFamilia = (fam: string) =>
    familias?.find((f) => f.familia === fam)?.etiqueta ?? fam;

  // ── Envío: DESDE PLANTILLA ───────────────────────────────────────────────
  // Cuerpo EXACTO del contrato (utillaje_schema.py:123-135): solo
  // id_utillaje_global es obligatorio; nombre/notas se omiten si están vacíos.
  const registrarDesdePlantilla = async () => {
    if (!plantilla) return;
    setGuardando(true);
    limpiarErrores();
    try {
      const resultado = await crearUtillajeDesdePlantilla({
        id_utillaje_global: plantilla.id_utillaje_global,
        ...(nombre.trim() ? { nombre: nombre.trim() } : {}),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });
      onRegistrado?.(resultado);
    } catch (e) {
      const { mensaje, errores } = describirError(e);
      setErrorGeneral(mensaje);
      setErroresCampos(
        Object.fromEntries(errores.map((er) => [er.campo, er.motivo])),
      );
    } finally {
      setGuardando(false);
    }
  };

  // ── Envío: MANUAL ────────────────────────────────────────────────────────
  // Cuerpo EXACTO del contrato (utillaje_schema.py:110-120): parametros con
  // clave = nombre del campo del schema, sin campos no visibles ni vacíos.
  const registrarManual = async () => {
    if (!schema || !familia || !nombre.trim()) return;
    setGuardando(true);
    limpiarErrores();
    try {
      const resultado = await crearUtillajeManual({
        nombre: nombre.trim(),
        familia,
        parametros: construirParametrosUtillaje(
          schema.campos_utillaje,
          valores,
        ),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });
      onRegistrado?.(resultado);
    } catch (e) {
      const { mensaje, errores } = describirError(e);
      setErrorGeneral(mensaje);
      setErroresCampos(
        Object.fromEntries(errores.map((er) => [er.campo, er.motivo])),
      );
    } finally {
      setGuardando(false);
    }
  };

  const setValor = (nombreCampo: string, valor: unknown) =>
    setValores((v) => ({ ...v, [nombreCampo]: valor }));

  // ── Render: vía DESDE PLANTILLA ──────────────────────────────────────────
  const renderPlantilla = () => {
    if (errorCatalogo) {
      return <p className="text-sm text-red-400">{errorCatalogo}</p>;
    }
    if (catalogo === null) {
      return (
        <p className="text-sm text-text-muted">Cargando catálogo global…</p>
      );
    }
    if (catalogo.catalogo.length === 0) {
      return (
        <p className="text-sm text-text-muted">
          El catálogo global no tiene plantillas activas. Use el registro
          manual.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {catalogo.advertencia_general && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">
            {catalogo.advertencia_general}
          </div>
        )}

        {familiaSel === null ? (
          // ── PASO 1: elegir la FAMILIA (tarjetas derivadas del catálogo) ──
          <div className="space-y-2">
            {[...plantillasPorFamilia.entries()].map(([fam, lista]) => (
              <button
                key={fam}
                type="button"
                onClick={() => {
                  setFamiliaSel(fam);
                  setPlantilla(null);
                  limpiarErrores();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg-primary p-3 text-left transition hover:border-accent-blue/50"
              >
                <p className="text-sm font-semibold text-text-primary">
                  {etiquetaFamilia(fam)}
                </p>
                <span className="shrink-0 font-mono text-xs text-text-muted">
                  {lista.length} plantilla{lista.length === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          // ── PASO 2: solo las plantillas de ESA familia ────────────────────
          <>
            <button
              type="button"
              onClick={() => {
                setFamiliaSel(null);
                setPlantilla(null);
                limpiarErrores();
              }}
              className="flex items-center gap-1 text-xs text-text-muted transition hover:text-text-primary"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Cambiar familia — {etiquetaFamilia(familiaSel)}
            </button>

            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {(plantillasPorFamilia.get(familiaSel) ?? []).map((p) => (
                <button
                  key={p.id_utillaje_global}
                  type="button"
                  onClick={() => {
                    setPlantilla(p);
                    // El nombre es opcional en el contrato: si se deja, el
                    // backend usa el de la plantilla (utillajes_routes.py:290).
                    setNombre(p.nombre);
                    limpiarErrores();
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    plantilla?.id_utillaje_global === p.id_utillaje_global
                      ? "border-accent-blue bg-accent-blue/10"
                      : "border-border bg-bg-primary hover:border-accent-blue/50"
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">
                    {p.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {etiquetaFamilia(p.familia)}
                    {p.norma ? ` · ${p.norma}` : ""}
                  </p>
                  {p.descripcion && (
                    <p className="mt-1 text-xs text-text-muted leading-snug">
                      {p.descripcion}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {plantilla && (
          <>
            {plantilla.advertencias.map((a, i) => (
              <div
                key={i}
                className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500"
              >
                {a}
              </div>
            ))}

            <div>
              <label
                htmlFor="registro-nombre"
                className="text-xs font-medium text-text-primary block mb-1"
              >
                Nombre en su parque
              </label>
              <input
                id="registro-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={plantilla.nombre}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="registro-notas"
                className="text-xs font-medium text-text-primary block mb-1"
              >
                Notas — opcional
              </label>
              <input
                id="registro-notas"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className={inputCls}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Render: vía MANUAL ───────────────────────────────────────────────────
  const renderManual = () => {
    if (errorFamilias) {
      return <p className="text-sm text-red-400">{errorFamilias}</p>;
    }
    if (familias === null) {
      return (
        <p className="text-sm text-text-muted">Cargando familias…</p>
      );
    }

    const campos = schema
      ? camposVisibles(schema.campos_utillaje, valores)
      : [];
    const incompletos = schema
      ? camposIncompletos(schema.campos_utillaje, valores)
      : [];

    return (
      <div className="space-y-4">
        <div>
          <label
            htmlFor="registro-familia"
            className="text-xs font-medium text-text-primary block mb-1"
          >
            Familia del utillaje
          </label>
          <select
            id="registro-familia"
            value={familia ?? ""}
            onChange={(e) => {
              setFamilia(e.target.value || null);
              limpiarErrores();
            }}
            className={inputCls}
          >
            <option value="">Seleccionar familia…</option>
            {familias.map((f) => (
              <option key={f.familia} value={f.familia}>
                {f.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {familia && !schema && (
          <p className="text-sm text-text-muted">
            Cargando formulario de la familia…
          </p>
        )}

        {schema && (
          <>
            {schema.advertencias.map((a, i) => (
              <div
                key={i}
                className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500"
              >
                {a}
              </div>
            ))}

            <div>
              <label
                htmlFor="registro-nombre"
                className="text-xs font-medium text-text-primary block mb-1"
              >
                Nombre en su parque
              </label>
              <input
                id="registro-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej.: Prensa de 160 de la mesa 2"
                className={inputCls}
              />
            </div>

            {/* Los campos FÍSICOS del utillaje, del schema. Ninguno hardcodeado. */}
            <CamposSchemaForm
              campos={campos}
              valores={valores}
              onCambiarValor={setValor}
              errores={erroresCampos}
            />

            <div>
              <label
                htmlFor="registro-notas"
                className="text-xs font-medium text-text-primary block mb-1"
              >
                Notas — opcional
              </label>
              <input
                id="registro-notas"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className={inputCls}
              />
            </div>

            {incompletos.length > 0 && (
              <p className="text-xs text-text-muted">
                Faltan campos obligatorios:{" "}
                {incompletos.map((c) => c.etiqueta).join(", ")}.
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  const puedeRegistrar =
    !guardando &&
    (modo === "plantilla"
      ? plantilla !== null
      : schema !== null &&
        nombre.trim() !== "" &&
        camposIncompletos(schema.campos_utillaje, valores).length === 0);

  return (
    <div className="space-y-4">
      {/* Selector de vía */}
      <div className="flex gap-2" role="tablist" aria-label="Vía de registro">
        <button
          type="button"
          role="tab"
          aria-selected={modo === "plantilla"}
          onClick={() => cambiarModo("plantilla")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
            modo === "plantilla"
              ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
              : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/40"
          }`}
        >
          <CopyPlus className="h-4 w-4" /> Usar plantilla
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === "manual"}
          onClick={() => cambiarModo("manual")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
            modo === "manual"
              ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
              : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/40"
          }`}
        >
          <Wrench className="h-4 w-4" /> Manual (medidas del taller)
        </button>
      </div>

      {modo === "plantilla" ? renderPlantilla() : renderManual()}

      {errorGeneral && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {errorGeneral}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-1">
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-xl border border-border px-5 py-2 text-sm text-text-muted hover:text-text-primary transition"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={
            modo === "plantilla" ? registrarDesdePlantilla : registrarManual
          }
          disabled={!puedeRegistrar}
          className="rounded-xl bg-accent-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {guardando ? "Registrando…" : "Registrar utillaje"}
        </button>
      </div>
    </div>
  );
};
