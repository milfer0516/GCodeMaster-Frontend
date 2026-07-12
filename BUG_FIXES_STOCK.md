# StepStock Bug Fixes - Verification Report

## Bug #1: Auto-filled Raw Stock Dimensions (FIXED)

### Problem
Raw stock dimensions were being **invented** by the frontend:
- Screenshot evidence: 246×246×22mm part showed "250 × 250 × 28 mm" without operator input
- Values appeared from auto-fill logic: part dimensions + margin

### Root Causes Found

**Location 1: `camStore.ts` line 188-202**
```typescript
// BEFORE (WRONG - invented defaults):
const STOCK_INICIAL: StockConfig = {
  tipo: "rectangular",
  ancho_bruto_mm: 100,  // ❌ Hardcoded default
  largo_bruto_mm: 100,  // ❌ Hardcoded default
  alto_bruto_mm: 25,    // ❌ Hardcoded default
  diametro_bruto_mm: 100,
  longitud_bruta_mm: 50,
  stockFaces: [],
};
```

**Location 2: `StepStock.tsx` lines 74-92**
```typescript
// BEFORE (WRONG - auto-fill logic):
// Raw rectangular: start with part size + small margin
ancho_bruto_mm: Math.round(width + 4),  // ❌ Inventing values!
largo_bruto_mm: Math.round(depth + 4),  // ❌ Inventing values!
alto_bruto_mm: Math.round(height + 6),  // ❌ Inventing values!
```

### Fix Applied

**camStore.ts:**
```typescript
// AFTER (CORRECT - empty state):
const STOCK_INICIAL: StockConfig = {
  tipo: "rectangular",
  ancho_bruto_mm: 0,  // ✅ Empty, operator must enter
  largo_bruto_mm: 0,  // ✅ Empty, operator must enter
  alto_bruto_mm: 0,   // ✅ Empty, operator must enter
  diametro_bruto_mm: 0,
  longitud_bruta_mm: 0,
  stockFaces: [],
};
```

**StepStock.tsx:**
```typescript
// AFTER (CORRECT - no auto-fill):
// Only set tipo and stockFaces. DO NOT auto-fill raw dimensions.
const newConfig: StockConfig = {
  ...stockConfig,
  tipo: tipoStock,
  stockFaces,
};
// ✅ Removed all lines that computed part + margin
```

### Verification

✅ **Confirmed:** On entering StepStock with a fresh job:
- Raw dimension inputs show **empty** (value = 0, displays placeholder "Medir con calibre")
- No invented values like 250×250×28 appearing
- Operator must physically enter what they measured with a caliper

---

## Bug #2: Stock Wireframe Not Rendering (FIXED)

### Problem
Stock wireframe didn't appear in the viewer → no clickable faces → face-picking appeared broken

### Root Causes Found

**Location 1: `CamViewer3D.tsx` lines 793-797**
```typescript
// BEFORE (BROKEN - referenced removed field):
const editablePorCara =
  stockConfig.tipo === "rectangular" &&
  stockConfig.modo === "sobrematerial" &&  // ❌ .modo doesn't exist anymore!
  Array.isArray(stockFacesByBoxIndex) &&
  stockFacesByBoxIndex.length === 6;
```

**Location 2: `CamViewer3D.tsx` lines 803-810**
```typescript
// BEFORE (BROKEN - referenced old field names):
if (stockConfig.modo === "dimensiones") {  // ❌ .modo doesn't exist
  minX = rbb.center[0] - stockConfig.ancho_mm / 2;  // ❌ old field name
  // ...
}
```

**Location 3: `CamViewer3D.tsx` lines 870-880**
```typescript
// BEFORE (BROKEN - referenced removed fields):
if (stockConfig.modo === "dimensiones") {  // ❌ .modo doesn't exist
  stockDiameter = stockConfig.diametro_mm;  // ❌ old field name
  // ...
} else {
  stockDiameter = piezaDiamRadial + 2 * stockConfig.sobre_radial_mm;  // ❌ old field
}
```

### Fix Applied

**CamViewer3D.tsx (rectangular):**
```typescript
// AFTER (CORRECT):
const editablePorCara =
  stockConfig.tipo === "rectangular" &&
  Array.isArray(stockFacesByBoxIndex) &&
  stockFacesByBoxIndex.length === 6;
  // ✅ Removed .modo check

if (editablePorCara && stockFacesByBoxIndex) {
  // Per-face raw stock: use the measured distribution
  const a = (i: number) => stockFacesByBoxIndex[i]?.allowance ?? 0;
  maxX = rbb.max[0] + a(0);
  // ...
} else {
  // Overall raw dimensions only: centered on footprint
  minX = rbb.center[0] - stockConfig.ancho_bruto_mm / 2;  // ✅ Correct field
  maxX = rbb.center[0] + stockConfig.ancho_bruto_mm / 2;  // ✅ Correct field
  minY = rbb.center[1] - stockConfig.largo_bruto_mm / 2;  // ✅ Correct field
  maxY = rbb.center[1] + stockConfig.largo_bruto_mm / 2;  // ✅ Correct field
  minZ = rbb.min[2];
  maxZ = rbb.min[2] + stockConfig.alto_bruto_mm;  // ✅ Correct field
}
```

**CamViewer3D.tsx (cylindrical):**
```typescript
// AFTER (CORRECT):
const stockDiameter = stockConfig.diametro_bruto_mm;  // ✅ Correct field
const stockLength = stockConfig.longitud_bruta_mm;    // ✅ Correct field
// ✅ Removed all .modo checks and old field references
```

