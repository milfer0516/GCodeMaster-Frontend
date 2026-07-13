REPOSITORY: frontend

TASK: Rebuild the Stock step around ONE data model: per-face offsets over the part's bounding box. Remove the competing "total dimensions" form. This eliminates the entire class of sync bugs currently in production.

FILE(S): src/modules/cam/components/steps/StepStock.tsx, src/modules/cam/components/CamViewer3D.tsx, src/modules/cam/store/camStore.ts, src/modules/cam/utils/stockFaces.ts, src/modules/cam/services/camService.ts

WHY (validated against professional CAM):
SolidWorks CAM / CAMWorks: stock is defined by extending the part's bounding box with positive and negative offsets per axis (X+, X−, Y+, Y−, Z+, Z−). The resulting total size is DISPLAYED, not typed. They also provide a "uniform" toggle per axis: clicking it copies the positive offset to the negative one.
Fusion 360: "Fixed size" (type the block) and "Relative size" (offsets) are MUTUALLY EXCLUSIVE modes — never both at once.
Mastercam: in fixed mode you type the as-measured block; there are no per-face offsets in that mode.

OUR BUG: we currently have BOTH a totals form AND a per-face popover writing to the same state. That is the root cause of every desync the operator has reported (form says 247 while chips say 0.75/0.25; typing in one field corrupts others; impossible values like a 1mm block for a 172mm part are accepted). No professional CAM does this.

THE MODEL (single source of truth, no exceptions):
StockFace.allowance = how much raw material sticks out on THAT face (measured with a caliper)
total_on_axis = part_dimension + allowance(+face) + allowance(−face) ← DERIVED, read-only
The operator has FULL control of every face independently. The system NEVER infers which axis or face will be machined — a flange may only need drilling (zero allowance everywhere), while another part needs allowance only on one face. That is the operator's call, never the engine's.

CHANGE:

1. REMOVE the editable totals form (Ancho/Largo/Alto bruto, Diámetro/Longitud bruta). Delete ancho_bruto_mm, largo_bruto_mm, alto_bruto_mm, diametro_bruto_mm, longitud_bruta_mm from StockConfig and every read/write of them. They are the competing source of truth and must not exist.
2. The form panel now shows, per axis, EDITABLE offset fields (X+, X−, Y+, Y−, Z+, Z−), each defaulting to empty (never 0-as-a-guess, never prefilled). These are the same values the popover edits — one state, two entry points, physically impossible to desync.
3. Add a "uniform" toggle per axis (like SolidWorks' blue box): when enabled, editing the positive offset copies the value to the negative offset of that axis. Off by default (raw stock is rarely centered).
4. The Z support face (setup.supportFace) stays LOCKED at 0 and disabled everywhere — form and popover. Material cannot exist between the part and the fixture.
5. Show "Material bruto resultante: 247 × 247 × 23.5 mm" as READ-ONLY, computed from part dims + offsets. It is a result, never an input.
6. Keep the viewer-centric popover exactly as it works now (click a face → edit that face's offset). It now edits the same field the form shows. No conversion, no split, no redistribution logic anywhere — that logic is what broke.
7. CYLINDRICAL: same principle, 3 regions instead of 6 faces — radial (uniform around the OD), axial-machining, axial-support (locked at 0). The operator enters offsets, the total (Ø / length) is displayed read-only.
8. VALIDATION (safety): a negative offset is impossible. Reject it at input. The engine still validates raw >= part and returns its Spanish error — do not duplicate that here, but never let the UI display or send a physically impossible stock.
9. PAYLOAD: send the per-face offsets to the engine (it already accepts "bruto_medido" with a nested por_cara — verified working end-to-end). The engine computes removal, passes, feeds and speeds. The frontend sends offsets and paints the returned plan. It computes nothing.
10. INITIAL RENDER: on entering the Stock step, immediately render the stock envelope wrapping the part with all offsets at 0 (skin-tight), so the operator SEES the stock and knows which faces they can click. The support face stays locked. IMPORTANT: this is VISUAL ONLY — the input fields remain EMPTY with the "Medir con calibre" placeholder. Rendering at 0 is feedback; prefilling a field would be the system inventing a measurement nobody took, and that value would end up in the G-code. Never do that.

DO NOT:

- Do not keep the totals fields "just in case" — they are the bug. Delete them.
- Do not add any redistribution/split logic (typing a total and halving it across faces). That logic does not exist in any professional CAM and it is what corrupted the values.
- Do not infer which face needs allowance from the part's geometry or tipo_pieza. A round flange may need zero allowance (drilling only); a disc may need allowance on one face only. The operator decides, always.
- Do not prefill, default, or suggest any offset value.
- Do not touch materials, lights, shadows, canvas size, or the raycaster — face picking currently works and must keep working.
- No browser automation (email-code login blocks it). Verify by code tracing; the user verifies visually.

VERIFY: Trace and report, for placa.step, phase_1.step AND brida_rodamiento.step, with BOTH stock shapes (rectangular and cylindrical — the operator declares the raw shape independently of the part's shape):
(a) offsets start empty; (b) editing an offset in the form updates the chip, the popover and the wireframe; (c) editing the same offset in the popover updates the form field — they are literally the same value, so desync is impossible by construction; (d) the read-only total = part + both offsets on that axis; (e) the support face is locked at 0 everywhere; (f) a part needing zero allowance (drilling-only flange) works with all offsets empty; (g) the payload sent to the engine carries the per-face offsets.
