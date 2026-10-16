import { BASIC_ACTIONS, type BasicAction } from '../../schemas/combat.js';
import type { ActionFacet } from './types.js';

/**
 * Базовые действия хода (§П3 разбора умений) — есть у всякого. Бонусные
 * версии («Хитрое действие», «Быстрые руки») — гранями своих умений в
 * `FEATURE_MECHANICS`: обработчик у действия один, меняется только цена.
 */
export const BASIC_ACTION_RECORDS: Readonly<Record<BasicAction, ActionFacet>> = {
  DASH: { kind: 'action', ability: 'DASH', economy: 'ACTION', input: { target: 'NONE' } },
  DISENGAGE: {
    kind: 'action',
    ability: 'DISENGAGE',
    economy: 'ACTION',
    applies: 'DISENGAGED',
    input: { target: 'NONE' },
  },
  DODGE: {
    kind: 'action',
    ability: 'DODGE',
    economy: 'ACTION',
    applies: 'DODGING',
    input: { target: 'NONE' },
  },
  // Вариант — «атака» или код навыка (сервер дописывает навыки листа).
  HELP: {
    kind: 'action',
    ability: 'HELP',
    economy: 'ACTION',
    input: { target: 'ALLY_AND_FOE', rangeFeet: 5, options: ['ATTACK'] },
  },
  HIDE: { kind: 'action', ability: 'HIDE', economy: 'ACTION', input: { target: 'NONE' } },
  // Вариант — оружие подготовленной атаки (сервер дописывает).
  READY: {
    kind: 'action',
    ability: 'READY',
    economy: 'ACTION',
    applies: 'READIED',
    input: { target: 'CREATURE' },
  },
  SEARCH: { kind: 'action', ability: 'SEARCH', economy: 'ACTION', input: { target: 'NONE' } },
  // Вариант — предмет, у которого есть обработчик (сервер дописывает).
  USE_AN_OBJECT: {
    kind: 'action',
    ability: 'USE_AN_OBJECT',
    economy: 'ACTION',
    input: { target: 'CREATURE', rangeFeet: 5 },
  },
  GRAPPLE: { kind: 'action', ability: 'GRAPPLE', economy: 'ATTACK', input: { target: 'CREATURE' } },
  SHOVE: {
    kind: 'action',
    ability: 'SHOVE',
    economy: 'ATTACK',
    input: { target: 'CREATURE', options: ['PRONE', 'PUSH'] },
  },
  ESCAPE: { kind: 'action', ability: 'ESCAPE', economy: 'ACTION', input: { target: 'NONE' } },
};

/** Ключ золотого сценария базового действия: `DASH` → `dash`, `USE_AN_OBJECT` → `use-an-object`. */
export function basicActionKey(action: BasicAction): string {
  return action.toLowerCase().replaceAll('_', '-');
}

export const isBasicAction = (ability: string): ability is BasicAction =>
  (BASIC_ACTIONS as readonly string[]).includes(ability);
