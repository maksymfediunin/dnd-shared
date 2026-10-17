import { describe, expect, it } from 'vitest';
import { amountOf, collectLights, collectSenses, holds, ruleHolds } from './compute.js';
import { EFFECT_MECHANICS } from './effects.data.js';
import { FEATURE_MECHANICS } from './features.data.js';
import type { MechanicsHolder } from './types.js';

const holder = (patch: Partial<MechanicsHolder> = {}): MechanicsHolder => ({
  level: 1,
  features: new Set(),
  traits: new Set(),
  effects: [],
  proficiencyBonus: 2,
  ancestryDamageType: null,
  ...patch,
});

describe('реестр волны 5', () => {
  it('чувства: эльф — тёмное зрение 60, колдун с воззванием — дьявольское 120', () => {
    expect(collectSenses(holder({ traits: new Set(['darkvision']) }))).toEqual({
      darkvision: 60,
      devilsSight: 0,
    });
    expect(
      collectSenses(holder({ features: new Set(['eldritch-invocation-devils-sight']) })),
    ).toEqual({ darkvision: 0, devilsSight: 120 });
  });

  it('«Священное оружие» светит 20/20', () => {
    expect(collectLights(holder({ effects: ['SACRED_WEAPON'] }))).toEqual([
      { kind: 'light', bright: 20, dim: 20 },
    ]);
  });

  it('предикаты: в тени и против растений-помех', () => {
    expect(holds(['bearerInDimOrDark'], { bearer: { light: 'DIM' } })).toBe(true);
    expect(holds(['bearerInDimOrDark'], { bearer: { light: 'BRIGHT' } })).toBe(false);
    expect(holds(['vsImpedingPlants'], { save: { spellTags: ['impedingPlants'] } })).toBe(true);
    expect(holds(['vsImpedingPlants'], { save: {} })).toBe(false);
  });

  it('«Единство с тенями» невидим и снимается шагом, действием, реакцией', () => {
    expect(EFFECT_MECHANICS.ONE_WITH_SHADOWS).toMatchObject({
      condition: 'invisible',
      endsOnMove: true,
      endsOnAction: true,
      endsOnReaction: true,
    });
  });

  it('«Медленное падение» у монаха 4 — минус 20', () => {
    const facet = FEATURE_MECHANICS['slow-fall']?.facets?.[0];
    expect(facet?.kind).toBe('reaction');
    if (facet?.kind !== 'reaction' || !('reduceFallDamage' in facet.effect)) throw new Error();
    expect(amountOf(facet.effect.reduceFallDamage, holder({ level: 4 }))).toBe(20);
  });

  it('движение без доспехов 9: по воде — только без доспеха и щита, в свой ход', () => {
    const monk = holder({ features: new Set(['unarmored-movement-2']) });
    const free = {
      armor: { worn: null, shield: false },
      turn: { isOwn: true, movedAtMostHalf: false },
    };
    expect(ruleHolds(monk, 'wallAndWaterWalk', free)).toBe(true);
    expect(
      ruleHolds(monk, 'wallAndWaterWalk', { ...free, armor: { worn: 'LIGHT', shield: false } }),
    ).toBe(false);
  });
});
