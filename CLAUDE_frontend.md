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
      StepContexto.tsx       ✅ operator declares the part's state before machining
  domain/contextoFabricacion.ts ✅ PURE: the six UI cards + the ONLY card→ProcessOrigin table
  services/camService.ts     ✅
  store/camStore.ts          ✅
```

## Contexto de fabricación (paso `contexto`, entre Stock y Operaciones)

Existe para despertar al MDE: antes, el adaptador del motor fijaba
`ManufacturingContext = DESCONOCIDO` porque la UI nunca lo preguntaba.

- La pregunta es **"¿cuál es el ESTADO de esta pieza antes de mecanizar?"**, no
  "¿de dónde viene?": el operador tiene la pieza en la mano y sabe lo que ES,
  pero puede no conocer su historia de fabricación.
- Seis tarjetas de UI contra diez `ProcessOrigin` del dominio: la relación **no
  es 1:1** (Fundición / Forja cubre dos orígenes). Por eso hay DOS tablas en
  `domain/contextoFabricacion.ts` y no una: `ESTADOS_PIEZA` (la tarjeta es dueña
  de sus imágenes) y `ORIGEN_POR_ESTADO` (única traducción al dominio del MDE).
  Los PNG llevan el nombre del ESTADO, nunca el de un `ProcessOrigin`.
- La variante de imagen (redondo/cuadrado) sale de `stockConfig.tipo`, ya
  declarado en Stock: se le muestra al operador SU caso.
- **Límite estricto de TODO el texto del paso** (tarjetas y panel de ayuda):
  solo lo FÍSICAMENTE OBSERVABLE en la pieza. Nunca "el MDE asumirá…",
  "buscará…", "no propondrá…", "aplicará la regla…", ni IDs de regla. El MDE
  explica sus propias decisiones después, en Operaciones. Criterio de
  aceptación: si mañana cambia la lógica del motor, esta pantalla sigue siendo
  correcta sin tocar una palabra.
- Anatomía de la tarjeta (fija, para que las seis se comparen de un vistazo):
  imagen en caja de **180 px con padding de 20 px** (la imagen ilustra, no
  domina), indicador de forma declarada (● Cilíndrica / ● Prismática), título
  con `min-h` de dos líneas, descripción observable y una línea reservada
  siempre para "✔ Seleccionado" — así seleccionar no cambia el alto. La rejilla
  usa `auto-rows-fr`: un título que envuelve no desalinea su fila. Sin textos
  del tipo "toca para elegir": una tarjeta clicable se explica sola.
- El paso NUNCA bloquea: "No estoy seguro" → `DESCONOCIDO` es el valor por
  defecto y el motor degrada igual que hoy.
- El valor viaja en `generateGcode` como `contexto_json`
  (`{ proceso_origen }`). Construir el `ManufacturingContext` real a partir de
  ahí es tarea del adaptador del motor, no del frontend.

## Reusable 3D architecture — THREE LAYERS (do not collapse them)

Built for the tooling module, but designed so **Montaje** can reuse layers 1–2
for the VMC table / spindle / workholding, and the simulator can reuse layer 2
to animate the tools.

```
src/lib/viewer3d/            ← LAYER 1 · generic viewer (knows nothing of tools)
  createViewer.ts            plain TS: canvas, camera, lights, PMREM env,
                             OrbitControls, ResizeObserver, dispose.
                             Contract: setContenido(Object3D) + encuadrar()
  Viewer3D.tsx               thin React wrapper — lifecycle ONLY
  dispose.ts                 liberarObjeto3D()

src/lib/geometry/            ← LAYER 2 · PURE parametric builders
  primitivas.ts              cilindro / revolucion / tubo / prisma / aro…
  curvas.ts                  CurvaHelicoidal, CurvaFiloEsferico, CurvaRecta
  materiales.ts              paleta metálica + tinte por material/recubrimiento
  herramientas/
    parametros.ts            resolverParametros(): cotas coherentes + defaults
                             de taller; tabla de paso grueso ISO; lectura de
                             designaciones (M10x1.5, APKT1604)
    comunes.ts               mango, cuerpo acanalado, dientes, portaherramientas
    <11 archivos>            un constructor por familia
    index.ts                 construirHerramienta(familia, params)

