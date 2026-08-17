TASK_TYPE: IMPLEMENTATION
REPOSITORY: frontend
SCOPE: CLOSED / PHASE 1.5a ONLY / smallest safe diff

CONTEXT

The existing CamViewer3D is now the ONLY visual surface for the mounting step.
Phase 1 already removed the duplicate 2D SVG and added the real machine table
to the existing Three.js scene.

The current UI proves that the integration works, but the result has three
visual problems:

1. The table and piece appear too small inside the viewer.
2. There is excessive empty space around the physical table.
3. The viewer grid extends beyond the physical table footprint.

This phase fixes ONLY those 3 render problems.

Do NOT implement responsive layout, collapsible panels, drawers, fixture
geometry, picking, WCS changes, or any new interaction model.

HARD RULES — NON-NEGOTIABLE

1. CamViewer3D remains the ONLY viewer.
   Do NOT create another renderer, canvas, SVG, Three.js scene, viewport,
   or parallel visualization.

2. Do NOT modify the existing piece-rendering effect:
   CamViewer3D.tsx:434-513, dependency [meshData].
   It must remain intact.

3. Do NOT modify the existing stock-rendering effect unless absolutely
   necessary and explicitly justified by evidence.

4. Do NOT change montage_espacial data semantics.

5. Do NOT change WCS semantics.

6. Do NOT calculate or introduce Safe-Z, clearance, retract, or collision logic.

7. Do NOT add any fixture geometry:
   no bridas, mordazas, tornillos, topes, copas, etc.

8. Do NOT redesign StepMontaje layout.

9. Do NOT change the physical dimensions of the table to make it appear larger.
   The real mesa_x_mm / mesa_y_mm values remain the source of physical geometry.
   Only the camera framing/fit may change the apparent size.

10. Preserve the exact physical aspect ratio:
    mesa_x_mm : mesa_y_mm

    Example:
    1500 × 800 must remain visually 1.875 : 1.
    Never stretch X independently from Y.

PHASE 0 — READ-ONLY CHECK BEFORE EDITING

Before modifying anything, inspect and report:

A. Current camera type and camera-fit logic in CamViewer3D.

B. Current dimensions and bounding objects used by the existing fit-to-view.

C. Locate the current GridHelper / grid implementation.

D. Determine whether that GridHelper is:

- specific to the mounting viewer/context, OR
- shared/reused by other wizard steps or viewer states.

E. Determine whether modifying the existing GridHelper would change the
appearance of other steps.

Do not guess.

If the GridHelper is shared:

- DO NOT globally modify it.
- Use a mounting-specific grid solution OR another local mechanism that
  affects only this table visualization.
- Do not create a second independent viewer/scene.

If the GridHelper is not shared:

- it may be safely adapted to the table footprint.

PHASE 1 — FIT-TO-VIEW

Improve the camera framing so the physical table occupies substantially more
of the available CamViewer3D viewport.

The fit must be derived from:

- real mesa_x_mm
- real mesa_y_mm
- current viewport width/height
- current camera model/projection
- the table's existing orientation in VIEWER_BASE_Q

Requirements:

1. The complete physical table must remain visible.
2. The table should use most of the useful viewport area rather than appearing
   as a small object surrounded by excessive empty space.
3. Preserve the table's exact X/Y aspect ratio.
4. The piece must remain visible at the same time.
5. The piece must remain physically supported by the table.
6. Do not alter mesh geometry or its physical dimensions.
7. Do not use a fixed arbitrary zoom multiplier such as "zoom ×2".
8. The calculation must adapt to different viewport aspect ratios.

Test at multiple viewport sizes/aspect ratios, not only the developer's laptop.

At minimum verify:

- narrow/small viewport
- standard laptop viewport
- wide desktop viewport

The exact pixel dimensions are implementation details; the important invariant
is that the table fits and uses the available viewport efficiently without
distortion.

PHASE 2 — TABLE FOOTPRINT / GRID

The visible grid must no longer visually extend beyond the physical table.

The grid must communicate the table footprint, not a larger imaginary machine
area.

Preferred order:

1. Restrict the grid to the physical table footprint.
2. If the current GridHelper cannot be safely restricted because of its
   implementation/shared usage, use a mounting-specific grid representation
   within the SAME CamViewer3D scene.
3. If necessary, reduce grid opacity so the table remains visually dominant.

Do NOT solve this by changing the physical table dimensions.

Do NOT allow a second grid to extend beyond the table.

The physical table boundary must be visually clear.

PHASE 3 — VISUAL CHECK

Verify visually that:

- the table is no longer tiny;
- the piece is clearly visible;
- the table/piece composition fills the viewer appropriately;
- the physical table aspect ratio is correct;
- the grid does not extend outside the table;
- no new viewer was created;
- the existing piece rendering remains intact.

VERIFY

1. npm run build passes.
2. npx tsc --noEmit passes, if it is a separate project command.
3. Show git diff proving the piece-rendering effect was not modified.
   3b. Show git diff --numstat for CamViewer3D.tsx. If any existing lines were
   modified (not just added), list exactly which lines and confirm they are
   camera/fit/grid related, NOT piece-mesh related. The piece effect
   (434-513) must show zero modifications.
4. Show the exact files changed.
5. Confirm no second renderer/canvas/scene/viewer was created.
6. Confirm no fixture geometry was added.
7. Confirm no WCS/Safe-Z/montaje_espacial semantics were changed.
8. Confirm the table ratio is preserved.
9. Confirm the camera fit works across multiple viewport aspect ratios.
10. Confirm the grid is limited to the table footprint and does not regress
    other viewer contexts.

IMPORTANT

If any part of the requested fit or grid behavior requires changing code
outside CamViewer3D, STOP and report why before expanding the scope.

Do not solve Phase 1.5b (responsive layout) in this task.

Do not solve the fixture-geometry phase in this task.

REPORT — FOUR BLOCKS ONLY

1. Objetivo
2. Cambios realizados
3. Verificación
4. Hallazgos / Límites

In Hallazgos explicitly state:

- whether the GridHelper was shared;
- how the grid was contained;
- how the fit-to-view was calculated;
- which viewport sizes/aspect ratios were tested;
- whether any code outside the permitted render scope was required.
