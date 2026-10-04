// src/modules/cam/components/steps/StepMontaje.tsx
//
// Paso Montaje: compone el visor con la barra de secciones y su panel flotante
// (useSeccionesFlotantes). Los controles viven en las secciones
// (components/montaje/), registradas en seccionesMontaje.ts. Aquí solo queda el
// visor. Lo que falta para avanzar lo pinta la barra de acciones
// (WizardNavButtons). El cero de pieza (datum y WCS) vive en Stock.
import { useCamStore } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { LayoutPasoVisor } from "../../../../components/layout/LayoutPasoVisor";
import { WizardNavButtons } from "./WizardNavButtons";
import { useSeccionesFlotantes } from "../montaje/useSeccionesFlotantes";

export const StepMontaje = () => {
  const analisis = useCamStore((s) => s.analisis);
  console.log("tipo_pieza:", analisis?.tipo_pieza);
  console.log("caras_planas count:", analisis?.caras_planas?.length);
  const montajeConfig = useCamStore((s) => s.montajeConfig);
  const setMontajeConfig = useCamStore((s) => s.setMontajeConfig);
  const meshData = useCamStore((s) => s.meshData);
  const estadoOrientacion = useCamStore((s) => s.estadoOrientacion);

  const { barra, panel } = useSeccionesFlotantes();

  const dimensiones = analisis?.dimensiones ?? { x: 0, y: 0, z: 0 };
  const carasPlanas = analisis?.caras_planas ?? [];

  return (
    <LayoutPasoVisor
      titulo="Configuración de montaje"
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
        />
      }
      barraSuperior={barra}
      superposicionVisor={panel}
      sinColumnaControles
      paneles={[]}
      navegacion={
        // Al avanzar, el registro (domain/pasos.ts) confirma el montaje y
        // cierra Montaje y Cargar.
        <WizardNavButtons />
      }
    />
  );
};
