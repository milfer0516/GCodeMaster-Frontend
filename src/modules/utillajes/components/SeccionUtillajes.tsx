// src/modules/utillajes/components/SeccionUtillajes.tsx
// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN "UTILLAJES DE AMARRE" del inventario (diseño "GCodeMaster
// inventario.html", acento verde): cabecera con conteo, búsqueda propia,
// acordeones por familia con filas nombre + código + medidas, insignia y menú
// de acciones.
//
// Datos: el PARQUE de la empresa (GET /utillajes/) y las etiquetas de familia
// (GET /utillajes/familias) — mismas llamadas de siempre, sin tocar payloads.
// El agrupado es GENÉRICO por `familia`: una familia nueva del backend aparece
// como un acordeón más, sin cambios de frontend.
//
// ESTADO VACÍO (diseño): tarjeta con icono, invitación y DOS botones —
// "Usar plantilla" y "Medidas del taller" — que abren el componente
// compartido RegistroUtillaje en la vía correspondiente (mismo componente que
// usa el wizard; aquí solo se le pasa la vía inicial).
//
// Colores a tokens: acento verde del diseño (#3dc882) → accent-green; tarjeta
// del estado vacío #14161a → bg-bg-surface; botón neutro #191c21 →
// bg-bg-elevated.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import { Anchor, CopyPlus, Ruler } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { SeccionInventario } from "../../tools/components/inventario/SeccionInventario";
import { CajaBusqueda } from "../../tools/components/inventario/CajaBusqueda";
import { AcordeonFamilia } from "../../tools/components/inventario/AcordeonFamilia";
import { FilaItem } from "../../tools/components/inventario/FilaItem";
import { RegistroUtillaje } from "./RegistroUtillaje";
import {
  getCatalogoGlobal,
  getFamiliasUtillaje,
  getUtillajes,
  type UtillajeResumen,
} from "../../cam/services/utillajesService";

const BADGE_DISPONIBLE =
  "bg-accent-green/10 text-accent-green border-accent-green/20";

