// Format helpers.

/**
 * Format a millimetre value for operator-facing display.
 *
 * Kills floating-point noise (e.g. 35.00000000000003 → "35") WITHOUT rounding
 * away legitimate decimals the operator entered (0.5 → "0.5", 108.239 → "108.239").
 * Rounds to `maxDecimals` (default 3 = micron resolution) then drops trailing
 * zeros. Do NOT use plain Math.round here — that would destroy 0.5 / 1.5 values.
 */
export function formatMm(value: number, maxDecimals = 3): string {
  if (!Number.isFinite(value)) return "0";
  return String(parseFloat(value.toFixed(maxDecimals)));
}
