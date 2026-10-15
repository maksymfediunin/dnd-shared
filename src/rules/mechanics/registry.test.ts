import { describe, expect, it } from 'vitest';
import {
  attacksPerActionOf,
  availableActions,
  collectAcFormula,
  collectAdvantage,
  collectCrit,
  collectDefenses,
  collectModifiers,
  collectOnHit,
  hasRule,
  onHitDiceCount,
  sumModifiers,
} from './compute.js';
import type { MechanicsContext, MechanicsHolder } from './types.js';

/** Коллекторы на настоящих записях реестра — то, что переехало из `class-features.rules.ts`. */
function holder(features: string[] = [], patch: Partial<MechanicsHolder> = {}): MechanicsHolder {
  return {
    level: 1,
    features: new Set(features),
    traits: new Set(),
    effects: [],
    proficiencyBonus: 2,
    ancestryDamageType: null,
    ...patch,
  };
}

const weapon = (
  patch: Partial<NonNullable<MechanicsContext['weapon']>> = {},
): MechanicsContext['weapon'] => ({
  rangeType: 'MELEE',
  properties: [],
  ability: 'strength',
  offHandWeapon: false,
  ...patch,
});
const bare = { worn: null, shield: false } as const;

describe('стили боя', () => {
  it('«Стрельба» — +2 к атаке дальнобойным, у всех классов', () => {
    for (const code of ['fighter-fighting-style-archery', 'ranger-fighting-style-archery']) {
      const h = holder([code]);
      expect(collectModifiers(h, 'attack', { weapon: weapon({ rangeType: 'RANGED' }) })).toEqual([
        { code, value: 2, source: 'archery' },
      ]);
      expect(collectModifiers(h, 'attack', { weapon: weapon() })).toEqual([]);
    }
  });

  it('«Дуэлянт» — +2 к урону одной рукой; двуручное и второе оружие — нет', () => {
    const h = holder(['fighting-style-dueling']);
    expect(collectModifiers(h, 'damage', { weapon: weapon() })).toEqual([
      { code: 'fighting-style-dueling', value: 2, source: 'dueling' },
    ]);
    expect(
      collectModifiers(h, 'damage', { weapon: weapon({ properties: ['TWO_HANDED'] }) }),
    ).toEqual([]);
    expect(collectModifiers(h, 'damage', { weapon: weapon({ offHandWeapon: true }) })).toEqual([]);
  });

  it('«Защита» — +1 к КД только в доспехе', () => {
    const h = holder(['ranger-fighting-style-defense']);
    expect(sumModifiers(h, 'ac', { armor: { worn: 'MEDIUM', shield: false } })).toBe(1);
    expect(sumModifiers(h, 'ac', { armor: bare })).toBe(0);
  });

  it('«Бой двумя оружиями» — правило, а не число', () => {
    expect(
      hasRule(holder(['fighter-fighting-style-two-weapon-fighting']), 'offHandAbilityDamage'),
    ).toBe(true);
    expect(hasRule(holder(), 'offHandAbilityDamage')).toBe(false);
  });
});

