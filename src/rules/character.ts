import type { ProficiencyLevel } from '../enums/character.js';

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

export interface ArmorClassInput {
  armor?: ArmorProfileInput | null;
  hasShield?: boolean;
  dexterityModifier: number;
}

export function armorClass({ armor, hasShield, dexterityModifier }: ArmorClassInput): number {
  const shield = hasShield ? SHIELD_ARMOR_CLASS_BONUS : 0;
  if (!armor) return 10 + dexterityModifier + shield;

  const cap = armor.dexBonusCap;
  const dexterity = cap === null ? dexterityModifier : cap === 0 ? 0 : Math.min(dexterityModifier, cap);
  return armor.baseAc + dexterity + shield;
}

export interface MaxHitPointsInput {
  hitDie: number;
  level: number;
  constitutionModifier: number;
}

/**
 * Первый уровень — полная кость, дальше среднее с округлением вверх.
 * Кубы здесь не бросаются: правила проекта считают хиты средним, и
 * лист должен получаться одинаковым при каждом пересчёте.
 *
 * Уровень не может дать меньше одного хита, иначе персонаж с плохим
 * Телосложением на высоком уровне становился бы слабее себя же.
 */
export function maxHitPoints({ hitDie, level, constitutionModifier }: MaxHitPointsInput): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`Уровень ${level} не годится для расчёта хитов`);
  }
  const average = Math.floor(hitDie / 2) + 1;
  const first = Math.max(1, hitDie + constitutionModifier);
  const rest = (level - 1) * Math.max(1, average + constitutionModifier);
  return first + rest;
}

export interface SavingThrowInput {
  abilityModifier: number;
  proficiencyBonus: number;
  isProficient: boolean;
}

export function savingThrow({
  abilityModifier,
  proficiencyBonus,
  isProficient,
}: SavingThrowInput): number {
  return abilityModifier + (isProficient ? proficiencyBonus : 0);
}

export interface SkillBonusInput {
  abilityModifier: number;
  proficiencyBonus: number;
  /** null — владения навыком нет. */
  proficiency?: ProficiencyLevel | null;
}

export function skillBonus({
  abilityModifier,
  proficiencyBonus,
  proficiency,
}: SkillBonusInput): number {
  if (proficiency === 'EXPERTISE') return abilityModifier + proficiencyBonus * 2;
  if (proficiency === 'PROFICIENT') return abilityModifier + proficiencyBonus;
  return abilityModifier;
}

/** Считается от готового бонуса навыка Внимательность. */
export function passivePerception(perceptionBonus: number): number {
  return 10 + perceptionBonus;
}

export function initiative(dexterityModifier: number): number {
  return dexterityModifier;
}
