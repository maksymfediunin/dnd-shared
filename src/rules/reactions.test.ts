import { describe, expect, it } from 'vitest';
import type { MechanicsHolder } from './mechanics/types.js';
import {
  adjustDamage,
  adjustRoll,
  type ReactionEvent,
  type ReactionMember,
  reactionResponders,
  rerollKeptOne,
  saveDamageAmount,
} from './reactions.js';

/** Числа — из разбора умений (план волны 4, S2). */

function holder(patch: Partial<MechanicsHolder> = {}): MechanicsHolder {
  return {
    level: 3,
    features: new Set(),
    traits: new Set(),
    effects: [],
    proficiencyBonus: 2,
    ancestryDamageType: null,
    ...patch,
  };
}

function member(id: string, x: number, patch: Partial<ReactionMember> = {}): ReactionMember {
  return {
    id,
    x,
    y: 0,
    size: 'MEDIUM',
    holder: holder(),
    resourcesLeft: {},
    hasUsedReaction: false,
    canReact: true,
    conscious: true,
    conditions: [],
    conditionImmunities: [],
    reactionSpells: [],
    ...patch,
  };
}

const always = () => true;
const respond = (members: ReactionMember[], e: Omit<ReactionEvent, 'cellSizeFeet'>) =>
  reactionResponders(members, { ...e, cellSizeFeet: 5 }, always, always);
const abilitiesOf = (members: ReactionMember[], e: Omit<ReactionEvent, 'cellSizeFeet'>) =>
  respond(members, e).flatMap((r) => r.options.map((o) => `${r.participantId}:${o.ability}`));

describe('урон после ответов', () => {
  it('уклонение 15 → 7, с сопротивлением дальше → 3', () => {
    const [part] = adjustDamage([{ amount: 15, type: 'bludgeoning' }], {
      subtract: [],
      halve: true,
    });
    expect(part?.amount).toBe(7);
    expect(Math.floor((part?.amount ?? 0) / 2)).toBe(3);
  });

  it('словцо 13 − 5 → 8, затем уклонение → 4', () => {
    expect(adjustDamage([{ amount: 13 }], { subtract: [5], halve: false })[0]?.amount).toBe(8);
    expect(adjustDamage([{ amount: 13 }], { subtract: [5], halve: true })[0]?.amount).toBe(4);
  });

  it('отражение 10 из 6 → 0; вычитание идёт с первой части на следующие', () => {
    expect(adjustDamage([{ amount: 6 }], { subtract: [10], halve: false })[0]?.amount).toBe(0);
    expect(
      adjustDamage([{ amount: 4 }, { amount: 7 }], { subtract: [6], halve: false }).map(
        (p) => p.amount,
      ),
    ).toEqual([0, 5]);
  });

  it('бросок: прибавки и вычитания', () => {
    expect(adjustRoll(14, [{ add: 4 }])).toBe(18);
    expect(adjustRoll(20, [{ subtract: 3 }])).toBe(17);
  });
});

describe('урон спасброска и уклонение', () => {
  it('28 с уклонением: успех 0, провал 14; без — 14 и 28', () => {
    expect(saveDamageAmount(28, true, true, true)).toBe(0);
    expect(saveDamageAmount(28, false, true, true)).toBe(14);
    expect(saveDamageAmount(28, true, true, false)).toBe(14);
    expect(saveDamageAmount(28, false, true, false)).toBe(28);
  });

  it('без половины на успехе уклонение не меняет ничего', () => {
    expect(saveDamageAmount(10, true, false, true)).toBe(0);
    expect(saveDamageAmount(10, false, false, true)).toBe(10);
  });
});

describe('«Везучий»', () => {
  const nine = () => 9;
  it('единица без режима — переброс', () => {
    expect(rerollKeptOne([1], 'NONE', nine)).toEqual({ results: [9], rerolled: 1 });
  });
  it('[1, 12] с преимуществом — в итог идёт 12, переброса нет', () => {
    expect(rerollKeptOne([1, 12], 'ADVANTAGE', nine)).toEqual({ results: [1, 12], rerolled: null });
  });
  it('[1, 15] с помехой — единица перебрасывается', () => {
    expect(rerollKeptOne([1, 15], 'DISADVANTAGE', nine)).toEqual({
      results: [9, 15],
      rerolled: 1,
    });
  });
});

