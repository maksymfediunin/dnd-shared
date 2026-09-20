import { z } from 'zod';

/**
 * Состояния SRD. Код совпадает с `Condition.code` справочника буква в
 * букву — по нему же фронт берёт название и описание на языке стола
 * (`GET /reference/conditions/:code`). Свой регистр завёл бы у одной
 * сущности два имени и преобразование между ними в обе стороны.
 */
export const CONDITION_CODES = [
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
] as const;
export const conditionCodeSchema = z.enum(CONDITION_CODES);
export type ConditionCode = (typeof CONDITION_CODES)[number];

/**
 * Истощение — единственное состояние со степенью, а не «есть или
 * нет». Шестой уровень означает смерть, и служба ставит `isDead` той
 * же транзакцией.
 */
export const EXHAUSTION_MIN_LEVEL = 1;
export const EXHAUSTION_MAX_LEVEL = 6;

/**
 * Границы уровня истощения одной конструкцией — `schemas/map.ts` (наложение
 * ведущим) и `schemas/combat.ts` (payload строки журнала) считали её
 * порознь от тех же констант: числа разойтись не могли, а форма проверки
 * была повторена дважды (хвосты волны «б», находка 15).
 */
export const exhaustionLevelSchema = z
  .number()
  .int()
  .min(EXHAUSTION_MIN_LEVEL)
  .max(EXHAUSTION_MAX_LEVEL);

/** Что случилось со строкой состояния — этим подписана строка журнала. */
export const CONDITION_ACTIONS = ['APPLIED', 'REMOVED', 'EXPIRED'] as const;
export const conditionActionSchema = z.enum(CONDITION_ACTIONS);
export type ConditionAction = (typeof CONDITION_ACTIONS)[number];
