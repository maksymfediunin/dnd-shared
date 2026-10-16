/**
 * Защита от урона с оговорками (план волны 7, р. 13–14; разбор монстров
 * §1.4, §6 р. 9). Код — вид урона или вид с оговоркой: `fire`,
 * `slashing@nonmagical-nonsilvered`, отдельный `spell` («damage from
 * spells» архимага). Оговорка — закрытый перечень: строку источника без
 * своей строки в таблице импорт не пропустит.
 */

export const DAMAGE_QUALIFIERS = [
  /** «from nonmagical weapons»: по р. 9 (пересмотрен 16.10) — любые немагические атаки. */
  'nonmagical',
  'nonmagical-nonsilvered',
  'nonmagical-nonadamantine',
  /** Уязвимость ракшаса: колющее магическим оружием в руках доброго существа. */
  'magical-good',
] as const;
export type DamageQualifier = (typeof DAMAGE_QUALIFIERS)[number];

/** `fire`, `slashing@nonmagical` или `spell`. */
export type DamageDefenseCode = string;

/**
 * Откуда урон — то, что читают оговорки. Без `isAttack` оговорка «от
 * немагических атак» молчит: падение и шипы ею не режутся.
 */
export interface DamageSource {
  isAttack: boolean;
  magical: boolean;
  silvered?: boolean;
  adamantine?: boolean;
  fromSpell?: boolean;
  attackerGood?: boolean;
}

/** Урон без атаки и без заклинания — падение, зона, правка ведущего. */
export const PLAIN_DAMAGE: DamageSource = { isAttack: false, magical: false };

const B_P_S = ['bludgeoning', 'piercing', 'slashing'] as const;

/**
 * Полные строки источника с оговорками → коды (р. 14). Простой вид урона
 * («fire») берётся как есть, всё прочее — только отсюда. «(from
 * stoneskin)» архимага — пусто: защиту даёт само заклинание при
 * развёртывании (р. 19 разбора), иначе «Рассеивание» её бы не сняло.
 */
const QUALIFIED_STRINGS: Readonly<Record<string, readonly DamageDefenseCode[]>> = {
  'bludgeoning, piercing, and slashing from nonmagical weapons': B_P_S.map(
    (t) => `${t}@nonmagical`,
  ),
  "bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered": B_P_S.map(
    (t) => `${t}@nonmagical-nonsilvered`,
  ),
  "bludgeoning, piercing, and slashing from nonmagical weapons that aren't adamantine": B_P_S.map(
    (t) => `${t}@nonmagical-nonadamantine`,
  ),
  "piercing and slashing from nonmagical weapons that aren't adamantine": [
    'piercing@nonmagical-nonadamantine',
    'slashing@nonmagical-nonadamantine',
  ],
  'bludgeoning, piercing, and slashing from nonmagical attacks (from stoneskin)': [],
  'damage from spells': ['spell'],
  'piercing from magic weapons wielded by good creatures': ['piercing@magical-good'],
};

/** Строка защиты источника → коды; неизвестная — `null` (импорт падает с перечнем). */
export function damageDefenseCodes(source: string): DamageDefenseCode[] | null {
  if (/^[a-z]+$/.test(source)) return [source];
  const known = QUALIFIED_STRINGS[source];
  return known ? [...known] : null;
}

/** Простые виды без оговорок — то, что читают места, не знающие источника урона. */
export function plainDamageTypes(codes: readonly DamageDefenseCode[]): string[] {
  return codes.filter((code) => /^[a-z]+$/.test(code) && code !== 'spell');
}

function applies(code: DamageDefenseCode, type: string, source: DamageSource): boolean {
  if (code === 'spell') return source.fromSpell === true;
  const [kind, qualifier] = code.split('@') as [string, DamageQualifier | undefined];
  if (kind !== type) return false;
  const nonmagicalAttack = source.isAttack && !source.magical;
  switch (qualifier) {
    case undefined:
      return true;
    case 'nonmagical':
      return nonmagicalAttack;
    case 'nonmagical-nonsilvered':
      return nonmagicalAttack && source.silvered !== true;
    case 'nonmagical-nonadamantine':
      return nonmagicalAttack && source.adamantine !== true;
    case 'magical-good':
      return source.isAttack && source.magical && source.attackerGood === true;
  }
}

export interface DamageDefenseSet {
  resistances: readonly DamageDefenseCode[];
  immunities: readonly DamageDefenseCode[];
  vulnerabilities: readonly DamageDefenseCode[];
}

/**
 * Во сколько обходится урон этого вида от этого источника: иммунитет —
 * 0, сопротивление — ½, уязвимость — ×2, оба — 1 (PHB: сперва
 * сопротивление вниз, затем уязвимость).
 */
export function damageMultiplier(
  type: string,
  defenses: DamageDefenseSet,
  source: DamageSource,
): { immune: boolean; resisted: boolean; vulnerable: boolean } {
  const t = type.toLowerCase();
  const any = (codes: readonly DamageDefenseCode[]) => codes.some((c) => applies(c, t, source));
  return {
    immune: any(defenses.immunities),
    resisted: any(defenses.resistances),
    vulnerable: any(defenses.vulnerabilities),
  };
}

/** Урон после защиты: иммунитет — 0; сопротивление — вниз вполовину; уязвимость — вдвое. */
export function defendedAmount(
  amount: number,
  type: string,
  defenses: DamageDefenseSet,
  source: DamageSource,
): number {
  const m = damageMultiplier(type, defenses, source);
  if (m.immune) return 0;
  const resisted = m.resisted ? Math.floor(amount / 2) : amount;
  return m.vulnerable ? resisted * 2 : resisted;
}

/** Мировоззрение доброе — «good» в строке монстра или `*_GOOD` персонажа. */
export function isGoodAlignment(alignment: string | null | undefined): boolean {
  return /good/i.test(alignment ?? '') && !/any non-good/i.test(alignment ?? '');
}
