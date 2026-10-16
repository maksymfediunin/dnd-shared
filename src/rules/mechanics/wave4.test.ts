import { describe, expect, it } from 'vitest';
import {
  advantageSources,
  auraGrants,
  collectAdvantage,
  collectDefenses,
  collectModifiers,
  collectReroll,
  hasRule,
  holds,
  immuneToCondition,
} from './compute.js';
import type { MechanicsContext, MechanicsHolder, Predicate } from './types.js';

/** Предикаты, защита, ауры и записи волны 4 на настоящих данных (план волны 4, S1, S3). */

function holderOf(patch: Partial<MechanicsHolder> = {}): MechanicsHolder {
  return {
    level: 10,
    features: new Set(),
    traits: new Set(),
    effects: [],
    proficiencyBonus: 4,
    ancestryDamageType: null,
    ...patch,
  };
}

describe('предикаты волны 4', () => {
  const check = (p: Predicate, ctx: MechanicsContext, h?: MechanicsHolder) =>
    holds([p], ctx, h ? { code: 'x', h } : undefined);

  it('без нужного поля — ложь, даже у «отрицательных»', () => {
    for (const p of [
      'raging',
      'bearerConscious',
      'shield',
      'actorSeen',
      'sourceSeen',
      'actorHearsBearer',
      'canHearBearer',
      'targetNotSelf',
      'rangedWeaponAttack',
      'incomingOpportunityAttack',
      'vsMagic',
      'vsPoison',
      'killedOutright',
      { bearerNot: ['blinded'] },
      { actorImmune: 'charmed' },
      { attackerSizeAtLeast: 'LARGE' },
      { vsCondition: 'frightened' },
      { withinFeet: 5, of: 'target' },
    ] as Predicate[]) {
      expect(check(p, {}), JSON.stringify(p)).toBe(false);
    }
  });

  it('ярость — по носителю', () => {
    expect(check('raging', {}, holderOf({ effects: ['RAGE'] }))).toBe(true);
    expect(check('raging', {}, holderOf())).toBe(false);
  });

  it('{not}, размер, расстояние, против состояния и яда', () => {
    expect(check({ not: 'killedOutright' }, { damage: { killedOutright: false } })).toBe(true);
    expect(check({ attackerSizeAtLeast: 'LARGE' }, { actor: { size: 'HUGE' } })).toBe(true);
    expect(check({ attackerSizeAtLeast: 'LARGE' }, { actor: { size: 'SMALL' } })).toBe(false);
    expect(check({ withinFeet: 5, of: 'target' }, { distances: { target: 5 } })).toBe(true);
    expect(check({ withinFeet: 5, of: 'target' }, { distances: { target: 10 } })).toBe(false);
    expect(check({ vsCondition: 'charmed' }, { save: { conditions: ['charmed'] } })).toBe(true);
    expect(check('vsPoison', { save: { damageTypes: ['poison'] } })).toBe(true);
    expect(check('vsPoison', { save: { conditions: ['poisoned'] } })).toBe(true);
    expect(check('vsPoison', { save: { damageTypes: ['fire'] } })).toBe(false);
    expect(check({ bearerNot: ['blinded'] }, { bearer: { conditions: [] } })).toBe(true);
    expect(check({ bearerNot: ['blinded'] }, { bearer: { conditions: ['blinded'] } })).toBe(false);
    expect(check('targetNotSelf', { target: { id: 'a' }, bearer: { id: 'b' } })).toBe(true);
    expect(check('targetNotSelf', { target: { id: 'a' }, bearer: { id: 'a' } })).toBe(false);
  });
});

describe('защита', () => {
  it('чистота тела: иммунитет к яду и «отравлен»', () => {
    const d = collectDefenses(holderOf({ features: new Set(['purity-of-body']) }));
    expect(d.immunities).toEqual(['poison']);
    expect(immuneToCondition(d.conditionImmunities, 'poisoned')).toBe(true);
  });

  it('защита природы: очарование — только от элементалей и фей', () => {
    const d = collectDefenses(holderOf({ features: new Set(['natures-ward']) }));
    expect(immuneToCondition(d.conditionImmunities, 'charmed', 'fey')).toBe(true);
    expect(immuneToCondition(d.conditionImmunities, 'charmed', 'humanoid')).toBe(false);
    expect(immuneToCondition(d.conditionImmunities, 'charmed', null)).toBe(false);
    expect(d.immunities).toEqual(['poison']);
  });

  it('бездумная ярость — только в ярости и приостанавливает', () => {
    const calm = collectDefenses(holderOf({ features: new Set(['mindless-rage']) }));
    expect(calm.conditionImmunities).toEqual([]);
    const raging = collectDefenses(
      holderOf({ features: new Set(['mindless-rage']), effects: ['RAGE'] }),
    );
    expect(raging.conditionImmunities.map((c) => [c.code, c.suspends])).toEqual([
      ['charmed', true],
      ['frightened', true],
    ]);
  });
});

