import { describe, it, expect } from 'vitest';
import {
  abilityScoresSchema,
  characterCreateSchema,
  characterUpdateSchema,
  customArmorProfileSchema,
  customWeaponProfileSchema,
  levelUpSchema,
} from './character.js';

const VALID_ABILITIES = {
  strength: 8,
  dexterity: 13,
  constitution: 14,
  intelligence: 15,
  wisdom: 12,
  charisma: 10,
};

const VALID_CHARACTER = {
  name: 'Элария',
  raceCode: 'high-elf',
  classCode: 'wizard',
  backgroundCode: 'sage',
  gender: 'FEMALE',
  alignment: 'NEUTRAL_GOOD',
  abilities: VALID_ABILITIES,
  skillCodes: ['arcana', 'history'],
  languageCodes: ['common', 'elvish'],
  equipmentChoices: [{ choiceIndex: 0, optionIndex: 1 }],
  spellCodes: ['mage-hand', 'magic-missile'],
};

describe('abilityScoresSchema', () => {
  it('принимает шесть значений в границах покупки', () => {
    expect(abilityScoresSchema.parse(VALID_ABILITIES)).toEqual(VALID_ABILITIES);
  });

  it('отклоняет значение выше пятнадцати и ниже восьми', () => {
    expect(abilityScoresSchema.safeParse({ ...VALID_ABILITIES, strength: 16 }).success).toBe(false);
    expect(abilityScoresSchema.safeParse({ ...VALID_ABILITIES, strength: 7 }).success).toBe(false);
  });

  it('отклоняет дробное значение и пропущенную характеристику', () => {
    expect(abilityScoresSchema.safeParse({ ...VALID_ABILITIES, wisdom: 12.5 }).success).toBe(false);
    const { charisma: _charisma, ...withoutCharisma } = VALID_ABILITIES;
    expect(abilityScoresSchema.safeParse(withoutCharisma).success).toBe(false);
  });
});

describe('characterCreateSchema', () => {
  it('принимает корректного персонажа', () => {
    const parsed = characterCreateSchema.parse(VALID_CHARACTER);
    expect(parsed.name).toBe('Элария');
    expect(parsed.classCode).toBe('wizard');
    expect(parsed.abilities.intelligence).toBe(15);
  });

  it('обрезает пробелы в имени и отклоняет пустое', () => {
    expect(characterCreateSchema.parse({ ...VALID_CHARACTER, name: '  Бром  ' }).name).toBe('Бром');
    expect(characterCreateSchema.safeParse({ ...VALID_CHARACTER, name: '   ' }).success).toBe(false);
  });

  it('отклоняет характеристику 16', () => {
    const result = characterCreateSchema.safeParse({
      ...VALID_CHARACTER,
      abilities: { ...VALID_ABILITIES, intelligence: 16 },
    });
    expect(result.success).toBe(false);
  });

  it('принимает подкласс при создании и обходится без него', () => {
    expect(
      characterCreateSchema.safeParse({ ...VALID_CHARACTER, subclassCode: 'life-domain' }).success,
    ).toBe(true);
    expect(characterCreateSchema.parse(VALID_CHARACTER).subclassCode).toBeUndefined();
  });

  it('принимает выбранные прибавки полуэльфа и выборы внутри умений', () => {
    const result = characterCreateSchema.safeParse({
      ...VALID_CHARACTER,
      chosenAbilityBonuses: ['dexterity', 'constitution'],
      featureChoices: [{ featureCode: 'fighter-fighting-style', value: 'defense' }],
    });

    expect(result.success).toBe(true);
  });

  it('по умолчанию выборов нет, а не undefined', () => {
    const result = characterCreateSchema.safeParse(VALID_CHARACTER);

    expect(result.success && result.data.chosenAbilityBonuses).toEqual([]);
    expect(result.success && result.data.featureChoices).toEqual([]);
  });

  it('отклоняет выдуманную характеристику в прибавках', () => {
    expect(
      characterCreateSchema.safeParse({ ...VALID_CHARACTER, chosenAbilityBonuses: ['удача'] })
        .success,
    ).toBe(false);
  });

  it('отклоняет неизвестный пол и неизвестное мировоззрение', () => {
    expect(characterCreateSchema.safeParse({ ...VALID_CHARACTER, gender: 'ЖЕНЩИНА' }).success).toBe(
      false,
    );
    expect(characterCreateSchema.safeParse({ ...VALID_CHARACTER, alignment: 'GOOD' }).success).toBe(
      false,
    );
  });

  it('отклоняет неизвестный класс', () => {
    expect(characterCreateSchema.safeParse({ ...VALID_CHARACTER, classCode: 'ведьмак' }).success).toBe(
      false,
    );
  });

  it('подставляет пустые списки выборов', () => {
    const { skillCodes: _s, languageCodes: _l, equipmentChoices: _e, spellCodes: _p, ...bare } =
      VALID_CHARACTER;
    const parsed = characterCreateSchema.parse(bare);
    expect(parsed.skillCodes).toEqual([]);
    expect(parsed.languageCodes).toEqual([]);
    expect(parsed.equipmentChoices).toEqual([]);
    expect(parsed.spellCodes).toEqual([]);
  });

  it('не даёт задать уровень и владельца в обход сервера', () => {
    const result = characterCreateSchema.safeParse({ ...VALID_CHARACTER, level: 5, ownerId: 'чужой' });
    expect(result.success).toBe(false);
  });
});

