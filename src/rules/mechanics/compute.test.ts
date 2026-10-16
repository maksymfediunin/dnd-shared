import { describe, expect, it } from 'vitest';
import {
  martialArtsDie,
  rageDamageBonus,
  sneakAttackDice,
  unarmoredMovementBonus,
} from '../progression.js';
import { amountOf, holds } from './compute.js';
import type { MechanicsContext, MechanicsHolder, Predicate } from './types.js';

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

const sword: MechanicsContext['weapon'] = {
  rangeType: 'MELEE',
  properties: [],
  ability: 'strength',
  offHandWeapon: false,
};

describe('предикаты', () => {
  const check = (p: Predicate, ctx: MechanicsContext) => holds([p], ctx);

  it('без нужного поля контекста условие ложно — даже «отрицательное»', () => {
    for (const p of [
      'noArmor',
      'noShield',
      'armored',
      'notHeavyArmor',
      'meleeWeapon',
      'rangedWeapon',
      'finesseOrRanged',
      'strengthAttack',
      'oneHandedMelee',
      'advantage',
      'notDisadvantage',
      'allyAdjacentToTarget',
    ] as const) {
      expect(check(p, {}), p).toBe(false);
    }
  });

  it('доспех и щит', () => {
    const bare = { armor: { worn: null, shield: false } };
    const plate = { armor: { worn: 'HEAVY' as const, shield: true } };
    expect(check('noArmor', bare)).toBe(true);
    expect(check('noShield', bare)).toBe(true);
    expect(check('armored', bare)).toBe(false);
    expect(check('notHeavyArmor', bare)).toBe(true);
    expect(check('noArmor', plate)).toBe(false);
    expect(check('noShield', plate)).toBe(false);
    expect(check('armored', plate)).toBe(true);
    expect(check('notHeavyArmor', plate)).toBe(false);
    expect(check('notHeavyArmor', { armor: { worn: 'MEDIUM', shield: false } })).toBe(true);
  });

  it('оружие', () => {
    const bow = { ...sword, rangeType: 'RANGED' as const, ability: 'dexterity' as const };
    const rapier = { ...sword, properties: ['FINESSE' as const] };
    const greatsword = { ...sword, properties: ['TWO_HANDED' as const] };
    expect(check('meleeWeapon', { weapon: sword })).toBe(true);
    expect(check('rangedWeapon', { weapon: sword })).toBe(false);
    expect(check('rangedWeapon', { weapon: bow })).toBe(true);
    expect(check('finesseOrRanged', { weapon: sword })).toBe(false);
    expect(check('finesseOrRanged', { weapon: rapier })).toBe(true);
    expect(check('finesseOrRanged', { weapon: bow })).toBe(true);
    expect(check('strengthAttack', { weapon: sword })).toBe(true);
    expect(check('strengthAttack', { weapon: bow })).toBe(false);
    expect(check('oneHandedMelee', { weapon: sword })).toBe(true);
    expect(check('oneHandedMelee', { weapon: greatsword })).toBe(false);
    expect(check('oneHandedMelee', { weapon: bow })).toBe(false);
    expect(check('oneHandedMelee', { weapon: { ...sword, offHandWeapon: true } })).toBe(false);
  });

  it('бросок и соседи', () => {
    const roll = (mode: 'NONE' | 'ADVANTAGE' | 'DISADVANTAGE', ally = false) => ({
      roll: { mode, allyAdjacentToTarget: ally },
    });
    expect(check('advantage', roll('ADVANTAGE'))).toBe(true);
    expect(check('advantage', roll('NONE'))).toBe(false);
    expect(check('notDisadvantage', roll('NONE'))).toBe(true);
    expect(check('notDisadvantage', roll('DISADVANTAGE'))).toBe(false);
    expect(check('allyAdjacentToTarget', roll('NONE', true))).toBe(true);
    expect(check('allyAdjacentToTarget', roll('NONE'))).toBe(false);
  });

  it('anyOf — хоть одно; список when — все разом', () => {
    const either: Predicate = { anyOf: ['advantage', 'allyAdjacentToTarget'] };
    expect(check(either, { roll: { mode: 'NONE', allyAdjacentToTarget: true } })).toBe(true);
    expect(check(either, { roll: { mode: 'ADVANTAGE', allyAdjacentToTarget: false } })).toBe(true);
    expect(check(either, { roll: { mode: 'NONE', allyAdjacentToTarget: false } })).toBe(false);
    expect(
      holds(['notDisadvantage', either], {
        roll: { mode: 'DISADVANTAGE', allyAdjacentToTarget: true },
      }),
    ).toBe(false);
    expect(holds(undefined, {})).toBe(true);
  });
});

describe('числа граней', () => {
  it('литерал и половина мастерства вниз', () => {
    expect(amountOf(2, holderOf())).toBe(2);
    expect(amountOf('halfProficiency', holderOf({ proficiencyBonus: 3 }))).toBe(1);
    expect(amountOf('halfProficiency', holderOf({ proficiencyBonus: 4 }))).toBe(2);
  });

  it('таблицы — те же функции progression.ts на каждом уровне', () => {
    for (let level = 1; level <= 10; level += 1) {
      const h = holderOf({ level });
      expect(amountOf({ table: 'rageDamage' }, h)).toBe(rageDamageBonus(level));
      expect(amountOf({ table: 'martialArtsDie' }, h)).toBe(martialArtsDie(level));
      expect(amountOf({ table: 'sneakAttackDice' }, h)).toBe(sneakAttackDice(level));
      expect(amountOf({ table: 'unarmoredMovement' }, h)).toBe(unarmoredMovementBonus(level));
    }
  });
});
