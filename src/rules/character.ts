import type { AbilityCode, ProficiencyLevel } from '../enums/character.js';
import type { ModifierPart } from '../schemas/combat.js';

/** Щит даёт два к классу доспеха независимо от прочей брони. */
export const SHIELD_ARMOR_CLASS_BONUS = 2;

export interface ArmorProfileInput {
  baseAc: number;
  /**
   * Предел бонуса Ловкости: null — предела нет (лёгкая броня),
   * 0 — Ловкость не учитывается вовсе (тяжёлая). Ноль означает
   * именно это, а не «не больше нуля»: в тяжёлой броне низкая
   * Ловкость класс доспеха не понижает.
   */
  dexBonusCap: number | null;
}

/**
 * Защита без доспехов — классовая формула вместо «10 + Ловкость»:
 * варвар (10 + ЛВК + ТЕЛ, со щитом), монах (10 + ЛВК + МДР, без щита),
 * драконья стойкость чародея (13 + ЛВК, со щитом).
 */
export interface UnarmoredDefense {
  base: number;
  /** Модификатор, который прибавляется к Ловкости: ТЕЛ, МДР или 0. */
  abilityModifier: number;
  /** Монах со щитом теряет свою формулу — остаётся обычная. */
  allowsShield: boolean;
}

export interface ArmorClassInput {
  armor?: ArmorProfileInput | null;
  hasShield?: boolean;
  dexterityModifier: number;
  unarmoredDefense?: UnarmoredDefense | null;
  /** Стиль боя «Оборона»: +1, пока надет доспех. */
  armoredBonus?: number;
}

export function armorClass({
  armor,
  hasShield,
  dexterityModifier,
  unarmoredDefense,
  armoredBonus = 0,
}: ArmorClassInput): number {
  const shield = hasShield ? SHIELD_ARMOR_CLASS_BONUS : 0;
  if (!armor) {
    const plain = 10 + dexterityModifier + shield;
    if (!unarmoredDefense || (hasShield && !unarmoredDefense.allowsShield)) return plain;
    // Бо́льшая из двух: формула класса не должна делать хуже обычной.
    return Math.max(
      plain,
      unarmoredDefense.base + dexterityModifier + unarmoredDefense.abilityModifier + shield,
    );
  }

  const cap = armor.dexBonusCap;
  const dexterity =
    cap === null ? dexterityModifier : cap === 0 ? 0 : Math.min(dexterityModifier, cap);
  return armor.baseAc + dexterity + shield + armoredBonus;
}

export interface MaxHitPointsInput {
  hitDie: number;
  level: number;
  constitutionModifier: number;
  /** Дварфийская стойкость, драконья стойкость: +1 хит за каждый уровень. */
  bonusPerLevel?: number;
}

/**
 * Первый уровень — полная кость, дальше среднее с округлением вверх.
 * Кубы здесь не бросаются: правила проекта считают хиты средним, и
 * лист должен получаться одинаковым при каждом пересчёте.
 *
 * Уровень не может дать меньше одного хита, иначе персонаж с плохим
 * Телосложением на высоком уровне становился бы слабее себя же.
 */
export function maxHitPoints({
  hitDie,
  level,
  constitutionModifier,
  bonusPerLevel = 0,
}: MaxHitPointsInput): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`Уровень ${level} не годится для расчёта хитов`);
  }
  const average = Math.floor(hitDie / 2) + 1;
  const first = Math.max(1, hitDie + constitutionModifier);
  const rest = (level - 1) * Math.max(1, average + constitutionModifier);
  return first + rest + level * bonusPerLevel;
}

export interface SavingThrowInput {
  abilityModifier: number;
  proficiencyBonus: number;
  isProficient: boolean;
}

export function savingThrow(input: SavingThrowInput): number {
  return sumParts(savingThrowParts('strength', input));
}

/**
 * Слагаемые модификатора — то, из чего сложено число листа. Само число
 * считается их суммой, а не рядом с ними: иначе расклад, который видит
 * стол, однажды разошёлся бы с броском. Нулевые части не отбрасываются
 * — это решение показа, а не правил.
 */
export function sumParts(parts: readonly ModifierPart[]): number {
  return parts.reduce((sum, part) => sum + part.value, 0);
}

export function savingThrowParts(
  ability: AbilityCode,
  { abilityModifier, proficiencyBonus, isProficient }: SavingThrowInput,
): ModifierPart[] {
  return [
    { source: ability, value: abilityModifier },
    ...(isProficient ? [{ source: 'proficiency' as const, value: proficiencyBonus }] : []),
  ];
}

export interface SkillBonusInput {
  abilityModifier: number;
  proficiencyBonus: number;
  /** null — владения навыком нет. */
  proficiency?: ProficiencyLevel | null;
  /** Мастер на все руки барда: половина мастерства к навыку без владения. */
  halfProficiency?: boolean;
}

export function skillBonus(input: SkillBonusInput): number {
  return sumParts(skillParts('strength', input));
}

export function skillParts(
  ability: AbilityCode,
  { abilityModifier, proficiencyBonus, proficiency, halfProficiency = false }: SkillBonusInput,
): ModifierPart[] {
  const base: ModifierPart = { source: ability, value: abilityModifier };
  // Компетентность — мастерство дважды, но на экране это две строки:
  // «мастерство +2, компетентность +2» объясняет, откуда вторые два.
  if (proficiency === 'EXPERTISE') {
    return [
      base,
      { source: 'proficiency', value: proficiencyBonus },
      { source: 'expertise', value: proficiencyBonus },
    ];
  }
  if (proficiency === 'PROFICIENT') {
    return [base, { source: 'proficiency', value: proficiencyBonus }];
  }
  return halfProficiency
    ? [base, { source: 'jackOfAllTrades', value: Math.floor(proficiencyBonus / 2) }]
    : [base];
}

/** Считается от готового бонуса навыка Внимательность. */
export function passivePerception(perceptionBonus: number): number {
  return 10 + perceptionBonus;
}

/**
 * Инициатива — проверка Ловкости, поэтому мастер на все руки барда
 * прибавляет к ней половину мастерства (`bonus`).
 */
export function initiative(dexterityModifier: number, bonus = 0): number {
  return sumParts(initiativeParts(dexterityModifier, bonus));
}

/** `bonus` — та же половина мастерства от мастера на все руки, что и у `initiative`. */
export function initiativeParts(dexterityModifier: number, bonus = 0): ModifierPart[] {
  return [
    { source: 'dexterity', value: dexterityModifier },
    ...(bonus !== 0 ? [{ source: 'jackOfAllTrades' as const, value: bonus }] : []),
  ];
}