describe('ауры паладина', () => {
  const paladin = (charisma: number, patch: Partial<MechanicsHolder> = {}) =>
    holderOf({
      features: new Set(['aura-of-protection', 'aura-of-courage']),
      abilityModifiers: { charisma },
      ...patch,
    });
  const source = (h: MechanicsHolder, distanceFeet: number, conscious = true) => ({
    holder: h,
    distanceFeet,
    ally: true,
    conscious,
    recipientHearsBearer: true,
  });

  it('защита: в 10 футах +ХАР носителя, в 15 — нет, без сознания — нет', () => {
    const bonus = (sources: Parameters<typeof auraGrants>[0]) =>
      auraGrants(sources).flatMap(({ facet, h }) =>
        facet.kind === 'modifier' && facet.target === 'save'
          ? [collectModifiers({ ...h, features: new Set(), effects: [] }, 'save').length, h]
          : [],
      );
    expect(auraGrants([source(paladin(3), 10)]).some((g) => g.facet.kind === 'modifier')).toBe(
      true,
    );
    expect(bonus([source(paladin(3), 15)])).toEqual([]);
    expect(bonus([source(paladin(3), 5, false)])).toEqual([]);
  });

  it('две ауры защиты не складываются — берётся бо́льшая', () => {
    const grants = auraGrants([source(paladin(1), 5), source(paladin(4), 5)]).filter(
      (g) => g.facet.kind === 'modifier',
    );
    expect(grants).toHaveLength(1);
    expect(grants[0]?.h.abilityModifiers?.charisma).toBe(4);
  });

  it('прибавка — минимум +1', () => {
    const [grant] = auraGrants([source(paladin(-1), 0)]).filter((g) => g.facet.kind === 'modifier');
    const facet = grant?.facet;
    expect(facet?.kind === 'modifier' && facet.amount).toEqual({ ability: 'charisma', min: 1 });
  });

  it('храбрость: иммунитет к испугу с приостановкой — защитой получателя', () => {
    const d = collectDefenses(holderOf(), {}, auraGrants([source(paladin(3), 10)]));
    expect(d.conditionImmunities).toEqual([{ code: 'frightened', suspends: true }]);
  });

  it('чужая сторона ауры не получает', () => {
    expect(auraGrants([{ ...source(paladin(3), 5), ally: false }])).toEqual([]);
  });
});

describe('преимущества спасбросков', () => {
  it('гномья хитрость — ИНТ, МДР, ХАР против магии; Ловкость — нет', () => {
    const gnome = holderOf({ traits: new Set(['gnome-cunning']) });
    const magic = { save: { magical: true } };
    expect(collectAdvantage(gnome, { kind: 'save', ability: 'wisdom' }, magic)).toBe('ADVANTAGE');
    expect(collectAdvantage(gnome, { kind: 'save', ability: 'dexterity' }, magic)).toBe('NONE');
    expect(collectAdvantage(gnome, { kind: 'save', ability: 'wisdom' }, {})).toBe('NONE');
  });

  it('чувство опасности: ЛОВ, видит источник, не ослеплён', () => {
    const barbarian = holderOf({ features: new Set(['danger-sense']) });
    const ctx = (conditions: string[]) => ({
      save: { sourceSeen: true },
      bearer: { conditions: conditions as never },
    });
    expect(collectAdvantage(barbarian, { kind: 'save', ability: 'dexterity' }, ctx([]))).toBe(
      'ADVANTAGE',
    );
    expect(
      collectAdvantage(barbarian, { kind: 'save', ability: 'dexterity' }, ctx(['blinded'])),
    ).toBe('NONE');
  });

  it('уход от орды: помеха атаке при отходе, обычной — нет', () => {
    const ranger = holderOf({ features: new Set(['defensive-tactics-escape-the-horde']) });
    expect(
      advantageSources(ranger, { kind: 'incoming' }, { attack: { isOpportunity: true } }),
    ).toEqual(['DISADVANTAGE']);
    expect(advantageSources(ranger, { kind: 'incoming' }, { attack: {} })).toEqual([]);
  });
});

describe('прочие записи', () => {
  it('«Везучий» перебрасывает единицу атаки, проверки и спасброска', () => {
    const halfling = holderOf({ traits: new Set(['lucky']) });
    expect(collectReroll(halfling, 'attack')).toEqual([1]);
    expect(collectReroll(halfling, 'save')).toEqual([1]);
    expect(collectReroll(holderOf(), 'save')).toEqual([]);
  });

  it('уклонение и сон у эльфа — правила', () => {
    expect(hasRule(holderOf({ features: new Set(['rogue-evasion']) }), 'evasion')).toBe(true);
    expect(hasRule(holderOf({ traits: new Set(['fey-ancestry']) }), 'immuneMagicalSleep')).toBe(
      true,
    );
  });

  it('защита от мультиатаки: +4 к КД, пока висит эффект', () => {
    expect(collectModifiers(holderOf({ effects: ['MULTIATTACK_DEFENSE'] }), 'ac')).toEqual([
      { code: 'MULTIATTACK_DEFENSE', value: 4 },
    ]);
  });
});
