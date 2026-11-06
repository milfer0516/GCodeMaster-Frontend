---
name: gcodemaster-principles
description: Product principles of GCodeMaster CNC that every change must respect. Use before designing, implementing or reviewing any change in this repository.
---

# GCodeMaster principles

- Never invent a manufacturing value (RPM, feed, depth, offset, tool). If it is unknown, declare it and fail loudly.
- Silent failures are the worst class of bug: every omission, clamp or default must produce a warning that reaches the operator.
- The engine calculates, the MDE recommends with evidence, the operator decides. Do not collapse those layers.
- Every change works for any STEP file, any machine and any screen size. Test parts and screens are examples, never the done criterion.
- Use FreeCAD's native API; build custom code only where FreeCAD truly lacks the capability.
- Grow by extension: no hardcoded catalogs or special-case conditionals; a new capability is a new rule or row.
- Mark every claim PROBADO (with the output that proves it) or NO VERIFICADO.
- Never commit on main and never push; commit only on develop. Only the owner merges into main. Answer in Spanish.
