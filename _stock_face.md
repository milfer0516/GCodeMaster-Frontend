REPOSITORY: frontend

TASK: Phase 2A-2 — replace StepStock's temporary six-field form with a professional, viewer-centric per-face stock allowance interaction, AND refactor the stock allowance data model from six loose floats into a proper domain entity StockFace[]. The 3D viewer becomes a pure visual/sensory consumer; all manufacturing interpretation (face roles, face→domain mapping, validation, cascade invalidation) lives in the domain. Single-Setup-per-Job architecture (no multi-setup — a second montaje is a new Job, out of scope here).

FILE(S): src/modules/cam/store/camStore.ts (StockConfig + new StockFace model + a new pure domain helper), src/modules/cam/components/steps/StepStock.tsx, src/modules/cam/components/CamViewer3D.tsx. Optionally a new src/modules/cam/utils/stockFaces.ts for the pure domain logic.

CONTEXT: Phase 2A-1 made StepStock read from the persisted Setup and store six loose per-face floats (sobre_x_pos_mm ... sobre_z_neg_mm) with a throwaway plain form. Architectural review (as CAM principal architect) found: (1) the planned "map clicked box face → offset key" logic was going to live in the Viewer — that's a DOMAIN decision leaking into the visual layer, the same duplication Phase 1 eliminated; (2) six loose floats are an anemic model that blocks upcoming features (Fixtures need to query which faces are free; Simulation needs per-face removed-material; AI needs per-face suggestions) — professional CAM (NX, hyperMILL) models faces as entities with role+identity; (3) there was no cascade invalidation, so changing the support face in Montaje would leave stock offsets orphaned in a coordinate frame that no longer exists. This phase fixes all three. Confirmed decisions: migrate CLEAN to StockFace[] (delete the six loose floats — nothing persistent depends on them yet, backend persistence is Phase 3); single Setup per Job (StockFace[] lives alongside the one Setup, no multi-setup context needed).

DOMAIN MODEL (new):
Define a StockFace entity:
StockFace {
direction: 'x_pos'|'x_neg'|'y_pos'|'y_neg'|'z_pos'|'z_neg' // key in the Setup/machine frame
role: 'apoyo' | 'mecanizado' | 'libre' // derived from the Setup
allowance: number // stock allowance in mm (>=0)
locked: boolean // true for the apoyo face
}
StockConfig's rectangular allowance is now stockFaces: StockFace[] (exactly 6), replacing sobre_x_pos_mm...sobre_z_neg_mm. Cylindrical (sobre_radial_mm/sobre_axial_mm) stays as-is for now unless the StockFace model cleanly subsumes it — if it doesn't map cleanly, leave cylindrical untouched and note it; do not force it.

RESPONSIBILITIES (must be enforced — this is the core of the refactor):

- DOMAIN owns: deriving the 6 StockFaces from the Setup (assigning role: the Setup.supportFace direction → role 'apoyo' + locked; Setup.machiningFace direction → role 'mecanizado'; the other four → 'libre'); the PURE mapping resolveStockFace(pickedFaceIndex, setup) → StockFace direction key that accounts for the montaje rotation; validation (allowance >= 0, locked faces pinned to 0); and cascade regeneration (see STATES below).
- VIEWER owns ONLY: detecting hover/click on the 6 stock-box faces, reporting the picked face INDEX to the domain (it does NOT know roles or axes), projecting a face's screen position so the popover can anchor to it, and drawing the wireframe by reading StockFace allowances from the domain. The Viewer must NOT map faces to offset keys, must NOT know which face is apoyo/mecanizado except as a visual flag passed down from the domain.

STATES / cascade invalidation (must be explicit):

- When the Setup is (re)created/confirmed (confirmMontaje), regenerate all 6 StockFaces from the new Setup: reassign roles from the new supportFace/machiningFace, and RESET allowances to 0 (old allowances referenced a frame that no longer exists — do not carry them over). The apoyo face is locked at 0.
- When invalidateSetup fires (face_id_apoyo/sujecion/mesh changed), the StockFaces are invalidated too (cleared or flagged stale) so no orphaned allowance leaks forward.
- If StepStock is entered with no confirmed Setup, keep the Phase 2A-1 "Volver a Montaje" panel.

INTERACTION (confirmed with user):

- Hover a stock-box face → highlights + shows that face's current allowance value.
- Click a face → a small contextual numeric popover opens ANCHORED to that face (screen-projected), editing only that face's allowance. Reuse Phase 2A-1 InputField (decimal typing + ±0.5 arrows).
- Only ONE face active at a time.
- On change → wireframe updates immediately (brief animation if feasible).
- A compact READ-ONLY summary below the viewer lists each face's role + allowance (e.g. "Mecanizado 5mm · Frontal 2mm · Apoyo 0 bloqueado").
- Apoyo face visually distinguished as locked (dim + lock icon), clicking it shows locked state / does not open an editable popover. Mecanizado face visually distinguished as the primary target.
- Keep "Dimensiones exactas" mode working (it can use simple fields; the viewer-centric editor is for the "Por sobre-material" mode).

CHANGE: Implement the domain model (StockFace, role derivation from Setup, pure resolveStockFace mapping, validation, cascade regeneration in confirmMontaje/invalidateSetup), then the Viewer face-picking (report index only) + popover anchoring + wireframe reading StockFace allowances, then the StepStock UI (popover editor + read-only role/allowance summary), then delete the six loose float fields and any references. Final stock dims = setup.rotatedBBox + each StockFace.allowance on its direction.

DO NOT:

- Do not put face→role or face→direction mapping in the Viewer — pure domain function only. This is the central point of the refactor; violating it defeats the purpose.
- Do not carry over old allowances when the Setup changes — reset to 0 (orphaned-frame safety).
- Do not implement multi-setup anything — single Setup per Job is fixed.
- Do not change Setup creation/computeSetup beyond adding StockFace regeneration hooks in confirmMontaje/invalidateSetup.
- Do not touch part-face picking in StepMontaje/StepOperaciones (that's the part, not the stock box), backend persistence (Phase 3), or other wizard steps.
- No browser automation — user verifies visually.

VERIFY: Standalone throwaway script (delete after) for the PURE domain logic (the testable part): (a) given a Setup for phase_1.step (disco on X-face), deriving StockFaces assigns exactly one 'apoyo' (locked, = supportFace direction), one 'mecanizado' (= machiningFace direction), four 'libre'; (b) resolveStockFace(pickedFaceIndex, setup) maps the box's top face to the correct Setup-frame direction key accounting for montaje rotation (NOT raw world axis); (c) changing a face's allowance updates final dims on that direction only; (d) simulating a Setup change regenerates StockFaces with roles reassigned and allowances reset to 0. Report the derived StockFace[] for a disco and a placa case. Then ask the user to verify visually: hover shows per-face value, clicking opens an anchored popover, apoyo face is locked+distinguished, mecanizado face is distinguished, summary below updates, and changing the support face in Montaje resets stock allowances.
