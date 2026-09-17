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

  it('код совпадает с именем: словарь перевода ищет ошибку по имени', () => {
    for (const [name, code] of Object.entries(ERROR_CODES)) {
      expect(code).toBe(name);
    }
  });
});
