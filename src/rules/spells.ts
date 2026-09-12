import type { AbilityCode, ClassCode } from '../enums/character.js';
import { casterKind, pactMagic, spellSlots } from './progression.js';

/**
 * Заклинательная характеристика класса. Таблицами прогрессии её не
 * назвать, но без неё ни сложность спасброска, ни бонус атаки не
 * посчитать, а класс — единственное, от чего она зависит.
 */
const SPELLCASTING_ABILITY: Partial<Record<ClassCode, AbilityCode>> = {
  bard: 'charisma',
  cleric: 'wisdom',
  druid: 'wisdom',
  paladin: 'charisma',
  ranger: 'wisdom',
  sorcerer: 'charisma',
  warlock: 'charisma',
  wizard: 'intelligence',
};

export function spellcastingAbility(classCode: ClassCode): AbilityCode | null {
  return SPELLCASTING_ABILITY[classCode] ?? null;
}

export interface SpellcastingInput {
  proficiencyBonus: number;
  abilityModifier: number;
}

export function spellSaveDc({ proficiencyBonus, abilityModifier }: SpellcastingInput): number {
  return 8 + proficiencyBonus + abilityModifier;
}

export function spellAttackBonus({ proficiencyBonus, abilityModifier }: SpellcastingInput): number {
  return proficiencyBonus + abilityModifier;
}

/**
 * Самый высокий доступный круг. Ноль — заклинаний кругами нет вовсе:
 * так выглядит и воин, и паладин первого уровня.
 */
export function maxSpellLevel(classCode: ClassCode, level: number): number {
  const pact = pactMagic(classCode, level);
  if (pact) return pact.spellLevel;
  return spellSlots(classCode, level).length;
}

export interface SpellsPreparedInput {
  classCode: ClassCode;
  level: number;
  /** Модификатор заклинательной характеристики класса. */
  spellcastingModifier: number;
}

/** Делители уровня для подготовки: паладин считает половину вниз. */
const PREPARING_CLASSES: Partial<Record<ClassCode, number>> = {
  cleric: 1,
  druid: 1,
  wizard: 1,
  paladin: 2,
};

/**
 * Сколько заклинаний персонаж готовит из списка класса. null — класс
 * подготовкой не пользуется: у барда, чародея, колдуна и следопыта
 * есть список известных, а у прочих заклинаний нет вовсе.
 */
export function spellsPrepared({
  classCode,
  level,
  spellcastingModifier,
}: SpellsPreparedInput): number | null {
  const divisor = PREPARING_CLASSES[classCode];
  if (divisor === undefined) return null;

  // Паладин становится заклинателем со второго уровня: пока ячеек
  // нет, готовить попросту нечем.
  if (maxSpellLevel(classCode, level) === 0 && casterKind(classCode) !== 'FULL') return 0;

  return Math.max(1, spellcastingModifier + Math.floor(level / divisor));
}
