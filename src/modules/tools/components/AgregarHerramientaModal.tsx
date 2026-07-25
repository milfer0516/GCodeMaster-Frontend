// src/modules/tools/components/AgregarHerramientaModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE REUTILIZABLE — "agregar herramienta física"
//
// Autocontenido: trae su propio catálogo, no depende de ningún store ni de la
// pantalla que lo abre. Se monta desde el onboarding, desde el inventario y —
// más adelante — desde Operaciones cuando el MDE detecte que falta la
// herramienta ideal. Por eso conserva `contexto` y `filtroInicial`.
//
//   <AgregarHerramientaModal
//     abierto={abierto}
//     onCerrar={() => setAbierto(false)}
//     onRegistrada={(inst) => ...}
//     contexto="La operación necesita Ø8 mm"
//     filtroInicial={{ familia: "fresa_plana", diametro_min: 7, diametro_max: 9 }} />
//
// DOS RUTAS DE ENTRADA, nombradas en claro:
//   · "Seleccionar del catálogo"  → catálogo global (95 definiciones curadas)
//   · "Crear nueva herramienta"   → definición propia, buscando ANTES en el
//                                    catálogo para no duplicar
//
// Las dos terminan en el MISMO formulario (HerramientaForm) con el render 3D
// en vivo al lado.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { X, ChevronLeft, Wrench, BookOpen, PlusCircle } from "lucide-react";
import {
  getFamilias,
  getDefinicion,
  asegurarEntradaLibreria,
  crearDefinicionPersonalizada,
  crearInstancia,
  mensajeError,
  type DefinicionResumen,
  type FiltrosCatalogo,
  type Instancia,
} from "../../../services/toolingService";
import { VisorConPanel } from "../../../components/layout/VisorConPanel";
import { SelectorCatalogo } from "./SelectorCatalogo";
import { HerramientaForm } from "./HerramientaForm";
import { HerramientaPreview3D } from "./HerramientaPreview3D";
import { CoincidenciasCatalogo } from "./CoincidenciasCatalogo";
import {
  valoresVacios,
  desdeDefinicion,
  aDefinicionPersonalizada,
  aNumero,
  validarDefinicion,
  validarInstancia,
  type ValoresHerramienta,
} from "../domain/valoresHerramienta";

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

type Paso = "entrada" | "catalogo" | "ficha" | "nueva";

const TITULOS: Record<Paso, { titulo: string; sub: string }> = {
  entrada: {
    titulo: "Agregar herramienta",
    sub: "¿La buscamos en el catálogo o la defines tú?",
  },
  catalogo: {
    titulo: "Seleccionar del catálogo",
    sub: "Reconoce tu herramienta por la forma y selecciónala.",
  },
  ficha: {
    titulo: "Mide tu herramienta física",
    sub: "Los datos técnicos vienen del catálogo. Tú solo mides tu pieza.",
  },
  nueva: {
    titulo: "Crear nueva herramienta",
    sub: "Define la herramienta y compruébala en el render mientras escribes.",
  },
};

