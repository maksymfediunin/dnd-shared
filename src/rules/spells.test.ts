import { describe, expect, it } from 'vitest';
import { LEVELS } from './progression.js';
import {
  damageDiceFor,
  healDiceFor,
  maxSpellLevel,
  parseSpellDice,
  slotLevelsAvailable,
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

describe('кости урона заклинания', () => {
  // Формы ровно те, что приезжают из SRD: карта «строковый ключ →
  // запись броска».
  const fireball = {
    level: 3,
    damageAtSlotLevel: { '3': '8d6', '4': '9d6', '5': '10d6' },
  };
  const fireBolt = {
    level: 0,
    damageAtLevel: { '1': '1d10', '5': '2d10', '11': '3d10', '17': '4d10' },
  };

  it('заклинание с ячейкой берёт кости по кругу ячейки', () => {
    expect(damageDiceFor({ spell: fireball, slotLevel: 3 })).toBe('8d6');
    expect(damageDiceFor({ spell: fireball, slotLevel: 5 })).toBe('10d6');
  });

  // Ячейка выше последней ступени таблицы — ступень последняя и
  // остаётся: в SRD таблица обрывается, а ячейки девятого круга есть.
  it('круг выше таблицы берёт её последнюю ступень', () => {
    expect(damageDiceFor({ spell: fireball, slotLevel: 9 })).toBe('10d6');
  });

  it('без круга ячейки берётся круг самого заклинания', () => {
    expect(damageDiceFor({ spell: fireball })).toBe('8d6');
  });

  it('кантрип растёт уровнем персонажа, а не ячейкой', () => {
    expect(damageDiceFor({ spell: fireBolt, casterLevel: 1 })).toBe('1d10');
    expect(damageDiceFor({ spell: fireBolt, casterLevel: 4 })).toBe('1d10');
    expect(damageDiceFor({ spell: fireBolt, casterLevel: 5 })).toBe('2d10');
    expect(damageDiceFor({ spell: fireBolt, casterLevel: 20 })).toBe('4d10');
  });

  // Половина заклинаний кругов 0–3 машинных полей не несёт вовсе — это
  // штатный случай (§3 дизайна), а не сбой.
  it('заклинание без костей отдаёт null', () => {
    expect(damageDiceFor({ spell: { level: 2 }, slotLevel: 2 })).toBeNull();
    expect(damageDiceFor({ spell: { level: 0 }, casterLevel: 5 })).toBeNull();
    expect(damageDiceFor({ spell: fireBolt })).toBeNull();
  });
});

describe('круги ячеек персонажа', () => {
  it('полный заклинатель набирает круги по таблице', () => {
    expect(slotLevelsAvailable('wizard', 1)).toEqual([1]);
    expect(slotLevelsAvailable('wizard', 3)).toEqual([1, 2]);
    expect(slotLevelsAvailable('wizard', 5)).toEqual([1, 2, 3]);
  });

  it('половинный начинает со второго уровня', () => {
    expect(slotLevelsAvailable('paladin', 1)).toEqual([]);
    expect(slotLevelsAvailable('paladin', 2)).toEqual([1]);
    expect(slotLevelsAvailable('ranger', 5)).toEqual([1, 2]);
  });

  // У колдуна все ячейки одного круга: предложить ему круги ниже
  // значило бы показать в панели ячейки, которых у него нет.
  it('колдун имеет только свой круг договора', () => {
    expect(slotLevelsAvailable('warlock', 1)).toEqual([1]);
    expect(slotLevelsAvailable('warlock', 3)).toEqual([2]);
    expect(slotLevelsAvailable('warlock', 5)).toEqual([3]);
  });

  it('у не-заклинателя ячеек нет', () => {
    expect(slotLevelsAvailable('fighter', 5)).toEqual([]);
    expect(slotLevelsAvailable('rogue', 1)).toEqual([]);
  });
});

describe('кости лечения заклинания', () => {
  // Форма та же, что у урона, и «+ MOD» источника остаётся в записи:
  // модификатор заклинателя подставляет тот, кто бросает, — правило
  // выбирает ступень, а не считает бросок.
  const cureWounds = {
    level: 1,
    healAtSlotLevel: { '1': '1d8 + MOD', '2': '2d8 + MOD', '3': '3d8 + MOD' },
  };

  it('берёт кости по кругу потраченной ячейки', () => {
    expect(healDiceFor({ spell: cureWounds, slotLevel: 1 })).toBe('1d8 + MOD');
    expect(healDiceFor({ spell: cureWounds, slotLevel: 3 })).toBe('3d8 + MOD');
  });

  // Та же «ступень не выше круга», что и у урона: точный поиск оставил
  // бы без костей ячейку, которой в таблице нет.
  it('круг выше таблицы берёт её последнюю ступень', () => {
    expect(healDiceFor({ spell: cureWounds, slotLevel: 9 })).toBe('3d8 + MOD');
  });

  it('без круга ячейки берётся круг самого заклинания', () => {
    expect(healDiceFor({ spell: cureWounds })).toBe('1d8 + MOD');
  });

  it('заклинание без лечения отдаёт null', () => {
    expect(healDiceFor({ spell: { level: 3 }, slotLevel: 3 })).toBeNull();
  });
});

describe('запись броска SRD', () => {
  it('разбирает кости, прибавку числом и прибавку модификатором', () => {
    expect(parseSpellDice('8d6', 3)).toEqual({ dice: '8d6', modifier: 0 });
    expect(parseSpellDice('3d4 + 3', 3)).toEqual({ dice: '3d4', modifier: 3 });
    expect(parseSpellDice('1d8 + MOD', 4)).toEqual({ dice: '1d8', modifier: 4 });
  });

  // Голое число — не бросок вовсе: так в SRD записано лечение высоких
  // кругов («heal» поднимает семьдесят хитов без костей).
  it('голое число отдаёт прибавкой без костей', () => {
    expect(parseSpellDice('70', 3)).toEqual({ dice: null, modifier: 70 });
  });

  // Запись из двух наборов костей правилу не по зубам, и считать её
  // наугад хуже, чем не считать: сотворение пройдёт без машинного
  // урона, а эффект применит ведущий (§3 дизайна).
  it('незнакомую запись отдаёт пустой', () => {
    expect(parseSpellDice('2d8 + 4d6', 3)).toBeNull();
    expect(parseSpellDice('', 3)).toBeNull();
  });
});
