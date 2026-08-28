// src/modules/cam/components/steps/StepMontaje.tsx
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { Collapsible } from "../../../../components/ui/Collapsible";
import { LayoutPasoVisor } from "../../../../components/layout/LayoutPasoVisor";
import { ModalSujecion } from "../sujecion/ModalSujecion";
import { EditorMontajeEspacial } from "../sujecion/EditorMontajeEspacial";
import { WizardNavButtons } from "./WizardNavButtons";
import type { SujecionConfig } from "../../store/camStore";

const WCS_ITEMS = [
  { code: "G54" as const, descripcion: "Origen pieza 1 (más común)" },
  { code: "G55" as const, descripcion: "Origen pieza 2 — múltiples piezas" },
  { code: "G56" as const, descripcion: "Origen pieza 3" },
  { code: "G57" as const, descripcion: "Origen pieza 4" },
];

const LABEL_TIPO: Record<string, string> = {
  prensa: "Prensa de banco",
  bridas: "Bridas + tornillos",
  mesa_magnetica: "Mesa magnética",
  copa_torno: "Copa de torno",
};

function badgeSujecion(cfg: SujecionConfig): string {
  const tipo = LABEL_TIPO[cfg.tipo ?? ""] ?? (cfg.tipo ?? "");
  const zApoyo = cfg.envolvente?.z_apoyo_mm ?? 0;
  if (cfg.tipo === "prensa")
    return `${tipo} — Ø${cfg.ancho_mordaza_mm}mm — z_apoyo: ${zApoyo}mm`;
  if (cfg.tipo === "bridas")
    return `${tipo} — ${cfg.cantidad_bridas} bridas — z_apoyo: ${zApoyo}mm`;
  if (cfg.tipo === "copa_torno")
    return `${tipo} — Ø${cfg.diametro_copa_mm}mm — z_apoyo: ${zApoyo}mm`;
  if (cfg.tipo === "mesa_magnetica")
    return `${tipo} — z_apoyo: ${zApoyo}mm`;
  return tipo;
}

function resumirSujecion(cfg: SujecionConfig): string {
  if (cfg.tipo === "prensa") {
    return `Mordaza ${cfg.ancho_mordaza_mm}mm · Apertura ${cfg.apertura_mm}mm · H.mordaza ${cfg.altura_mordaza_mm}mm${cfg.altura_paralelas_mm ? ` · Paralelas ${cfg.altura_paralelas_mm}mm` : ""}`;
  }
  if (cfg.tipo === "bridas") {
    return `${cfg.cantidad_bridas} bridas${cfg.posicion_automatica ? " · Posición automática" : " · Posición manual"}${cfg.altura_paralelas_mm ? ` · Paralelas ${cfg.altura_paralelas_mm}mm` : ""}`;
  }
  if (cfg.tipo === "copa_torno") {
    return `Ø${cfg.diametro_copa_mm}mm · ${cfg.tipo_garras} garras`;
  }
  if (cfg.tipo === "mesa_magnetica") {
    return "Mesa magnética activa";
  }
  return "";
}

