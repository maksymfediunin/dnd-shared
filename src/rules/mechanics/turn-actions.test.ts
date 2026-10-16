import { describe, expect, it } from 'vitest';
import type { AvailableActionsInput, TurnState } from './compute.js';
import { turnActions } from './turn-actions.js';
import type { MechanicsHolder } from './types.js';

/** Список действий хода (план волны 3, B4). */
function holder(features: string[], patch: Partial<MechanicsHolder> = {}): MechanicsHolder {
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

const fresh: TurnState = {
  cannotAct: false,
  surprised: false,
  grappled: false,
  attackActionTaken: false,
  attacksLeft: 1,
  attackedThisTurn: false,
  flurryStrikesLeft: 0,
  hordeBreakerUsed: false,
  hasLastWeaponAttack: false,
  round: 1,
};
const economy = { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false };

function list(
  h: MechanicsHolder,
  patch: Partial<AvailableActionsInput> = {},
  state: Partial<TurnState> = {},
) {
  return turnActions({
    holder: h,
    resources: [],
    economy,
    isTurn: true,
    ...patch,
    state: { ...fresh, ...state },
  });
}

const kinds = (actions: ReturnType<typeof list>, kind: string) =>
  actions.filter((a) => a.kind === kind);

describe('базовые действия', () => {
  it('у воина 11 видов; высвобождение — только схваченному', () => {
    const basic = kinds(list(holder([])), 'BASIC');
    expect(basic.map((a) => a.kind === 'BASIC' && a.ability)).toEqual([
      'DASH',
      'DISENGAGE',
      'DODGE',
      'HELP',
      'HIDE',
      'READY',
      'SEARCH',
      'USE_AN_OBJECT',
      'GRAPPLE',
      'SHOVE',
    ]);
    const grappled = kinds(list(holder([]), {}, { grappled: true }), 'BASIC');
    expect(grappled).toHaveLength(11);
    expect(grappled.at(-1)).toMatchObject({ ability: 'ESCAPE', economy: 'ACTION' });
    expect(grappled.find((a) => a.kind === 'BASIC' && a.ability === 'GRAPPLE')).toMatchObject({
      economy: 'ATTACK',
    });
  });

  it('оцепеневшему — PARTICIPANT_CANNOT_ACT у действий, бонусных и реакций', () => {
    const actions = list(
      holder(['rage']),
      { resources: [{ code: 'RAGE', max: 2, used: 0 }] },
      {
        cannotAct: true,
      },
    );
    const dash = actions.find((a) => a.kind === 'BASIC' && a.ability === 'DASH');
    expect(dash?.reason).toBe('PARTICIPANT_CANNOT_ACT');
    const rage = actions.find((a) => a.kind === 'ABILITY' && a.ability === 'RAGE');
    expect(rage?.reason).toBe('PARTICIPANT_CANNOT_ACT');
  });

  it('застигнутый врасплох: пусто; варвар 7 со звериными инстинктами — только ярость', () => {
    expect(list(holder([]), {}, { surprised: true })).toEqual([]);
    const barbarian = list(
      holder(['rage', 'feral-instinct'], { level: 7 }),
      { resources: [{ code: 'RAGE', max: 4, used: 0 }] },
      { surprised: true },
    );
    expect(barbarian.map((a) => a.kind === 'ABILITY' && a.ability)).toEqual(['RAGE']);
    expect(barbarian[0]?.available).toBe(true);
  });

  it('плут 2: рывок, отход и засада ещё и бонусом; вор 3 — и предмет', () => {
    const bonus = (features: string[]) =>
      kinds(list(holder(features)), 'BASIC')
        .filter((a) => a.economy === 'BONUS_ACTION')
        .map((a) => a.kind === 'BASIC' && [a.ability, a.featureCode]);
    expect(bonus(['cunning-action'])).toEqual([
      ['DASH', 'cunning-action'],
      ['DISENGAGE', 'cunning-action'],
      ['HIDE', 'cunning-action'],
    ]);
    expect(bonus(['cunning-action', 'fast-hands']).at(-1)).toEqual(['USE_AN_OBJECT', 'fast-hands']);
  });
});

describe('умения', () => {
  const ki = (used: number) => ({ resources: [{ code: 'KI' as const, max: 2, used }] });

  it('монах 2: шквал до «Атаки» — ATTACK_ACTION_REQUIRED, после — доступен, без ци — исчерпан', () => {
    const flurry = (state: Partial<TurnState>, used = 0) =>
      list(holder(['flurry-of-blows']), ki(used), state).find(
        (a) => a.kind === 'ABILITY' && a.ability === 'FLURRY_OF_BLOWS',
      );
    expect(flurry({})).toMatchObject({ available: false, reason: 'ATTACK_ACTION_REQUIRED' });
    expect(flurry({ attackActionTaken: true })).toMatchObject({ available: true });
    expect(flurry({ attackActionTaken: true }, 2)).toMatchObject({ reason: 'RESOURCE_EXHAUSTED' });
  });

  it('жрец 2: изгнание и сохранение жизни на одном канале; без кода умения — без кнопки', () => {
    const cleric = (features: string[], used: number) =>
      kinds(
        list(holder(features), {
          resources: [{ code: 'CHANNEL_DIVINITY', max: 1, used }],
        }),
        'ABILITY',
      ).map((a) => a.kind === 'ABILITY' && [a.ability, a.available]);
    expect(cleric(['channel-divinity-turn-undead', 'channel-divinity-preserve-life'], 0)).toEqual([
      ['TURN_UNDEAD', true],
      ['PRESERVE_LIFE', true],
    ]);
    expect(cleric(['channel-divinity-turn-undead', 'channel-divinity-preserve-life'], 1)).toEqual([
      ['TURN_UNDEAD', false],
      ['PRESERVE_LIFE', false],
    ]);
    expect(cleric(['channel-divinity-turn-undead'], 0)).toEqual([['TURN_UNDEAD', true]]);
  });

  it('паладин 3: священное оружие и изгнание нечестивых', () => {
    const paladin = kinds(
      list(holder(['channel-divinity-sacred-weapon', 'channel-divinity-turn-the-unholy']), {
        resources: [{ code: 'CHANNEL_DIVINITY', max: 1, used: 0 }],
      }),
      'ABILITY',
    );
    expect(paladin.map((a) => a.kind === 'ABILITY' && a.ability)).toEqual([
      'TURN_THE_UNHOLY',
      'SACRED_WEAPON',
    ]);
  });

  it('берсерк: у ярости вариант «бешенство»', () => {
    const rage = list(holder(['rage', 'frenzy']), {
      resources: [{ code: 'RAGE', max: 3, used: 0 }],
    }).find((a) => a.kind === 'ABILITY' && a.ability === 'RAGE');
    expect(rage?.kind === 'ABILITY' && rage.input?.options).toEqual(['FRENZY']);
  });
});

describe('пути атаки', () => {
  const paths = (actions: ReturnType<typeof list>) =>
    kinds(actions, 'ATTACK').map((a) => a.kind === 'ATTACK' && [a.via, a.available, a.left]);

  it('воин 5: «Атака» на 2; бонусная — после «Атаки»', () => {
    expect(paths(list(holder([]), {}, { attacksLeft: 2 }))).toEqual([
      ['ACTION', true, 2],
      ['BONUS', false, null],
    ]);
    expect(
      paths(
        list(holder([]), {}, { attacksLeft: 1, attackActionTaken: true, attackedThisTurn: true }),
      ),
    ).toEqual([
      ['ACTION', true, 1],
      ['BONUS', true, null],
    ]);
  });

  it('бешенство: в раунде входа нет, в следующем — есть', () => {
    const berserk = (round: number) =>
      paths(
        list(
          holder(['frenzy'], { effects: ['RAGE', 'FRENZY'], effectData: { FRENZY: { round: 2 } } }),
          {},
          { round },
        ),
      ).map((row) => row && row[0]);
    expect(berserk(2)).not.toContain('FRENZY');
    expect(berserk(3)).toContain('FRENZY');
  });

  it('сокрушитель орды: после атаки оружием и до использования', () => {
    const horde = (state: Partial<TurnState>) =>
      paths(list(holder(['hunters-prey-horde-breaker']), {}, state)).some(
        (row) => row && row[0] === 'HORDE_BREAKER',
      );
    expect(horde({})).toBe(false);
    expect(horde({ hasLastWeaponAttack: true })).toBe(true);
    expect(horde({ hasLastWeaponAttack: true, hordeBreakerUsed: true })).toBe(false);
  });

  it('безрассудство — только на первой атаке хода', () => {
    const flags = (attacked: boolean) =>
      kinds(list(holder(['reckless-attack']), {}, { attackedThisTurn: attacked }), 'ATTACK')[0];
    expect(flags(false)).toMatchObject({ flags: ['RECKLESS'] });
    expect(flags(true)).toMatchObject({ flags: [] });
  });

  it('удары шквала — даром, без оружия, пока остались', () => {
    const flurry = kinds(
      list(
        holder([]),
        { economy: { ...economy, hasUsedBonusAction: true, hasUsedAction: true } },
        {
          flurryStrikesLeft: 2,
          attacksLeft: 0,
        },
      ),
      'ATTACK',
    ).find((a) => a.kind === 'ATTACK' && a.via === 'FLURRY');
    expect(flurry).toMatchObject({ available: true, left: 2, weaponIds: ['unarmed'] });
  });
});

describe('доплата к сотворению', () => {
  it('чародей 3 с двумя метамагиями; возвышенное при 2 очках — исчерпано', () => {
    const options = kinds(
      list(holder(['metamagic-quickened-spell', 'metamagic-heightened-spell']), {
        resources: [{ code: 'SORCERY_POINT', max: 3, used: 1 }],
      }),
      'CAST_OPTION',
    );
    expect(options.map((a) => a.kind === 'CAST_OPTION' && [a.option, a.cost, a.reason])).toEqual([
      ['QUICKENED', 2, null],
      ['HEIGHTENED', 3, 'RESOURCE_EXHAUSTED'],
    ]);
  });
});

describe('упавший', () => {
  it('и доплата к сотворению недоступна с причиной PARTICIPANT_IS_DOWN', () => {
    const options = list(
      holder(['metamagic-quickened-spell']),
      { isDown: true, resources: [{ code: 'SORCERY_POINT', max: 3, used: 0 }] },
      {},
    ).filter((a) => a.kind === 'CAST_OPTION');
    expect(options.map((a) => a.reason)).toEqual(['PARTICIPANT_IS_DOWN']);
  });
});
