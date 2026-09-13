import { describe, it, expect } from 'vitest';
import { diceRollInputSchema } from './dice.js';

const baseRoll = { diceCount: 2, diceSides: 6, modifier: 3 };

describe('схема броска кубов', () => {
  it('принимает обычный бросок', () => {
    expect(diceRollInputSchema.safeParse(baseRoll).success).toBe(true);
  });

  it('отвергает несуществующую грань кости', () => {
    expect(diceRollInputSchema.safeParse({ ...baseRoll, diceSides: 7 }).success).toBe(false);
  });

  it('отвергает число костей вне диапазона 1–20', () => {
    expect(diceRollInputSchema.safeParse({ ...baseRoll, diceCount: 0 }).success).toBe(false);
    expect(diceRollInputSchema.safeParse({ ...baseRoll, diceCount: 21 }).success).toBe(false);
  });

  it('отвергает поправку вне диапазона ±20', () => {
    expect(diceRollInputSchema.safeParse({ ...baseRoll, modifier: 21 }).success).toBe(false);
    expect(diceRollInputSchema.safeParse({ ...baseRoll, modifier: -21 }).success).toBe(false);
  });

  it('принимает преимущество на одном d20', () => {
    const result = diceRollInputSchema.safeParse({
      diceCount: 1,
      diceSides: 20,
      advantageMode: 'ADVANTAGE',
    });
    expect(result.success).toBe(true);
  });

  it('отвергает преимущество вне одного d20: у 2d6 и у 1d12 такого правила нет', () => {
    expect(
      diceRollInputSchema.safeParse({ diceCount: 2, diceSides: 6, advantageMode: 'ADVANTAGE' })
        .success,
    ).toBe(false);
    expect(
      diceRollInputSchema.safeParse({ diceCount: 1, diceSides: 12, advantageMode: 'ADVANTAGE' })
        .success,
    ).toBe(false);
  });

  it('по умолчанию бросок публичный, без преимущества и без спасброска', () => {
    const parsed = diceRollInputSchema.parse({ diceCount: 1, diceSides: 20 });
    expect(parsed.advantageMode).toBe('NONE');
    expect(parsed.visibility).toBe('PUBLIC');
    expect(parsed.isSavingThrow).toBe(false);
    expect(parsed.modifier).toBe(0);
  });

  it('принимает полное имя характеристики и отвергает сокращения', () => {
    expect(diceRollInputSchema.safeParse({ ...baseRoll, abilityCode: 'dexterity' }).success).toBe(
      true,
    );
    expect(diceRollInputSchema.safeParse({ ...baseRoll, abilityCode: 'dex' }).success).toBe(false);
    expect(diceRollInputSchema.safeParse({ ...baseRoll, abilityCode: 'DEX' }).success).toBe(false);
  });
});
