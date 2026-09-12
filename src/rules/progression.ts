import type { CharacterResourceCode, ClassCode } from '../enums/character.js';

/**
 * Правила кончаются на пятом уровне — так решено в общем ТЗ. Пятый
 * уровень даёт и Дополнительную атаку, и третий круг заклинаний,
 * то есть все механики, которые понадобятся боёвке.
 */
export const MAX_LEVEL = 5;

export const LEVELS = [1, 2, 3, 4, 5] as const;

export type CharacterLevel = (typeof LEVELS)[number];

/** Вид заклинателя. Договор колдуна — отдельная механика, не ячейки. */
export type CasterKind = 'FULL' | 'HALF' | 'PACT' | 'NONE';

export interface PactMagic {
  slots: number;
  /** Круг, которым колдун колдует: у него все ячейки одного круга. */
  spellLevel: number;
}

export interface ResourceMaximum {
  code: CharacterResourceCode;
  max: number;
}

/**
 * Уровень вне таблиц — ошибка вызывающего, а не повод вернуть ноль:
 * молчаливый ноль превратился бы в персонажа без ячеек и хитов.
 */
function assertLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
    throw new RangeError(`Уровень ${level} вне таблиц правил (1–${MAX_LEVEL})`);
  }
}

/** Значение таблицы по уровню: индекс проверен assertLevel. */
function atLevel<T>(table: readonly T[], level: number): T {
  assertLevel(level);
  return table[level - 1] as T;
}

const PROFICIENCY_BONUS = [2, 2, 2, 2, 3] as const;

export function proficiencyBonus(level: number): number {
  return atLevel(PROFICIENCY_BONUS, level);
}

const HIT_DIE: Record<ClassCode, number> = {
  barbarian: 12,
  bard: 8,
  cleric: 8,
  druid: 8,
  fighter: 10,
  monk: 8,
  paladin: 10,
  ranger: 10,
  rogue: 8,
  sorcerer: 6,
  warlock: 8,
  wizard: 6,
};

export function hitDie(classCode: ClassCode): number {
  return HIT_DIE[classCode];
}

const CASTER_KIND: Record<ClassCode, CasterKind> = {
  barbarian: 'NONE',
  bard: 'FULL',
  cleric: 'FULL',
  druid: 'FULL',
  fighter: 'NONE',
  monk: 'NONE',
  paladin: 'HALF',
  ranger: 'HALF',
  rogue: 'NONE',
  sorcerer: 'FULL',
  warlock: 'PACT',
  wizard: 'FULL',
};

export function casterKind(classCode: ClassCode): CasterKind {
  return CASTER_KIND[classCode];
}

/** Ячейки по кругам, уровни 1–5. Полные заклинатели. */
const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [[2], [3], [4, 2], [4, 3], [4, 3, 2]];

/** Половинные заклинатели: заклинания появляются со второго уровня. */
const HALF_CASTER_SLOTS: readonly (readonly number[])[] = [[], [2], [3], [3], [4, 2]];

const NO_SLOTS: readonly number[] = [];

/**
 * Ячейки заклинаний по кругам: индекс 0 — первый круг. У колдуна
 * пусто: его ячейки живут в pactMagic, потому что восстанавливаются
 * в короткий отдых и все одного круга.
 */
export function spellSlots(classCode: ClassCode, level: number): number[] {
  assertLevel(level);
  switch (casterKind(classCode)) {
    case 'FULL':
      return [...atLevel(FULL_CASTER_SLOTS, level)];
    case 'HALF':
      return [...atLevel(HALF_CASTER_SLOTS, level)];
    default:
      return [...NO_SLOTS];
  }
}

const PACT_MAGIC: readonly PactMagic[] = [
  { slots: 1, spellLevel: 1 },
  { slots: 2, spellLevel: 1 },
  { slots: 2, spellLevel: 2 },
  { slots: 2, spellLevel: 2 },
  { slots: 2, spellLevel: 3 },
];

export function pactMagic(classCode: ClassCode, level: number): PactMagic | null {
  assertLevel(level);
  if (casterKind(classCode) !== 'PACT') return null;
  return { ...atLevel(PACT_MAGIC, level) };
}

const NONE_BY_LEVEL = [0, 0, 0, 0, 0] as const;

const CANTRIPS_KNOWN: Record<ClassCode, readonly number[]> = {
  barbarian: NONE_BY_LEVEL,
  bard: [2, 2, 2, 3, 3],
  cleric: [3, 3, 3, 4, 4],
  druid: [2, 2, 2, 3, 3],
  fighter: NONE_BY_LEVEL,
  monk: NONE_BY_LEVEL,
  paladin: NONE_BY_LEVEL,
  ranger: NONE_BY_LEVEL,
  rogue: NONE_BY_LEVEL,
  sorcerer: [4, 4, 4, 5, 5],
  warlock: [2, 2, 2, 3, 3],
  wizard: [3, 3, 3, 4, 4],
};

export function cantripsKnown(classCode: ClassCode, level: number): number {
  return atLevel(CANTRIPS_KNOWN[classCode], level);
}

/**
 * Классы со списком известных заклинаний. Остальные заклинатели
 * готовят заклинания из полного списка класса, поэтому «известно» у
 * них не число, а null: считать подготовку — дело spells.ts.
 */
const SPELLS_KNOWN: Partial<Record<ClassCode, readonly number[]>> = {
  bard: [4, 5, 6, 7, 8],
  sorcerer: [2, 3, 4, 5, 6],
  warlock: [2, 3, 4, 5, 6],
  ranger: [0, 2, 3, 3, 4],
};

