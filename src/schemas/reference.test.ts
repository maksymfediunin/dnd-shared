import { describe, expect, it } from 'vitest';
import { REFERENCE_ENTITIES, referenceListQuerySchema, spellFilterSchema } from './reference.js';

describe('схемы справочника', () => {
  it('подставляет страницу и размер по умолчанию', () => {
    expect(referenceListQuerySchema.parse({})).toMatchObject({ page: 1, perPage: 20 });
  });

  it('принимает поиск и язык', () => {
    const parsed = referenceListQuerySchema.parse({ q: 'меч', locale: 'ru' });
    expect(parsed.q).toBe('меч');
    expect(parsed.locale).toBe('ru');
  });

  it('приводит уровень заклинания к числу и отвергает выход за 0–9', () => {
    expect(spellFilterSchema.parse({ level: '3' }).level).toBe(3);
    expect(() => spellFilterSchema.parse({ level: '10' })).toThrow();
  });

  it('знает пятнадцать сущностей', () => {
    expect(REFERENCE_ENTITIES).toHaveLength(16);
  });
});
