import { describe, expect, it } from 'vitest';
import { MONSTER_ACTION_OVERRIDES } from './mechanics/monster-actions.data.js';
import {
  legendaryCandidates,
  legendaryLeft,
  monsterActionMechanicSchema,
  multiattackDice,
  multiattackNext,
  rechargeReady,
  rolledCountOf,
  spentRecharges,
  usageSpent,
  usageState,
} from './monster-actions.js';

describe('multiattackNext', () => {
  const bear = [
    [
      { action: 'bite', count: 1 },
      { action: 'claws', count: 1 },
    ],
  ];

  it('бурый медведь: в начале — укус и когти, после укуса — только когти, после обоих — ничего', () => {
    expect(multiattackNext(bear, [])).toEqual(['bite', 'claws']);
    expect(multiattackNext(bear, ['bite'])).toEqual(['claws']);
    expect(multiattackNext(bear, ['bite', 'claws'])).toEqual([]);
  });

  it('счётчик шага: две атаки длинным мечом, третьей нет', () => {
    const veteran = [
      [
        { action: 'longsword', count: 2 },
        { action: 'shortsword', count: 1 },
      ],
    ];
    expect(multiattackNext(veteran, ['longsword'])).toEqual(['longsword', 'shortsword']);
    expect(multiattackNext(veteran, ['longsword', 'longsword'])).toEqual(['shortsword']);
  });

  it('альтернативы: начатая ближняя закрывает дальнюю', () => {
    const scout = [[{ action: 'shortsword', count: 2 }], [{ action: 'longbow', count: 2 }]];
    expect(multiattackNext(scout, [])).toEqual(['shortsword', 'longbow']);
    expect(multiattackNext(scout, ['shortsword'])).toEqual(['shortsword']);
  });

  it('рогатый дьявол: шаг разрешён, если какая-то альтернатива покрывает сделанное и его', () => {
    const horned = [
      [
        { action: 'fork', count: 2 },
        { action: 'tail', count: 1 },
      ],
      [
        { action: 'fork', count: 2 },
        { action: 'hurl', count: 1 },
      ],
      [
        { action: 'fork', count: 1 },
        { action: 'tail', count: 1 },
        { action: 'hurl', count: 1 },
      ],
    ];
    expect(multiattackNext(horned, ['fork'])).toEqual(['fork', 'tail', 'hurl']);
    expect(multiattackNext(horned, ['fork', 'hurl', 'tail'])).toEqual([]);
  });

  it('сделанное, которого нет ни в одной альтернативе, план закрывает', () => {
    expect(multiattackNext(bear, ['tail'])).toEqual([]);
  });
});

describe('monsterActionMechanicSchema', () => {
  it('принимает атаку с двумя видами урона и хватом двумя руками', () => {
    const azer = {
      kind: 'attack',
      attackType: 'MELEE_WEAPON',
      bonus: 5,
      reachFeet: 5,
      damage: [
        { dice: '1d8+3', type: 'bludgeoning' },
        { dice: '1d6', type: 'fire' },
      ],
      variants: [
        {
          when: 'twoHanded',
          damage: [
            { dice: '1d10+3', type: 'bludgeoning' },
            { dice: '1d6', type: 'fire' },
          ],
        },
      ],
    };
    expect(monsterActionMechanicSchema.parse(azer)).toEqual(azer);
  });

  it('ровный урон без кости — тоже часть урона', () => {
    expect(
      monsterActionMechanicSchema.safeParse({
        kind: 'attack',
        attackType: 'MELEE_WEAPON',
        bonus: 0,
        reachFeet: 5,
        damage: [{ dice: '1', type: 'piercing' }],
      }).success,
    ).toBe(true);
  });

  it('не принимает мультиатаку с пустой альтернативой и кость с пробелами', () => {
    expect(
      monsterActionMechanicSchema.safeParse({ kind: 'multiattack', options: [[]] }).success,
    ).toBe(false);
    expect(
      monsterActionMechanicSchema.safeParse({
        kind: 'attack',
        attackType: 'MELEE_WEAPON',
        bonus: 4,
        damage: [{ dice: '1d8 + 3', type: 'slashing' }],
      }).success,
    ).toBe(false);
  });

  it('каждая поправка таблицы проходит схему', () => {
    for (const [code, mechanic] of Object.entries(MONSTER_ACTION_OVERRIDES)) {
      expect(monsterActionMechanicSchema.safeParse(mechanic).success, code).toBe(true);
    }
  });
});

