import { describe, expect, it } from 'vitest';
import { type SpellResolutionFields, spellDamagePlan, spellResolution } from './spell-effect.js';

/**
 * Заклинания настоящие, полями из `dnd-api/srd/en/spells.json` в том
 * виде, в каком их раскладывает `spell.mapper.ts`. Синтетический объект
 * «спасбросок → да» эту проверку проходил и тогда, когда признак врал
 * про половину справочника: расхождение видно только на именах, у
 * которых поля сложены по-живому — спасбросок без костей, кости без
 * атаки. Таблицы урезаны до двух нижних ступеней — выбор ступени
 * проверяет `spells.test.ts`.
 */
function spell(overrides: Partial<SpellResolutionFields>): SpellResolutionFields {
  return {
    level: 1,
    attackType: null,
    saveAbility: null,
    damageType: null,
    damageAtSlotLevel: null,
    damageAtLevel: null,
    healAtSlotLevel: null,
    ...overrides,
  };
}

const FIREBALL = spell({
  level: 3,
  saveAbility: 'dex',
  damageType: 'fire',
  damageAtSlotLevel: { '3': '8d6', '4': '9d6' },
});

const MAGIC_MISSILE = spell({
  level: 1,
  damageType: 'force',
  damageAtSlotLevel: { '1': '3d4 + 3', '2': '4d4 + 4' },
});

const HOLD_PERSON = spell({ level: 2, saveAbility: 'wis' });

const CURE_WOUNDS = spell({ level: 1, healAtSlotLevel: { '1': '1d8 + MOD', '2': '2d8 + MOD' } });

const BLESS = spell({ level: 1 });

const FIRE_BOLT = spell({
  level: 0,
  attackType: 'RANGED',
  damageType: 'fire',
  damageAtLevel: { '1': '1d10', '5': '2d10' },
});

describe('spellResolution', () => {
  it('«Огненный шар» — спасбросок с уроном', () => {
    expect(spellResolution(FIREBALL, { slotLevel: 3 })).toBe('SAVE');
  });

  it('«Огненный снаряд» — атака: у кантрипа она не ждёт ячейки', () => {
    expect(spellResolution(FIRE_BOLT, { casterLevel: 1 })).toBe('ATTACK');
  });

  it('«Лечение ран» — лечение', () => {
    expect(spellResolution(CURE_WOUNDS, { slotLevel: 1 })).toBe('HEAL');
  });

  // Кости и вид урона есть, разбираются, но бросать их некому: ни
  // атаки, ни спасброска. Раньше это уходило в NONE, и «Волшебная
  // стрела» — одно из самых частых заклинаний низких кругов — в бою не
  // считалась вовсе.
  it('«Волшебная стрела» — урон без броска: попадание не проверяется', () => {
    expect(spellDamagePlan(MAGIC_MISSILE, { slotLevel: 1 }).kind).toBe('DAMAGE');
    expect(spellResolution(MAGIC_MISSILE, { slotLevel: 1 })).toBe('AUTO_DAMAGE');
  });

  // Зеркальный случай: спасбросок есть, а урона по нему нет. Бросок
  // система катит и пишет, а что именно накладывается на провале —
  // справочник не знает: поля состояния в SRD нет, только текст
  // описания. Поэтому эффект остаётся за ведущим.
  it('«Удержание личности» — только спасбросок, без эффекта', () => {
    expect(spellResolution(HOLD_PERSON, { slotLevel: 2 })).toBe('SAVE_ONLY');
  });

  it('«Благословение» — ничего: машинных полей нет вовсе', () => {
    expect(spellResolution(BLESS, { slotLevel: 1 })).toBe('NONE');
  });

  // Круг ячейки выше своего даёт другие кости, но не другое
  // разрешение: вид, посчитанный листом заранее, не обязан меняться от
  // выбора в панели.
  it('ячейка выше круга заклинания вида разрешения не меняет', () => {
    expect(spellResolution(FIREBALL, { slotLevel: 9 })).toBe('SAVE');
    expect(spellResolution(MAGIC_MISSILE, { slotLevel: 9 })).toBe('AUTO_DAMAGE');
  });
});

describe('spellDamagePlan', () => {
  it('у «Благословения» урона нет вовсе', () => {
    expect(spellDamagePlan(BLESS)).toEqual({ kind: 'NONE' });
  });

  // «Усыпление»: кости в SRD есть, вида урона нет.
  it('кости без вида урона — NO_DAMAGE_TYPE', () => {
    const sleep = spell({ level: 1, damageAtSlotLevel: { '1': '5d8' } });
    expect(spellDamagePlan(sleep, { slotLevel: 1 })).toEqual({
      kind: 'UNRESOLVED',
      reason: 'NO_DAMAGE_TYPE',
    });
  });

  // «Ледяной шторм»: две пары костей в одной записи, разбор их не
  // берёт. Спасбросок с уроном по такой записи не разрешается — но сам
  // бросок система всё равно катит (`SAVE_ONLY`), а причину отсутствия
  // урона пишет в строку сотворения. Молчания не остаётся ни в одном
  // из двух мест.
  it('запись «2d8 + 4d6» — UNPARSED_DICE, урона нет, а спасбросок идёт', () => {
    const iceStorm = spell({
      level: 4,
      saveAbility: 'dex',
      damageType: 'bludgeoning',
      damageAtSlotLevel: { '4': '2d8 + 4d6' },
    });
    expect(spellDamagePlan(iceStorm, { slotLevel: 4 })).toEqual({
      kind: 'UNRESOLVED',
      reason: 'UNPARSED_DICE',
    });
    expect(spellResolution(iceStorm, { slotLevel: 4 })).toBe('SAVE_ONLY');
  });

  it('«+ MOD» подставляет модификатор заклинателя', () => {
    expect(spellDamagePlan(FIREBALL, { slotLevel: 3, spellcastingModifier: 4 })).toEqual({
      kind: 'DAMAGE',
      dice: '8d6',
      modifier: 0,
      type: 'fire',
    });
    expect(spellDamagePlan(MAGIC_MISSILE, { slotLevel: 1 })).toEqual({
      kind: 'DAMAGE',
      dice: '3d4',
      modifier: 3,
      type: 'force',
    });
  });
});