export function AgregarHerramientaModal({
  abierto,
  onCerrar,
  onRegistrada,
  filtroInicial,
  contexto,
  permitirEncadenar = false,
}: Props) {
  const [paso, setPaso] = useState<Paso>("entrada");
  const [familias, setFamilias] = useState<string[]>([]);
  const [valores, setValores] = useState<ValoresHerramienta>(valoresVacios());
  /** id de la definición global adoptada; null = definición propia. */
  const [idGlobal, setIdGlobal] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [campoConError, setCampoConError] = useState<
    keyof ValoresHerramienta | null
  >(null);

  const reiniciar = (paso: Paso = "entrada") => {
    setPaso(paso);
    setValores(valoresVacios(filtroInicial?.familia ?? ""));
    setIdGlobal(null);
    setError("");
    setCampoConError(null);
  };

  const cerrar = () => {
    reiniciar();
    onCerrar();
  };

  useEffect(() => {
    if (!abierto) return;
    reiniciar(filtroInicial?.familia ? "catalogo" : "entrada");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    if (!abierto || familias.length > 0) return;
    getFamilias()
      .then(setFamilias)
      .catch(() => setFamilias([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const cambiar = (parcial: Partial<ValoresHerramienta>) => {
    setValores((v) => ({ ...v, ...parcial }));
    setCampoConError(null);
    setError("");
  };

  /**
   * Adoptar una definición del catálogo — desde la lista o desde el aviso de
   * coincidencias. Se pide el DETALLE porque el resumen no trae longitudes ni
   * ángulos, y el render los necesita.
   */
  const adoptarDelCatalogo = async (def: DefinicionResumen) => {
    setIdGlobal(def.id_herramienta_global);
    setValores((v) => ({
      ...desdeDefinicion(def),
      // La medida de la pieza física NUNCA se prefill.
      longitud_util_real_mm: "",
      codigo_interno: v.codigo_interno,
      costo_compra: v.costo_compra,
    }));
    setPaso("ficha");
    setError("");

    try {
      const detalle = await getDefinicion(def.id_herramienta_global);
      setValores((v) => ({ ...desdeDefinicion(detalle), ...instanciaDe(v) }));
    } catch {
      // El resumen ya alcanza para operar; el detalle solo afina el render.
    }
  };

  const guardar = async (encadenar = false) => {
    const esNueva = idGlobal === null;

    if (esNueva) {
      const fallo = validarDefinicion(valores);
      if (fallo) {
        setError(fallo.mensaje);
        setCampoConError(fallo.campo);
        return;
      }
    }
    const falloInstancia = validarInstancia(valores);
    if (falloInstancia) {
      setError(falloInstancia.mensaje);
      setCampoConError(falloInstancia.campo);
      return;
    }

    setGuardando(true);
    setError("");
    try {
      // 1. Asegurar la definición en la librería de la empresa (Tier 2). Si ya
      //    estaba (409) se reutiliza: así conviven varias piezas físicas de la
      //    misma definición, cada una con su medida.
      const entrada = esNueva
        ? await crearDefinicionPersonalizada(aDefinicionPersonalizada(valores))
        : await asegurarEntradaLibreria(idGlobal!);

      // 2. Crear la herramienta FÍSICA (Tier 3).
      const instancia = await crearInstancia({
        id_herramienta_libreria: entrada.id_herramienta_libreria,
        longitud_util_real_mm: aNumero(valores.longitud_util_real_mm),
        codigo_interno: valores.codigo_interno || undefined,
        posicion_carrusel: aNumero(valores.posicion_carrusel),
        portaherramienta_real: valores.portaherramienta_real || undefined,
        costo_compra: aNumero(valores.costo_compra),
        notas: valores.notas || undefined,
      });

      onRegistrada?.(instancia);

      if (encadenar) reiniciar("entrada");
      else cerrar();
    } catch (e: any) {
      setError(mensajeError(e, "No se pudo registrar la herramienta."));
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) return null;

  const { titulo, sub } = TITULOS[paso];
  const enFormulario = paso === "ficha" || paso === "nueva";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cerrar}
    >
      <div
        className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cabecera ── */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-text-primary">
              <Wrench className="h-4 w-4 text-accent-blue" />
              {titulo}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">{sub}</p>
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

        {/* ── PASO 0 · Dos rutas de entrada ── */}
        {paso === "entrada" && (
          <div className="grid flex-1 place-items-center px-6 py-8">
            <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
              <button
                onClick={() => setPaso("catalogo")}
                className="group rounded-2xl border border-border bg-bg-primary p-6 text-left transition hover:border-accent-blue"
              >
                <BookOpen className="h-7 w-7 text-accent-blue" />
                <p className="mt-3 font-semibold text-text-primary">
                  Seleccionar del catálogo
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  95 definiciones curadas con su geometría ya cargada. Solo mides
                  la longitud útil de tu pieza.
                </p>
                <p className="mt-3 text-xs font-medium text-accent-blue">
                  Lo más rápido →
                </p>
              </button>

              <button
                onClick={() => setPaso("nueva")}
                className="group rounded-2xl border border-border bg-bg-primary p-6 text-left transition hover:border-accent-blue"
              >
                <PlusCircle className="h-7 w-7 text-accent-blue" />
                <p className="mt-3 font-semibold text-text-primary">
                  Crear nueva herramienta
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Para lo que no está en el catálogo. Te mostramos coincidencias
                  mientras escribes, para que no la definas dos veces.
                </p>
                <p className="mt-3 text-xs font-medium text-accent-blue">
                  Definir yo mismo →
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 1 · Catálogo ── */}
        {paso === "catalogo" && (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
            <SelectorCatalogo
              familias={familias}
              filtroInicial={filtroInicial}
              onElegir={adoptarDelCatalogo}
              onCrearNueva={() => setPaso("nueva")}
            />
          </div>
        )}

        {/* ── PASO 2 · Formulario (una definición del catálogo o una nueva) ── */}
        {enFormulario && (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
            <VisorConPanel
              className="h-full"
              panel={
                <HerramientaForm
                  modo="crear"
                  valores={valores}
                  onCambiar={cambiar}
                  definicionEditable={paso === "nueva"}
                  familias={familias}
                  campoConError={campoConError}
                  slotDefinicion={
                    paso === "nueva" ? (
                      <CoincidenciasCatalogo
                        familia={valores.familia}
                        diametro={valores.diametro_mm}
                        onAdoptar={adoptarDelCatalogo}
                      />
                    ) : null
                  }
                />
              }
              visor={<HerramientaPreview3D valores={valores} />}
            />
          </div>
        )}

        {/* ── Pie ── */}
        {paso !== "entrada" && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
            <button
              onClick={() => {
                setError("");
                setCampoConError(null);
                if (paso === "ficha") {
                  setIdGlobal(null);
                  setPaso("catalogo");
                } else {
                  setPaso("entrada");
                }
              }}
              disabled={guardando}
              className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm text-text-muted transition hover:text-text-primary disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>

            {error && (
              <p className="flex-1 text-sm text-accent-red">{error}</p>
            )}

            {paso === "catalogo" && (
              <button
                onClick={() => setPaso("nueva")}
                className="ml-auto rounded-xl border border-border px-4 py-2.5 text-sm text-text-primary transition hover:border-accent-blue"
              >
                No está en el catálogo — crear nueva
              </button>
            )}

            {enFormulario && (
              <>
                <button
                  onClick={() => guardar(false)}
                  disabled={guardando}
                  className="ml-auto rounded-xl bg-accent-blue px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-blue/90 disabled:opacity-50"
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Campos de la pieza física, que sobreviven al recargar la definición. */
function instanciaDe(v: ValoresHerramienta) {
  return {
    longitud_util_real_mm: v.longitud_util_real_mm,
    codigo_interno: v.codigo_interno,
    posicion_carrusel: v.posicion_carrusel,
    portaherramienta_real: v.portaherramienta_real,
    estado: v.estado,
    costo_compra: v.costo_compra,
    notas: v.notas,
  };
}
