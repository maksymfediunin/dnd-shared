import { describe, expect, it } from 'vitest';
import { armorClass, initiative, maxHitPoints, skillBonus } from './character.js';
import { attackRoll, isMonkWeapon, largerDice, weaponAttackBonus } from './combat.js';

/**
 * Классовые и расовые умения, которые меняют числа листа и боя
 * (docs/2026-09-27-rules-audit-design.md, кусок B).
 */
describe('защита без доспехов', () => {
  const monk = { base: 10, abilityModifier: 2, allowsShield: false };
  const barbarian = { base: 10, abilityModifier: 3, allowsShield: true };

  it('монах: 10 + ЛВК + МДР, но не со щитом', () => {
    expect(armorClass({ dexterityModifier: 3, unarmoredDefense: monk })).toBe(15);
    expect(armorClass({ dexterityModifier: 3, hasShield: true, unarmoredDefense: monk })).toBe(15);
  });

  it('варвар: 10 + ЛВК + ТЕЛ, со щитом', () => {
    expect(armorClass({ dexterityModifier: 1, hasShield: true, unarmoredDefense: barbarian })).toBe(
      16,
    );
  });

  it('в доспехе формула класса не действует, а «Оборона» даёт +1', () => {
    const chain = { baseAc: 16, dexBonusCap: 0 };
    expect(armorClass({ armor: chain, dexterityModifier: 2, unarmoredDefense: barbarian })).toBe(
      16,
    );
    expect(armorClass({ armor: chain, dexterityModifier: 2, armoredBonus: 1 })).toBe(17);
    // Без доспеха «Оборона» не работает.
    expect(armorClass({ dexterityModifier: 2, armoredBonus: 1 })).toBe(12);
  });
});

describe('хиты, навыки, инициатива', () => {
  it('+1 хит за уровень у холмового дварфа и драконьего чародея', () => {
    expect(maxHitPoints({ hitDie: 6, level: 3, constitutionModifier: 1, bonusPerLevel: 1 })).toBe(
      maxHitPoints({ hitDie: 6, level: 3, constitutionModifier: 1 }) + 3,
    );
  });

  it('мастер на все руки — половина мастерства к навыку без владения', () => {
    expect(skillBonus({ abilityModifier: 1, proficiencyBonus: 3, halfProficiency: true })).toBe(2);
    // С владением половина не добавляется сверху.
    expect(
      skillBonus({
        abilityModifier: 1,
        proficiencyBonus: 3,
        proficiency: 'PROFICIENT',
        halfProficiency: true,
      }),
    ).toBe(4);
    expect(initiative(2, 1)).toBe(3);
  });
});

describe('атака', () => {
  const quarterstaff = {
    code: 'quarterstaff',
    category: 'SIMPLE' as const,
    rangeType: 'MELEE' as const,
    properties: [],
  };

  it('посох — оружие монаха, двуручная палица — нет', () => {
    expect(isMonkWeapon(quarterstaff)).toBe(true);
    expect(isMonkWeapon({ ...quarterstaff, code: 'greatclub', properties: ['TWO_HANDED'] })).toBe(
      false,
    );
    expect(
      isMonkWeapon({ code: 'shortsword', category: 'MARTIAL', rangeType: 'MELEE', properties: [] }),
    ).toBe(true);
  });

  it('оружие монаха бьёт от Ловкости, если она выше Силы', () => {
    const base = {
      properties: [],
      rangeType: 'MELEE' as const,
      strengthModifier: 0,
      dexterityModifier: 3,
      proficiencyBonus: 2,
      isProficient: true,
    };
    expect(weaponAttackBonus(base)).toBe(2);
    expect(weaponAttackBonus({ ...base, monkWeapon: true })).toBe(5);
  });

  it('кость боевых искусств заменяет кость оружия, только если больше', () => {
    expect(largerDice('1d6', '1d4')).toBe('1d6');
    expect(largerDice('1d4', '1d6')).toBe('1d6');
  });

  it('улучшенный критический — крит с 19', () => {
    const nineteen = () => 19;
    expect(attackRoll({ attackBonus: 0, advantageMode: 'NONE' }, nineteen).isCritical).toBe(false);
    expect(
      attackRoll({ attackBonus: 0, advantageMode: 'NONE', critThreshold: 19 }, nineteen).isCritical,
    ).toBe(true);
  });
});
