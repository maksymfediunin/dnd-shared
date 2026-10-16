import { describe, expect, it } from 'vitest';
import { amountOf, holds } from './compute.js';
import type { MechanicsContext, MechanicsHolder, Predicate } from './types.js';

/** Предикаты и числа волны 3 (план волны 3, B1). */
function holderOf(patch: Partial<MechanicsHolder> = {}): MechanicsHolder {
  return {
    level: 1,
    features: new Set(),
    traits: new Set(),
    effects: [],
    proficiencyBonus: 2,
    ancestryDamageType: null,
    ...patch,
  };
}

const sword: NonNullable<MechanicsContext['weapon']> = {
  rangeType: 'MELEE',
  properties: [],
  ability: 'strength',
  offHandWeapon: false,
};

describe('предикаты волны 3', () => {
  const check = (p: Predicate, ctx: MechanicsContext) => holds([p], ctx);

  it('без нужного поля контекста — ложь', () => {
    for (const p of [
      'ownTurn',
      'movedAtMostHalfSpeed',
      'attackerSeen',
      'bearerAlert',
      'pactWeapon',
      'viaFlurry',
      'effectItemIsWeapon',
      'effectTargetIsTarget',
    ] as const) {
      expect(check(p, {}), p).toBe(false);
    }
  });

  it('ход, пройденное, обзор, бдительность', () => {
    expect(check('ownTurn', { turn: { isOwn: true, movedAtMostHalf: false } })).toBe(true);
    expect(check('ownTurn', { turn: { isOwn: false, movedAtMostHalf: true } })).toBe(false);
    expect(check('movedAtMostHalfSpeed', { turn: { isOwn: true, movedAtMostHalf: true } })).toBe(
      true,
    );
    expect(check('movedAtMostHalfSpeed', { turn: { isOwn: true, movedAtMostHalf: false } })).toBe(
      false,
    );
    const roll = (seen: boolean) => ({
      roll: { mode: 'NONE' as const, allyAdjacentToTarget: false, targetSeesAttacker: seen },
    });
    expect(check('attackerSeen', roll(true))).toBe(true);
    expect(check('attackerSeen', roll(false))).toBe(false);
    expect(check('bearerAlert', { bearer: { alert: true } })).toBe(true);
    expect(check('bearerAlert', { bearer: { alert: false } })).toBe(false);
  });

  it('клинок договора и шквал', () => {
    expect(check('pactWeapon', { weapon: { ...sword, pact: true } })).toBe(true);
    expect(check('pactWeapon', { weapon: sword })).toBe(false);
    expect(check('viaFlurry', { attack: { via: 'FLURRY' } })).toBe(true);
    expect(check('viaFlurry', { attack: { via: 'BONUS' } })).toBe(false);
  });

  it('данные эффекта: священное оружие — свой предмет, помощь — своя цель', () => {
    const h = holderOf({
      effectData: { SACRED_WEAPON: { itemId: 'sword-1' }, HELPED: { targetId: 'goblin' } },
    });
    const sacred = { code: 'SACRED_WEAPON', h };
    expect(holds(['effectItemIsWeapon'], { weapon: { ...sword, itemId: 'sword-1' } }, sacred)).toBe(
      true,
    );
    expect(holds(['effectItemIsWeapon'], { weapon: { ...sword, itemId: 'dagger' } }, sacred)).toBe(
      false,
    );
    const helped = { code: 'HELPED', h };
    expect(holds(['effectTargetIsTarget'], { target: { id: 'goblin' } }, helped)).toBe(true);
    expect(holds(['effectTargetIsTarget'], { target: { id: 'orc' } }, helped)).toBe(false);
    // Без владельца данных нет — ложь.
    expect(holds(['effectTargetIsTarget'], { target: { id: 'goblin' } })).toBe(false);
  });
});

describe('числа волны 3', () => {
  it('Харизма не меньше +1: при −1 — 1, при +3 — 3; без листа — минимум', () => {
    const amount = { ability: 'charisma' as const, min: 1 };
    expect(amountOf(amount, holderOf({ abilityModifiers: { charisma: -1 } }))).toBe(1);
    expect(amountOf(amount, holderOf({ abilityModifiers: { charisma: 3 } }))).toBe(3);
    expect(amountOf(amount, holderOf())).toBe(1);
  });

  it('5 × уровень, мастерство, сумма с минимумом', () => {
    expect(amountOf({ times: 5, of: 'level' }, holderOf({ level: 4 }))).toBe(20);
    expect(amountOf('proficiency', holderOf({ proficiencyBonus: 3 }))).toBe(3);
    const blessing = { sum: [{ ability: 'charisma' as const }, 'level' as const], min: 1 };
    expect(amountOf(blessing, holderOf({ level: 3, abilityModifiers: { charisma: 3 } }))).toBe(6);
    expect(amountOf(blessing, holderOf({ level: 1, abilityModifiers: { charisma: -2 } }))).toBe(1);
    expect(amountOf({ table: 'bardicInspirationDie' }, holderOf({ level: 5 }))).toBe(8);
  });
});
