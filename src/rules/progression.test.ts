import { describe, it, expect } from 'vitest';
import { CLASS_CODES, type ClassCode } from '../enums/character.js';
import {
  LEVELS,
  MAX_LEVEL,
  bardicInspirationDie,
  cantripsKnown,
  casterKind,
  classResources,
  hasAbilityScoreImprovement,
  hasExtraAttack,
  hitDie,
  invocationsKnown,
  martialArtsDie,
  pactMagic,
  proficiencyBonus,
  rageDamageBonus,
  sneakAttackDice,
  spellSlots,
  spellbookSize,
  spellsKnown,
  subclassUnlockLevel,
} from './progression.js';

/**
 * Ожидания набраны руками по таблицам плана и нарочно не выводятся
 * из кода движка: смысл этого файла — поймать опечатку в ячейке,
 * а сверка таблицы с самой собой этого не умеет.
 */
interface ClassExpectation {
  hitDie: number;
  caster: 'FULL' | 'HALF' | 'PACT' | 'NONE';
  subclassLevel: number;
  extraAttack: boolean;
  /** Ячейки по кругам для уровней 1–5. */
  slots: number[][];
  cantrips: number[];
  /** null — класс не держит список известных заклинаний. */
  known: number[] | null;
}

const FULL_SLOTS = [[2], [3], [4, 2], [4, 3], [4, 3, 2]];
const HALF_SLOTS = [[], [2], [3], [3], [4, 2]];
const NO_SLOTS = [[], [], [], [], []];

const EXPECTED: Record<ClassCode, ClassExpectation> = {
  barbarian: {
    hitDie: 12,
    caster: 'NONE',
    subclassLevel: 3,
    extraAttack: true,
    slots: NO_SLOTS,
    cantrips: [0, 0, 0, 0, 0],
    known: null,
  },
  bard: {
    hitDie: 8,
    caster: 'FULL',
    subclassLevel: 3,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [2, 2, 2, 3, 3],
    known: [4, 5, 6, 7, 8],
  },
  cleric: {
    hitDie: 8,
    caster: 'FULL',
    subclassLevel: 1,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [3, 3, 3, 4, 4],
    known: null,
  },
  druid: {
    hitDie: 8,
    caster: 'FULL',
    subclassLevel: 2,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [2, 2, 2, 3, 3],
    known: null,
  },
  fighter: {
    hitDie: 10,
    caster: 'NONE',
    subclassLevel: 3,
    extraAttack: true,
    slots: NO_SLOTS,
    cantrips: [0, 0, 0, 0, 0],
    known: null,
  },
  monk: {
    hitDie: 8,
    caster: 'NONE',
    subclassLevel: 3,
    extraAttack: true,
    slots: NO_SLOTS,
    cantrips: [0, 0, 0, 0, 0],
    known: null,
  },
  paladin: {
    hitDie: 10,
    caster: 'HALF',
    subclassLevel: 3,
    extraAttack: true,
    slots: HALF_SLOTS,
    cantrips: [0, 0, 0, 0, 0],
    known: null,
  },
  ranger: {
    hitDie: 10,
    caster: 'HALF',
    subclassLevel: 3,
    extraAttack: true,
    slots: HALF_SLOTS,
    cantrips: [0, 0, 0, 0, 0],
    known: [0, 2, 3, 3, 4],
  },
  rogue: {
    hitDie: 8,
    caster: 'NONE',
    subclassLevel: 3,
    extraAttack: false,
    slots: NO_SLOTS,
    cantrips: [0, 0, 0, 0, 0],
    known: null,
  },
  sorcerer: {
    hitDie: 6,
    caster: 'FULL',
    subclassLevel: 1,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [4, 4, 4, 5, 5],
    known: [2, 3, 4, 5, 6],
  },
  warlock: {
    hitDie: 8,
    caster: 'PACT',
    subclassLevel: 1,
    extraAttack: false,
    // Колдун считает ячейки договором, обычных у него нет.
    slots: NO_SLOTS,
    cantrips: [2, 2, 2, 3, 3],
    known: [2, 3, 4, 5, 6],
  },
  wizard: {
    hitDie: 6,
    caster: 'FULL',
    subclassLevel: 2,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [3, 3, 3, 4, 4],
    known: null,
  },
};

