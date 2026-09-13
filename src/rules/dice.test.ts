import { describe, it, expect, vi } from 'vitest';
import { diceNotation, rollDice, type RandomSource, type RollRequest } from './dice.js';

/**
 * Подставной источник — очередь заранее заданных значений. Настоящая
 * случайность недетерминирована, а тест «преимущество берёт большее»
 * на недетерминированном источнике был бы хуже отсутствующего теста.
 */
const queue = (...values: number[]): RandomSource => {
  let i = 0;
  return () => values[i++]!;
};

const baseRequest = (overrides: Partial<RollRequest> = {}): RollRequest => ({
  diceCount: 1,
  diceSides: 20,
  modifier: 0,
  advantageMode: 'NONE',
  ...overrides,
});

describe('diceNotation', () => {
  it('без модификатора хвоста нет', () => {
    expect(diceNotation(1, 20, 0)).toBe('1d20');
  });

  it('положительный модификатор идёт с плюсом', () => {
    expect(diceNotation(2, 6, 3)).toBe('2d6+3');
  });

  it('отрицательный модификатор идёт с минусом, а не с двойным знаком', () => {
    expect(diceNotation(1, 20, -1)).toBe('1d20-1');
  });
});

describe('rollDice без преимущества', () => {
  it('2d6+3 при выпавших 4 и 2 даёт results, total и notation', () => {
    const random = queue(4, 2);
    const outcome = rollDice(baseRequest({ diceCount: 2, diceSides: 6, modifier: 3 }), random);
    expect(outcome.results).toEqual([4, 2]);
    expect(outcome.total).toBe(9);
    expect(outcome.notation).toBe('2d6+3');
  });

  it('источник вызывается ровно diceCount раз', () => {
    const random = vi.fn(queue(4, 2, 1));
    rollDice(baseRequest({ diceCount: 3, diceSides: 6, modifier: 0 }), random);
    expect(random).toHaveBeenCalledTimes(3);
  });
});

describe('rollDice с преимуществом и помехой', () => {
  it('преимущество при выпавших 17 и 3 берёт большее, но не прячет отброшенное', () => {
    const random = queue(17, 3);
    const outcome = rollDice(baseRequest({ advantageMode: 'ADVANTAGE' }), random);
    expect(outcome.results).toEqual([17, 3]);
    expect(outcome.total).toBe(17);
  });

  it('помеха при тех же значениях берёт меньшее', () => {
    const random = queue(17, 3);
    const outcome = rollDice(baseRequest({ advantageMode: 'DISADVANTAGE' }), random);
    expect(outcome.results).toEqual([17, 3]);
    expect(outcome.total).toBe(3);
  });

  it('преимущество при равных значениях берёт это же значение', () => {
    const random = queue(11, 11);
    const outcome = rollDice(baseRequest({ advantageMode: 'ADVANTAGE' }), random);
    expect(outcome.total).toBe(11);
  });

  it('источник вызывается ровно два раза при преимуществе', () => {
    const random = vi.fn(queue(17, 3));
    rollDice(baseRequest({ advantageMode: 'ADVANTAGE' }), random);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('1d20 с преимуществом и модификатором +5 при 17 и 3 даёт total 22', () => {
    const random = queue(17, 3);
    const outcome = rollDice(baseRequest({ advantageMode: 'ADVANTAGE', modifier: 5 }), random);
    expect(outcome.total).toBe(22);
  });
});
