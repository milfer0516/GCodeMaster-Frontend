// src/modules/tools/components/AgregarHerramientaModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE REUTILIZABLE — "agregar herramienta física"
//
// Autocontenido: trae su propio catálogo, no depende de ningún store ni de la
// pantalla que lo abre. Se puede montar desde cualquier lugar:
//
//   const [abierto, setAbierto] = useState(false);
//   <AgregarHerramientaModal
//     abierto={abierto}
//     onCerrar={() => setAbierto(false)}
//     onRegistrada={(inst) => ...}
//   />
//
// Aperturas contextuales (p. ej. Operaciones, cuando el MDE reporte que falta
// la herramienta ideal) pueden prefiltrar el catálogo y mostrar un mensaje:
//
//   <AgregarHerramientaModal ... contexto="La operación necesita Ø8 mm"
//     filtroInicial={{ familia: "fresa_plana", diametro_min: 7, diametro_max: 9 }} />
//
// FLUJO: buscar en el catálogo → seleccionar → medir longitud útil → guardar.
// El operador NO escribe datos de catálogo: solo mide su herramienta física.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { Search, X, ChevronLeft, Ruler, Wrench } from "lucide-react";
import {
  getCatalogo,
  getFamilias,
  asegurarEntradaLibreria,
  crearDefinicionPersonalizada,
  crearInstancia,
  familiaLabel,
  mensajeError,
  MATERIALES_HERRAMIENTA,
  type DefinicionResumen,
  type DefinicionPersonalizadaPayload,
  type FiltrosCatalogo,
  type Instancia,
} from "../../../services/toolingService";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Se dispara con la instancia física recién creada. */
  onRegistrada?: (instancia: Instancia) => void;
  /** Prefiltro del catálogo para aperturas contextuales. */
  filtroInicial?: FiltrosCatalogo;
  /** Mensaje contextual mostrado en la cabecera. */
  contexto?: string;
  /** Muestra "Guardar y agregar otra" (útil en el onboarding). */
  permitirEncadenar?: boolean;
}

type Paso = "catalogo" | "personalizada" | "medida";

type Seleccion =
  | { origen: "catalogo"; definicion: DefinicionResumen }
  | { origen: "personalizada"; datos: DefinicionPersonalizadaPayload };

const FORM_PERSONALIZADA = {
  familia: "",
  nombre: "",
  diametro_mm: "",
  material: "",
  numero_filos: "",
  largo_filo_mm: "",
  recubrimiento: "",
};

const FORM_MEDIDA = {
  longitud_util_real_mm: "",
  posicion_carrusel: "",
  portaherramienta_real: "",
};

const inputCls =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue";

const labelCls = "mb-1 block text-xs font-medium text-text-muted";

