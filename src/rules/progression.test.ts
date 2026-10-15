import { describe, expect, it } from 'vitest';
import { CLASS_CODES, type ClassCode } from '../enums/character.js';
import {
  bardicInspirationDie,
  cantripsKnown,
  casterKind,
  classResources,
  hasAbilityScoreImprovement,
  hasExtraAttack,
  hitDie,
  invocationsKnown,
  LEVELS,
  MAX_LEVEL,
  martialArtsDie,
  pactMagic,
  proficiencyBonus,
  rageDamageBonus,
  sneakAttackDice,
  spellbookSize,
  spellSlots,
  spellsKnown,
  subclassUnlockLevel,
  unarmoredMovementBonus,
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
  /** Ячейки по кругам для уровней 1–10. */
  slots: number[][];
  cantrips: number[];
  /** null — класс не держит список известных заклинаний. */
  known: number[] | null;
}

const FULL_SLOTS = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
];
const HALF_SLOTS = [[], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2]];
const NO_SLOTS = [[], [], [], [], [], [], [], [], [], []];
const NO_CANTRIPS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const EXPECTED: Record<ClassCode, ClassExpectation> = {
  barbarian: {
    hitDie: 12,
    caster: 'NONE',
    subclassLevel: 3,
    extraAttack: true,
    slots: NO_SLOTS,
    cantrips: NO_CANTRIPS,
    known: null,
  },
  bard: {
    hitDie: 8,
    caster: 'FULL',
    subclassLevel: 3,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
    known: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14],
  },
  cleric: {
    hitDie: 8,
    caster: 'FULL',
    subclassLevel: 1,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
    known: null,
  },
  druid: {
    hitDie: 8,
    caster: 'FULL',
    subclassLevel: 2,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
    known: null,
  },
  fighter: {
    hitDie: 10,
    caster: 'NONE',
    subclassLevel: 3,
    extraAttack: true,
    slots: NO_SLOTS,
    cantrips: NO_CANTRIPS,
    known: null,
  },
  monk: {
    hitDie: 8,
    caster: 'NONE',
    subclassLevel: 3,
    extraAttack: true,
    slots: NO_SLOTS,
    cantrips: NO_CANTRIPS,
    known: null,
  },
  paladin: {
    hitDie: 10,
    caster: 'HALF',
    subclassLevel: 3,
    extraAttack: true,
    slots: HALF_SLOTS,
    cantrips: NO_CANTRIPS,
    known: null,
  },
  ranger: {
    hitDie: 10,
    caster: 'HALF',
    subclassLevel: 3,
    extraAttack: true,
    slots: HALF_SLOTS,
    cantrips: NO_CANTRIPS,
    known: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6],
  },
  rogue: {
    hitDie: 8,
    caster: 'NONE',
    subclassLevel: 3,
    extraAttack: false,
    slots: NO_SLOTS,
    cantrips: NO_CANTRIPS,
    known: null,
  },
  sorcerer: {
    hitDie: 6,
    caster: 'FULL',
    subclassLevel: 1,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6],
    known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  warlock: {
    hitDie: 8,
    caster: 'PACT',
    subclassLevel: 1,
    extraAttack: false,
    // Колдун считает ячейки договором, обычных у него нет.
    slots: NO_SLOTS,
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
    known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10],
  },
  wizard: {
    hitDie: 6,
    caster: 'FULL',
    subclassLevel: 2,
    extraAttack: false,
    slots: FULL_SLOTS,
    cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
    known: null,
  },
};

