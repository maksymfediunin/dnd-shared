import { describe, expect, it } from 'vitest';
import {
  SPELL_AREA_SHAPES,
  SPELL_ATTACK_TYPES,
  SPELL_SLOT_MAX_LEVEL,
  SPELL_SLOT_MIN_LEVEL,
  spellAreaShapeSchema,
  spellAttackTypeSchema,
  spellSlotLevelSchema,
} from './spells.js';

describe('вид атаки заклинанием', () => {
  it('ближняя и дальняя — больше в SRD ничего нет', () => {
    expect(SPELL_ATTACK_TYPES).toEqual(['MELEE', 'RANGED']);
    expect(spellAttackTypeSchema.safeParse('melee').success).toBe(false);
  });
});

describe('формы области', () => {
  it('все пять форм SRD на месте', () => {
    expect(SPELL_AREA_SHAPES).toEqual(['SPHERE', 'CUBE', 'CYLINDER', 'CONE', 'LINE']);
  });

  it('чужую форму схема отвергает', () => {
    expect(spellAreaShapeSchema.safeParse('WALL').success).toBe(false);
  });
});

describe('круг ячейки', () => {
  it('от первого до девятого', () => {
    expect(SPELL_SLOT_MIN_LEVEL).toBe(1);
    expect(SPELL_SLOT_MAX_LEVEL).toBe(9);
    expect(spellSlotLevelSchema.safeParse(1).success).toBe(true);
    expect(spellSlotLevelSchema.safeParse(9).success).toBe(true);
  });

  // Ноль — это кантрип, а кантрип ячеек не тратит: круга ноль не бывает.
  it('ноль и десятый круг отвергаются', () => {
    expect(spellSlotLevelSchema.safeParse(0).success).toBe(false);
    expect(spellSlotLevelSchema.safeParse(10).success).toBe(false);
  });
});