export function AgregarHerramientaModal({
  abierto,
  onCerrar,
  onRegistrada,
  filtroInicial,
  contexto,
  permitirEncadenar = false,
}: Props) {
  const [paso, setPaso] = useState<Paso>("catalogo");
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);

  // Catálogo
  const [familias, setFamilias] = useState<string[]>([]);
  const [catalogo, setCatalogo] = useState<DefinicionResumen[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [q, setQ] = useState("");
  const [familia, setFamilia] = useState(filtroInicial?.familia ?? "");
  const [diametroMin, setDiametroMin] = useState(
    filtroInicial?.diametro_min != null ? String(filtroInicial.diametro_min) : "",
  );
  const [diametroMax, setDiametroMax] = useState(
    filtroInicial?.diametro_max != null ? String(filtroInicial.diametro_max) : "",
  );

  // Formularios
  const [formCustom, setFormCustom] = useState(FORM_PERSONALIZADA);
  const [formMedida, setFormMedida] = useState(FORM_MEDIDA);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  const reiniciar = (mantenerFiltros = false) => {
    setPaso("catalogo");
    setSeleccion(null);
    setFormCustom(FORM_PERSONALIZADA);
    setFormMedida(FORM_MEDIDA);
    setError("");
    if (!mantenerFiltros) {
      setQ("");
      setFamilia(filtroInicial?.familia ?? "");
      setDiametroMin(
        filtroInicial?.diametro_min != null
          ? String(filtroInicial.diametro_min)
          : "",
      );
      setDiametroMax(
        filtroInicial?.diametro_max != null
          ? String(filtroInicial.diametro_max)
          : "",
      );
    }
  };

  const cerrar = () => {
    reiniciar();
    onCerrar();
  };

  // Escape cierra el modal
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  // Familias (una sola vez, al abrir)
  useEffect(() => {
    if (!abierto || familias.length > 0) return;
    getFamilias()
      .then(setFamilias)
      .catch(() => setFamilias([]));
  }, [abierto]);

  // Catálogo con debounce sobre los filtros
  useEffect(() => {
    if (!abierto || paso !== "catalogo") return;
    setCargandoCatalogo(true);
    const timer = setTimeout(() => {
      getCatalogo({
        q: q.trim() || undefined,
        familia: familia || undefined,
        diametro_min: diametroMin ? Number(diametroMin) : undefined,
        diametro_max: diametroMax ? Number(diametroMax) : undefined,
      })
        .then((defs) => {
          setCatalogo(defs);
          setError("");
        })
        .catch(() => setError("No se pudo cargar el catálogo de herramientas."))
        .finally(() => setCargandoCatalogo(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [abierto, paso, q, familia, diametroMin, diametroMax]);

  // Agrupar por familia para que el operador reconozca por tipo
  const grupos = useMemo(() => {
    const mapa = new Map<string, DefinicionResumen[]>();
    for (const def of catalogo) {
      const lista = mapa.get(def.familia) ?? [];
      lista.push(def);
      mapa.set(def.familia, lista);
    }
    return [...mapa.entries()];
  }, [catalogo]);

  // ── Acciones ──────────────────────────────────────────────────────────────

  const elegirDelCatalogo = (definicion: DefinicionResumen) => {
    setSeleccion({ origen: "catalogo", definicion });
    setFormMedida(FORM_MEDIDA); // la medida NUNCA se prefill
    setError("");
    setPaso("medida");
  };

  const continuarPersonalizada = () => {
    // Mismas reglas que el backend, verificadas aquí para dar un mensaje claro
    // en vez de un 422 de validación.
    if (
      !formCustom.familia ||
      !formCustom.nombre.trim() ||
      !formCustom.diametro_mm ||
      !formCustom.material
    ) {
      setError("Familia, nombre, diámetro y material son obligatorios.");
      return;
    }
    if (formCustom.nombre.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (!(Number(formCustom.diametro_mm) > 0)) {
      setError("El diámetro debe ser mayor que 0.");
      return;
    }
    setSeleccion({
      origen: "personalizada",
      datos: {
        familia: formCustom.familia,
        nombre: formCustom.nombre.trim(),
        diametro_mm: Number(formCustom.diametro_mm),
        material: formCustom.material,
        numero_filos: formCustom.numero_filos
          ? Number(formCustom.numero_filos)
          : undefined,
        largo_filo_mm: formCustom.largo_filo_mm
          ? Number(formCustom.largo_filo_mm)
          : undefined,
        recubrimiento: formCustom.recubrimiento || undefined,
      },
    });
    setFormMedida(FORM_MEDIDA);
    setError("");
    setPaso("medida");
  };

  const guardar = async (encadenar = false) => {
    if (!seleccion) return;
    const longitud = Number(formMedida.longitud_util_real_mm);
    if (!formMedida.longitud_util_real_mm || !(longitud > 0)) {
      setError("Ingresa la longitud útil medida (mayor que 0).");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      // 1. Asegurar la definición en la librería de la empresa (Tier 2).
      //    Si ya estaba (409), se reutiliza: así conviven varias herramientas
      //    físicas de la misma definición, cada una con su longitud medida.
      const entrada =
        seleccion.origen === "catalogo"
          ? await asegurarEntradaLibreria(
              seleccion.definicion.id_herramienta_global,
            )
          : await crearDefinicionPersonalizada(seleccion.datos);

      // 2. Crear la herramienta FÍSICA (Tier 3) con la medida del operador.
      const instancia = await crearInstancia({
        id_herramienta_libreria: entrada.id_herramienta_libreria,
        longitud_util_real_mm: longitud,
        posicion_carrusel: formMedida.posicion_carrusel
          ? Number(formMedida.posicion_carrusel)
          : undefined,
        portaherramienta_real: formMedida.portaherramienta_real || undefined,
      });

      onRegistrada?.(instancia);

      if (encadenar) {
        reiniciar(true); // vuelve al catálogo conservando los filtros
      } else {
        cerrar();
      }
    } catch (e: any) {
      setError(mensajeError(e, "No se pudo registrar la herramienta."));
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) return null;

  // ── Datos de la definición seleccionada (para el paso de medida) ──────────

  const resumenSeleccion =
    seleccion?.origen === "catalogo"
      ? {
          nombre: seleccion.definicion.nombre,
          familia: seleccion.definicion.familia,
          diametro_mm: seleccion.definicion.diametro_mm,
          numero_filos: seleccion.definicion.numero_filos,
          material: seleccion.definicion.material,
          recubrimiento: seleccion.definicion.recubrimiento,
          norma: seleccion.definicion.norma,
          serie: seleccion.definicion.serie,
        }
      : seleccion
        ? {
            nombre: seleccion.datos.nombre,
            familia: seleccion.datos.familia,
            diametro_mm: seleccion.datos.diametro_mm,
            numero_filos: seleccion.datos.numero_filos ?? null,
            material: seleccion.datos.material,
            recubrimiento: seleccion.datos.recubrimiento ?? null,
            norma: null,
            serie: null,
          }
        : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cerrar}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cabecera ── */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-text-primary">
              <Wrench className="h-4 w-4 text-accent-blue" />
              {paso === "personalizada"
                ? "Herramienta fuera del catálogo"
                : paso === "medida"
                  ? "Mide tu herramienta física"
                  : "Agregar herramienta"}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {paso === "catalogo" &&
                "Busca la herramienta que tienes físicamente y selecciónala."}
              {paso === "personalizada" &&
                "Solo si no existe en el catálogo. Describe la definición una vez."}
              {paso === "medida" &&
                "Los datos técnicos vienen del catálogo. Tú solo mides tu pieza."}
            </p>
            {contexto && (
              <p className="mt-2 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-3 py-1.5 text-xs text-accent-amber">
                {contexto}
              </p>
            )}
          </div>
          <button
            onClick={cerrar}
            className="rounded-lg p-1 text-text-muted transition hover:text-text-primary"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── PASO 1 · Catálogo ── */}
        {paso === "catalogo" && (
          <>
            <div className="space-y-3 border-b border-border px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  autoFocus
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre... (ej: fresa plana, broca)"
                  className={`${inputCls} pl-9`}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={familia}
                  onChange={(e) => setFamilia(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Todas las familias</option>
                  {familias.map((f) => (
                    <option key={f} value={f}>
                      {familiaLabel(f)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={diametroMin}
                  onChange={(e) => setDiametroMin(e.target.value)}
                  placeholder="Ø mín (mm)"
                  className={inputCls}
                />
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={diametroMax}
                  onChange={(e) => setDiametroMax(e.target.value)}
                  placeholder="Ø máx (mm)"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cargandoCatalogo ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
                </div>
              ) : catalogo.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm text-text-muted">
                    Ninguna definición del catálogo coincide con esos filtros.
                  </p>
                  <button
                    onClick={() => {
                      setError("");
                      setPaso("personalizada");
                    }}
                    className="text-sm text-accent-blue hover:underline"
                  >
                    Crear una definición personalizada
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {grupos.map(([fam, defs]) => (
                    <div key={fam}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        {familiaLabel(fam)}{" "}
                        <span className="font-normal">({defs.length})</span>
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {defs.map((def) => (
                          <button
                            key={def.id_herramienta_global}
                            onClick={() => elegirDelCatalogo(def)}
                            className="rounded-xl border border-border bg-bg-primary p-3 text-left transition hover:border-accent-blue"
                          >
                            <p className="text-sm font-medium leading-tight text-text-primary">
                              {def.nombre}
                            </p>
                            <p className="mt-1 text-[11px] text-text-muted">
                              Ø{def.diametro_mm} mm
                              {def.numero_filos
                                ? ` · ${def.numero_filos} filos`
                                : ""}{" "}
                              · {def.material}
                              {def.recubrimiento ? ` · ${def.recubrimiento}` : ""}
                            </p>
                            {(def.norma || def.serie) && (
                              <p className="mt-0.5 text-[11px] text-text-muted">
                                {[def.norma, def.serie]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <p className="text-xs text-text-muted">
                ¿No está en el catálogo?
              </p>
              <button
                onClick={() => {
                  setError("");
                  setPaso("personalizada");
                }}
                className="rounded-xl border border-border px-4 py-2 text-sm text-text-primary transition hover:border-accent-blue"
              >
                Crear definición personalizada
              </button>
            </div>
          </>
        )}

        {/* ── PASO 1b · Definición personalizada ── */}
        {paso === "personalizada" && (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <p className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-muted">
                Esta definición queda solo en la librería de tu empresa. Úsala
                cuando la herramienta que tienes no exista en el catálogo global.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Familia *</label>
                  <select
                    value={formCustom.familia}
                    onChange={(e) =>
                      setFormCustom((f) => ({ ...f, familia: e.target.value }))
                    }
                    className={inputCls}
                  >
                    <option value="">Selecciona...</option>
                    {familias.map((f) => (
                      <option key={f} value={f}>
                        {familiaLabel(f)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Material *</label>
                  <select
                    value={formCustom.material}
                    onChange={(e) =>
                      setFormCustom((f) => ({ ...f, material: e.target.value }))
                    }
                    className={inputCls}
                  >
                    <option value="">Selecciona...</option>
                    {MATERIALES_HERRAMIENTA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Nombre *</label>
                  <input
                    type="text"
                    value={formCustom.nombre}
                    onChange={(e) =>
                      setFormCustom((f) => ({ ...f, nombre: e.target.value }))
                    }
                    placeholder="Ej: Fresa plana Ø14 3F carburo (proveedor local)"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Diámetro (mm) *</label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={formCustom.diametro_mm}
                    onChange={(e) =>
                      setFormCustom((f) => ({
                        ...f,
                        diametro_mm: e.target.value,
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Número de filos</label>
                  <input
                    type="number"
                    min={1}
                    value={formCustom.numero_filos}
                    onChange={(e) =>
                      setFormCustom((f) => ({
                        ...f,
                        numero_filos: e.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Largo de filo (mm)</label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={formCustom.largo_filo_mm}
                    onChange={(e) =>
                      setFormCustom((f) => ({
                        ...f,
                        largo_filo_mm: e.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Recubrimiento</label>
                  <input
                    type="text"
                    value={formCustom.recubrimiento}
                    onChange={(e) =>
                      setFormCustom((f) => ({
                        ...f,
                        recubrimiento: e.target.value,
                      }))
                    }
                    placeholder="TiAlN, TiN... (opcional)"
                    className={inputCls}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-accent-red">{error}</p>}
            </div>

            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => {
                  setError("");
                  setPaso("catalogo");
                }}
                className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm text-text-muted transition hover:text-text-primary"
              >
                <ChevronLeft className="h-4 w-4" /> Volver al catálogo
              </button>
              <button
                onClick={continuarPersonalizada}
                className="flex-1 rounded-xl bg-accent-blue py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90"
              >
                Continuar → medir herramienta
              </button>
            </div>
          </>
        )}

        {/* ── PASO 2 · Medida (único dato manual) ── */}
        {paso === "medida" && resumenSeleccion && (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Definición elegida — datos del catálogo, no editables */}
              <div className="rounded-xl border border-border bg-bg-primary p-4">
                <p className="mb-1 text-[11px] uppercase tracking-wider text-text-muted">
                  {seleccion?.origen === "catalogo"
                    ? "Definición del catálogo"
                    : "Definición personalizada"}
                </p>
                <p className="font-medium text-text-primary">
                  {resumenSeleccion.nombre}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {familiaLabel(resumenSeleccion.familia)} · Ø
                  {resumenSeleccion.diametro_mm} mm
                  {resumenSeleccion.numero_filos
                    ? ` · ${resumenSeleccion.numero_filos} filos`
                    : ""}{" "}
                  · {resumenSeleccion.material}
                  {resumenSeleccion.recubrimiento
                    ? ` · ${resumenSeleccion.recubrimiento}`
                    : ""}
                </p>
                {(resumenSeleccion.norma || resumenSeleccion.serie) && (
                  <p className="mt-0.5 text-xs text-text-muted">
                    {[resumenSeleccion.norma, resumenSeleccion.serie]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>

              {/* EL campo manual */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                  <Ruler className="h-4 w-4 text-accent-blue" />
                  Longitud útil medida (mm) *
                </label>
                <p className="mb-2 text-xs text-text-muted">
                  Mídela en TU herramienta: es el largo que queda disponible
                  fuera del portaherramientas. Varía en cada pieza física según
                  cómo esté montada y el desgaste, por eso nadie puede
                  calcularla por ti.
                </p>
                <input
                  autoFocus
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={formMedida.longitud_util_real_mm}
                  onChange={(e) =>
                    setFormMedida((f) => ({
                      ...f,
                      longitud_util_real_mm: e.target.value,
                    }))
                  }
                  placeholder="Ej: 42.5"
                  className={`${inputCls} text-base`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Posición en carrusel</label>
                  <input
                    type="number"
                    min={0}
                    value={formMedida.posicion_carrusel}
                    onChange={(e) =>
                      setFormMedida((f) => ({
                        ...f,
                        posicion_carrusel: e.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Portaherramientas</label>
                  <input
                    type="text"
                    value={formMedida.portaherramienta_real}
                    onChange={(e) =>
                      setFormMedida((f) => ({
                        ...f,
                        portaherramienta_real: e.target.value,
                      }))
                    }
                    placeholder="Opcional — ej: BT40 ER32"
                    className={inputCls}
                  />
                </div>
              </div>

              <p className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-muted">
                ¿Tienes dos herramientas iguales? Regístralas por separado: cada
                pieza física lleva su propia longitud medida.
              </p>

              {error && <p className="text-sm text-accent-red">{error}</p>}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => {
                  setError("");
                  setPaso(
                    seleccion?.origen === "personalizada"
                      ? "personalizada"
                      : "catalogo",
                  );
                }}
                disabled={guardando}
                className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm text-text-muted transition hover:text-text-primary disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Volver
              </button>
              <button
                onClick={() => guardar(false)}
                disabled={guardando}
                className="flex-1 rounded-xl bg-accent-blue py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar herramienta"}
              </button>
              {permitirEncadenar && (
                <button
                  onClick={() => guardar(true)}
                  disabled={guardando}
                  className="rounded-xl border border-accent-blue px-4 py-2.5 text-sm font-semibold text-accent-blue transition hover:bg-accent-blue/10 disabled:opacity-50"
                >
                  Guardar y agregar otra
                </button>
              )}
            </div>
          </>
        )}

        {/* Error del catálogo (paso 1) */}
        {paso === "catalogo" && error && (
          <p className="border-t border-border px-6 py-2 text-sm text-accent-red">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