describe('бонус мастерства', () => {
  it('равен +2 на уровнях 1–4 и +3 на пятом', () => {
    expect(LEVELS.map(proficiencyBonus)).toEqual([2, 2, 2, 2, 3, 3, 3, 3, 4, 4]);
  });

  it('бросает за пределами первых десяти уровней', () => {
    expect(() => proficiencyBonus(0)).toThrow();
    expect(() => proficiencyBonus(11)).toThrow();
  });

  it('знает, что дальше десятого уровня правил нет', () => {
    expect(MAX_LEVEL).toBe(10);
    expect(LEVELS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
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

      it('повышение характеристик — на 4 и 8, у воина ещё на 6, у плута на 10', () => {
        const extra = { fighter: 6, rogue: 10 }[classCode as string];
        expect(LEVELS.filter((level) => hasAbilityScoreImprovement(classCode, level))).toEqual(
          extra ? [4, extra, 8].sort((a, b) => a - b) : [4, 8],
        );
      });

      it('дополнительная атака — с пятого и только у своих', () => {
        expect(LEVELS.filter((level) => hasExtraAttack(classCode, level))).toEqual(
          expected.extraAttack ? [5, 6, 7, 8, 9, 10] : [],
        );
      });

      it('ячейки заклинаний на всех уровнях', () => {
        expect(LEVELS.map((level) => spellSlots(classCode, level))).toEqual(expected.slots);
      });

      it('заговоров известно на всех уровнях', () => {
        expect(LEVELS.map((level) => cantripsKnown(classCode, level))).toEqual(expected.cantrips);
      });

      it('заклинаний известно на всех уровнях', () => {
        expect(LEVELS.map((level) => spellsKnown(classCode, level))).toEqual(
          expected.known ?? LEVELS.map(() => null),
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
      { slots: 2, spellLevel: 3 },
      { slots: 2, spellLevel: 4 },
      { slots: 2, spellLevel: 4 },
      { slots: 2, spellLevel: 5 },
      { slots: 2, spellLevel: 5 },
    ]);
  });

  it('у прочих классов договора нет', () => {
    expect(pactMagic('wizard', 5)).toBeNull();
    expect(pactMagic('fighter', 5)).toBeNull();
  });
});

describe('книга волшебника', () => {
  it('шесть заклинаний на первом уровне и по два за каждый следующий', () => {
    expect(LEVELS.map(spellbookSize)).toEqual([6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
  });
});

/** Максимум одного ресурса по всем уровням; 0 — ресурса в листе нет. */
const resourceByLevel = (classCode: ClassCode, code: string): number[] =>
  LEVELS.map(
    (level) =>
      classResources(classCode, level).find((resource) => resource.code === code)?.max ?? 0,
  );

describe('ресурсы классов', () => {
  it('ярость варвара и её урон', () => {
    expect(resourceByLevel('barbarian', 'RAGE')).toEqual([2, 2, 3, 3, 3, 4, 4, 4, 4, 4]);
    expect(LEVELS.map(rageDamageBonus)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 3, 3]);
  });

  it('вдохновение барда считается от Харизмы и не меньше одного', () => {
    expect(classResources('bard', 1, { charismaModifier: 3 })).toEqual([
      { code: 'BARDIC_INSPIRATION', max: 3 },
    ]);
    expect(classResources('bard', 1, { charismaModifier: -1 })).toEqual([
      { code: 'BARDIC_INSPIRATION', max: 1 },
    ]);
    expect(LEVELS.map(bardicInspirationDie)).toEqual([6, 6, 6, 6, 8, 8, 8, 8, 8, 10]);
  });

  it('божественный канал жреца — со второго уровня, второй — с шестого', () => {
    expect(resourceByLevel('cleric', 'CHANNEL_DIVINITY')).toEqual([0, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
    expect(classResources('cleric', 1)).toEqual([]);
  });

  it('обличья зверя друида появляются со второго уровня', () => {
    expect(resourceByLevel('druid', 'WILD_SHAPE')).toEqual([0, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
  });

  it('второе дыхание воина с первого уровня, всплеск действий со второго', () => {
    expect(resourceByLevel('fighter', 'SECOND_WIND')).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(resourceByLevel('fighter', 'ACTION_SURGE')).toEqual([0, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(classResources('fighter', 1)).toEqual([{ code: 'SECOND_WIND', max: 1 }]);
  });

  it('очки ци монаха и кость боевых искусств', () => {
    expect(resourceByLevel('monk', 'KI')).toEqual([0, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(classResources('monk', 1)).toEqual([]);
    expect(LEVELS.map(martialArtsDie)).toEqual([4, 4, 4, 4, 6, 6, 6, 6, 6, 6]);
  });

  it('наложение рук паладина — пять хитов за уровень, канал с третьего', () => {
    expect(resourceByLevel('paladin', 'LAY_ON_HANDS')).toEqual(LEVELS.map((level) => 5 * level));
    expect(resourceByLevel('paladin', 'CHANNEL_DIVINITY')).toEqual([0, 0, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('у следопыта, плута, колдуна и волшебника расходуемых ресурсов нет', () => {
    for (const classCode of ['ranger', 'rogue', 'warlock', 'wizard'] as const) {
      expect(LEVELS.flatMap((level) => classResources(classCode, level))).toEqual([]);
    }
  });

  it('кости скрытой атаки плута', () => {
    expect(LEVELS.map(sneakAttackDice)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('очки чародейства со второго уровня', () => {
    expect(resourceByLevel('sorcerer', 'SORCERY_POINT')).toEqual([0, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(classResources('sorcerer', 1)).toEqual([]);
  });

  it('воззвания колдуна', () => {
    expect(LEVELS.map(invocationsKnown)).toEqual([0, 2, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('движение без доспехов монаха: +10 со второго, +15 с шестого, +20 с десятого', () => {
    expect(LEVELS.map(unarmoredMovementBonus)).toEqual([0, 10, 10, 10, 10, 15, 15, 15, 15, 20]);
  });
});
