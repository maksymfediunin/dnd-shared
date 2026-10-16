import { describe, expect, it } from 'vitest';
import { type CastOptionSpell, castOptionCost, castOptionEligible } from './cast-options.js';

/** Годность метамагии по разбору умений, §11 (план волны 3, B8). */
const spell = (patch: Partial<CastOptionSpell>): CastOptionSpell => ({
  code: 'x',
  level: 1,
  range: '60 feet',
  castingTime: '1 action',
  duration: 'Instantaneous',
  saveAbility: null,
  areaShape: null,
  damageType: null,
  ...patch,
});

const fireBolt = spell({ code: 'fire-bolt', level: 0, range: '120 feet', damageType: 'fire' });
const burningHands = spell({
  code: 'burning-hands',
  range: 'Self (15-foot cone)',
  areaShape: 'CONE',
  saveAbility: 'DEX',
  damageType: 'fire',
});
const shockingGrasp = spell({
  code: 'shocking-grasp',
  level: 0,
  range: 'Touch',
  damageType: 'lightning',
});
const holdPerson = spell({
  code: 'hold-person',
  level: 2,
  saveAbility: 'WIS',
  duration: 'Up to 1 minute',
});

describe('метамагия', () => {
  it('дальнее: снаряд да, ладони нет, касание да', () => {
    expect(castOptionEligible('DISTANT', fireBolt, null)).toBe(true);
    expect(castOptionEligible('DISTANT', burningHands, 1)).toBe(false);
    expect(castOptionEligible('DISTANT', shockingGrasp, null)).toBe(true);
  });

  it('удвоенное: стрела и луч нет; удержание ячейкой 2 — за 2, ячейкой 3 — нет; снаряд — 1', () => {
    expect(castOptionEligible('TWINNED', spell({ code: 'magic-missile' }), 1)).toBe(false);
    expect(castOptionEligible('TWINNED', spell({ code: 'scorching-ray', level: 2 }), 2)).toBe(
      false,
    );
    expect(castOptionEligible('TWINNED', holdPerson, 2)).toBe(true);
    expect(castOptionCost('TWINNED', 2)).toBe(2);
    expect(castOptionEligible('TWINNED', holdPerson, 3)).toBe(false);
    expect(castOptionEligible('TWINNED', fireBolt, null)).toBe(true);
    expect(castOptionCost('TWINNED', null)).toBe(1);
  });

  it('ускоренное — только «1 действие»; продлённое — от минуты; бережное и возвышенное — со спасброском', () => {
    expect(castOptionEligible('QUICKENED', fireBolt, null)).toBe(true);
    expect(castOptionEligible('QUICKENED', spell({ castingTime: '1 bonus action' }), 1)).toBe(
      false,
    );
    expect(castOptionEligible('EXTENDED', holdPerson, 2)).toBe(true);
    expect(castOptionEligible('EXTENDED', spell({ duration: '1 round' }), 1)).toBe(false);
    expect(castOptionEligible('CAREFUL', burningHands, 1)).toBe(true);
    expect(castOptionEligible('HEIGHTENED', fireBolt, null)).toBe(false);
    expect(castOptionCost('HEIGHTENED', 2)).toBe(3);
  });

  it('стихийное сопротивление — только своим видом урона', () => {
    expect(
      castOptionEligible('ELEMENTAL_RESISTANCE', fireBolt, null, {
        sorcererAncestryDamageType: 'fire',
      }),
    ).toBe(true);
    expect(
      castOptionEligible('ELEMENTAL_RESISTANCE', shockingGrasp, null, {
        sorcererAncestryDamageType: 'fire',
      }),
    ).toBe(false);
  });
});
