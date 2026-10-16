import { describe, expect, it } from 'vitest';
import { MONSTER_ACTION_OVERRIDES } from './mechanics/monster-actions.data.js';
import { monsterActionMechanicSchema, multiattackNext } from './monster-actions.js';

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