src/components/layout/VisorConPanel.tsx   ← LAYER 3 · layout
  variante="dividido"        panel + visor lado a lado (herramientas)
  variante="visorDominante"  visor completo + panel flotante (para Montaje)
```

**Reglas que no se pueden romper:**

- Capa 2 es PURA: ni React, ni Zustand, ni props, ni fetch. Se puede llamar
  desde un script plano de Node (`construirHerramienta("broca", {diametro_mm:8})`).
  Si un constructor necesita estado, está mal y deja de ser reutilizable.
- Convención de ejes de la capa 2: eje de la herramienta = **+Y**, punta en
  **y = 0**, cuerpo hacia +Y. Es la orientación de husillo, para que Montaje y
  el simulador coloquen el objeto sin recalcular nada.
- El visor es DUEÑO del objeto que recibe: lo libera al reemplazarlo.
- Materiales con `side: DoubleSide` a propósito (revoluciones y tubos son
  superficies abiertas en los extremos).
- **Encuadre — dos operaciones distintas, no confundirlas:**
  - `encuadrar()` = cámara + target + distancia desde el CENTRO de la caja
    envolvente (nunca desde el origen del mundo). Solo cuando cambia
    `Viewer3D.claveEncuadre` (la familia al teclear; el id de la definición al
    navegar el catálogo). Ajusta la distancia al FOV **horizontal Y vertical**:
    en un panel estrecho el limitante es el horizontal.
  - `recentrar()` = en CADA cambio de contenido, y hace DOS cosas:
    1. **Sigue el centro** — siempre. Traslada target + cámara por el mismo
       delta, conservando ángulo y distancia. Hace falta porque con la
       convención "punta en y = 0, cuerpo hacia +Y" el centro de la caja SE
       MUEVE al editar cotas (filo 26 → 90 lo sube 42 mm), y sin esto la pieza
       se descuadra ~80 % de media pantalla aunque el encuadre inicial fuera
       correcto.
    2. **Prueba de encaje** — solo si hace falta. La distancia únicamente se
       toca si la pieza ya no cabe (`MARGEN_DESBORDE`) o quedó diminuta
       (`MARGEN_DIMINUTA`). Entre ambos umbrales hay ZONA MUERTA: teclear
       cotas pequeñas no mueve la cámara. Tras un ajuste la distancia cae
       dentro de la zona muerta ⇒ no puede oscilar.
  - La prueba de encaje solo se evalúa si cambió **el tamaño de la pieza o el
    del panel**. Con geometría idéntica la distancia es del operador y no se
    toca: acercarse a mirar la punta es deliberado. La referencia
    (`radioAjustado`) se actualiza SOLO al mover la cámara, así una cadena de
    ediciones pequeñas se mide desde el último ajuste y no puede colar un
    desborde a base de incrementos por debajo del umbral.
  - `controls.minDistance/maxDistance` se refrescan en cada `recentrar()`: si
    no, `update()` volvería a clampar la distancia recién calculada contra los
    límites del encuadre anterior y la pieza seguiría desbordando.
  - `alRedimensionar()` también llama a `recentrar()`: estrechar el panel
    reduce el FOV útil y puede sacar la pieza de cuadro sin que cambie nada.
  - Si el contenedor mide 0×0 (modal recién montado) el encuadre se APLAZA al
    primer resize real; si no, se calcularía con el aspecto de reserva.
- CamViewer3D.tsx **no se tocó**: el wizard sigue con su visor propio. La capa 1
  es nueva y limpia, no una extracción.

## Tooling module (T3-bis)

- Dos rutas de entrada, sin la palabra "manual": _Seleccionar del catálogo_ /
  _Crear nueva herramienta_.
- `CoincidenciasCatalogo.tsx` — al crear, busca en el catálogo global por
  familia + Ø ±5 % y ofrece adoptar: evita definiciones duplicadas.
- `HerramientaForm.tsx` — UN componente, tres modos (`crear|editar|ver`).
  `definicionEditable` separa además catálogo (definición bloqueada) de
  herramienta nueva. En modo `ver` todo es solo lectura.
- `src/modules/tools/domain/camposFamilia.ts` — dominio PURO: qué campos pide
  cada familia. Una broca no muestra radio de esquina; un macho muestra paso.
- `costo_compra` va en la INSTANCIA física (Tier 3), no en la definición.
- **Plaquitas — flujo de datos (no parchear en el render):** `numero_insertos` y
  `designacion_inserto` viven en `DefinicionDetalle` y en `LibreriaEntrada`, pero
  FALTABAN en `DefinicionPersonalizadaPayload` (se descartaban al crear) y en
  `DefinicionResumen` (el listado no los trae, así que el preview del catálogo
  caía en los valores por defecto). Ambos corregidos; `SelectorCatalogo` pide
  además el DETALLE de la ficha enfocada y lo cachea.
- Cotas de taller verificadas contra catálogo real (ver comentarios en
  `parametros.ts`): altura de planeadora, agujero de árbol FMB, DIN 338 (brocas),
  DIN 333 (brocas de centros), DIN 6527 (fresas de mango), DIN 212 (escariador),
  S16Q-SCLCR09 (barra), BIG KAISER EWN (cabezal).
- **Separación catálogo / pieza física en la UI:** los datos del catálogo se
  muestran en `FichaTecnica.tsx` (tabla de solo lectura), NUNCA como `<input
