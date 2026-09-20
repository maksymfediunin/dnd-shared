import { describe, expect, it } from 'vitest';
import { CONDITION_CODES, conditionCodeSchema, EXHAUSTION_MAX_LEVEL } from './conditions.js';

describe('коды состояний', () => {
  it('все пятнадцать состояний SRD на месте', () => {
    expect(CONDITION_CODES).toHaveLength(15);
    expect(CONDITION_CODES).toContain('prone');
    expect(CONDITION_CODES).toContain('exhaustion');
  });

  // Код совпадает с кодом справочника буква в букву: по нему фронт
  // идёт за названием в GET /reference/conditions/:code, и свой
  // регистр завёл бы у одной сущности два имени.
  it('коды нижним регистром, как в справочнике', () => {
    for (const code of CONDITION_CODES) expect(code).toBe(code.toLowerCase());
  });

  it('чужой код схема отвергает', () => {
    expect(conditionCodeSchema.safeParse('PRONE').success).toBe(false);
    expect(conditionCodeSchema.safeParse('sleepy').success).toBe(false);
  });

  it('истощение кончается шестым уровнем', () => {
    expect(EXHAUSTION_MAX_LEVEL).toBe(6);
  });
});
