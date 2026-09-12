import { describe, it, expect } from 'vitest';
import {
  ABILITY_CODES,
  POINT_BUY_BUDGET,
  abilityModifier,
  autoAssign,
  pointBuyCost,
  pointBuyTotal,
} from './abilities.js';

describe('abilityModifier', () => {
  it('считает модификатор по краям и в середине шкалы', () => {
    expect(abilityModifier(1)).toBe(-5);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(14)).toBe(2);
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(20)).toBe(5);
  });
});

describe('pointBuyCost', () => {
  it('знает цену каждого значения от 8 до 15', () => {
    expect(pointBuyCost(8)).toBe(0);
    expect(pointBuyCost(9)).toBe(1);
    expect(pointBuyCost(10)).toBe(2);
    expect(pointBuyCost(11)).toBe(3);
    expect(pointBuyCost(12)).toBe(4);
    expect(pointBuyCost(13)).toBe(5);
    expect(pointBuyCost(14)).toBe(7);
    expect(pointBuyCost(15)).toBe(9);
  });

  it('бросает за пределами покупки', () => {
    expect(() => pointBuyCost(7)).toThrow();
    expect(() => pointBuyCost(16)).toThrow();
  });
});

describe('pointBuyTotal', () => {
  it('бюджет покупки — 27 очков', () => {
    expect(POINT_BUY_BUDGET).toBe(27);
  });

  it('набор 15/14/13/12/10/8 стоит ровно бюджет', () => {
    expect(
      pointBuyTotal({
        strength: 8,
        dexterity: 13,
        constitution: 14,
        intelligence: 15,
        wisdom: 12,
        charisma: 10,
      }),
    ).toBe(27);
  });
});

describe('autoAssign', () => {
  it('кладёт лучшие значения в главные характеристики волшебника', () => {
    const scores = autoAssign('wizard');
    expect(scores.intelligence).toBe(15);
    expect(scores.constitution).toBe(14);
    expect(scores.dexterity).toBe(13);
  });

  it('тратит ровно бюджет любому из классов', () => {
    expect(pointBuyTotal(autoAssign('wizard'))).toBe(POINT_BUY_BUDGET);
    expect(pointBuyTotal(autoAssign('barbarian'))).toBe(POINT_BUY_BUDGET);
    expect(pointBuyTotal(autoAssign('bard'))).toBe(POINT_BUY_BUDGET);
  });

  it('ставит 15 в первую характеристику приоритета класса', () => {
    expect(autoAssign('barbarian').strength).toBe(15);
    expect(autoAssign('rogue').dexterity).toBe(15);
    expect(autoAssign('cleric').wisdom).toBe(15);
    expect(autoAssign('sorcerer').charisma).toBe(15);
  });

  it('раздаёт все шесть характеристик и ничего не повторяет лишнего', () => {
    const scores = autoAssign('monk');
    const values = ABILITY_CODES.map((code) => scores[code]).sort((a, b) => b - a);
    expect(values).toEqual([15, 14, 13, 12, 10, 8]);
  });
});
