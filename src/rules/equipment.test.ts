import { describe, expect, it } from 'vitest';
import { inEquipmentCategory, isKnownEquipmentCategory } from './equipment.js';

const quarterstaff = {
  code: 'quarterstaff',
  weapon: { category: 'SIMPLE', rangeType: 'MELEE' },
} as const;
const shortbow = { code: 'shortbow', weapon: { category: 'SIMPLE', rangeType: 'RANGED' } } as const;
const longsword = {
  code: 'longsword',
  weapon: { category: 'MARTIAL', rangeType: 'MELEE' },
} as const;
const lute = { code: 'lute', weapon: null };

describe('inEquipmentCategory', () => {
  it('оружие — по профилю: вид и дальность', () => {
    expect(inEquipmentCategory('simple-weapons', quarterstaff)).toBe(true);
    expect(inEquipmentCategory('simple-weapons', shortbow)).toBe(true);
    // «Простое рукопашное» паладина — лук сюда не входит.
    expect(inEquipmentCategory('simple-melee-weapons', shortbow)).toBe(false);
    expect(inEquipmentCategory('martial-melee-weapons', longsword)).toBe(true);
    expect(inEquipmentCategory('martial-weapons', quarterstaff)).toBe(false);
    expect(inEquipmentCategory('simple-weapons', lute)).toBe(false);
  });

  it('неоружие — по таблице SRD', () => {
    expect(inEquipmentCategory('musical-instruments', lute)).toBe(true);
    expect(inEquipmentCategory('holy-symbols', lute)).toBe(false);
    expect(inEquipmentCategory('arcane-foci', { code: 'staff', weapon: null })).toBe(true);
  });

  it('неизвестная категория пуста', () => {
    expect(isKnownEquipmentCategory('simple-weapons')).toBe(true);
    expect(isKnownEquipmentCategory('spaceships')).toBe(false);
    expect(inEquipmentCategory('spaceships', lute)).toBe(false);
  });
});