export const StepMontaje = () => {
  const setStep = useCamStore((s) => s.setStep);
  const analisis = useCamStore((s) => s.analisis);
  console.log("tipo_pieza:", analisis?.tipo_pieza);
  console.log("caras_planas count:", analisis?.caras_planas?.length);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  const setMontajeConfig = useCamStore((s) => s.setMontajeConfig);
  const setMontajeEspacial = useCamStore((s) => s.setMontajeEspacial);
  const meshData = useCamStore((s) => s.meshData);
  const confirmMontaje = useCamStore((s) => s.confirmMontaje);

  // La máquina se carga UNA vez a nivel del wizard (CamWizardPage) al entrar al
  // flujo CAM; aquí solo se LEE del store. Así sus dimensiones (mesa_x/y_mm) están
  // disponibles para el visor en cualquier paso sin depender de que Montaje se
  // monte primero. La cascada máquina→mecanizabilidad la conserva setMaquina.
  const maquinaActiva = useCamStore((s) => s.maquina);
  const [modalAbierto, setModalAbierto] = useState(false);

  const dimensiones = analisis?.dimensiones ?? { x: 0, y: 0, z: 0 };

  // Silueta de la pieza en el editor espacial: círculo si la pieza es
  // cilíndrica, si no rectángulo. Es SOLO presentación (el modelo de datos —
  // pos/altura/orientación — es idéntico para ambas formas), así que el bbox
  // manda y esta heurística no puede corromper ningún número serializado.
  const esCilindrica = /cil|redond|torn|revol/i.test(
    String(analisis?.tipo_pieza ?? ""),
  );

  const carasPlanas = analisis?.caras_planas ?? [];
  const carasParaSelector = [...carasPlanas]
    .sort((a: any, b: any) => b.area_mm2 - a.area_mm2)
    .map((c: any) => {
      let orientacion = "Lateral";
      if (c.apunta_arriba) orientacion = "Superior";
      else if (c.apunta_abajo) orientacion = "Inferior";
      return {
        face_id: c.face_index,
        label: `${orientacion} — Área ${Math.round(c.area_mm2)} mm² — Z=${c.z_mm}mm`,
        normal: c.normal,
      };
    });

  const puedeAvanzar = montajeConfig.sujecion_config !== null;

  const handleConfirmarSujecion = (config: SujecionConfig) => {
    setMontajeConfig({
      tipo_sujecion: config.tipo,
      sujecion_config: config,
      id_maquina: maquinaActiva?.id_maquina ?? null,
    });
  };

  // Controles del paso (los Collapsibles). El MARCO — envoltura con scroll,
  // cabeceras, plegado y cajón — lo aporta LayoutPasoVisor; aquí solo el contenido.
  const controlesMontaje = (
    <>
      {/* Sujeción */}
      <Collapsible titulo="Sistema de sujeción" defaultOpen>
        {montajeConfig.sujecion_config ? (
          <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {LABEL_TIPO[montajeConfig.sujecion_config.tipo ?? ""] ??
                    montajeConfig.sujecion_config.tipo}
                </p>
                <p className="mt-0.5 text-xs text-text-muted leading-snug">
                  {resumirSujecion(montajeConfig.sujecion_config)}
                </p>
                {montajeConfig.sujecion_config.altura_total_montaje_mm !== null && (
                  <p className="mt-1 text-xs text-text-muted">
                    Altura total:{" "}
                    <span className="font-semibold text-text-primary">
                      {Math.round(montajeConfig.sujecion_config.altura_total_montaje_mm)}mm
                    </span>
                  </p>
                )}
                <p className="mt-1.5 font-mono text-[11px] leading-none text-accent-blue/80">
                  {badgeSujecion(montajeConfig.sujecion_config)}
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(true)}
                className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-accent-blue/50 hover:text-text-primary transition"
              >
                Cambiar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setModalAbierto(true)}
            disabled={!maquinaActiva}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-text-muted transition hover:border-accent-blue/50 hover:text-accent-blue disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Settings2 className="h-4 w-4" />
            {maquinaActiva
              ? "Configurar sujeción"
              : "Cargando máquina registrada…"}
          </button>
        )}
      </Collapsible>

      {/* Cara de apoyo */}
      <Collapsible titulo="Cara de apoyo">
        <p className="mb-2 text-xs text-text-muted">
          Doble clic en la cara del visor; un clic muestra su dimensión.
        </p>
        {carasParaSelector.length === 0 ? (
          <p className="text-xs text-text-muted">
            No hay caras de apoyo detectadas.
          </p>
        ) : (
          <select
            value={montajeConfig.face_id_apoyo ?? ""}
            onChange={(e) => {
              const faceId =
                e.target.value === "" ? null : Number(e.target.value);
              const cara = carasParaSelector.find(
                (c) => c.face_id === faceId,
              );
              setMontajeConfig({
                face_id_apoyo: faceId,
                face_normal_apoyo: cara ? cara.normal : null,
              });
            }}
            className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
          >
            <option value="">Seleccionar cara de apoyo…</option>
            {carasParaSelector.map((c) => (
              <option key={c.face_id} value={c.face_id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        {montajeConfig.face_id_apoyo !== null && (
          <p className="mt-1 text-xs text-accent-blue">
            ✓ Cara seleccionada:{" "}
            {carasParaSelector.find(
              (c) => c.face_id === montajeConfig.face_id_apoyo,
            )?.label ?? `ID ${montajeConfig.face_id_apoyo}`}
          </p>
        )}
      </Collapsible>

      {/* WCS */}
      <Collapsible titulo="Sistema de coordenadas (WCS)">
        <div className="grid grid-cols-2 md:flex gap-2">
          {WCS_ITEMS.map(({ code, descripcion }) => (
            <div key={code} className="relative group">
              <button
                onClick={() => setMontajeConfig({ wcs: code })}
                className={`w-full md:w-auto rounded-xl border px-4 py-3 md:py-2 min-h-[44px] text-sm font-medium transition ${
                  montajeConfig.wcs === code
                    ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                    : "border-border bg-bg-primary text-text-muted hover:border-accent-blue/50"
                }`}
              >
                {code}
              </button>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 group-hover:block">
                <div className="rounded-lg border border-border bg-bg-card px-2.5 py-1.5 text-xs text-text-primary shadow-lg whitespace-nowrap">
                  {code}: {descripcion}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* Notas */}
      <Collapsible titulo="Notas de montaje">
        <textarea
          value={montajeConfig.notas}
          onChange={(e) => setMontajeConfig({ notas: e.target.value })}
          placeholder="Instrucciones especiales de sujeción…"
          rows={3}
          className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none resize-none"
        />
      </Collapsible>

      {/* Colocación en la mesa (editor espacial) */}
      {maquinaActiva && (
        <Collapsible titulo="Colocación en la mesa">
          <p className="mb-3 text-xs text-text-muted">
            Arrastra la pieza y los elementos físicos a su posición real sobre la
            mesa. Marca dónde agarra cada elemento (zona de sujeción). Solo se
            guardan las posiciones y alturas, no el dibujo.
          </p>
          <EditorMontajeEspacial
            maquina={maquinaActiva}
            dimensiones={dimensiones}
            esCilindrica={esCilindrica}
            value={montajeConfig.montaje_espacial}
            onChange={setMontajeEspacial}
          />
        </Collapsible>
      )}
    </>
  );

  return (
    <>
      <LayoutPasoVisor
        encabezado={
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Configuración de montaje
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Define cómo se fija la pieza en la máquina antes de seleccionar
              operaciones.
            </p>
          </div>
        }
        visorContent={
          <CamViewer3D
            dimensiones={dimensiones}
            mostrarMesa
            modoLecturaMontaje
            sujecionConfig={montajeConfig.sujecion_config}
            piezaBoundingBox={dimensiones}
            onFaceClick={(faceId) => {
              const caraPlana = carasPlanas.find(
                (c: any) => c.face_index === faceId,
              );
              const faceNormal = caraPlana
                ? caraPlana.normal
                : (meshData?.faces.find((f) => f.face_id === faceId)
                    ?.face_normal ?? null);
              setMontajeConfig({
                face_id_apoyo: faceId,
                face_normal_apoyo: faceNormal,
              });
            }}
            faceIdDestacada={montajeConfig.face_id_apoyo}
          />
        }
        paneles={[
          {
            id: "controles",
            titulo: "Controles",
            tituloMovil: "Controles de montaje",
            abiertoInicial: true,
            contenido: controlesMontaje,
          },
        ]}
        navegacion={
          <WizardNavButtons
            prevStep="analisis"
            nextStep="material"
            nextLabel="Seleccionar material"
            canAdvance={puedeAvanzar}
            onNext={() => {
              // Confirmación explícita del montaje: aquí se construye el Setup
              // persistente (fuente de verdad en frame OCC/máquina) que consumirán
              // el visor y, en fases siguientes, Stock/operaciones/G-code.
              confirmMontaje();
              // El veredicto de mecanizabilidad NO se pide aquí: el paso
              // Operaciones es el único disparador (useEffect con guarda de los
              // tres valores idJob/face/idMaquina). Pedirlo también en este punto
              // —sin esa guarda— lanzaba una evaluación con id_maquina posiblemente
              // nulo que pisaba el veredicto bueno con 'desconocido'.
              console.log(
                "montajeConfig al confirmar:",
                JSON.stringify(montajeConfig, null, 2),
              );
            }}
          />
        }
      />

      {/* Modal de sujeción */}
      {modalAbierto && maquinaActiva && (
        <ModalSujecion
          maquina={maquinaActiva}
          dimensiones={dimensiones}
          onConfirm={handleConfirmarSujecion}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </>
  );
};