export function spellsKnown(classCode: ClassCode, level: number): number | null {
  assertLevel(level);
  const table = SPELLS_KNOWN[classCode];
  return table ? atLevel(table, level) : null;
}

/** Книга волшебника: шесть на первом уровне и по два за каждый следующий. */
export function spellbookSize(level: number): number {
  assertLevel(level);
  return 6 + (level - 1) * 2;
}

const SUBCLASS_UNLOCK_LEVEL: Record<ClassCode, number> = {
  barbarian: 3,
  bard: 3,
  cleric: 1,
  druid: 2,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 1,
  warlock: 1,
  wizard: 2,
};

/**
 * Единственный источник правды об уровне открытия подкласса: та же
 * таблица раньше жила в мапперах импорта справочника, и два места
 * одной правды — как раз то, на чём она и разъедется.
 */
export function subclassUnlockLevel(classCode: ClassCode): number {
  return SUBCLASS_UNLOCK_LEVEL[classCode];
}

/** До пятого уровня повышение характеристик одно и у всех классов. */
export const ABILITY_SCORE_IMPROVEMENT_LEVELS = [4] as const;

export function hasAbilityScoreImprovement(_classCode: ClassCode, level: number): boolean {
  assertLevel(level);
  return (ABILITY_SCORE_IMPROVEMENT_LEVELS as readonly number[]).includes(level);
}

const EXTRA_ATTACK_CLASSES: readonly ClassCode[] = [
  'barbarian',
  'fighter',
  'monk',
  'paladin',
  'ranger',
];

export function hasExtraAttack(classCode: ClassCode, level: number): boolean {
  assertLevel(level);
  return level >= 5 && EXTRA_ATTACK_CLASSES.includes(classCode);
}

const RAGE_COUNT = [2, 2, 3, 3, 3] as const;
const CHANNEL_DIVINITY_CLERIC = [0, 1, 1, 1, 1] as const;
const CHANNEL_DIVINITY_PALADIN = [0, 0, 1, 1, 1] as const;
const WILD_SHAPE = [0, 2, 2, 2, 2] as const;
const SECOND_WIND = [1, 1, 1, 1, 1] as const;
const ACTION_SURGE = [0, 1, 1, 1, 1] as const;
const KI_POINTS = [0, 2, 3, 4, 5] as const;
const SORCERY_POINTS = [0, 2, 3, 4, 5] as const;

export interface ClassResourceOptions {
  /** Нужен барду: вдохновений столько, каков модификатор Харизмы. */
  charismaModifier?: number;
}

/**
 * Максимумы расходуемых ресурсов класса на уровне. Ресурсы с нулевым
 * максимумом не попадают в список: пустая строка в листе означала бы,
 * что умение уже получено, но кончилось.
 */
export function classResources(
  classCode: ClassCode,
  level: number,
  options: ClassResourceOptions = {},
): ResourceMaximum[] {
  assertLevel(level);
  const resources: ResourceMaximum[] = [];
  const push = (code: CharacterResourceCode, max: number): void => {
    if (max > 0) resources.push({ code, max });
  };

  switch (classCode) {
    case 'barbarian':
      push('RAGE', atLevel(RAGE_COUNT, level));
      break;
    case 'bard':
      // Модификатор Харизмы, но не меньше одного: иначе бард с низкой
      // Харизмой остался бы вовсе без своего главного умения.
      push('BARDIC_INSPIRATION', Math.max(1, options.charismaModifier ?? 0));
      break;
    case 'cleric':
      push('CHANNEL_DIVINITY', atLevel(CHANNEL_DIVINITY_CLERIC, level));
      break;
    case 'druid':
      push('WILD_SHAPE', atLevel(WILD_SHAPE, level));
      break;
    case 'fighter':
      push('SECOND_WIND', atLevel(SECOND_WIND, level));
      push('ACTION_SURGE', atLevel(ACTION_SURGE, level));
      break;
    case 'monk':
      push('KI', atLevel(KI_POINTS, level));
      break;
    case 'paladin':
      push('LAY_ON_HANDS', 5 * level);
      push('CHANNEL_DIVINITY', atLevel(CHANNEL_DIVINITY_PALADIN, level));
      break;
    case 'sorcerer':
      push('SORCERY_POINT', atLevel(SORCERY_POINTS, level));
      break;
    default:
      break;
  }

  return resources;
}

const RAGE_DAMAGE = [2, 2, 2, 2, 2] as const;
const BARDIC_INSPIRATION_DIE = [6, 6, 6, 6, 8] as const;
const MARTIAL_ARTS_DIE = [4, 4, 4, 4, 6] as const;
const SNEAK_ATTACK_DICE = [1, 1, 2, 2, 3] as const;
const INVOCATIONS_KNOWN = [0, 2, 2, 2, 3] as const;

/** Прибавка варвара к урону в ярости. */
export function rageDamageBonus(level: number): number {
  return atLevel(RAGE_DAMAGE, level);
}

/** Грань кости вдохновения барда. */
export function bardicInspirationDie(level: number): number {
  return atLevel(BARDIC_INSPIRATION_DIE, level);
}

/** Грань кости боевых искусств монаха. */
export function martialArtsDie(level: number): number {
  return atLevel(MARTIAL_ARTS_DIE, level);
}

/** Сколько d6 добавляет Скрытая атака плута. */
export function sneakAttackDice(level: number): number {
  return atLevel(SNEAK_ATTACK_DICE, level);
}

/** Сколько воззваний знает колдун. */
export function invocationsKnown(level: number): number {
  return atLevel(INVOCATIONS_KNOWN, level);
}
