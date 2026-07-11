# Frontend — GCodeMaster

## Role

You are a Senior Frontend Engineer specialized in React, TypeScript, and
Three.js, with working knowledge of CAM/CNC visualization. You are working
on GCodeMaster CNC — a multi-tenant SaaS for G-Code generation for
Colombian metalworking SMEs. This file is your persistent context for the
frontend; read it fully before making any change.

## Stack

React 18 + Vite + TypeScript + Zustand + TailwindCSS + Three.js

## Relevant CAM structure

```
src/modules/cam/
  components/
    CamViewer3D.tsx          ← Three.js viewer — DO NOT TOUCH WITHOUT ANALYSIS
    sujecion/
      ModalSujecion.tsx      ✅
      PasoSelectorElemento.tsx ✅
      PasoConfigElemento.tsx ✅
      PasoValidacionMaquina.tsx ✅
      SujecionOverlay3D.tsx  ⚠️ disabled — incorrect coordinates
    steps/
      StepCargarStep.tsx     ✅ shared validateFile (extension + 5MB size)
      StepAnalisis.tsx       ✅
      StepMontaje.tsx        ✅ double-click selects support face; single click shows dimension
      StepOperaciones.tsx    ✅ double-click toggles operation; single click shows dimension
      StepMaterial.tsx       ✅ catalog grouped by categoria, asignarMaterialJob() on next
      StepStock.tsx          ✅ draws stock wireframe (box/cylinder) over the part in the viewer
  services/camService.ts     ✅
  store/camStore.ts          ✅
```

## Wizard step order (current)

```
cargar → analisis → montaje → operaciones → material → stock → resumen → resultado
```

No "maquina" step — the machine is mandatory at company registration
(min. 1 machine + 5 tools), so it is never chosen inside the wizard.
Pending: add a "simulacion" step between resumen and resultado (Pro plan only, see Plan restrictions).

## Three.js decisions — DO NOT REVERT

- Single global mesh with addGroup() per face
- materialIndex == face_id → O(1) picking
- Visual rotation: Quaternion.slerp() **1200ms** ease in-out (raised from 600ms — felt too fast)
- mesh.position.y = -minYTransformado (base on grid)
- With fixturing: mesh.position.y = -minYTransformado + z_apoyo_mm
- Rotation pivot fix: mesh must also recenter X/Z after rotating (not just Y),
  and OrbitControls.target must follow the new mesh center (lerpVectors during
  the same slerp animation) — otherwise the part rotates but looks off-center
  and the camera keeps looking at the old center.
- Rotation source of truth: use the ANALYSIS normal (`analisis.caras_planas[].normal`),
  never `face.face_normal` (tessellation) directly. Tessellation normal can come
  with inverted sign vs. the analysis for the same face — confirmed with placa.step
  (analysis said `apunta_arriba:true`, tessellation gave the opposite sign), causing
  the wrong face to land on the table. Fallback to `face.face_normal` only if the
  face is not found in `caras_planas`.

## Face picking — click vs double-click (current behavior)

- Single click → ONLY shows the face dimension in a fixed overlay panel
  (bottom-left corner of the viewer, `pointer-events:none`). Does NOT select anything.
- Double click → performs the selection action:
  - StepMontaje: sets the support face (`onFaceClick`)
  - StepOperaciones: toggles the operation (`onToggle`)
- No timeout needed to distinguish click/dblclick: the single-click handler is
  idempotent (just sets state), so it can fire twice during a dblclick without
  side effects.
- Dimension format by `surface_type` (helper `formatFaceDimension`):
  - `cylinder` → `"Ø{diametro_mm} mm"` (+ `"· prof {profundidad_mm} mm"` if present)
  - `plane` → `"{dim_largo_mm} × {dim_ancho_mm} mm"`
  - `cone` → `"Ø{diametro_mm} mm · {angulo_grados}°"`
  - `torus` → `"R {radio_menor_mm} mm"`

## Key types (camService.ts)

```typescript
MeshData { positions, normals, indices, faces, bounding_box, stats }
FaceMetadata { face_id, start, count, surface_type, feature, face_normal }
FeatureInfo {
  op_id, op_tipo, tipo,
  // dimension fields added for the click-to-measure panel (all optional):
  diametro_mm?, profundidad_mm?, dim_largo_mm?, dim_ancho_mm?,
  area_mm2?, angulo_grados?, radio_menor_mm?
}
```

## camStore.ts — relevant state

