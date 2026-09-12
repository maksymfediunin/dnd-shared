import { describe, it, expect } from 'vitest';
import {
  armorClass,
  initiative,
  maxHitPoints,
  passivePerception,
  savingThrow,
  skillBonus,
} from './character.js';

/** Профили из справочника: кольчуга, кожаная броня, кольчужная рубаха. */
const CHAIN_MAIL = { baseAc: 16, dexBonusCap: 0 };
const LEATHER = { baseAc: 11, dexBonusCap: null };
const CHAIN_SHIRT = { baseAc: 13, dexBonusCap: 2 };

describe('класс доспеха', () => {
  it('без брони — десять плюс Ловкость', () => {
    expect(armorClass({ dexterityModifier: 3 })).toBe(13);
    expect(armorClass({ dexterityModifier: -1 })).toBe(9);
  });

  it('щит добавляет два', () => {
    expect(armorClass({ dexterityModifier: 3, hasShield: true })).toBe(15);
    expect(armorClass({ armor: CHAIN_MAIL, dexterityModifier: 3, hasShield: true })).toBe(18);
  });

  it('тяжёлая броня не пускает Ловкость', () => {
    expect(armorClass({ armor: CHAIN_MAIL, dexterityModifier: 3 })).toBe(16);
    expect(armorClass({ armor: CHAIN_MAIL, dexterityModifier: -1 })).toBe(16);
  });

  it('лёгкая броня берёт Ловкость целиком', () => {
    expect(armorClass({ armor: LEATHER, dexterityModifier: 4 })).toBe(15);
  });

  it('средняя броня ограничивает Ловкость двойкой', () => {
    expect(armorClass({ armor: CHAIN_SHIRT, dexterityModifier: 4 })).toBe(15);
    expect(armorClass({ armor: CHAIN_SHIRT, dexterityModifier: 1 })).toBe(14);
  });

  it('отрицательная Ловкость вычитается и в броне с ограничением', () => {
    expect(armorClass({ armor: CHAIN_SHIRT, dexterityModifier: -1 })).toBe(12);
  });
});

describe('максимум хитов', () => {
  it('первый уровень — полная кость плюс Телосложение', () => {
    expect(maxHitPoints({ hitDie: 8, level: 1, constitutionModifier: 2 })).toBe(10);
  });

  it('дальше — среднее кости плюс Телосложение за уровень', () => {
    expect(maxHitPoints({ hitDie: 8, level: 5, constitutionModifier: 2 })).toBe(38);
    expect(maxHitPoints({ hitDie: 12, level: 5, constitutionModifier: 3 })).toBe(55);
    expect(maxHitPoints({ hitDie: 6, level: 1, constitutionModifier: 0 })).toBe(6);
  });

  it('уровень даёт не меньше одного хита при плохом Телосложении', () => {
    expect(maxHitPoints({ hitDie: 6, level: 2, constitutionModifier: -4 })).toBe(3);
  });
});

describe('спасброски и навыки', () => {
  it('владение спасброском добавляет бонус мастерства', () => {
    expect(savingThrow({ abilityModifier: 2, proficiencyBonus: 2, isProficient: false })).toBe(2);
    expect(savingThrow({ abilityModifier: 2, proficiencyBonus: 2, isProficient: true })).toBe(4);
  });

  it('навык без владения — только модификатор', () => {
    expect(skillBonus({ abilityModifier: 3, proficiencyBonus: 3, proficiency: null })).toBe(3);
  });

  it('владение навыком добавляет мастерство, экспертиза — удвоенное', () => {
    expect(skillBonus({ abilityModifier: 3, proficiencyBonus: 3, proficiency: 'PROFICIENT' })).toBe(6);
    expect(skillBonus({ abilityModifier: 3, proficiencyBonus: 3, proficiency: 'EXPERTISE' })).toBe(9);
  });
});

describe('пассивная Внимательность и инициатива', () => {
  it('пассивная Внимательность — десять плюс бонус навыка', () => {
    expect(passivePerception(4)).toBe(14);
    expect(passivePerception(-1)).toBe(9);
  });

  it('инициатива — модификатор Ловкости', () => {
    expect(initiative(3)).toBe(3);
    expect(initiative(-2)).toBe(-2);
  });
});
