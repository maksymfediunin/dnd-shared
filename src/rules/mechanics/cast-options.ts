import type { CastOption } from '../../schemas/combat.js';
import { spellRayCount, spellTargetLimit } from '../spell-mechanics.js';
import { combatCastingTime, isSelfRange, spellEffectDuration, spellRangeFeet } from '../spells.js';

/** Поля заклинания, по которым решается годность метамагии. */
export interface CastOptionSpell {
  code: string;
  level: number;
  range: string;
  castingTime: string;
  duration: string;
  saveAbility: string | null;
  areaShape: string | null;
  /** Вид урона; нет — заклинание не ранит. */
  damageType: string | null;
  /** Школа (код справочника); нет — ваяние не годится. */
  school?: string | null;
}

/** Минута — десять раундов: продлённое заклинание — от минуты (SRD). */
const MINUTE_ROUNDS = 10;

/**
 * Годится ли заклинание под вариант (разбор умений, §11). Одна функция
 * на фронт и сервер: флажок в панели и отказ сервера обязаны совпадать.
 */
export function castOptionEligible(
  option: CastOption,
  spell: CastOptionSpell,
  slotLevel: number | null,
  context: { sorcererAncestryDamageType?: string | null } = {},
): boolean {
  switch (option) {
    case 'CAREFUL':
    case 'HEIGHTENED':
      return spell.saveAbility !== null;
    case 'DISTANT': {
      if (isSelfRange(spell.range)) return false;
      const feet = spellRangeFeet(spell.range);
      return feet !== null && feet >= 5;
    }
    case 'EMPOWERED':
      return spell.damageType !== null;
    case 'EXTENDED': {
      const duration = spellEffectDuration(spell.duration);
      return duration === 'LONG' || (typeof duration === 'number' && duration >= MINUTE_ROUNDS);
    }
    case 'QUICKENED':
      return combatCastingTime(spell.castingTime) === 'ACTION';
    case 'SUBTLE':
      return true;
    case 'TWINNED':
      // Одна цель на этом круге, не область, не лучи и не «на себя» (П4.43).
      return (
        !isSelfRange(spell.range) &&
        spell.areaShape === null &&
        spellRayCount(spell.code, spell.level, slotLevel, 1) === null &&
        spellTargetLimit(spell.code, spell.level, slotLevel) === 1
      );
    case 'SCULPT':
      // Ваяние бережёт от спасброска воплощения — без спасброска беречь не от чего.
      return spell.school?.toLowerCase() === 'evocation' && spell.saveAbility !== null;
    case 'ELEMENTAL_RESISTANCE':
      return (
        spell.damageType !== null &&
        !!context.sorcererAncestryDamageType &&
        spell.damageType.toLowerCase() === context.sorcererAncestryDamageType
      );
  }
}

const FLAT_COST: Record<Exclude<CastOption, 'TWINNED'>, number> = {
  CAREFUL: 1,
  DISTANT: 1,
  EMPOWERED: 1,
  EXTENDED: 1,
  HEIGHTENED: 3,
  QUICKENED: 2,
  SUBTLE: 1,
  ELEMENTAL_RESISTANCE: 1,
  SCULPT: 0,
};

/** Цена в очках чародейства; удвоенное — круг ячейки, у заговора 1. */
export function castOptionCost(option: CastOption, slotLevel: number | null): number {
  return option === 'TWINNED' ? Math.max(1, slotLevel ?? 0) : FLAT_COST[option];
}