describe('мультиатака с условием и счётчиками (волна 7а)', () => {
  it('чуул: щупальца — только когда держит захват', () => {
    const chuul = [
      [{ action: 'pincer', count: 2 }],
      [
        { action: 'pincer', count: 2 },
        { action: 'tentacles', count: 1, when: 'grappling' as const },
      ],
    ];
    expect(multiattackNext(chuul, ['pincer', 'pincer'])).toEqual([]);
    expect(multiattackNext(chuul, ['pincer', 'pincer'], { grappling: true })).toEqual([
      'tentacles',
    ]);
  });

  it('гидра с четырьмя головами — четыре укуса', () => {
    const hydra = [[{ action: 'bite', count: { param: 'heads' as const } }]];
    expect(multiattackNext(hydra, ['bite', 'bite', 'bite'], { heads: 4 })).toEqual(['bite']);
    expect(multiattackNext(hydra, ['bite', 'bite', 'bite', 'bite'], { heads: 4 })).toEqual([]);
  });

  it('фиолетовый гриб: брошенное «1d4» лежит пометкой в сделанном', () => {
    const fungus = [[{ action: 'touch', count: { dice: '1d4' } }]];
    expect(multiattackDice(fungus)).toBe('1d4');
    expect(multiattackNext(fungus, [])).toEqual(['touch']);
    expect(multiattackNext(fungus, ['#2', 'touch'])).toEqual(['touch']);
    expect(multiattackNext(fungus, ['#2', 'touch', 'touch'])).toEqual([]);
    expect(rolledCountOf(['#2', 'touch'])).toBe(2);
  });
});

describe('перезарядка, «в день», легендарные', () => {
  it('перезарядка 5–6: к6 = 4 — нет, 5 — да', () => {
    expect(rechargeReady(5, 4)).toBe(false);
    expect(rechargeReady(5, 5)).toBe(true);
  });

  it('счётчики: нет ключа — полный; трата пишет ключ', () => {
    const breath = { kind: 'RECHARGE' as const, min: 5 };
    expect(usageState(breath, {}, 'acid').ready).toBe(true);
    expect(usageSpent(breath, {}, 'acid')).toEqual({ 'recharge:acid': true });
    expect(usageState(breath, { 'recharge:acid': true }, 'acid').ready).toBe(false);
    expect(spentRecharges({ 'recharge:acid': true, 'day:x': 1 })).toEqual(['acid']);
    const daily = { kind: 'PER_DAY' as const, times: 3 };
    expect(usageState(daily, {}, 'x')).toMatchObject({ left: 3, max: 3, ready: true });
    expect(usageSpent(daily, { 'day:x': 1 }, 'x')).toEqual({ 'day:x': 0 });
    expect(usageState(daily, { 'day:x': 0 }, 'x').ready).toBe(false);
    expect(legendaryLeft({})).toBe(3);
    expect(legendaryLeft({ legendary: 1 })).toBe(1);
  });

  it('кандидаты вставки: застигнутый, недееспособный, сам закончивший ход, пул 0 — нет', () => {
    const base = {
      legendary: true,
      left: 3,
      cheapest: 1,
      dead: false,
      incapacitated: false,
      surprised: false,
    };
    const members = [
      { ...base, id: 'ok' },
      { ...base, id: 'surprised', surprised: true },
      { ...base, id: 'stunned', incapacitated: true },
      { ...base, id: 'ended' },
      { ...base, id: 'empty', left: 0 },
      { ...base, id: 'cheap', left: 1, cheapest: 2 },
      { ...base, id: 'none', legendary: false },
    ];
    expect(legendaryCandidates(members, 'ended')).toEqual(['ok']);
  });
});

describe('схема механики волны 7а', () => {
  it('дыхание, взмах крыльев, наездники, ссылки и «Parry»', () => {
    const cases = [
      {
        kind: 'areaSave',
        area: { shape: 'LINE', sizeFeet: 60, widthFeet: 5 },
        save: { ability: 'dexterity', dc: 18, onSuccess: 'half' },
        damage: [{ dice: '12d8', type: 'acid' }],
      },
      {
        kind: 'attack',
        attackType: 'MELEE_WEAPON',
        bonus: 4,
        reachFeet: 5,
        damage: [{ dice: '2d4+2', type: 'piercing' }],
        riders: [
          {
            kind: 'save',
            save: { ability: 'strength', dc: 11, onSuccess: 'none' },
            onFail: [{ kind: 'condition', condition: 'prone' }],
          },
        ],
      },
      { kind: 'ref', action: 'adult-black-dragon-tail-action' },
      { kind: 'move', fraction: 0.5, noOpportunity: true },
      { kind: 'check', skill: 'perception' },
      { kind: 'parry', ac: 2 },
    ];
    for (const mechanic of cases) {
      expect(monsterActionMechanicSchema.safeParse(mechanic).success, mechanic.kind).toBe(true);
    }
  });
});
