import { ABILITY_CODES, type AbilityCode, type AbilityScores, type ClassCode } from '../enums/character.js';

export { ABILITY_CODES, type AbilityCode, type AbilityScores };

export const POINT_BUY_BUDGET = 27;

/** Границы покупки очков: всё, что вне них, покупкой не набирается. */
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

const COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Цена значения при покупке очков. Вне 8–15 бросает, а не возвращает
 * бесконечность: значение вне покупки — это ошибка ввода, и поймать её
 * лучше на месте, чем получить NaN в сумме бюджета.
 */
export function pointBuyCost(score: number): number {
  const cost = COST[score];
  if (cost === undefined) {
    throw new RangeError(`Значение ${score} вне покупки очков (${POINT_BUY_MIN}–${POINT_BUY_MAX})`);
  }
  return cost;
}

export function pointBuyTotal(scores: AbilityScores): number {
  return ABILITY_CODES.reduce((sum, code) => sum + pointBuyCost(scores[code]), 0);
}

/**
 * Набор автораспределения. Стоит ровно 27 очков, поэтому отдельный
 * алгоритм оптимизации бюджета не нужен: любая перестановка набора
 * тратит бюджет целиком.
 */
export const POINT_BUY_ARRAY = [15, 14, 13, 12, 10, 8] as const;

/** Порядок важности характеристик для класса: от главной к последней. */
export const ABILITY_PRIORITY: Record<ClassCode, readonly AbilityCode[]> = {
  barbarian: ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'],
  bard: ['charisma', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'strength'],
  cleric: ['wisdom', 'constitution', 'strength', 'charisma', 'intelligence', 'dexterity'],
  druid: ['wisdom', 'constitution', 'dexterity', 'intelligence', 'charisma', 'strength'],
  fighter: ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'],
  monk: ['dexterity', 'wisdom', 'constitution', 'strength', 'intelligence', 'charisma'],
  paladin: ['strength', 'charisma', 'constitution', 'wisdom', 'intelligence', 'dexterity'],
  ranger: ['dexterity', 'wisdom', 'constitution', 'strength', 'intelligence', 'charisma'],
  rogue: ['dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'strength'],
  sorcerer: ['charisma', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'strength'],
  warlock: ['charisma', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'strength'],
  wizard: ['intelligence', 'constitution', 'dexterity', 'wisdom', 'charisma', 'strength'],
};

/** Раскладывает набор автораспределения по приоритету класса. */
export function autoAssign(classCode: ClassCode): AbilityScores {
  const priority = ABILITY_PRIORITY[classCode];
  const scores = {} as AbilityScores;
  priority.forEach((code, index) => {
    scores[code] = POINT_BUY_ARRAY[index] ?? POINT_BUY_MIN;
  });
  return scores;
}
