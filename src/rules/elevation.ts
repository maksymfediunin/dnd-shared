/**
 * Высота и падение (план волны 5, §4.3; PHB «Falling», «Flying Movement»).
 */

/** Кости падения: 1к6 за каждые полные 10 футов, не больше 20к6. */
export function fallDice(feet: number): number {
  return Math.min(20, Math.max(0, Math.floor(feet / 10)));
}

/**
 * Держится ли участник в воздухе (решение 19). Падает тот, у кого нет
 * скорости полёта, скорость 0, кто лежит или недееспособен — кроме
 * парящего (`hover`: бехолдер ошеломлён и висит). Левитирующий не падает.
 */
export function staysAloft(p: {
  flySpeed: number;
  hover: boolean;
  levitating: boolean;
  speedZero: boolean;
  prone: boolean;
  incapacitated: boolean;
}): boolean {
  if (p.levitating) return true;
  if (p.flySpeed <= 0) return false;
  if (p.hover) return true;
  return !(p.speedZero || p.prone || p.incapacitated);
}
