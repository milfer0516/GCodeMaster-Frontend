# Frontend — GCodeMaster Frontend

## Proyecto

GCodeMaster CNC — SaaS CAM para PYMES metalmecánicas Colombia
Interfaz web para operarios CNC sin conocimientos avanzados de CAM

## Stack

- React 18 + Vite + TypeScript + Zustand + TailwindCSS + Three.js
- Deploy: Vercel automático en push a main
- URL producción: https://gcodemastercnc.vercel.app
- Backend: https://gcodemastercnc.duckdns.org

## Deploy

Push a main → Vercel despliega automáticamente (~1 min)
vercel.json configurado con rewrites para React Router

## Variables de entorno (Vercel)

- VITE_API_URL_PROD=https://gcodemastercnc.duckdns.org
- VITE_API_URL_DEV=http://localhost:8000

## CAM Wizard — estado de pasos

- StepCargarStep.tsx ✅ — upload STEP con drag & drop
- StepAnalisis.tsx ✅ — dimensiones + operaciones detectadas
- StepMontaje.tsx ✅ — selector caras, rotación animada 600ms slerp
- StepOperaciones.tsx ✅ — lista operaciones con picking 3D
- StepMaterial.tsx ❌ — pendiente
- StepMaquina.tsx ❌ — pendiente
- StepResumen.tsx ❌ — pendiente
- StepResultado.tsx ❌ — pendiente

## Decisiones NO revertir — Three.js / CamViewer3D

- Mesh global único con addGroup() por cara — NO mesh por cara
- materialIndex == face_id — picking O(1)
- op_id viene del backend ("op_0", "op_1"...) — NO regenerar en frontend
- camStore.ts usa op.op_id con fallback para id de operación
- Rotación visual: Quaternion.slerp() 600ms ease in-out

## Estructura relevante

src/
modules/
cam/
components/
CamViewer3D.tsx ← visor Three.js OCC mesh
StepMontaje.tsx ← selector cara de apoyo
StepOperaciones.tsx ← lista + picking
services/camService.ts
store/camStore.ts
pages/CamWizardPage.tsx
auth/ ← login, MFA, registro
dashboard/ ← dashboard principal
herramientas/ ← CRUD inventario
maquinas/ ← gestión máquinas
services/api.ts ← axios con interceptors JWT refresh
hooks/usePlanInfo.ts
components/ui/PlanBanner.tsx

## Problema activo

Pieza flotando sobre grilla — fórmula halfHeight incorrecta
en CamViewer3D.tsx useEffect 3 (posicionamiento inicial del mesh)

## Tipos importantes

- MeshData — buffers OCC: positions, normals, indices, faces
- FaceMetadata — face_id, start, count, surface_type, feature, face_normal
- FeatureInfo — op_id, op_tipo, tipo
- CamStep — pasos del wizard: cargar|analisis|montaje|operaciones|...

## Planes y restricciones frontend

- demo: sin descarga G-Code, 1 simulación/día
- basic: descarga G-Code, sin simulador
- premium: simulador + Copiloto IA ilimitado
- usePlanInfo.ts centraliza lógica de planes
- PlanBanner.tsx muestra días restantes y botón upgrade