```typescript
MontajeConfig {
  tipo_sujecion: TipoSujecion
  sujecion_config: SujecionConfig | null  // has envolvente and z_apoyo_mm
  face_id_apoyo: number | null
  face_normal_apoyo: number[] | null
  wcs: "G54"|"G55"|"G56"|"G57"
}
SujecionConfig.envolvente.z_apoyo_mm  // mounting height for G-Code — source of truth: freecad-cam-service

StockConfig {
  tipo: "rectangular" | "cilindrico"
  modo: "dimensiones" | "sobrematerial"
  ancho_mm, largo_mm, alto_mm            // rectangular (dimensiones exactas)
  diametro_mm, longitud_mm               // cylindrical
  sobre_radial_mm, sobre_axial_mm        // cylindrical stock allowance (unchanged)
  stockFaces: StockFace[]                // rectangular allowance = 6 StockFace entities (Phase 2A-2)
}

// StockFace (src/modules/cam/utils/stockFaces.ts) — PURE domain, one per box face:
StockFace {
  direction: 'x_pos'|'x_neg'|'y_pos'|'y_neg'|'z_pos'|'z_neg'  // key in Setup/machine frame
  role: 'apoyo' | 'mecanizado' | 'libre'   // derived from Setup (rotation-aware)
  allowance: number                        // mm (>= 0)
  locked: boolean                          // true for apoyo face (pinned to 0)
}
// deriveStockFaces(setup) assigns roles + resets allowances (called in confirmMontaje).
// resolveStockFace(pickedBoxFaceIndex, setup) maps a Viewer-reported materialIndex → StockFace.
// The Viewer reports only the face INDEX; it never maps face→role/direction. Cascade: any
// Setup invalidation clears stockFaces (no orphaned allowances in a dead coordinate frame).
```

## SujecionOverlay3D — pending issue

OCC → Three.js coordinate conversion:

- Three.js X = OCC X
- Three.js Y = OCC Z (height)
- Three.js Z = -OCC Y

Groups are positioned at y=0 but must be placed at a negative y
relative to the part mesh. Requires receiving minYTransformado.

## Implemented fixturing elements

prensa (vise) | bridas (clamps) | mesa_magnetica (magnetic table) | copa_torno (lathe chuck)
Pending: mordaza_3garras (3-jaw chuck) | entre_puntos (between centers) | plato_divisor (dividing plate)

## Plan restrictions (current)

Only two plans — "basic" plan was eliminated (SOFIA copilot makes the
old 3-tier split pointless):

- **demo** (7 days free): FULL software access including SOFIA copilot,
  3D simulator, viewing/copying G-Code on screen. ONLY restriction: no
  file download. Copy/paste of G-Code IS allowed — it's the conversion hook.
- **pro**: everything in demo + G-Code file download + advanced simulator
  (OCC-based, material removal, collision detection) + SOFIA with PDF
  catalogs + advanced cross-session memory.
- Hook: usePlanInfo.ts — component: PlanBanner.tsx

## Resolved issues

- Part resting on grid: mesh.position.y = -minYTransformado + z_apoyo_mm ✅
- Inverted normals: TopAbs_REVERSED in tessellator.py ✅
- op_id synced backend ↔ frontend ✅
- Logout redirects to landing page ("/"), not "/login": handleLogout()
  now clears local state FIRST, then best-effort notifies backend, then
  navigates — no window.location.assign() can override it. api.ts
  interceptor detects logout requests via `url.includes("logout")` so a
  401 from /auth/logout no longer triggers the refresh-token redirect. ✅
- Part off-center after double-click rotation in StepMontaje: mesh now
  recenters X/Z (not just Y) and OrbitControls.target follows smoothly ✅
- Latent crash in "load another file" button: setArchivo(null) used to
  throw ("Cannot read properties of null (reading 'name')") because
  camStore's setArchivo/nombreArchivo did not accept null. Fixed with
  `archivo?.name ?? ""` and `File | null` typing. Found via the tsconfig
  fix below (the broken type-check was hiding it). ✅
- tsconfig.json `"ignoreDeprecations": "6.0"` (invalid for TS 5.9.3) fixed
  to `"5.0"` — `npm run build` (tsc --noEmit && vite build) works again.
  Note: Vercel's actual build command is plain `vite build` (no type
  check), so this never affected deploys, only local builds. ✅

## Known non-blocking issue

- Loading a file from Google Drive on mobile does not work (loading from
  local downloaded files on the phone works fine). Likely a `content://`
  URI / File materialization issue specific to the Drive picker. Low
  priority — only needed for demos, not core flow.

## Pending UX/UI

- Dashboard redesign
- Consistency between StepMontaje orientation and StepStock: the part
  must keep the orientation chosen in montaje (resting on the selected
  face) when rendered in the Stock step; stock allowance should apply to
  the non-resting faces, not the support face.
- "Simulacion" step (Pro only) — Three.js toolpath viewer, to be added
  between resumen and resultado.