disabled>` — un input deshabilitado parece editable y el operador se queda
  esperando poder escribir. Los inputs editables son solo los de la pieza.
- La longitud útil se explica con la COTA 3D (`lib/geometry/anotaciones.ts`)
  más el indicador L/D, no con párrafos de ayuda.
- **Trampa de Tailwind — no repetirla:** una clase compartida que empiece por
  `w-full` NO se puede anular con `w-auto` en el punto de uso; en el CSS
  compilado `.w-full` va después (byte 8325 vs 45096 para `.sm\:w-auto`), así
  que gana siempre. Fue la causa real de que los filtros del inventario
  salieran a lo ancho y apilados pese a tener el markup en una fila. Las clases
  compartidas de input NO llevan anchura; se declara en cada uso.
- Inventario agrupado por familia, plegable, con búsqueda en vivo insensible a
  tildes y a Ø.
- NO hay parámetros de corte (Vc, fz, RPM, avance) en ningún formulario de
  herramienta: viven en el catálogo de materiales y en el motor CAM.

## Wizard step order (current)

```
cargar → analisis → montaje → material → stock → contexto → operaciones →
resumen → simulacion → resultado
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

# Política de Ejecución — GCodeMaster CNC

> Aplica a **todas** las tareas en Motor CAM, Backend, Frontend y MDE.

---

## 1. Principio

Prefiero una tarea terminada al **100%**, verificada y estable, antes que tres tareas abiertas durante la ejecución.

La estabilidad del proyecto tiene prioridad sobre corregir toda la deuda técnica encontrada.

Solo el **Chief Software Architect** decide cuándo un hallazgo pasa del backlog a una tarea.

---

## 2. Alcance cerrado

Cada tarea resuelve **únicamente** el objetivo solicitado y verifica que quedó funcionando.

- Si durante el análisis se descubren otros defectos, inconsistencias o deuda técnica, **NO se incorporan al fix actual** ni se modifica código fuera del alcance, salvo autorización explícita en el prompt.
- Esos hallazgos se **reportan** como observaciones independientes (ver §3, bloque 3).
- **Ningún repositorio puede modificar otro** (Motor CAM ↔ Backend ↔ Frontend) sin autorización explícita. _Leer_ para entender un contrato sí está permitido; _escribir_ no.

---

## 3. Formato obligatorio de entrega

Toda respuesta debe terminar con esta estructura, en este orden:

### 1. Objetivo solicitado

