// src/modules/cam/components/steps/StepOperaciones.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DE TRABAJO CAM — visor dominante entre dos paneles plegables.
//
//   ┌──────────────────────────────────────────────────────────┐
//   │ Cabecera: título + contadores                            │
//   ├──────────────────────────────────────────────────────────┤
//   │ [Operaciones] ←   V I S O R   3 D   → [Asistente MDE]    │
//   ├──────────────────────────────────────────────────────────┤
//   │ Pie: totales                                             │
//   └──────────────────────────────────────────────────────────┘
//
// EL CANVAS NO CAMBIA DE TAMAÑO NUNCA. Los dos paneles laterales están en
// `position:absolute` DENTRO del contenedor del visor y se pliegan con
// `transform` (ver PanelDeslizante). El contenedor del canvas no comparte fila
// con ellos, así que abrir o cerrar un panel no toca un solo píxel del visor y
// el raycaster nunca se desincroniza. No convertir esto en un grid de tres
// columnas: ese cambio reintroduce el bug de picking del paso Stock.
//
// SELECCIÓN BIDIRECCIONAL — dos conceptos distintos que no se deben mezclar:
//   · ENFOCAR (clic en la fila / doble clic en una cara): elige qué operación se
//     mira. Resalta su región en la pieza y llena el panel del MDE.
//   · MARCAR (la casilla): decide si la operación se mecaniza. Solo la casilla
//     la cambia; enfocar no marca nada.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { WizardNavButtons } from "./WizardNavButtons";
import { PanelDeslizante } from "../operaciones/PanelDeslizante";
import { ListaOperaciones } from "../operaciones/ListaOperaciones";
import { PanelMDE } from "../operaciones/PanelMDE";
import { AgregarHerramientaModal } from "../../../tools/components/AgregarHerramientaModal";
import {
  getInstancias,
  mensajeError,
  type Instancia,
} from "../../../../services/toolingService";
import {
  solicitarRecomendacionesMDE,
  normalizarRecomendaciones,
} from "../../services/mdeService";
import { solicitarMecanizabilidad } from "../../services/machinabilityService";
import {
  consultaFallida,
  estadoFila,
  familiaDeToolType,
  herramientaIdeal,
  indexarRecomendaciones,
  recomendacionDe,
} from "../../domain/mdeRecomendaciones";
import {
  buscarHerramientaFisica,
  cambiosDeHerramienta,
  porId,
  TOLERANCIA_DIAMETRO_MM,
} from "../../domain/herramientasOperacion";
import {
  ALCANZABLE,
  conteoPorMotivo,
  DESCONOCIDO,
  indexarMecanizabilidad,
  MOTIVO,
  NO_ALCANZABLE,
  TEXTO_REMEDIO_REANALISIS,
  VEREDICTO_CLASE,
  type Veredicto,
} from "../../domain/mecanizabilidad";
import { formatMm } from "../../../../utils/format";

const ANCHO_PANEL_IZQUIERDO = 280;
const ANCHO_PANEL_DERECHO = 340;

/**
 * Los tres contadores del veredicto. El VALOR se lee de `resumen` (el motor ya
 * los contó); aquí solo se decide la palabra en español y el color, que es el
 * único trabajo que el contrato delega en el consumidor.
 */
const CONTADORES_VEREDICTO: Array<{ clave: Veredicto; etiqueta: string }> = [
  { clave: ALCANZABLE, etiqueta: "alcanzables" },
  { clave: NO_ALCANZABLE, etiqueta: "no alcanzables" },
  { clave: DESCONOCIDO, etiqueta: "desconocidas" },
];