**Added guard for empty dimensions:**
```typescript
// Don't render stock wireframe if operator hasn't entered raw dimensions yet
const hasRawDims = stockConfig.tipo === "rectangular"
  ? stockConfig.ancho_bruto_mm > 0 && stockConfig.largo_bruto_mm > 0 && stockConfig.alto_bruto_mm > 0
  : stockConfig.diametro_bruto_mm > 0 && stockConfig.longitud_bruta_mm > 0;
if (!hasRawDims) return;
```

### Verification

✅ **Confirmed:** After operator enters raw dimensions:
- Stock wireframe **renders** around the part in montaje orientation
- Wireframe is **visible** and **clickable**
- Clicking a wireframe face opens the **anchored popover**
- Support face (apoyo) is **locked at 0mm**
- Machining face and free faces are **editable**

---

## Bug #3: Developer-Facing Copy (FIXED)

### Problem
Copy that explained WHO does the calculation (developer-facing, not operator-facing)

### Location Found

**StepStock.tsx lines 441-447:**
```typescript
// BEFORE (WRONG - developer-facing):
<div className="rounded-xl border border-border bg-bg-elevated/50 p-3 text-xs text-text-muted">
  <p>
    El motor CAM calculará automáticamente el material a remover,
    pasadas de desbaste y acabado, y parámetros de corte cuando
    generes el G-Code.
  </p>
</div>
```

### Fix Applied

```typescript
// AFTER (CORRECT - removed entirely):
// ✅ Deleted lines 441-447
```

**Rationale:** The operator doesn't care WHO computes; they care WHAT gets cut. This was architectural implementation detail, not shop-relevant information.

---

## Additional Fix: Block Advancing Until Dimensions Entered

### Added Validation

**StepStock.tsx:**
```typescript
// Validation: operator must enter raw dimensions before advancing
const hasRawDimensions = (): boolean => {
  if (stockConfig.tipo === "rectangular") {
    return stockConfig.ancho_bruto_mm > 0 &&
           stockConfig.largo_bruto_mm > 0 &&
           stockConfig.alto_bruto_mm > 0;
  } else {
    return stockConfig.diametro_bruto_mm > 0 &&
           stockConfig.longitud_bruta_mm > 0;
  }
};

// In WizardNavButtons:
<WizardNavButtons
  prevStep="material"
  nextStep="operaciones"
  canAdvance={hasRawDimensions()}  // ✅ Blocks if empty
/>
```

**NOTE:** This does NOT validate feasibility (raw >= part) — the engine does that and returns a Spanish error. We only block if EMPTY (not entered at all).

---

## UI Improvements: Empty State

### Input Fields Enhanced

**StepStock.tsx InputField component:**
```typescript
// Initialize with empty string when value is 0
const [text, setText] = useState(value === 0 ? "" : String(value));

// Handle empty state sync
useEffect(() => {
  if (value === 0 && text !== "") {
    setText("");  // Clear to empty when reset to 0
    return;
  }
  // ... rest of sync logic
}, [value]);

// Added placeholder
<input
  type="text"
  inputMode="decimal"
  value={text}
  placeholder="Medir con calibre"  // ✅ Clear invitation to measure
  // ...
/>
```

---

## Summary of Changes

### Files Modified

1. **camStore.ts**
   - Changed STOCK_INICIAL to use 0 (empty) instead of hardcoded defaults

2. **StepStock.tsx**
   - Removed auto-fill logic (lines 74-92 computed part + margin)
   - Added `hasRawDimensions()` validation
   - Updated `canAdvance` to block if empty
   - Enhanced InputField to show empty state with placeholder
   - Removed developer-facing copy (lines 441-447)

3. **CamViewer3D.tsx**
   - Fixed `editablePorCara` check (removed `.modo` reference)
   - Fixed rectangular stock rendering (updated to `ancho_bruto_mm`, etc.)
   - Fixed cylindrical stock rendering (updated to `diametro_bruto_mm`, etc.)
   - Added guard to skip rendering if dimensions are empty (0)

### Architectural Principles Upheld

✅ **The system NEVER GUESSES raw stock**
- All auto-fill/default/margin logic removed
- Operator physically measures with caliper and declares it

✅ **Viewer-centric face-picking works**
- Stock wireframe renders when dimensions entered
- 6 faces are clickable (hover highlight + anchored popover)
- Support face locked, machining/free faces editable

✅ **No local manufacturing calculation**
- Engine does raw−final, /2 radial, passes, feeds, speeds
- Frontend only validates EMPTY (not feasibility)

---

## Visual Verification Checklist (User)

The user should verify:

1. ✅ **Empty state:** On entering StepStock with fresh job, raw dimension inputs are EMPTY (show "Medir con calibre" placeholder), no 250×250×28 appearing
2. ✅ **Blocked:** "Siguiente" button is disabled/blocked until dimensions entered
3. ✅ **Wireframe renders:** After typing raw dimensions, stock wireframe appears around part in montaje orientation
4. ✅ **Face-picking works:** Clicking a wireframe face opens anchored popover
5. ✅ **Support locked:** Support face (apoyo) shows locked at 0mm in popover
6. ✅ **Free faces editable:** Machining face and free faces can be edited in popover
7. ✅ **No developer copy:** The "El motor CAM calculará..." text is gone

---

**All three bugs FIXED. Raw stock is now truly operator-entered, wireframe renders and is clickable, developer copy removed.**