- Qué se pidió
- Qué archivos se modificaron
- Qué comportamiento cambió

### 2. Verificación

- Compila correctamente
- Tests ejecutados (cuáles y resultado)
- Sin regresiones
- Objetivo cumplido

### 3. Hallazgos encontrados (NO corregidos)

Cada hallazgo con:

| Campo                                  | Valor                     |
| -------------------------------------- | ------------------------- |
| Descripción                            |                           |
| Módulo afectado                        | `archivo:línea` si aplica |
| Impacto                                | **Alto / Medio / Bajo**   |
| ¿Bloquea el funcionamiento actual?     | Sí / No                   |
| **¿Falla en silencio?**                | Sí / No                   |
| ¿Estaba dentro del alcance solicitado? | Sí / No                   |
| Recomendación                          |                           |

> **Regla:** si un hallazgo produce datos incorrectos **sin error, log ni aviso**, su impacto es **automáticamente Alto**.

### 4. Backlog sugerido

Mejoras posibles listadas como tareas futuras. **Nunca ejecutadas automáticamente.**

---

## 4. Excepción — cuándo detenerse y pedir ampliación

El alcance solo puede ampliarse si el hallazgo cumple **al menos una** de estas condiciones:

1. **Impide terminar correctamente** la tarea actual
2. **Produce datos incorrectos**
3. **Falla en silencio** — genera resultados erróneos sin excepción, log ni aviso

> El tercer caso es el más peligroso de este proyecto: **el software genera G-code que controla una máquina real.**
> Un fallo ruidoso se detecta. Uno silencioso rompe herramientas o arruina piezas.

En cualquiera de los tres casos, el modelo debe **detenerse y justificar técnicamente** por qué el fix no puede cerrarse sin ampliar el alcance — **no ampliarlo por su cuenta**.

En todo otro caso, el hallazgo va al **backlog**.

---

## 5. Reglas permanentes del dominio

Estas no dependen de la tarea y **nunca se violan**:

- **El sistema nunca inventa un dato de manufactura.** Si no se sabe, se declara desconocido explícitamente.
- **El operario decide.** El MDE recomienda con evidencia; nunca elimina una operación por su cuenta.
- **Asimetría de riesgo:** excluir una operación necesaria produce una pieza mala o una colisión; proponer una innecesaria solo corta aire. Ante duda, **proponer**.
- **Crecimiento por extensión:** capacidades nuevas se agregan como reglas o filas nuevas, **nunca** como condicionales especiales dentro de reglas existentes.
- **El MDE es dominio puro:** sin FreeCAD, OCC, HTTP, base de datos ni frameworks de UI.
- **Una sola fuente de verdad** por cálculo. Si ya existe, se consume; no se duplica.

---

## 6. Verificación proporcional

El nivel de verificación debe corresponder al tamaño y riesgo del cambio:

| Tipo de cambio                              | Verificación esperada                                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Visual o de texto                           | Compilar y reportar. Sin scripts de medición.                                                                                     |
| Lógica                                      | Tests unitarios y verificación del comportamiento afectado.                                                                       |
| **G-code, geometría o parámetros de corte** | Verificación exhaustiva contra archivos reales, comparación antes/después, y prueba de que la salida no cambió salvo lo esperado. |

## 8. Clasificación de tareas

Toda respuesta debe declarar su tipo ANTES de comenzar:

**INVESTIGACIÓN** — solo observar y reportar evidencia. Cero propuestas.
No se propone ningún cambio, ninguna estructura, ninguna arquitectura.
El entregable es evidencia del código con archivo:línea.

**IMPLEMENTACIÓN** — modificar únicamente lo solicitado.
Alcance cerrado. Los hallazgos van al backlog, no al fix.

**ARQUITECTURA** — solo cuando el Chief Software Architect la solicite explícitamente.

> Nunca mezclar investigación con rediseño.
> Nunca proponer una nueva arquitectura durante una tarea de verificación.
> Si una tarea de investigación revela que hace falta un cambio de diseño,
> se reporta como hallazgo y se detiene — no se implementa ni se propone la solución.
