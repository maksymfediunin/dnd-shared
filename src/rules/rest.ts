/**
 * Восстановление ячеек на коротком отдыхе — магическое (волшебник) и
 * природное (друид): общим кругом не выше бюджета, ни одной выше
 * `maxSlotLevel`. `null` — годится; иначе код отказа.
 */
export function validateRecovery(
  levels: readonly number[],
  budget: number,
  maxSlotLevel: number,
): 'RECOVERY_BUDGET_EXCEEDED' | null {
  if (levels.length === 0) return null;
  const total = levels.reduce((sum, level) => sum + level, 0);
  if (total > budget || levels.some((level) => level > maxSlotLevel || level < 1)) {
    return 'RECOVERY_BUDGET_EXCEEDED';
  }
  return null;
}
