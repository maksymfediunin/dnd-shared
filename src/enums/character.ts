/**
 * Коды характеристик и классов — общий словарь правил, схем и базы.
 * Лежат в перечислениях, а не в движке правил: на них ссылается и
 * справочник, и схема персонажа, а движок — лишь один из потребителей.
 */
export const ABILITY_CODES = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

export type AbilityCode = (typeof ABILITY_CODES)[number];

/** Шесть характеристик персонажа. Порядок полей — как в листе. */
export type AbilityScores = Record<AbilityCode, number>;

export const CLASS_CODES = [
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
] as const;

export type ClassCode = (typeof CLASS_CODES)[number];
