import { describe, expect, it } from 'vitest';
import { characterResources } from './resources.js';
import type { MechanicsHolder } from './types.js';

/** Ресурсы персонажа одним списком (план волны 3, §6). */
function holder(level: number, features: string[] = [], traits: string[] = []): MechanicsHolder {
  return {
    level,
    features: new Set(features),
    traits: new Set(traits),
    effects: [],
    proficiencyBonus: 2,
    ancestryDamageType: null,
  };
}

const codes = (rows: ReturnType<typeof characterResources>) =>
  rows.map((row) => [row.code, row.max, row.recovery]);

describe('ресурсы персонажа', () => {
  it('бес-колдун 6 — удача Тёмного на коротком отдыхе; колдун без исчадия — нет', () => {
    expect(
      codes(
        characterResources({
          classCode: 'warlock',
          level: 6,
          charismaModifier: 3,
          holder: holder(6, ['dark-ones-own-luck']),
        }),
      ),
    ).toEqual([['DARK_ONES_OWN_LUCK', 1, 'SHORT']]);
    expect(
      characterResources({
        classCode: 'warlock',
        level: 6,
        charismaModifier: 3,
        holder: holder(6),
      }),
    ).toEqual([]);
  });

  it('полуорк — неослабевающая стойкость; драконорождённый — дыхание на коротком', () => {
    const halfOrc = characterResources({
      classCode: 'fighter',
      level: 1,
      charismaModifier: 0,
      holder: holder(1, [], ['relentless-endurance']),
    });
    expect(codes(halfOrc)).toContainEqual(['RELENTLESS_ENDURANCE', 1, 'LONG']);
    const dragonborn = characterResources({
      classCode: 'wizard',
      level: 1,
      charismaModifier: 0,
      holder: holder(1, [], ['breath-weapon']),
    });
    expect(codes(dragonborn)).toContainEqual(['BREATH_WEAPON', 1, 'SHORT']);
  });

  it('монах открытой ладони 6 — ци и целостность тела', () => {
    expect(
      codes(
        characterResources({
          classCode: 'monk',
          level: 6,
          charismaModifier: 0,
          holder: holder(6, ['wholeness-of-body']),
        }),
      ),
    ).toEqual([
      ['KI', 6, 'SHORT'],
      ['WHOLENESS_OF_BODY', 1, 'LONG'],
    ]);
  });

  it('тифлинг 3 — адское возмездие; тифлинг 5 — и тьма', () => {
    const tiefling = (level: number) =>
      characterResources({
        classCode: 'rogue',
        level,
        charismaModifier: 0,
        holder: holder(level, [], ['infernal-legacy']),
      }).map((row) => row.code);
    expect(tiefling(2)).toEqual([]);
    expect(tiefling(3)).toEqual(['INFERNAL_REBUKE']);
    expect(tiefling(5)).toEqual(['INFERNAL_REBUKE', 'INFERNAL_DARKNESS']);
  });

  it('бард с Харизмой +3 — три вдохновения', () => {
    expect(
      codes(
        characterResources({ classCode: 'bard', level: 1, charismaModifier: 3, holder: holder(1) }),
      ),
    ).toEqual([['BARDIC_INSPIRATION', 3, 'LONG']]);
  });
});