describe('кто вправе ответить', () => {
  const protector = (patch: Partial<ReactionMember> = {}) =>
    member('fighter', 1, {
      holder: holder({ features: new Set(['fighter-fighting-style-protection']) }),
      armor: { worn: 'HEAVY', shield: true },
      ...patch,
    });
  const wizard = member('wizard', 0);
  const goblin = member('goblin', -1, { size: 'SMALL', side: 'HOSTILE' });
  const declared = { event: 'attackDeclared', actorId: 'goblin', subjectIds: ['wizard'] } as const;

  it('«Оборона»: со щитом в пяти футах — есть; без щита — нет; реакция потрачена — нет', () => {
    expect(abilitiesOf([protector(), wizard, goblin], declared)).toEqual(['fighter:PROTECTION']);
    expect(
      abilitiesOf(
        [protector({ armor: { worn: 'HEAVY', shield: false } }), wizard, goblin],
        declared,
      ),
    ).toEqual([]);
    expect(abilitiesOf([protector({ hasUsedReaction: true }), wizard, goblin], declared)).toEqual(
      [],
    );
    expect(abilitiesOf([protector({ x: 3 }), wizard, goblin], declared)).toEqual([]);
  });

  // Помеха и вычитание — оружие против врага: союзнику «Оборона» и словцо
  // только мешали бы (решение 30 плана волны 4).
  it('«Оборона» и словцо — только против врага', () => {
    const friend = member('goblin', -1, { side: 'PARTY' });
    expect(abilitiesOf([protector(), wizard, friend], declared)).toEqual([]);
    const ally = member('ogre', 0);
    expect(abilitiesOf([bard(13), ally, member('fighter', 1)], rolled)).toEqual([]);
  });

  it('«Оборона» не прикрывает самого носителя', () => {
    expect(abilitiesOf([protector(), goblin], { ...declared, subjectIds: ['fighter'] })).toEqual(
      [],
    );
  });

  const bard = (x: number, patch: Partial<ReactionMember> = {}) =>
    member('bard', x, {
      holder: holder({ features: new Set(['cutting-words']) }),
      resourcesLeft: { BARDIC_INSPIRATION: 2 },
      ...patch,
    });
  const ogre = member('ogre', 0, { size: 'LARGE', side: 'HOSTILE' });
  const rolled = {
    event: 'attackRolled',
    actorId: 'ogre',
    subjectIds: ['fighter'],
    natural: 14,
  } as const;

  it('словцо: в 60 футах — есть, в 65 — нет, без вдохновения — нет', () => {
    const fighter = member('fighter', 1);
    expect(abilitiesOf([bard(13), ogre, fighter], rolled)).toEqual(['bard:CUTTING_WORDS']);
    expect(abilitiesOf([bard(14), ogre, fighter], rolled)).toEqual([]);
    expect(
      abilitiesOf([bard(13, { resourcesLeft: { BARDIC_INSPIRATION: 0 } }), ogre, fighter], rolled),
    ).toEqual([]);
  });

  it('словцо: бард не видит бросающего — нет', () => {
    const blind = reactionResponders(
      [bard(2), ogre, member('fighter', 1)],
      { ...rolled, cellSizeFeet: 5 },
      (viewer) => viewer !== 'bard',
      always,
    );
    expect(blind).toEqual([]);
  });

  it('натуральные 1 и 20 фазы броска не открывают', () => {
    const fighter = member('fighter', 1);
    expect(abilitiesOf([bard(2), ogre, fighter], { ...rolled, natural: 20 })).toEqual([]);
    expect(abilitiesOf([bard(2), ogre, fighter], { ...rolled, natural: 1 })).toEqual([]);
  });

  it('натуральная 19 при крите с 19 (чемпион) — тоже крит: фазы броска нет', () => {
    const fighter = member('fighter', 1);
    const champion = { ...rolled, natural: 19, critThreshold: 19 };
    expect(abilitiesOf([bard(2), ogre, fighter], champion)).toEqual([]);
    expect(abilitiesOf([bard(2), ogre, fighter], { ...rolled, natural: 19 })).toEqual([
      'bard:CUTTING_WORDS',
    ]);
  });

  const ranger = (patch: Partial<ReactionMember> = {}) =>
    member('ranger', 1, {
      holder: holder({ features: new Set(['hunters-prey-giant-killer']) }),
      ...patch,
    });
  const resolved = { event: 'attackResolved', actorId: 'ogre', subjectIds: ['ranger'] } as const;

  it('убийца великанов: огр — есть, гоблин — нет, удар не по следопыту — нет, на нуле — нет', () => {
    expect(abilitiesOf([ranger(), ogre], resolved)).toEqual(['ranger:GIANT_KILLER']);
    expect(abilitiesOf([ranger(), member('ogre', 0, { size: 'SMALL' })], resolved)).toEqual([]);
    expect(
      abilitiesOf([ranger(), ogre, member('fighter', -1)], {
        ...resolved,
        subjectIds: ['fighter'],
      }),
    ).toEqual([]);
    expect(abilitiesOf([ranger({ canReact: false, conscious: false }), ogre], resolved)).toEqual(
      [],
    );
  });

  const halfOrc = member('orc', 0, {
    holder: holder({ traits: new Set(['relentless-endurance']) }),
    resourcesLeft: { RELENTLESS_ENDURANCE: 1 },
  });

  it('стойкость: 12 при 8 из 30 — есть, 45 при 8 — нет, ресурса нет — нет', () => {
    const zero = (killedOutright: boolean) =>
      ({
        event: 'reducedToZero',
        actorId: 'ogre',
        subjectIds: ['orc'],
        zeroed: { orc: { killedOutright } },
      }) as const;
    expect(abilitiesOf([halfOrc, ogre], zero(false))).toEqual(['orc:RELENTLESS_ENDURANCE']);
    expect(abilitiesOf([halfOrc, ogre], zero(true))).toEqual([]);
    expect(
      abilitiesOf([{ ...halfOrc, resourcesLeft: { RELENTLESS_ENDURANCE: 0 } }, ogre], zero(false)),
    ).toEqual([]);
  });

  it('атака при отходе: из досягаемости вывел шаг — есть; отходил с «Отходом» — нет', () => {
    const fighter = member('fighter', 1);
    const leaves = {
      event: 'leavesReach',
      actorId: 'goblin',
      subjectIds: [],
      opportunityReactorIds: ['fighter'],
    } as const;
    expect(abilitiesOf([fighter, goblin], leaves)).toEqual(['fighter:OPPORTUNITY_ATTACK']);
    const disengaged = { ...goblin, holder: holder({ effects: ['DISENGAGED'] }) };
    expect(abilitiesOf([fighter, disengaged], leaves)).toEqual([]);
  });

  it('кость вдохновения — своя, к своему броску', () => {
    const inspired = member('fighter', 1, {
      holder: holder({ effects: ['INSPIRED'] }),
    });
    expect(
      abilitiesOf([inspired, goblin], { ...rolled, actorId: 'fighter', subjectIds: ['goblin'] }),
    ).toEqual(['fighter:INSPIRATION_DIE']);
    expect(
      abilitiesOf([inspired, goblin], { ...rolled, actorId: 'goblin', subjectIds: ['fighter'] }),
    ).toEqual([]);
  });
});

describe('«Parry» (волна 7а)', () => {
  const knight = member('knight', 1, {
    monster: { legendaryResistanceLeft: 0, legendaryLeft: 0, legendaryCheapest: null, parryAc: 2 },
  });
  const hit = (attack: ReactionEvent['attack']) =>
    abilitiesOf([member('caster', 0), knight], {
      event: 'attackHit',
      actorId: 'caster',
      subjectIds: ['knight'],
      ...(attack ? { attack } : {}),
    });

  // SRD: «one melee attack that would hit it» — любой рукопашной, заклинанием тоже.
  it('рукопашная атака заклинанием — есть; дальняя — нет', () => {
    const melee = { range: 'MELEE', weapon: false, spell: true, isOpportunity: false } as const;
    expect(hit(melee)).toContain('knight:PARRY');
    expect(hit({ ...melee, range: 'RANGED' })).not.toContain('knight:PARRY');
  });
});