export const StepOperaciones = () => {
  const analisis = useCamStore((s) => s.analisis);
  const operaciones = useCamStore((s) => s.operaciones);
  const setOperaciones = useCamStore((s) => s.setOperaciones);
  const toggleOperacion = useCamStore((s) => s.toggleOperacion);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  const ordenSetups = useCamStore((s) => s.ordenSetups);
  const setOrdenSetups = useCamStore((s) => s.setOrdenSetups);
  const idJob = useCamStore((s) => s.idJob);
  const engineResponse = useCamStore((s) => s.engineResponse);

  // Lo que define el trabajo para el motor. Se lee aquí porque la consulta al
  // MDE manda el trabajo COMPLETO (mismo formulario que la generación), no un
  // resumen: ver solicitarAnalisis().
  const archivo = useCamStore((s) => s.archivo);
  const setup = useCamStore((s) => s.setup);
  const stockConfig = useCamStore((s) => s.stockConfig);
  const datumConfig = useCamStore((s) => s.datumConfig);
  const material = useCamStore((s) => s.material);
  const maquina = useCamStore((s) => s.maquina);
  const contextoFabricacion = useCamStore((s) => s.contextoFabricacion);

  const mdeRecomendaciones = useCamStore((s) => s.mdeRecomendaciones);
  const mdeEstado = useCamStore((s) => s.mdeEstado);
  const mdeError = useCamStore((s) => s.mdeError);
  const setMdeEstado = useCamStore((s) => s.setMdeEstado);
  const setMdeRecomendaciones = useCamStore((s) => s.setMdeRecomendaciones);
  const herramientaPorOperacion = useCamStore((s) => s.herramientaPorOperacion);
  const asignarHerramienta = useCamStore((s) => s.asignarHerramienta);

  // ── Mecanizabilidad ──────────────────────────────────────────────────────
  // La respuesta del motor es la fuente de verdad. Esta pantalla la solicita al
  // entrar y al cambiar el montaje, pero no deduce ni recompone veredictos.
  const mecanizabilidad = useCamStore((s) => s.mecanizabilidad);
  const mecanizabilidadEstado = useCamStore((s) => s.mecanizabilidadEstado);
  const mecanizabilidadError = useCamStore((s) => s.mecanizabilidadError);
  const setMecanizabilidad = useCamStore((s) => s.setMecanizabilidad);
  const setMecanizabilidadEstado = useCamStore((s) => s.setMecanizabilidadEstado);

  const consultaMecanizabilidadRef = useRef({
    idJob,
    faceIdApoyo: montajeConfig.face_id_apoyo,
    idMaquina: maquina?.id_maquina ?? null,
  });
  const initialEvaluationDoneRef = useRef(false);
  const ultimaConsultaSolicitadaRef = useRef<string | null>(null);
  const isEvaluatingMecanizabilidadRef = useRef(false);
  const evaluacionEpochRef = useRef(0);

  consultaMecanizabilidadRef.current = {
    idJob,
    faceIdApoyo: montajeConfig.face_id_apoyo,
    idMaquina: maquina?.id_maquina ?? null,
  };

  const [panelIzquierdo, setPanelIzquierdo] = useState(true);
  const [panelDerecho, setPanelDerecho] = useState(true);
  const [opEnfocada, setOpEnfocada] = useState<string | null>(null);
  const [inventario, setInventario] = useState<Instancia[]>([]);
  const [modalHerramienta, setModalHerramienta] = useState<{
    familia?: string;
    diametro?: number | null;
    contexto: string;
  } | null>(null);

  // ── Inventario del taller ────────────────────────────────────────────────
  // El MDE razona con familia y diámetro; el alojamiento del carrusel y el
  // estado físico viven aquí. Se cargan para poder ENSEÑARLOS, no para deducir
  // nada con ellos.
  const cargarInventario = async () => {
    try {
      setInventario(await getInstancias());
    } catch {
      setInventario([]);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  // ── Análisis del MDE ─────────────────────────────────────────────────────
  // Si el motor ya respondió en esta sesión, su `mde_recommendations` es la
  // fuente: llega dentro de la respuesta del motor y se adopta tal cual.
  useEffect(() => {
    if (mdeRecomendaciones) return;
    const delMotor = normalizarRecomendaciones(
      (engineResponse as any)?.mde_recommendations,
    );
    if (delMotor) setMdeRecomendaciones(delMotor);
  }, [engineResponse, mdeRecomendaciones, setMdeRecomendaciones]);

  // Un Job nuevo es un wizard nuevo: permite una evaluación inicial aunque el
  // componente no haya sido desmontado entre ambos trabajos.
  useEffect(() => {
    initialEvaluationDoneRef.current = false;
    ultimaConsultaSolicitadaRef.current = null;
    evaluacionEpochRef.current += 1;
  }, [idJob]);

  /**
   * Evalúa el montaje visible. Las refs hacen que este callback siempre tome
   * los datos actuales sin convertir los flags de control en estado de React.
   */
  const evaluarMecanizabilidad = async () => {
    const consulta = consultaMecanizabilidadRef.current;
    const idJob = consulta.idJob;
    if (
      !idJob ||
      consulta.faceIdApoyo === null ||
      consulta.idMaquina === null ||
      isEvaluatingMecanizabilidadRef.current
    ) {
      return;
    }

    const claveConsulta = `${idJob}:${consulta.faceIdApoyo}:${consulta.idMaquina}`;
    const epoch = evaluacionEpochRef.current;
    isEvaluatingMecanizabilidadRef.current = true;
    setMecanizabilidadEstado("analizando");

    try {
      const respuesta = await solicitarMecanizabilidad({ ...consulta, idJob });
      if (epoch === evaluacionEpochRef.current) {
        setMecanizabilidad(respuesta);
      }
    } catch (e) {
      if (epoch === evaluacionEpochRef.current) {
        setMecanizabilidadEstado(
          "error",
          mensajeError(e, "No se pudo evaluar la mecanizabilidad de este montaje."),
        );
      }
    } finally {
      isEvaluatingMecanizabilidadRef.current = false;

      // Si la cara o máquina cambió mientras la petición estaba pendiente, no
      // se solapan llamadas: al terminar se lanza una nueva para el montaje actual.
      const actual = consultaMecanizabilidadRef.current;
      const claveActual =
        actual.idJob && actual.faceIdApoyo !== null && actual.idMaquina !== null
          ? `${actual.idJob}:${actual.faceIdApoyo}:${actual.idMaquina}`
          : null;
      if (epoch !== evaluacionEpochRef.current || claveActual !== claveConsulta) {
        void evaluarMecanizabilidad();
      }
    }
  };

  // Evalúa una vez al montar Operaciones y de nuevo al variar cara o máquina.
  // La clave evita repetir la consulta por renders causados por sus propios
  // cambios de estado; el store invalida la respuesta al cambiar la cara.
  useEffect(() => {
    const { idJob, faceIdApoyo, idMaquina } = consultaMecanizabilidadRef.current;

    // [DIAG machinability] logs temporales — quitar tras el diagnóstico.
    console.log("[MACH] efecto ejecutado (montaje/cambio de deps)");
    console.log("[MACH] valores:", { idJob, faceIdApoyo, idMaquina });
    console.log("[MACH] guard:", {
      idJob_ok: !!idJob,
      faceIdApoyo_ok: faceIdApoyo !== null,
      idMaquina_ok: idMaquina !== null,
      bloqueaPor:
        !idJob
          ? "idJob (null/0/undefined)"
          : faceIdApoyo === null
            ? "faceIdApoyo === null"
            : idMaquina === null
              ? "idMaquina === null"
              : "no bloquea (pasa el guard)",
    });

    if (!idJob || faceIdApoyo === null || idMaquina === null) return;

    const claveConsulta = `${idJob}:${faceIdApoyo}:${idMaquina}`;
    const esInicial = !initialEvaluationDoneRef.current;
    const cambioMontaje = ultimaConsultaSolicitadaRef.current !== claveConsulta;

    // [DIAG machinability] por qué se lanza o no la petición.
    console.log("[MACH] dedup:", {
      claveConsulta,
      esInicial,
      cambioMontaje,
      seLanza: esInicial || cambioMontaje,
    });

    if (!esInicial && !cambioMontaje) return;

    initialEvaluationDoneRef.current = true;
    ultimaConsultaSolicitadaRef.current = claveConsulta;
    console.log("[MACH] → llamando evaluarMecanizabilidad()");
    void evaluarMecanizabilidad();
  }, [idJob, montajeConfig.face_id_apoyo, maquina?.id_maquina]);

  /**
   * Pide el análisis COMPLETO. Nunca una re-evaluación parcial de la operación
   * afectada: el razonamiento del MDE es global (una herramienta nueva puede
   * cambiar la alternativa de otra operación o resolver un conflicto entre
   * reglas), así que reevaluar una sola daría un resultado que el motor jamás
   * habría emitido.
   *
   * Manda el MISMO trabajo que la generación (TrabajoPayload → el formulario
   * que arma camService), porque el MDE tiene que opinar sobre el trabajo que
   * se va a mecanizar. Dos detalles que NO son descuidos:
   *
   *   · Van TODAS las operaciones detectadas, no solo las marcadas. Es la
   *     respuesta del MDE la que decide qué casillas quedan marcadas
   *     (`default_checked` → camStore.setMdeRecomendaciones), así que filtrar
   *     por `seleccionada` antes de preguntar sería circular: la primera
   *     consulta no mandaría ninguna operación.
   *   · Van las herramientas FÍSICAS del taller (Tier 3), que es el inventario
   *     sobre el que el MDE razona disponibilidad y alternativas.
   *
   * Falta el archivo STEP → no se pregunta. El motor necesita la geometría, y
   * un análisis sin ella no existe: se dice, no se simula.
   */
  const solicitarAnalisis = async () => {
    if (!idJob || !archivo) {
      setMdeEstado("error", "El trabajo aún no tiene análisis geométrico.");
      return;
    }
    if (!setup) {
      setMdeEstado(
        "error",
        "Confirme el montaje antes de pedir el análisis: sin él no hay medidas de bruto que enviar.",
      );
      return;
    }
    setMdeEstado("analizando");
    try {
      setMdeRecomendaciones(
        await solicitarRecomendacionesMDE({
          archivo,
          idJob,
          operaciones,
          herramientas: inventario,
          materialKey: material?.nombre ?? "",
          stockConfig,
          partDims: {
            x: setup.rotatedBBox.width,
            y: setup.rotatedBBox.depth,
            z: setup.rotatedBBox.height,
          },
          partCylinderOD: setup.partCylinderOD,
          partCylinderLen: setup.partCylinderLen,
          datumConfig,
          montajeConfig,
          contextoFabricacion,
          ordenSetups,
          idMaquina: maquina?.id_maquina,
        }),
      );
    } catch (e: any) {
      setMdeEstado(
        "error",
        mensajeError(e, "No se pudo obtener el análisis del MDE."),
      );
    }
  };

  const indiceMDE = useMemo(
    () => indexarRecomendaciones(mdeRecomendaciones, ordenSetups),
    [mdeRecomendaciones, ordenSetups],
  );

  const fallo = useMemo(
    () => consultaFallida(mdeRecomendaciones),
    [mdeRecomendaciones],
  );

  // Cruce por op_id y por nada más (ni posición, ni tipo, ni setup).
  const indiceMecanizabilidad = useMemo(
    () => indexarMecanizabilidad(mecanizabilidad),
    [mecanizabilidad],
  );

  // El único `desconocido` con remedio: el análisis guardado es anterior al
  // contrato de orientación, así que volver a analizar la pieza SÍ cambia la
  // respuesta (H11). El número sale de `resumen.por_motivo`, no de un recuento.
  const sinOrientacion = conteoPorMotivo(mecanizabilidad, MOTIVO.SIN_ORIENTACION);

  // ── Herramienta de cada operación ────────────────────────────────────────
  // Por defecto la que el MDE emparejó; si el operador eligió otra, la suya.
  // Solo se guarda la ANULACIÓN, así que las dos no se pueden desincronizar.
  const herramientaDe = useMemo(() => {
    return (op: { id: string; tipo: string; setup: number }) => {
      const elegida = porId(inventario, herramientaPorOperacion[op.id]);
      if (elegida) return elegida;
      const ideal = herramientaIdeal(recomendacionDe(indiceMDE, op));
      return buscarHerramientaFisica(inventario, ideal?.tipo, ideal?.diametro_mm);
    };
  }, [inventario, herramientaPorOperacion, indiceMDE]);

  // ── Contadores de la cabecera ────────────────────────────────────────────
  const contadores = useMemo(() => {
    let listas = 0;
    let revision = 0;
    let sinHerramienta = 0;
    for (const op of operaciones) {
      const estado = estadoFila(recomendacionDe(indiceMDE, op));
      if (estado === "lista") listas++;
      else if (estado === "revisar") revision++;
      else if (estado === "sin_herramienta") sinHerramienta++;
    }
    return { listas, revision, sinHerramienta };
  }, [operaciones, indiceMDE]);

  // ── Totales del pie ──────────────────────────────────────────────────────
  const seleccionadas = useMemo(
    () => operaciones.filter((op) => op.seleccionada),
    [operaciones],
  );

  const cambiosHerramienta = useMemo(
    () => cambiosDeHerramienta(seleccionadas.map((op) => herramientaDe(op))),
    [seleccionadas, herramientaDe],
  );

  // Material removido: lo calcula el motor (plan_mecanizado.remocion_stock). Si
  // no ha respondido, no hay número — no se deriva uno aquí.
  const remocion = (engineResponse as any)?.plan_mecanizado?.remocion_stock;
  const materialRemovido = remocion
    ? ["x", "y", "z"]
        .map((eje) => remocion[eje]?.total_mm)
        .filter((v: any) => typeof v === "number")
        .map((v: number, i: number) => `${["X", "Y", "Z"][i]} ${formatMm(v)}`)
        .join(" · ")
    : null;

  const opActual = operaciones.find((op) => op.id === opEnfocada) ?? null;

  const dimensiones = analisis?.dimensiones ?? { x: 100, y: 100, z: 50 };
  const operacionesBackend = [
    ...(analisis?.lados?.lado_a?.operaciones ?? []),
    ...(analisis?.lados?.lado_b?.operaciones ?? []),
  ];
  const idsSeleccionadas = seleccionadas.map((op) => op.id);

  // ── Acciones ─────────────────────────────────────────────────────────────

  const abrirRegistroHerramienta = (
    toolType: string | null,
    diametroMm: number | null,
  ) => {
    // El modal ya existe y ya acepta `contexto` y `filtroInicial`: se abre
    // prefiltrado por la familia y el Ø que falta, para que el operador no
    // tenga que buscar a mano lo que el MDE acaba de nombrar.
    const familia = familiaDeToolType(toolType) ?? undefined;
    setModalHerramienta({
      familia,
      diametro: diametroMm,
      contexto:
        diametroMm != null
          ? `La operación necesita Ø${diametroMm} mm`
          : "La operación necesita una herramienta que no está en el inventario",
    });
  };

  const alRegistrarHerramienta = async () => {
    setModalHerramienta(null);
    await cargarInventario();
    // Inventario nuevo ⇒ análisis COMPLETO otra vez.
    await solicitarAnalisis();
  };

  const ignorarOperacion = () => {
    if (!opActual || !opActual.seleccionada) return;
    toggleOperacion(opActual.id);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Cabecera ── */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text-primary md:text-lg">
            Operaciones
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Elige una operación para verla sobre la pieza.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Contador
            valor={contadores.listas}
            etiqueta={contadores.listas === 1 ? "lista" : "listas"}
            clase="border-green-500/30 bg-green-500/10 text-green-400"
          />
          <Contador
            valor={contadores.revision}
            etiqueta={contadores.revision === 1 ? "revisión" : "revisiones"}
            clase="border-amber-500/30 bg-amber-500/10 text-amber-400"
          />
          <Contador
            valor={contadores.sinHerramienta}
            etiqueta="sin herram."
            clase="border-red-500/30 bg-red-500/10 text-red-400"
          />

          {/* Mecanizabilidad: los tres contadores salen de `resumen`, ya
              contados por el motor. Si el frontend los volviera a sumar y el
              motor cambiara una regla, la cabecera empezaría a discrepar del
              veredicto de cada fila sin que fallara nada. */}
          {mecanizabilidad && (
            <span className="mx-1 self-center text-[11px] text-text-muted/50">
              |
            </span>
          )}
          {mecanizabilidad &&
            CONTADORES_VEREDICTO.map(({ clave, etiqueta }) => (
              <Contador
                key={clave}
                valor={mecanizabilidad.resumen[clave]}
                etiqueta={etiqueta}
                clase={VEREDICTO_CLASE[clave]}
              />
            ))}
        </div>
      </div>

      {/* Estado de la evaluación cuando NO hay veredicto que mostrar. Un hueco
          en blanco se lee como "todo bien"; aquí se dice qué falta. */}
      {!mecanizabilidad && (
        <p className="text-[11px] text-text-muted">
          {mecanizabilidadEstado === "analizando"
            ? "Evaluando qué se puede mecanizar con este montaje…"
            : mecanizabilidadEstado === "error"
              ? (mecanizabilidadError ??
                "No se pudo evaluar la mecanizabilidad de este montaje.")
              : "Mecanizabilidad sin evaluar: vuelve al paso Montaje y confírmalo para pedir el veredicto."}
        </p>
      )}

      {/* Único caso con remedio real. No se ofrece en los demás `desconocido`:
          repetir el análisis no los cambiaría y sería mandar al operario a dar
          una vuelta inútil. */}
      {sinOrientacion > 0 && (
        <p className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-2.5 py-1.5 text-[11px] text-text-muted">
          <span className="font-semibold text-text-primary">
            {sinOrientacion}
          </span>{" "}
          {sinOrientacion === 1 ? "operación" : "operaciones"} sin veredicto por
          un análisis antiguo. {TEXTO_REMEDIO_REANALISIS}
        </p>
      )}

      {/* ── Zona central: visor + paneles flotantes ──
          El alto es FIJO y no depende de los paneles. */}
      <div className="relative h-[520px] overflow-hidden rounded-xl border border-border bg-bg-primary md:h-[620px]">
        {/* El contenedor del canvas ocupa SIEMPRE el 100 %: los paneles van
            encima, nunca a su lado. */}
        <div className="absolute inset-0">
          <CamViewer3D
            dimensiones={dimensiones}
            mostrarMesa
            modoLecturaMontaje
            operaciones={operaciones}
            operacionesBackend={operacionesBackend}
            seleccionadas={idsSeleccionadas}
            opEnfocada={opEnfocada}
            // Doble clic en una cara → ENFOCA su operación en la lista. El
            // visor solo informa de qué operación hay en la cara; qué significa
            // eso lo decide esta pantalla.
            onToggle={(id) => {
              setOpEnfocada(id);
              setPanelDerecho(true);
            }}
            faceIdDestacada={montajeConfig.face_id_apoyo}
            sujecionConfig={montajeConfig.sujecion_config}
          />
        </div>

        {/* Línea de ayuda — sobre el visor, sin robarle espacio. */}
        <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-3 pb-1.5 pt-6 text-center text-[10px] text-white/80">
          Arrastra para rotar · Scroll para acercar · Doble clic en una cara para
          seleccionar
        </p>

        <PanelDeslizante
          lado="izquierda"
          abierto={panelIzquierdo}
          onAlternar={() => setPanelIzquierdo((v) => !v)}
          ancho={ANCHO_PANEL_IZQUIERDO}
          titulo="Operaciones"
          distintivo={
            <span className="ml-auto text-[10px] text-text-muted">
              {seleccionadas.length}/{operaciones.length}
            </span>
          }
        >
          <ListaOperaciones
            operaciones={operaciones}
            indiceMDE={indiceMDE}
            indiceMecanizabilidad={indiceMecanizabilidad}
            herramientaDe={herramientaDe}
            opEnfocada={opEnfocada}
            onEnfocar={setOpEnfocada}
            onAlternar={toggleOperacion}
            onSeleccionarTodas={() =>
              setOperaciones(operaciones.map((op) => ({ ...op, seleccionada: true })))
            }
            onDeseleccionarTodas={() =>
              setOperaciones(operaciones.map((op) => ({ ...op, seleccionada: false })))
            }
            ordenSetups={ordenSetups}
            onOrdenSetups={setOrdenSetups}
          />
        </PanelDeslizante>

        <PanelDeslizante
          lado="derecha"
          abierto={panelDerecho}
          onAlternar={() => setPanelDerecho((v) => !v)}
          ancho={ANCHO_PANEL_DERECHO}
          titulo="Asistente MDE"
        >
          <PanelMDE
            operacion={opActual}
            recomendacion={opActual ? recomendacionDe(indiceMDE, opActual) : null}
            inventario={inventario}
            estado={mdeEstado}
            error={mdeError}
            motivoNoDisponible={fallo?.reason ?? null}
            onSolicitarAnalisis={solicitarAnalisis}
            onUsarAlternativa={(herramienta) => {
              if (opActual) {
                asignarHerramienta(
                  opActual.id,
                  herramienta.id_herramienta_instancia,
                );
              }
            }}
            onRegistrarHerramienta={abrirRegistroHerramienta}
            onIgnorarOperacion={ignorarOperacion}
          />
        </PanelDeslizante>
      </div>

      {/* ── Pie: totales ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-bg-primary px-3 py-2">
        <Total
          etiqueta="Cambios de herramienta"
          valor={cambiosHerramienta != null ? String(cambiosHerramienta) : null}
          ayuda="Se cuenta sobre las operaciones seleccionadas, en el orden de la lista. Si alguna no tiene herramienta asignada no hay total: un número con un hueco sería falso."
        />
        <Total
          etiqueta="Longitud de trayectoria"
          valor={null}
          ayuda="La calcula el motor al generar las trayectorias; todavía no ha respondido para este trabajo."
        />
        <Total
          etiqueta="Material removido"
          valor={materialRemovido ? `${materialRemovido} mm` : null}
          ayuda="Remoción por eje que reporta el motor (plan_mecanizado.remocion_stock)."
        />
        {/* Sitio RESERVADO para el tiempo estimado. Se muestra vacío a
            propósito: el MDE no calcula tiempo hoy y aquí no se inventa uno.
            Aparecerá cuando salga de datos reales (pasadas × avance × longitud). */}
        <Total
          etiqueta="Tiempo estimado"
          valor={null}
          ayuda="No se muestra: hoy no se calcula con datos reales, y un tiempo inventado se convierte en una promesa al cliente."
        />

        <div className="ml-auto">
          <WizardNavButtons
            prevStep="contexto"
            nextStep="resumen"
            canAdvance={seleccionadas.length > 0}
          />
        </div>
      </div>

      {/* Modal REUTILIZADO tal cual, prefiltrado por familia y Ø. */}
      <AgregarHerramientaModal
        abierto={modalHerramienta !== null}
        onCerrar={() => setModalHerramienta(null)}
        onRegistrada={alRegistrarHerramienta}
        contexto={modalHerramienta?.contexto}
        filtroInicial={
          modalHerramienta
            ? {
                familia: modalHerramienta.familia,
                diametro_min:
                  modalHerramienta.diametro != null
                    ? modalHerramienta.diametro - TOLERANCIA_DIAMETRO_MM
                    : undefined,
                diametro_max:
                  modalHerramienta.diametro != null
                    ? modalHerramienta.diametro + TOLERANCIA_DIAMETRO_MM
                    : undefined,
              }
            : undefined
        }
      />
    </div>
  );
};

function Contador({
  valor,
  etiqueta,
  clase,
}: {
  valor: number;
  etiqueta: string;
  clase: string;
}) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${clase}`}>
      <span className="font-semibold">{valor}</span> {etiqueta}
    </span>
  );
}

/**
 * Un total del pie. Sin valor muestra un guion, NUNCA un cero ni una
 * estimación: la ausencia de dato se ve como ausencia.
 */
function Total({
  etiqueta,
  valor,
  ayuda,
}: {
  etiqueta: string;
  valor: string | null;
  ayuda: string;
}) {
  return (
    <div title={ayuda} className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-text-muted">
        {etiqueta}
      </span>
      <span
        className={`font-mono text-xs ${valor ? "text-text-primary" : "text-text-muted/50"}`}
      >
        {valor ?? "—"}
      </span>
    </div>
  );
}