describe('умения листа', () => {
  it('формула КД без доспеха', () => {
    expect(collectAcFormula(holder(['barbarian-unarmored-defense']))).toMatchObject({
      base: 10,
      ability: 'constitution',
      shield: true,
    });
    expect(collectAcFormula(holder(['monk-unarmored-defense']))).toMatchObject({
      ability: 'wisdom',
      shield: false,
    });
    expect(collectAcFormula(holder(['draconic-resilience']))).toMatchObject({
      base: 13,
      ability: null,
    });
    expect(collectAcFormula(holder())).toBeNull();
  });

  it('движение без доспехов монаха 10/15/20 и ноль в доспехе или со щитом', () => {
    const speed = (level: number, armor: MechanicsContext['armor']) =>
      sumModifiers(holder(['unarmored-movement-1'], { level }), 'speed', { armor });
    expect(speed(2, bare)).toBe(10);
    expect(speed(6, bare)).toBe(15);
    expect(speed(10, bare)).toBe(20);
    expect(speed(10, { worn: 'LIGHT', shield: false })).toBe(0);
    expect(speed(10, { worn: null, shield: true })).toBe(0);
  });

  it('быстрое передвижение — не в тяжёлом доспехе', () => {
    const h = holder(['fast-movement']);
    expect(sumModifiers(h, 'speed', { armor: { worn: 'MEDIUM', shield: true } })).toBe(10);
    expect(sumModifiers(h, 'speed', { armor: { worn: 'HEAVY', shield: false } })).toBe(0);
  });

  it('мастер на все руки — половина мастерства к инициативе и навыкам', () => {
    const h = holder(['jack-of-all-trades'], { proficiencyBonus: 3 });
    expect(sumModifiers(h, 'initiative')).toBe(1);
    expect(sumModifiers(h, 'skill')).toBe(1);
  });

  it('хит за уровень: драконья стойкость и дварфийская выдержка', () => {
    expect(sumModifiers(holder(['draconic-resilience']), 'hpPerLevel')).toBe(1);
    const dwarf = holder([], { traits: new Set(['dwarven-toughness']) });
    expect(sumModifiers(dwarf, 'hpPerLevel')).toBe(1);
  });

  it('дополнительная атака — максимумом, не суммой', () => {
    expect(attacksPerActionOf(holder())).toBe(1);
    expect(attacksPerActionOf(holder(['extra-attack-1']))).toBe(2);
    for (const prefix of ['barbarian', 'monk', 'paladin', 'ranger']) {
      expect(attacksPerActionOf(holder([`${prefix}-extra-attack`]))).toBe(2);
    }
    expect(attacksPerActionOf(holder(['extra-attack-1', 'monk-extra-attack']))).toBe(2);
    expect(attacksPerActionOf(holder(['martial-arts']))).toBe(1);
  });

  it('улучшенный критический — 19', () => {
    expect(collectCrit(holder(['improved-critical'])).threshold).toBe(19);
    expect(collectCrit(holder()).threshold).toBe(20);
  });

  it('боевые искусства — правило', () => {
    expect(hasRule(holder(['martial-arts']), 'martialArts')).toBe(true);
  });
});

describe('черты', () => {
  it('сопротивления: яд, огонь, вид урона предка', () => {
    const traits = (codes: string[], ancestry: string | null = null) =>
      collectDefenses(holder([], { traits: new Set(codes), ancestryDamageType: ancestry }))
        .resistances;
    expect(traits(['dwarven-resilience'])).toEqual(['poison']);
    expect(traits(['hellish-resistance'])).toEqual(['fire']);
    expect(traits(['damage-resistance'], 'cold')).toEqual(['cold']);
    expect(traits(['damage-resistance'])).toEqual([]);
  });
});

describe('ярость', () => {
  const raging = (level = 1) => holder([], { level, effects: ['RAGE'] });
  const unarmored = { armor: bare };

  it('+урон по таблице рукопашной атакой Силой, не в тяжёлом доспехе', () => {
    expect(collectModifiers(raging(), 'damage', { ...unarmored, weapon: weapon() })).toEqual([
      { code: 'RAGE', value: 2, source: 'rage' },
    ]);
    expect(sumModifiers(raging(9), 'damage', { ...unarmored, weapon: weapon() })).toBe(3);
    expect(
      sumModifiers(raging(), 'damage', {
        ...unarmored,
        weapon: weapon({ rangeType: 'RANGED', ability: 'dexterity' }),
      }),
    ).toBe(0);
    expect(
      sumModifiers(raging(), 'damage', { ...unarmored, weapon: weapon({ ability: 'dexterity' }) }),
    ).toBe(0);
    expect(
      sumModifiers(raging(), 'damage', {
        armor: { worn: 'HEAVY', shield: false },
        weapon: weapon(),
      }),
    ).toBe(0);
  });

  it('сопротивление физическому урону и преимущество на спасброски и проверки Силы', () => {
    expect(collectDefenses(raging(), unarmored).resistances.sort()).toEqual([
      'bludgeoning',
      'piercing',
      'slashing',
    ]);
    expect(collectAdvantage(raging(), { kind: 'save', ability: 'strength' }, unarmored)).toBe(
      'ADVANTAGE',
    );
    expect(collectAdvantage(raging(), { kind: 'check', ability: 'strength' }, unarmored)).toBe(
      'ADVANTAGE',
    );
    expect(collectAdvantage(raging(), { kind: 'save', ability: 'dexterity' }, unarmored)).toBe(
      'NONE',
    );
    const plate = { armor: { worn: 'HEAVY' as const, shield: false } };
    expect(collectDefenses(raging(), plate).resistances).toEqual([]);
    expect(collectAdvantage(raging(), { kind: 'save', ability: 'strength' }, plate)).toBe('NONE');
  });
});

