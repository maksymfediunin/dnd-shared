import { z } from 'zod';

/**
 * Состояние боя — отдельно от `status` сцены, который означает
 * видимость карты. Карту выводят на стол заранее, а бой начинают
 * отдельным нажатием; между этими моментами фишки ходят свободно.
 */
export const COMBAT_STATUSES = ['NONE', 'ROLLING_INITIATIVE', 'FIGHTING'] as const;
export const combatStatusSchema = z.enum(COMBAT_STATUSES);
export type CombatStatus = (typeof COMBAT_STATUSES)[number];

/**
 * Виды строк журнала. `ROUND` — не действие участника, а отметка
 * «пошёл следующий круг»: по ней журнал делится на раунды при чтении.
 */
export const ENCOUNTER_EVENT_KINDS = [
  'INITIATIVE',
  'MOVE',
  'ATTACK',
  'DAMAGE',
  'HEAL',
  'DEATH_SAVE',
  'END_TURN',
  'ROUND',
] as const;
export const encounterEventKindSchema = z.enum(ENCOUNTER_EVENT_KINDS);
export type EncounterEventKind = (typeof ENCOUNTER_EVENT_KINDS)[number];

/** Исход броска атаки. Промах по единице — тоже `MISS`. */
export const ATTACK_OUTCOMES = ['HIT', 'MISS'] as const;
export const attackOutcomeSchema = z.enum(ATTACK_OUTCOMES);
export type AttackOutcomeKind = (typeof ATTACK_OUTCOMES)[number];

/** Исход спасброска от смерти — им же подписывается строка журнала. */
export const DEATH_SAVE_OUTCOMES = ['SUCCESS', 'FAILURE', 'STABLE', 'DEAD', 'REVIVED'] as const;
export const deathSaveOutcomeSchema = z.enum(DEATH_SAVE_OUTCOMES);
export type DeathSaveOutcome = (typeof DEATH_SAVE_OUTCOMES)[number];

/**
 * Верхняя граница инициативы, которую ведущий вписывает руками. 1к20
 * плюс модификатор ловкости с любыми бонусами уровня 20 не выходит за
 * сорок; граница нужна, чтобы опечатка в три нуля не ломала очередь.
 */
export const INITIATIVE_MIN = 1;
export const INITIATIVE_MAX = 40;