describe('бонус мастерства', () => {
  it('равен +2 на уровнях 1–4 и +3 на пятом', () => {
    expect([1, 2, 3, 4, 5].map(proficiencyBonus)).toEqual([2, 2, 2, 2, 3]);
  });

  it('бросает за пределами первых пяти уровней', () => {
    expect(() => proficiencyBonus(0)).toThrow();
    expect(() => proficiencyBonus(6)).toThrow();
  });

  it('знает, что дальше пятого уровня правил нет', () => {
    expect(MAX_LEVEL).toBe(5);
    expect(LEVELS).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('таблицы классов', () => {
  it('покрывает все двенадцать классов', () => {
    expect(CLASS_CODES).toHaveLength(12);
  });

  for (const classCode of CLASS_CODES) {
    const expected = EXPECTED[classCode];

    describe(classCode, () => {
      it('кость хитов и вид заклинателя', () => {
        expect(hitDie(classCode)).toBe(expected.hitDie);
        expect(casterKind(classCode)).toBe(expected.caster);
      });

      it('уровень открытия подкласса', () => {
        expect(subclassUnlockLevel(classCode)).toBe(expected.subclassLevel);
      });

      it('повышение характеристик — только на четвёртом уровне', () => {
        expect(LEVELS.map((level) => hasAbilityScoreImprovement(classCode, level))).toEqual([
          false,
          false,
          false,
          true,
          false,
        ]);
      });

      it('дополнительная атака — только на пятом и только у своих', () => {
        expect(LEVELS.map((level) => hasExtraAttack(classCode, level))).toEqual([
          false,
          false,
          false,
          false,
          expected.extraAttack,
        ]);
      });

      it('ячейки заклинаний на всех пяти уровнях', () => {
        expect(LEVELS.map((level) => spellSlots(classCode, level))).toEqual(expected.slots);
      });

      it('заговоров известно на всех пяти уровнях', () => {
        expect(LEVELS.map((level) => cantripsKnown(classCode, level))).toEqual(expected.cantrips);
      });

      it('заклинаний известно на всех пяти уровнях', () => {
        expect(LEVELS.map((level) => spellsKnown(classCode, level))).toEqual(
          expected.known ?? [null, null, null, null, null],
        );
      });
    });
  }
});

describe('договор колдуна', () => {
  it('даёт ячейки одного круга по таблице договора', () => {
    expect(LEVELS.map((level) => pactMagic('warlock', level))).toEqual([
      { slots: 1, spellLevel: 1 },
      { slots: 2, spellLevel: 1 },
      { slots: 2, spellLevel: 2 },
      { slots: 2, spellLevel: 2 },
      { slots: 2, spellLevel: 3 },
    ]);
  });

  it('у прочих классов договора нет', () => {
    expect(pactMagic('wizard', 5)).toBeNull();
    expect(pactMagic('fighter', 5)).toBeNull();
  });
});

describe('книга волшебника', () => {
  it('шесть заклинаний на первом уровне и по два за каждый следующий', () => {
    expect(LEVELS.map(spellbookSize)).toEqual([6, 8, 10, 12, 14]);
  });
});

describe('ресурсы классов', () => {
  it('ярость варвара и её урон', () => {
    expect(LEVELS.map((level) => classResources('barbarian', level))).toEqual([
      [{ code: 'RAGE', max: 2 }],
      [{ code: 'RAGE', max: 2 }],
      [{ code: 'RAGE', max: 3 }],
      [{ code: 'RAGE', max: 3 }],
      [{ code: 'RAGE', max: 3 }],
    ]);
    expect(LEVELS.map(rageDamageBonus)).toEqual([2, 2, 2, 2, 2]);
  });

  it('вдохновение барда считается от Харизмы и не меньше одного', () => {
    expect(classResources('bard', 1, { charismaModifier: 3 })).toEqual([
      { code: 'BARDIC_INSPIRATION', max: 3 },
    ]);
    expect(classResources('bard', 1, { charismaModifier: -1 })).toEqual([
      { code: 'BARDIC_INSPIRATION', max: 1 },
    ]);
    expect(LEVELS.map(bardicInspirationDie)).toEqual([6, 6, 6, 6, 8]);
  });

  it('божественный канал жреца появляется со второго уровня', () => {
    expect(LEVELS.map((level) => classResources('cleric', level))).toEqual([
      [],
      [{ code: 'CHANNEL_DIVINITY', max: 1 }],
      [{ code: 'CHANNEL_DIVINITY', max: 1 }],
      [{ code: 'CHANNEL_DIVINITY', max: 1 }],
      [{ code: 'CHANNEL_DIVINITY', max: 1 }],
    ]);
  });

  it('обличья зверя друида появляются со второго уровня', () => {
    expect(LEVELS.map((level) => classResources('druid', level))).toEqual([
      [],
      [{ code: 'WILD_SHAPE', max: 2 }],
      [{ code: 'WILD_SHAPE', max: 2 }],
      [{ code: 'WILD_SHAPE', max: 2 }],
      [{ code: 'WILD_SHAPE', max: 2 }],
    ]);
  });

  it('второе дыхание воина с первого уровня, всплеск действий со второго', () => {
    expect(LEVELS.map((level) => classResources('fighter', level))).toEqual([
      [{ code: 'SECOND_WIND', max: 1 }],
      [
        { code: 'SECOND_WIND', max: 1 },
        { code: 'ACTION_SURGE', max: 1 },
      ],
      [
        { code: 'SECOND_WIND', max: 1 },
        { code: 'ACTION_SURGE', max: 1 },
      ],
      [
        { code: 'SECOND_WIND', max: 1 },
        { code: 'ACTION_SURGE', max: 1 },
      ],
      [
        { code: 'SECOND_WIND', max: 1 },
        { code: 'ACTION_SURGE', max: 1 },
      ],
    ]);
  });

  it('очки ци монаха и кость боевых искусств', () => {
    expect(LEVELS.map((level) => classResources('monk', level))).toEqual([
      [],
      [{ code: 'KI', max: 2 }],
      [{ code: 'KI', max: 3 }],
      [{ code: 'KI', max: 4 }],
      [{ code: 'KI', max: 5 }],
    ]);
    expect(LEVELS.map(martialArtsDie)).toEqual([4, 4, 4, 4, 6]);
  });

  it('наложение рук паладина — пять хитов за уровень, канал с третьего', () => {
    expect(LEVELS.map((level) => classResources('paladin', level))).toEqual([
      [{ code: 'LAY_ON_HANDS', max: 5 }],
      [{ code: 'LAY_ON_HANDS', max: 10 }],
      [
        { code: 'LAY_ON_HANDS', max: 15 },
        { code: 'CHANNEL_DIVINITY', max: 1 },
      ],
      [
        { code: 'LAY_ON_HANDS', max: 20 },
        { code: 'CHANNEL_DIVINITY', max: 1 },
      ],
      [
        { code: 'LAY_ON_HANDS', max: 25 },
        { code: 'CHANNEL_DIVINITY', max: 1 },
      ],
    ]);
  });

  it('у следопыта и плута расходуемых ресурсов нет', () => {
    expect(LEVELS.map((level) => classResources('ranger', level))).toEqual([[], [], [], [], []]);
    expect(LEVELS.map((level) => classResources('rogue', level))).toEqual([[], [], [], [], []]);
  });

  it('кости скрытой атаки плута', () => {
    expect(LEVELS.map(sneakAttackDice)).toEqual([1, 1, 2, 2, 3]);
  });

  it('очки чародейства со второго уровня', () => {
    expect(LEVELS.map((level) => classResources('sorcerer', level))).toEqual([
      [],
      [{ code: 'SORCERY_POINT', max: 2 }],
      [{ code: 'SORCERY_POINT', max: 3 }],
      [{ code: 'SORCERY_POINT', max: 4 }],
      [{ code: 'SORCERY_POINT', max: 5 }],
    ]);
  });

  it('воззвания колдуна', () => {
    expect(LEVELS.map(invocationsKnown)).toEqual([0, 2, 2, 2, 3]);
    expect(LEVELS.map((level) => classResources('warlock', level))).toEqual([[], [], [], [], []]);
  });

  it('у волшебника расходуемых ресурсов нет', () => {
    expect(LEVELS.map((level) => classResources('wizard', level))).toEqual([[], [], [], [], []]);
  });
});
