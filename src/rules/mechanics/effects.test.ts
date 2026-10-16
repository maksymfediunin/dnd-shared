import { describe, expect, it } from 'vitest';
import { collectAdvantage, collectDefenses, collectModifiers, hasRule } from './compute.js';
import type { MechanicsContext, MechanicsHolder } from './types.js';

/** Эффекты волны 3 на настоящих записях (план волны 3, B3). */
function bearer(effects: string[], patch: Partial<MechanicsHolder> = {}): MechanicsHolder {
  return {
    level: 3,
    features: new Set(),
    traits: new Set(),
    effects,
    proficiencyBonus: 2,
    ancestryDamageType: null,
    ...patch,
  };
}

const melee: NonNullable<MechanicsContext['weapon']> = {
  rangeType: 'MELEE',
  properties: [],
  ability: 'strength',
  offHandWeapon: false,
};
const ownTurn = { isOwn: true, movedAtMostHalf: false };

describe('безрассудство', () => {
  const h = bearer(['RECKLESS']);
  it('преимущество — только в свой ход, рукопашным с Силой', () => {
    expect(collectAdvantage(h, { kind: 'attack' }, { weapon: melee, turn: ownTurn })).toBe(
      'ADVANTAGE',
    );
    expect(
      collectAdvantage(
        h,
        { kind: 'attack' },
        { weapon: melee, turn: { ...ownTurn, isOwn: false } },
      ),
    ).toBe('NONE');
    expect(
      collectAdvantage(
        h,
        { kind: 'attack' },
        { weapon: { ...melee, rangeType: 'RANGED', ability: 'dexterity' }, turn: ownTurn },
      ),
    ).toBe('NONE');
    expect(
      collectAdvantage(
        h,
        { kind: 'attack' },
        { weapon: { ...melee, ability: 'dexterity' }, turn: ownTurn },
      ),
    ).toBe('NONE');
  });
  it('по безрассудному — с преимуществом всегда', () => {
    expect(collectAdvantage(h, { kind: 'incoming' })).toBe('ADVANTAGE');
  });
});

describe('уклонение', () => {
  const h = bearer(['DODGING']);
  const seen = (alert: boolean, seesAttacker: boolean): MechanicsContext => ({
    bearer: { alert },
    roll: { mode: 'NONE', allyAdjacentToTarget: false, targetSeesAttacker: seesAttacker },
  });
  it('помеха входящим, когда видит атакующего и бдителен', () => {
    expect(collectAdvantage(h, { kind: 'incoming' }, seen(true, true))).toBe('DISADVANTAGE');
    expect(collectAdvantage(h, { kind: 'incoming' }, seen(true, false))).toBe('NONE');
    expect(collectAdvantage(h, { kind: 'incoming' }, seen(false, true))).toBe('NONE');
  });
  it('спасбросок Ловкости — с преимуществом, пока бдителен', () => {
    expect(
      collectAdvantage(h, { kind: 'save', ability: 'dexterity' }, { bearer: { alert: true } }),
    ).toBe('ADVANTAGE');
    expect(
      collectAdvantage(h, { kind: 'save', ability: 'dexterity' }, { bearer: { alert: false } }),
    ).toBe('NONE');
    expect(
      collectAdvantage(h, { kind: 'save', ability: 'strength' }, { bearer: { alert: true } }),
    ).toBe('NONE');
  });
});

describe('помощь', () => {
  it('преимущество — только по цели из данных', () => {
    const h = bearer(['HELPED'], { effectData: { HELPED: { targetId: 'goblin' } } });
    expect(collectAdvantage(h, { kind: 'attack' }, { target: { id: 'goblin' } })).toBe('ADVANTAGE');
    expect(collectAdvantage(h, { kind: 'attack' }, { target: { id: 'orc' } })).toBe('NONE');
  });
});

describe('священное оружие', () => {
  const blessed = (charisma: number) =>
    bearer(['SACRED_WEAPON'], {
      abilityModifiers: { charisma },
      effectData: { SACRED_WEAPON: { itemId: 'longsword' } },
    });
  const withItem = (itemId: string): MechanicsContext => ({ weapon: { ...melee, itemId } });
  it('+ХАР к атаке этим оружием (ХАР 16 → +3, ХАР 8 → +1), подпись sacredWeapon', () => {
    expect(collectModifiers(blessed(3), 'attack', withItem('longsword'))).toEqual([
      { code: 'SACRED_WEAPON', value: 3, source: 'sacredWeapon' },
    ]);
    expect(collectModifiers(blessed(-1), 'attack', withItem('longsword'))[0]?.value).toBe(1);
  });
  it('чужим оружием — ничего', () => {
    expect(collectModifiers(blessed(3), 'attack', withItem('dagger'))).toEqual([]);
  });
});

describe('правила эффектов', () => {
  it('ярость запрещает колдовать; изгнание и «без реакций» — реакции', () => {
    expect(hasRule(bearer(['RAGE']), 'noSpellcasting')).toBe(true);
    expect(hasRule(bearer(['TURNED']), 'noReactions')).toBe(true);
    expect(hasRule(bearer(['NO_REACTIONS']), 'noReactions')).toBe(true);
    expect(hasRule(bearer([]), 'noReactions')).toBe(false);
  });

  it('стихийное сродство — сопротивление виду урона предка чародея', () => {
    const red = bearer(['ELEMENTAL_AFFINITY'], { sorcererAncestryDamageType: 'fire' });
    expect(collectDefenses(red).resistances).toEqual(['fire']);
    expect(collectDefenses(bearer(['ELEMENTAL_AFFINITY'])).resistances).toEqual([]);
  });
});