/** Búsqueda sin tildes, como la de herramientas. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Línea de medida en mono: hasta dos parámetros registrados, clave: valor. */
function detalleUtillaje(u: UtillajeResumen): string {
  return Object.entries(u.parametros)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export const SeccionUtillajes = () => {
  const [utillajes, setUtillajes] = useState<UtillajeResumen[]>([]);
  const [etiquetas, setEtiquetas] = useState<Record<string, string>>({});
  const [plantillasEnCatalogo, setPlantillasEnCatalogo] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());
  const [seccionAbierta, setSeccionAbierta] = useState(true);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [modalRegistro, setModalRegistro] = useState<
    "plantilla" | "manual" | null
  >(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [lista, familias] = await Promise.all([
        getUtillajes(),
        getFamiliasUtillaje(),
      ]);
      setUtillajes(lista);
      setEtiquetas(
        Object.fromEntries(familias.map((f) => [f.familia, f.etiqueta])),
      );
    } catch {
      setError("No se pudo cargar el parque de utillajes.");
    } finally {
      setLoading(false);
    }
    // El conteo de plantillas solo alimenta la nota del estado vacío: si
    // falla, la nota simplemente no se muestra.
    try {
      const cat = await getCatalogoGlobal();
      setPlantillasEnCatalogo(cat.total);
    } catch {
      setPlantillasEnCatalogo(null);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const etiquetaDe = (familia: string) => etiquetas[familia] ?? familia;

  // Filtrado en vivo: nombre, familia, notas y valores de los parámetros.
  const filtrados = useMemo(() => {
    const t = normalizar(busqueda);
    if (!t) return utillajes;
    return utillajes.filter((u) =>
      [
        u.nombre,
        u.familia,
        etiquetaDe(u.familia),
        u.notas ?? "",
        ...Object.values(u.parametros).map(String),
      ].some((c) => normalizar(c).includes(t)),
    );
    // etiquetas llega con la carga; incluirla no cambia el criterio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utillajes, busqueda, etiquetas]);

  // Acordeones por familia — genérico, sin familias escritas a mano.
  const grupos = useMemo(() => {
    const mapa = new Map<string, UtillajeResumen[]>();
    for (const u of filtrados) {
      const lista = mapa.get(u.familia) ?? [];
      lista.push(u);
      mapa.set(u.familia, lista);
    }
    return [...mapa.entries()].sort((a, b) =>
      etiquetaDe(a[0]).localeCompare(etiquetaDe(b[0])),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, etiquetas]);

  const alternarGrupo = (familia: string) =>
    setPlegadas((prev) => {
      const s = new Set(prev);
      if (s.has(familia)) s.delete(familia);
      else s.add(familia);
      return s;
    });

  // ── ESTADO VACÍO (diseño): dos vías de registro ─────────────────────────
  const estadoVacio = (
    <div className="flex flex-col items-center gap-3.5 rounded-xl border border-border bg-bg-surface px-5 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-green/25 bg-accent-green/10">
        <Anchor className="h-5 w-5 text-accent-green" strokeWidth={1.7} />
      </span>
      <div className="max-w-[340px]">
        <h3 className="m-0 mb-1.5 text-[15px] font-semibold text-text-primary">
          Aún no hay utillajes en el parque
        </h3>
        <p className="m-0 text-[13px] text-text-muted">
          Registra las prensas, bridas y platos del taller para poder
          asignarlos a los amarres de cada trabajo.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setModalRegistro("plantilla")}
          className="flex items-center gap-[7px] rounded-lg border border-accent-green/40 bg-accent-green/10 px-3.5 py-[9px] text-[13px] text-accent-green transition hover:bg-accent-green/20"
        >
          <CopyPlus className="h-3.5 w-3.5" strokeWidth={1.9} />
          Usar plantilla
        </button>
        <button
          type="button"
          onClick={() => setModalRegistro("manual")}
          className="flex items-center gap-[7px] rounded-lg border border-border bg-bg-elevated px-3.5 py-[9px] text-[13px] text-text-primary transition hover:border-accent-green/40"
        >
          <Ruler className="h-3.5 w-3.5" strokeWidth={1.9} />
          Medidas del taller
        </button>
      </div>
      {plantillasEnCatalogo !== null && (
        <p className="m-0 font-mono text-[11.5px] text-text-muted">
          {plantillasEnCatalogo} plantillas listas en el catálogo
        </p>
      )}
    </div>
  );

  const contenido = loading ? (
    <div className="flex h-48 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-green border-t-transparent" />
    </div>
  ) : error ? (
    <div className="rounded-xl border border-accent-red/20 bg-accent-red/5 p-4 text-sm text-accent-red">
      {error}
    </div>
  ) : utillajes.length === 0 ? (
    estadoVacio
  ) : grupos.length === 0 ? (
    <p className="py-10 text-center text-sm text-text-muted">
      No hay utillajes con esa búsqueda.
    </p>
  ) : (
    <div className="flex flex-col gap-2">
      {grupos.map(([familia, lista]) => (
        <AcordeonFamilia
          key={familia}
          nombre={etiquetaDe(familia)}
          cantidad={lista.length}
          abierto={!plegadas.has(familia)}
          onAlternar={() => alternarGrupo(familia)}
        >
          {lista.map((u) => (
            <FilaItem
              key={u.id_utillaje}
              nombre={u.nombre}
              codigo={`UT-${u.id_utillaje}`}
              detalle={detalleUtillaje(u)}
              badge={{ texto: "Disponible", clases: BADGE_DISPONIBLE }}
              acciones={[
                {
                  etiqueta: "Ver detalle",
                  onClick: () =>
                    setDetalleId((id) =>
                      id === u.id_utillaje ? null : u.id_utillaje,
                    ),
                },
              ]}
              expandido={detalleId === u.id_utillaje}
              detalleExpandido={
                <div className="space-y-1.5 text-xs text-text-muted">
                  {Object.entries(u.parametros).map(([k, v]) => (
                    <p key={k} className="font-mono text-[11px]">
                      {k}: {String(v)}
                    </p>
                  ))}
                  <p>
                    {u.id_utillaje_global !== null
                      ? "Copiado de plantilla del catálogo global."
                      : "Registrado con medidas del taller."}
                  </p>
                  {u.notas && <p>{u.notas}</p>}
                </div>
              }
            />
          ))}
        </AcordeonFamilia>
      ))}
    </div>
  );

  return (
    <>
      <SeccionInventario
        icono={Anchor}
        titulo="Utillajes de amarre"
        subtitulo="Prensas, bridas y platos"
        conteo={`${utillajes.length} en el parque`}
        etiquetaAccion="Registrar"
        onAccion={() => setModalRegistro("plantilla")}
        acento="green"
        abierto={seccionAbierta}
        onAlternar={() => setSeccionAbierta((v) => !v)}
      >
        <CajaBusqueda
          placeholder="Buscar utillaje o referencia"
          value={busqueda}
          onChange={setBusqueda}
        />
        {contenido}
      </SeccionInventario>

      {/* Registro: el MISMO componente del wizard; la key reinicia la vía */}
      <Modal
        open={modalRegistro !== null}
        onClose={() => setModalRegistro(null)}
        title="Registrar utillaje"
        size="lg"
      >
        {modalRegistro && (
          <RegistroUtillaje
            key={modalRegistro}
            modoInicial={modalRegistro}
            onRegistrado={() => {
              setModalRegistro(null);
              cargar();
            }}
            onCancelar={() => setModalRegistro(null)}
          />
        )}
      </Modal>
    </>
  );
};
