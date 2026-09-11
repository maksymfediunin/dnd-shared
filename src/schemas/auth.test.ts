import { describe, it, expect } from 'vitest';
import { passwordSchema, registerSchema } from './auth.js';

describe('passwordSchema', () => {
  it('отклоняет пароль короче 10 символов', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
  });

  it('отклоняет пароль длиннее 200 символов', () => {
    expect(passwordSchema.safeParse('a'.repeat(201)).success).toBe(false);
  });

  it('принимает пароль нормальной длины', () => {
    expect(passwordSchema.safeParse('correct horse battery').success).toBe(true);
  });
});

describe('registerSchema', () => {
  it('приводит почту к нижнему регистру и обрезает пробелы', () => {
    const parsed = registerSchema.parse({
      email: '  Maks@Example.COM ',
      password: 'correct horse battery',
      displayName: 'Макс',
      locale: 'ru',
    });
    expect(parsed.email).toBe('maks@example.com');
  });

  it('отклоняет неизвестный язык', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'correct horse battery',
      displayName: 'Макс',
      locale: 'de',
    });
    expect(result.success).toBe(false);
  });
});
