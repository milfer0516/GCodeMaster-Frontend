# Frontend — GCodeMaster

## Stack

React 18 + Vite + TypeScript + Zustand + TailwindCSS + Three.js

## Estructura CAM relevante

```
src/modules/cam/
  components/
    CamViewer3D.tsx          ← visor Three.js — NO tocar sin análisis
    sujecion/
      ModalSujecion.tsx      ✅
      PasoSelectorElemento.tsx ✅
      PasoConfigElemento.tsx ✅
      PasoValidacionMaquina.tsx ✅
      SujecionOverlay3D.tsx  ⚠️ desactivado — coordenadas incorrectas
    steps/
      StepMontaje.tsx        ✅
      StepOperaciones.tsx    ✅
  services/camService.ts     ✅
  store/camStore.ts          ✅
```

## Decisiones Three.js — NO revertir

- Mesh global único con addGroup() por cara
- materialIndex == face_id → picking O(1)
- Rotación visual: Quaternion.slerp() 600ms ease in-out
- mesh.position.y = -minYTransformado (base sobre grilla)
- Con sujeción: mesh.position.y = -minYTransformado + z_apoyo_mm

## Tipos clave (camService.ts)

```typescript
MeshData { positions, normals, indices, faces, bounding_box, stats }
FaceMetadata { face_id, start, count, surface_type, feature, face_normal }
```

## camStore.ts — estado relevante

```typescript
MontajeConfig {
  tipo_sujecion: TipoSujecion
  sujecion_config: SujecionConfig | null  // tiene envolvente y z_apoyo_mm
  face_id_apoyo: number | null
  face_normal_apoyo: number[] | null
  wcs: "G54"|"G55"|"G56"|"G57"
}
SujecionConfig.envolvente.z_apoyo_mm  // altura de montaje para G-Code
```

## SujecionOverlay3D — problema pendiente

Conversión coordenadas OCC → Three.js:

- Three.js X = OCC X
- Three.js Y = OCC Z (altura)
- Three.js Z = -OCC Y
  Los grupos se posicionan en y=0 pero deben ir en y negativo
  respecto al mesh de la pieza. Requiere recibir minYTransformado.

## Elementos de sujeción implementados

prensa | bridas | mesa_magnetica | copa_torno
Pendientes: mordaza_3garras | entre_puntos | plato_divisor

## Restricciones de planes

- demo: sin descarga G-Code
- basic: descarga G-Code, sin simulador
- premium: simulador + Copiloto IA
- Hook: usePlanInfo.ts — componente: PlanBanner.tsx

## Problema resuelto

- Pieza sobre grilla: mesh.position.y = -minYTransformado + z_apoyo_mm ✅
- Normales invertidas: TopAbs_REVERSED en tessellator.py ✅
- op_id sincronizado backend ↔ frontend ✅

## Pendiente UX/UI

- Dashboard rediseño
