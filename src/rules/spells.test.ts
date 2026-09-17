import { describe, expect, it } from 'vitest';
import { LEVELS } from './progression.js';
import {
  maxSpellLevel,
  spellAttackBonus,
  spellcastingAbility,
  spellSaveDc,
  spellsPrepared,
} from './spells.js';

describe('сложность спасброска и бонус атаки заклинанием', () => {
  it('сложность — восемь плюс мастерство плюс модификатор', () => {
    expect(spellSaveDc({ proficiencyBonus: 2, abilityModifier: 3 })).toBe(13);
    expect(spellSaveDc({ proficiencyBonus: 3, abilityModifier: 4 })).toBe(15);
  });

  it('бонус атаки — мастерство плюс модификатор', () => {
    expect(spellAttackBonus({ proficiencyBonus: 2, abilityModifier: 3 })).toBe(5);
    expect(spellAttackBonus({ proficiencyBonus: 3, abilityModifier: -1 })).toBe(2);
  });
});

describe('заклинательная характеристика', () => {
  it('у каждого заклинателя своя, у прочих её нет', () => {
    expect(spellcastingAbility('bard')).toBe('charisma');
    expect(spellcastingAbility('cleric')).toBe('wisdom');
    expect(spellcastingAbility('druid')).toBe('wisdom');
    expect(spellcastingAbility('paladin')).toBe('charisma');
    expect(spellcastingAbility('ranger')).toBe('wisdom');
    expect(spellcastingAbility('sorcerer')).toBe('charisma');
    expect(spellcastingAbility('warlock')).toBe('charisma');
    expect(spellcastingAbility('wizard')).toBe('intelligence');
    expect(spellcastingAbility('barbarian')).toBeNull();
    expect(spellcastingAbility('fighter')).toBeNull();
    expect(spellcastingAbility('monk')).toBeNull();
    expect(spellcastingAbility('rogue')).toBeNull();
  });
});

describe('доступный круг заклинаний', () => {
  it('полные заклинатели добираются до третьего круга к пятому уровню', () => {
    expect(LEVELS.map((level) => maxSpellLevel('wizard', level))).toEqual([1, 1, 2, 2, 3]);
    expect(LEVELS.map((level) => maxSpellLevel('bard', level))).toEqual([1, 1, 2, 2, 3]);
  });

  it('половинные начинают со второго уровня и доходят до второго круга', () => {
    expect(LEVELS.map((level) => maxSpellLevel('paladin', level))).toEqual([0, 1, 1, 1, 2]);
    expect(LEVELS.map((level) => maxSpellLevel('ranger', level))).toEqual([0, 1, 1, 1, 2]);
  });

  it('колдун берёт круг из договора', () => {
    expect(LEVELS.map((level) => maxSpellLevel('warlock', level))).toEqual([1, 1, 2, 2, 3]);
  });

  it('у не-заклинателей круга нет', () => {
    expect(LEVELS.map((level) => maxSpellLevel('fighter', level))).toEqual([0, 0, 0, 0, 0]);
    expect(LEVELS.map((level) => maxSpellLevel('rogue', level))).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('подготовка заклинаний', () => {
  it('жрец, друид и волшебник готовят модификатор плюс уровень', () => {
    expect(spellsPrepared({ classCode: 'cleric', level: 3, spellcastingModifier: 3 })).toBe(6);
    expect(spellsPrepared({ classCode: 'druid', level: 5, spellcastingModifier: 2 })).toBe(7);
    expect(spellsPrepared({ classCode: 'wizard', level: 1, spellcastingModifier: 3 })).toBe(4);
  });

  it('паладин готовит модификатор плюс половину уровня вниз', () => {
    expect(spellsPrepared({ classCode: 'paladin', level: 5, spellcastingModifier: 3 })).toBe(5);
    expect(spellsPrepared({ classCode: 'paladin', level: 2, spellcastingModifier: 2 })).toBe(3);
  });

  it('паладин первого уровня не заклинатель и не готовит ничего', () => {
    expect(spellsPrepared({ classCode: 'paladin', level: 1, spellcastingModifier: 3 })).toBe(0);
  });

  it('подготовить меньше одного заклинания нельзя', () => {
    expect(spellsPrepared({ classCode: 'cleric', level: 1, spellcastingModifier: -2 })).toBe(1);
  });

  it('классы со списком известных и не-заклинатели подготовки не знают', () => {
    expect(spellsPrepared({ classCode: 'bard', level: 5, spellcastingModifier: 3 })).toBeNull();
    expect(spellsPrepared({ classCode: 'sorcerer', level: 5, spellcastingModifier: 3 })).toBeNull();
    expect(spellsPrepared({ classCode: 'warlock', level: 5, spellcastingModifier: 3 })).toBeNull();
    expect(spellsPrepared({ classCode: 'ranger', level: 5, spellcastingModifier: 3 })).toBeNull();
    expect(spellsPrepared({ classCode: 'fighter', level: 5, spellcastingModifier: 0 })).toBeNull();
  });
});