describe('characterUpdateSchema', () => {
  it('принимает частичную правку', () => {
    const parsed = characterUpdateSchema.parse({ biography: 'Тайна', inspiration: true });
    expect(parsed.biography).toBe('Тайна');
    expect(parsed.inspiration).toBe(true);
  });

  it('принимает инвентарь со справочным и самодельным предметом', () => {
    const parsed = characterUpdateSchema.parse({
      items: [
        { itemCode: 'dagger', quantity: 2, isEquipped: false },
        {
          customName: 'Шпага деда',
          customWeaponProfile: {
            category: 'MARTIAL',
            rangeType: 'MELEE',
            damageDice: '1d8',
            damageType: 'piercing',
            properties: ['FINESSE'],
          },
          quantity: 1,
          isEquipped: true,
        },
      ],
    });
    expect(parsed.items).toHaveLength(2);
  });

  it('отклоняет предмет без справочного кода и без своего названия', () => {
    const result = characterUpdateSchema.safeParse({ items: [{ quantity: 1, isEquipped: false }] });
    expect(result.success).toBe(false);
  });

  it('не даёт править уровень и характеристики', () => {
    expect(characterUpdateSchema.safeParse({ level: 5 }).success).toBe(false);
    expect(characterUpdateSchema.safeParse({ abilities: VALID_ABILITIES }).success).toBe(false);
  });
});

describe('levelUpSchema', () => {
  it('принимает список выборов уровня', () => {
    const parsed = levelUpSchema.parse({
      choices: [
        { choiceType: 'SUBCLASS', choiceValue: 'school-of-evocation' },
        { choiceType: 'ABILITY_SCORE', choiceValue: 'intelligence' },
      ],
    });
    expect(parsed.choices).toHaveLength(2);
  });

  it('подставляет пустой список, если выборов нет', () => {
    expect(levelUpSchema.parse({}).choices).toEqual([]);
  });

  it('отклоняет неизвестный вид выбора', () => {
    expect(levelUpSchema.safeParse({ choices: [{ choiceType: 'ЧЕРТА', choiceValue: 'x' }] }).success).toBe(
      false,
    );
  });
});

describe('самодельные профили', () => {
  it('оружие описывается теми же полями, что и справочное', () => {
    const parsed = customWeaponProfileSchema.parse({
      category: 'SIMPLE',
      rangeType: 'RANGED',
      damageDice: '1d6',
      damageType: 'piercing',
      properties: ['AMMUNITION', 'TWO_HANDED'],
      normalRange: 80,
      longRange: 320,
    });
    expect(parsed.longRange).toBe(320);
  });

  it('доспех описывается теми же полями, что и справочный', () => {
    const parsed = customArmorProfileSchema.parse({
      category: 'MEDIUM',
      baseAc: 14,
      dexBonusCap: 2,
      stealthDisadvantage: true,
    });
    expect(parsed.baseAc).toBe(14);
    expect(parsed.dexBonusCap).toBe(2);
  });

  it('отклоняет неизвестную категорию и неверную кость урона', () => {
    expect(
      customWeaponProfileSchema.safeParse({
        category: 'EXOTIC',
        rangeType: 'MELEE',
        damageDice: '1d6',
        damageType: 'slashing',
      }).success,
    ).toBe(false);
    expect(
      customWeaponProfileSchema.safeParse({
        category: 'SIMPLE',
        rangeType: 'MELEE',
        damageDice: 'много',
        damageType: 'slashing',
      }).success,
    ).toBe(false);
  });
});
