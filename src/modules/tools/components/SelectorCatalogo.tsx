// src/modules/tools/components/SelectorCatalogo.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · Ruta de entrada "Seleccionar del catálogo".
//
// Lista filtrable del catálogo global agrupada por familia, con vista previa 3D
// de la definición enfocada: el operador reconoce su herramienta por la forma,
// no por el texto.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  getCatalogo,
  getDefinicion,
  familiaLabel,
  type DefinicionDetalle,
  type DefinicionResumen,
  type FiltrosCatalogo,
} from "../../../services/toolingService";
import { VisorConPanel } from "../../../components/layout/VisorConPanel";
import { HerramientaPreview3D } from "./HerramientaPreview3D";
import { desdeDefinicion } from "../domain/valoresHerramienta";

interface Props {
  familias: string[];
  filtroInicial?: FiltrosCatalogo;
  onElegir: (definicion: DefinicionResumen) => void;
  onCrearNueva: () => void;
}

const inputCls =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue";

export function SelectorCatalogo({
  familias,
  filtroInicial,
  onElegir,
  onCrearNueva,
}: Props) {
  const [catalogo, setCatalogo] = useState<DefinicionResumen[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [familia, setFamilia] = useState(filtroInicial?.familia ?? "");
  const [dMin, setDMin] = useState(
    filtroInicial?.diametro_min != null ? String(filtroInicial.diametro_min) : "",
  );
  const [dMax, setDMax] = useState(
    filtroInicial?.diametro_max != null ? String(filtroInicial.diametro_max) : "",
  );

  const [enfocada, setEnfocada] = useState<DefinicionResumen | null>(null);

  // El LISTADO del catálogo no trae toda la geometría (longitudes, ángulos,
  // nº de plaquitas): sin el detalle, una planeadora se previsualizaría con el
  // número de plaquitas por defecto en vez del suyo. Se pide el detalle de la
  // ficha enfocada y se cachea, para no repetir la petición al recorrer la lista.
  const [detalles, setDetalles] = useState<Map<number, DefinicionDetalle>>(
    new Map(),
  );

  useEffect(() => {
    if (!enfocada) return;
    const id = enfocada.id_herramienta_global;
    if (detalles.has(id)) return;
    let cancelado = false;
    const timer = setTimeout(() => {
      getDefinicion(id)
        .then((det) => {
          if (cancelado) return;
          setDetalles((prev) => new Map(prev).set(id, det));
        })
        .catch(() => {
          /* el resumen ya alcanza para elegir; el detalle solo afina el render */
        });
    }, 180);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [enfocada, detalles]);

  useEffect(() => {
    setCargando(true);
    const timer = setTimeout(() => {
      getCatalogo({
        q: q.trim() || undefined,
        familia: familia || undefined,
        diametro_min: dMin ? Number(dMin) : undefined,
        diametro_max: dMax ? Number(dMax) : undefined,
      })
        .then((defs) => {
          setCatalogo(defs);
          setEnfocada(defs[0] ?? null);
          setError("");
        })
        .catch(() => setError("No se pudo cargar el catálogo de herramientas."))
        .finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, familia, dMin, dMax]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, DefinicionResumen[]>();
    for (const def of catalogo) {
      const lista = mapa.get(def.familia) ?? [];
      lista.push(def);
      mapa.set(def.familia, lista);
    }
    return [...mapa.entries()];
  }, [catalogo]);

  const panel = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Filtros en UNA fila compacta: el buscador se queda con el espacio
          sobrante y los Ø ocupan lo que ocupa un número de 4 cifras. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            autoFocus
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar... (ej: fresa plana, broca)"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={familia}
          onChange={(e) => setFamilia(e.target.value)}
          className={`${inputCls} w-auto`}
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
          value={dMin}
          onChange={(e) => setDMin(e.target.value)}
          placeholder="Ø mín"
          className={`${inputCls} w-[5.5rem]`}
        />
        <input
          type="number"
          min={0}
          step={0.1}
          value={dMax}
          onChange={(e) => setDMax(e.target.value)}
          placeholder="Ø máx"
          className={`${inputCls} w-[5.5rem]`}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {cargando ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
          </div>
        ) : error ? (
          <p className="text-sm text-accent-red">{error}</p>
        ) : catalogo.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-text-muted">
              Ninguna definición del catálogo coincide con esos filtros.
            </p>
            <button
              onClick={onCrearNueva}
              className="text-sm text-accent-blue hover:underline"
            >
              Crear nueva herramienta
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map(([fam, defs]) => (
              <div key={fam}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {familiaLabel(fam)}{" "}
                  <span className="font-normal">({defs.length})</span>
                </p>
                <div className="grid gap-2">
                  {defs.map((def) => {
                    const activa =
                      enfocada?.id_herramienta_global === def.id_herramienta_global;
                    return (
                      <button
                        key={def.id_herramienta_global}
                        onMouseEnter={() => setEnfocada(def)}
                        onFocus={() => setEnfocada(def)}
                        onClick={() => {
                          setEnfocada(def);
                          onElegir(def);
                        }}
                        className={`rounded-xl border p-2.5 text-left transition ${
                          activa
                            ? "border-accent-blue bg-accent-blue/5"
                            : "border-border bg-bg-primary hover:border-accent-blue/60"
                        }`}
                      >
                        <p className="text-sm font-medium leading-tight text-text-primary">
                          {def.nombre}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          Ø{def.diametro_mm} mm
                          {def.numero_filos ? ` · ${def.numero_filos} filos` : ""}{" "}
                          · {def.material}
                          {def.recubrimiento ? ` · ${def.recubrimiento}` : ""}
                        </p>
                        {(def.norma || def.serie) && (
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            {[def.norma, def.serie].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const visor = enfocada ? (
    // Cada definición del catálogo es otra herramienta (una Ø6 y una Ø63 son
    // de la misma familia), así que el encuadre se rehace por id, no por familia.
    <HerramientaPreview3D
      valores={desdeDefinicion(
        detalles.get(enfocada.id_herramienta_global) ?? enfocada,
      )}
      claveEncuadre={enfocada.id_herramienta_global}
    />
  ) : (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-muted">
      Pasa el cursor por una herramienta del catálogo para verla en 3D.
    </div>
  );

  return (
    <VisorConPanel panel={panel} visor={visor} className="h-full" />
  );
}
