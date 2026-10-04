// src/modules/cam/components/steps/StepMontaje.tsx
//
// Paso Montaje: compone el visor y el panel de secciones. Los controles viven
// en las secciones (components/montaje/), registradas en seccionesMontaje.ts.
// Aquí solo queda el visor, el estado del modo datum (local a esta pantalla) y
// la nota de lo que falta para avanzar.
import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { LayoutPasoVisor } from "../../../../components/layout/LayoutPasoVisor";
import { WizardNavButtons } from "./WizardNavButtons";
import { PanelMontaje } from "../montaje/PanelMontaje";
import { ContextoMontajeLocal } from "../montaje/contextoMontaje";
import { usePuntosDatum } from "../montaje/hooksMontaje";
import { pendientesDeMontaje } from "../../domain/pasos";

export const StepMontaje = () => {
  const analisis = useCamStore((s) => s.analisis);
  console.log("tipo_pieza:", analisis?.tipo_pieza);
  console.log("caras_planas count:", analisis?.caras_planas?.length);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  const setMontajeConfig = useCamStore((s) => s.setMontajeConfig);
  const meshData = useCamStore((s) => s.meshData);
  const estadoOrientacion = useCamStore((s) => s.estadoOrientacion);

  // El modo datum es estado de ESTA pantalla: al salir del paso se pierde y el
  // visor vuelve a su comportamiento normal. Las secciones lo leen por contexto.
  const [modoDatum, setModoDatum] = useState(false);
  const salirModoDatum = useCallback(() => setModoDatum(false), []);
  const contextoLocal = useMemo(() => ({ modoDatum, setModoDatum }), [modoDatum]);
  const { puntosDatum, puntoElegido, elegirPuntoDatum } = usePuntosDatum();

  // Lo que falta para avanzar: misma lista que decide puedeAvanzar y que marca
  // "Pendiente" en las secciones (domain/montaje.ts vía domain/pasos.ts).
  const pendientes = useCamStore(useShallow(pendientesDeMontaje));

  const dimensiones = analisis?.dimensiones ?? { x: 0, y: 0, z: 0 };
  const carasPlanas = analisis?.caras_planas ?? [];

  return (
    <ContextoMontajeLocal.Provider value={contextoLocal}>
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
              // Sellada o sellándose, la cara de apoyo no se cambia desde el
              // visor (solo con "Editar cara de apoyo").
              if (estadoOrientacion !== "editando") return;
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
            modoDatum={modoDatum}
            puntosDatum={puntosDatum}
            datumSeleccionadoId={puntoElegido?.id ?? null}
            onDatumPick={elegirPuntoDatum}
            onSalirModoDatum={salirModoDatum}
          />
        }
        paneles={[
          {
            id: "controles",
            titulo: "Controles",
            tituloMovil: "Controles de montaje",
            abiertoInicial: true,
            contenido: <PanelMontaje />,
          },
        ]}
        navegacion={
          <>
            {/* Misma lista que decide puedeAvanzar (domain/pasos.ts). */}
            {pendientes.length > 0 && (
              <p className="mb-2 text-xs text-text-muted">
                Para continuar falta: {pendientes.join(", ")}.
              </p>
            )}
            {/* Al avanzar, el registro (domain/pasos.ts) confirma el montaje y
                cierra Montaje y Cargar. */}
            <WizardNavButtons nextLabel="Seleccionar material" />
          </>
        }
      />
    </ContextoMontajeLocal.Provider>
  );
};
