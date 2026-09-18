import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  attackOutcome,
  attackRoll,
  damageRoll,
  deathSave,
  initiativeOrder,
  movementCost,
  reachInCells,
  weaponAttackBonus,
} from './combat.js';

/** Кости, выпадающие по написанному: удобнее любого мока случайности. */
function scripted(values: number[]) {
  let i = 0;
  return () => values[i++] ?? 1;
}

describe('initiativeOrder', () => {
  it('ставит вперёд большую инициативу', () => {
    const order = initiativeOrder([
      { id: 'a', initiative: 12, dexterityModifier: 1 },
      { id: 'b', initiative: 18, dexterityModifier: 0 },
    ]);

    expect(order.map((p) => p.id)).toEqual(['b', 'a']);
  });

  // Равные числа разводит ловкость — правило PHB.
  it('при равной инициативе вперёд идёт ловкач', () => {
    const order = initiativeOrder([
      { id: 'a', initiative: 15, dexterityModifier: 1 },
      { id: 'b', initiative: 15, dexterityModifier: 4 },
    ]);

    expect(order.map((p) => p.id)).toEqual(['b', 'a']);
  });

  // Иначе очередь переставлялась бы от запроса к запросу, и игрок не
  // понимал бы, почему он то третий, то четвёртый.
  it('при равных числе и ловкости порядок устойчив', () => {
    const input = [
      { id: 'b', initiative: 15, dexterityModifier: 2 },
      { id: 'a', initiative: 15, dexterityModifier: 2 },
    ];

    expect(initiativeOrder(input).map((p) => p.id)).toEqual(['a', 'b']);
    expect(initiativeOrder([...input].reverse()).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('attackRoll', () => {
  it('складывает бросок с бонусом атаки', () => {
    const roll = attackRoll({ attackBonus: 5, advantageMode: 'NONE' }, scripted([12]));

    expect(roll).toMatchObject({ total: 17, isCritical: false, isCriticalMiss: false });
    expect(roll.notation).toBe('1d20+5');
  });

  it('двадцатка — критическое попадание', () => {
    expect(attackRoll({ attackBonus: 3, advantageMode: 'NONE' }, scripted([20])).isCritical).toBe(
      true,
    );
  });

  it('единица — промах, сколько бы ни было бонуса', () => {
    const roll = attackRoll({ attackBonus: 11, advantageMode: 'NONE' }, scripted([1]));

    expect(roll.isCriticalMiss).toBe(true);
    expect(attackOutcome({ ...roll, targetArmorClass: 5 })).toBe('MISS');
  });

  it('преимущество берёт большее из двух и показывает оба', () => {
    const roll = attackRoll({ attackBonus: 0, advantageMode: 'ADVANTAGE' }, scripted([4, 17]));

    expect(roll.results).toEqual([4, 17]);
    expect(roll.total).toBe(17);
  });
});

describe('attackOutcome', () => {
  it('равный КД итог — попадание', () => {
    expect(
      attackOutcome({ total: 15, isCritical: false, isCriticalMiss: false, targetArmorClass: 15 }),
    ).toBe('HIT');
  });

  it('двадцатка попадает по любому КД', () => {
    expect(
      attackOutcome({ total: 21, isCritical: true, isCriticalMiss: false, targetArmorClass: 30 }),
    ).toBe('HIT');
  });
});

describe('damageRoll', () => {
  it('складывает кости с модификатором', () => {
    const roll = damageRoll({ dice: '1d8', modifier: 3, isCritical: false }, scripted([5]));

    expect(roll.amount).toBe(8);
    expect(roll.results).toEqual([5]);
  });

  // PHB: критическое попадание удваивает кости, но не модификатор.
  it('крит удваивает кости и не трогает модификатор', () => {
    const roll = damageRoll({ dice: '1d8', modifier: 3, isCritical: true }, scripted([5, 6]));

    expect(roll.results).toEqual([5, 6]);
    expect(roll.amount).toBe(14);
  });

  it('разбирает кость вида 2d6', () => {
    const roll = damageRoll({ dice: '2d6', modifier: 0, isCritical: false }, scripted([3, 4]));

    expect(roll.amount).toBe(7);
  });
});

describe('applyDamage', () => {
  it('списывает сначала временные хиты', () => {
    expect(applyDamage({ current: 10, temporary: 4, amount: 6 })).toEqual({
      current: 8,
      temporary: 0,
      temporaryAbsorbed: 4,
    });
  });

  it('не уводит текущие хиты ниже нуля', () => {
    expect(applyDamage({ current: 3, temporary: 0, amount: 11 })).toEqual({
      current: 0,
      temporary: 0,
      temporaryAbsorbed: 0,
    });
  });
});

describe('deathSave', () => {
  it('десять и выше — успех', () => {
    expect(deathSave({ roll: 10, successes: 0, failures: 0 })).toMatchObject({
      outcome: 'SUCCESS',
      successes: 1,
      failures: 0,
    });
  });

  it('третий успех делает стабильным', () => {
    expect(deathSave({ roll: 12, successes: 2, failures: 0 })).toMatchObject({
      outcome: 'STABLE',
      successes: 3,
    });
  });

  it('единица даёт два провала', () => {
    expect(deathSave({ roll: 1, successes: 0, failures: 0 })).toMatchObject({
      outcome: 'FAILURE',
      failures: 2,
    });
  });

  it('третий провал — смерть', () => {
    expect(deathSave({ roll: 4, successes: 0, failures: 2 })).toMatchObject({
      outcome: 'DEAD',
      failures: 3,
    });
  });

  it('двадцатка поднимает с одним хитом', () => {
    expect(deathSave({ roll: 20, successes: 1, failures: 2 })).toMatchObject({
      outcome: 'REVIVED',
      successes: 0,
      failures: 0,
      hitPoints: 1,
    });
  });
});

describe('movementCost', () => {
  // Базовое правило 5e: диагональ стоит столько же, сколько прямая.
  it('диагональ стоит как прямая', () => {
    expect(movementCost({ x: 0, y: 0 }, { x: 3, y: 3 }, 5)).toBe(15);
    expect(movementCost({ x: 0, y: 0 }, { x: 3, y: 0 }, 5)).toBe(15);
  });

  it('шаг на месте бесплатен', () => {
    expect(movementCost({ x: 2, y: 2 }, { x: 2, y: 2 }, 5)).toBe(0);
  });

  it('считает по размеру клетки сцены', () => {
    expect(movementCost({ x: 0, y: 0 }, { x: 2, y: 0 }, 10)).toBe(20);
  });
});

describe('weaponAttackBonus', () => {
  it('силовое оружие бьёт от силы', () => {
    expect(
      weaponAttackBonus({
        properties: [],
        rangeType: 'MELEE',
        strengthModifier: 3,
        dexterityModifier: 1,
        proficiencyBonus: 2,
        isProficient: true,
      }),
    ).toBe(5);
  });

  // Фехтовальное оружие бьёт по большему из двух — правило PHB, и
  // игроку не приходится выбирать самому.
  it('фехтовальное берёт больший модификатор', () => {
    expect(
      weaponAttackBonus({
        properties: ['FINESSE'],
        rangeType: 'MELEE',
        strengthModifier: 1,
        dexterityModifier: 4,
        proficiencyBonus: 2,
        isProficient: true,
      }),
    ).toBe(6);
  });

  it('дальнобойное бьёт от ловкости', () => {
    expect(
      weaponAttackBonus({
        properties: [],
        rangeType: 'RANGED',
        strengthModifier: 4,
        dexterityModifier: 2,
        proficiencyBonus: 3,
        isProficient: true,
      }),
    ).toBe(5);
  });

  it('без владения бонус мастерства не добавляется', () => {
    expect(
      weaponAttackBonus({
        properties: [],
        rangeType: 'MELEE',
        strengthModifier: 3,
        dexterityModifier: 0,
        proficiencyBonus: 2,
        isProficient: false,
      }),
    ).toBe(3);
  });
});

describe('reachInCells', () => {
  it('обычный ближний бой — соседняя клетка', () => {
    expect(reachInCells({ reachFeet: 5, cellSizeFeet: 5 })).toBe(1);
  });

  it('длинное оружие достаёт через клетку', () => {
    expect(reachInCells({ reachFeet: 10, cellSizeFeet: 5 })).toBe(2);
  });

  // Дробное округляется вниз: достать «на полторы клетки» нельзя.
  it('дробную досягаемость округляет вниз, но не до нуля', () => {
    expect(reachInCells({ reachFeet: 5, cellSizeFeet: 10 })).toBe(1);
  });
});
