import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from './codes.js';

describe('коды ошибок', () => {
  it('знает коды персонажей', () => {
    expect(ERROR_CODES.CHARACTER_NOT_FOUND).toBe('CHARACTER_NOT_FOUND');
    expect(ERROR_CODES.INVALID_ABILITY_SCORES).toBe('INVALID_ABILITY_SCORES');
    expect(ERROR_CODES.INVALID_CHOICE).toBe('INVALID_CHOICE');
    expect(ERROR_CODES.LEVEL_UP_NOT_AVAILABLE).toBe('LEVEL_UP_NOT_AVAILABLE');
    expect(ERROR_CODES.MAX_LEVEL_REACHED).toBe('MAX_LEVEL_REACHED');
  });

  it('знает коды заклинаний', () => {
    expect(ERROR_CODES.SPELL_NOT_PREPARED).toBe('SPELL_NOT_PREPARED');
    expect(ERROR_CODES.NO_SPELL_SLOT).toBe('NO_SPELL_SLOT');
    expect(ERROR_CODES.SPELL_SLOT_TOO_LOW).toBe('SPELL_SLOT_TOO_LOW');
    expect(ERROR_CODES.SPELL_OUT_OF_RANGE).toBe('SPELL_OUT_OF_RANGE');
    expect(ERROR_CODES.SPELL_NEEDS_TARGET).toBe('SPELL_NEEDS_TARGET');
    expect(ERROR_CODES.SPELL_NOT_IN_COMBAT).toBe('SPELL_NOT_IN_COMBAT');
  });

  it('код совпадает с именем: словарь перевода ищет ошибку по имени', () => {
    for (const [name, code] of Object.entries(ERROR_CODES)) {
      expect(code).toBe(name);
    }
  });
});