describe('кости при попадании', () => {
  it('кара: 2 на первом круге, +1 за круг, не больше 5; по нежити +1 сверх', () => {
    const h = holder(['divine-smite']);
    const [smite] = collectOnHit(h, { weapon: weapon() });
    expect(smite?.code).toBe('divine-smite');
    if (!smite) return;
    expect(smite.facet.cost).toBe('spellSlot');
    expect(onHitDiceCount(smite.facet, h, { slotLevel: 1 })).toBe(2);
    expect(onHitDiceCount(smite.facet, h, { slotLevel: 4 })).toBe(5);
    expect(onHitDiceCount(smite.facet, h, { slotLevel: 5 })).toBe(5);
    expect(onHitDiceCount(smite.facet, h, { slotLevel: 1, creatureType: 'Undead' })).toBe(3);
    expect(onHitDiceCount(smite.facet, h, { slotLevel: 5, creatureType: 'fiend' })).toBe(6);
    expect(collectOnHit(h, { weapon: weapon({ rangeType: 'RANGED' }) })).toEqual([]);
  });

  it('скрытая атака 5 уровня — 3к6; нужна фехтовальность или дальность и повод', () => {
    const h = holder(['sneak-attack'], { level: 5 });
    const rapier = weapon({ properties: ['FINESSE'] });
    const roll = (mode: 'NONE' | 'ADVANTAGE' | 'DISADVANTAGE', ally: boolean) => ({
      mode,
      allyAdjacentToTarget: ally,
    });
    const [sneak] = collectOnHit(h, { weapon: rapier, roll: roll('ADVANTAGE', false) });
    expect(sneak && onHitDiceCount(sneak.facet, h)).toBe(3);
    expect(collectOnHit(h, { weapon: rapier, roll: roll('NONE', true) })).toHaveLength(1);
    expect(collectOnHit(h, { weapon: rapier, roll: roll('NONE', false) })).toHaveLength(0);
    expect(collectOnHit(h, { weapon: rapier, roll: roll('DISADVANTAGE', true) })).toHaveLength(0);
    expect(collectOnHit(h, { weapon: weapon(), roll: roll('ADVANTAGE', true) })).toHaveLength(0);
  });
});

describe('доступные действия', () => {
  const economy = { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false };
  const list = (
    resources: { code: 'RAGE' | 'SECOND_WIND' | 'ACTION_SURGE'; max: number; used: number }[],
    patch: Partial<Parameters<typeof availableActions>[0]> = {},
  ) => availableActions({ holder: holder(), resources, economy, isTurn: true, ...patch });

  it('варвар: ярость бонусным действием с зарядами 2 из 2; на нуле — исчерпано', () => {
    expect(list([{ code: 'RAGE', max: 2, used: 0 }])).toEqual([
      {
        kind: 'ABILITY',
        ability: 'RAGE',
        featureCode: 'rage',
        economy: 'BONUS_ACTION',
        resource: { code: 'RAGE', left: 2, max: 2 },
        available: true,
        reason: null,
      },
    ]);
    expect(list([{ code: 'RAGE', max: 2, used: 2 }])[0]).toMatchObject({
      resource: { left: 0 },
      available: false,
      reason: 'RESOURCE_EXHAUSTED',
    });
  });

  it('в ярости — только снятие, даром', () => {
    const actions = list([{ code: 'RAGE', max: 2, used: 1 }], {
      holder: holder([], { effects: ['RAGE'] }),
    });
    expect(actions.map((a) => [a.ability, a.economy, a.resource, a.available])).toEqual([
      ['END_RAGE', 'FREE', null, true],
    ]);
  });

  it('потраченное бонусное действие — раньше исчерпанного ресурса; чужой ход — раньше всего', () => {
    const spent = list([{ code: 'RAGE', max: 2, used: 2 }], {
      economy: { ...economy, hasUsedBonusAction: true },
    });
    expect(spent[0]?.reason).toBe('BONUS_ACTION_ALREADY_USED');
    const notMine = list([{ code: 'RAGE', max: 2, used: 2 }], {
      economy: { ...economy, hasUsedBonusAction: true },
      isTurn: false,
    });
    expect(notMine[0]?.reason).toBe('NOT_YOUR_TURN');
  });

  it('воин 1 — второе дыхание; воин 2 — и всплеск действий, в порядке реестра', () => {
    expect(list([{ code: 'SECOND_WIND', max: 1, used: 0 }]).map((a) => a.ability)).toEqual([
      'SECOND_WIND',
    ]);
    const two = list([
      { code: 'ACTION_SURGE', max: 1, used: 0 },
      { code: 'SECOND_WIND', max: 1, used: 0 },
    ]);
    expect(two.map((a) => a.ability)).toEqual(['SECOND_WIND', 'ACTION_SURGE']);
    expect(two[1]).toMatchObject({ economy: 'FREE', featureCode: 'action-surge-1-use' });
  });

  it('волшебнику — пусто', () => {
    expect(list([])).toEqual([]);
  });
});
