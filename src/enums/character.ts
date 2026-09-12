import { z } from 'zod';

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

export const abilityCodeSchema = z.enum(ABILITY_CODES);

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

export const classCodeSchema = z.enum(CLASS_CODES);

export type ClassCode = (typeof CLASS_CODES)[number];

/**
 * Расходуемые ресурсы классов. Хранится только израсходованное:
 * максимум считает движок по классу и уровню, иначе повышение уровня
 * пришлось бы переписывать максимумы во всех строках.
 */
export const CHARACTER_RESOURCE_CODES = [
  'RAGE',
  'KI',
  'SORCERY_POINT',
  'SECOND_WIND',
  'ACTION_SURGE',
  'CHANNEL_DIVINITY',
  'BARDIC_INSPIRATION',
  'LAY_ON_HANDS',
  'WILD_SHAPE',
] as const;

export const characterResourceCodeSchema = z.enum(CHARACTER_RESOURCE_CODES);

export type CharacterResourceCode = (typeof CHARACTER_RESOURCE_CODES)[number];

/** Уровень владения навыком. Отсутствие владения строкой не хранится. */
export const PROFICIENCY_LEVELS = ['PROFICIENT', 'EXPERTISE'] as const;

export const proficiencyLevelSchema = z.enum(PROFICIENCY_LEVELS);

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

export const genderSchema = z.enum(GENDERS);

export type Gender = (typeof GENDERS)[number];

export const ALIGNMENTS = [
  'LAWFUL_GOOD',
  'NEUTRAL_GOOD',
  'CHAOTIC_GOOD',
  'LAWFUL_NEUTRAL',
  'TRUE_NEUTRAL',
  'CHAOTIC_NEUTRAL',
  'LAWFUL_EVIL',
  'NEUTRAL_EVIL',
  'CHAOTIC_EVIL',
] as const;

export const alignmentSchema = z.enum(ALIGNMENTS);

export type Alignment = (typeof ALIGNMENTS)[number];

/** Откуда у персонажа заклинание: от класса, от расы или от предмета. */
export const SPELL_SOURCES = ['CLASS', 'RACE', 'ITEM'] as const;

export const spellSourceSchema = z.enum(SPELL_SOURCES);

export type SpellSource = (typeof SPELL_SOURCES)[number];

/**
 * Виды выборов, которые персонаж делает на уровне. Без них пересчёт
 * листа теряет принятые решения.
 */
export const LEVEL_CHOICE_TYPES = [
  'SKILL',
  'SUBCLASS',
  'ABILITY_SCORE',
  'SPELL',
  'FEATURE_OPTION',
  'LANGUAGE',
  'TOOL',
] as const;

export const levelChoiceTypeSchema = z.enum(LEVEL_CHOICE_TYPES);

export type LevelChoiceType = (typeof LEVEL_CHOICE_TYPES)[number];
