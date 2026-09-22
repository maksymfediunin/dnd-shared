import { describe, expect, it } from 'vitest';
import {
  isMachineResolvable,
  type SpellResolutionFields,
  spellDamagePlan,
  spellResolution,
} from './spell-effect.js';

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

describe('isMachineResolvable', () => {
  it('«Огненный шар» считается: спасбросок и разобранные кости урона', () => {
    expect(isMachineResolvable(FIREBALL, { slotLevel: 3 })).toBe(true);
    expect(spellResolution(FIREBALL, { slotLevel: 3 })).toBe('SAVE');
  });

  it('«Огненный снаряд» считается: атака у кантрипа не ждёт ячейки', () => {
    expect(isMachineResolvable(FIRE_BOLT, { casterLevel: 1 })).toBe(true);
    expect(spellResolution(FIRE_BOLT, { casterLevel: 1 })).toBe('ATTACK');
  });

  it('«Лечение ран» считается: лечение — третье разрешение', () => {
    expect(isMachineResolvable(CURE_WOUNDS, { slotLevel: 1 })).toBe(true);
    expect(spellResolution(CURE_WOUNDS, { slotLevel: 1 })).toBe('HEAL');
  });

  // Ровно тот случай, ради которого признак переписан: кости и вид
  // урона у «Волшебной стрелы» есть, разбираются, и прежнее «есть ли
  // машинные поля» отвечало «да» — а сервер бросать их некому: ни
  // атаки, ни спасброска у заклинания нет.
  it('«Волшебная стрела» не считается: кости есть, а бросать их нечем', () => {
    expect(spellDamagePlan(MAGIC_MISSILE, { slotLevel: 1 }).kind).toBe('DAMAGE');
    expect(isMachineResolvable(MAGIC_MISSILE, { slotLevel: 1 })).toBe(false);
  });

  // Зеркальный случай: спасбросок есть, а урона по нему нет вовсе —
  // эффект «удержан» система не применяет.
  it('«Удержание личности» не считается: спасбросок без костей урона', () => {
    expect(isMachineResolvable(HOLD_PERSON, { slotLevel: 2 })).toBe(false);
  });

  it('«Благословение» не считается: машинных полей нет вовсе', () => {
    expect(isMachineResolvable(BLESS, { slotLevel: 1 })).toBe(false);
  });

  // Круг ячейки выше своего даёт другие кости, но не другое
  // разрешение: признак, посчитанный листом заранее, не обязан меняться
  // от выбора в панели.
  it('ячейка выше круга заклинания признака не меняет', () => {
    expect(isMachineResolvable(FIREBALL, { slotLevel: 9 })).toBe(true);
    expect(isMachineResolvable(MAGIC_MISSILE, { slotLevel: 9 })).toBe(false);
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

  // «Ледяной шторм»: две пары костей в одной записи, разбор их не берёт
  // — и спасбросок из-за этого не разрешается тоже.
  it('запись «2d8 + 4d6» — UNPARSED_DICE, и спасбросок по ней не идёт', () => {
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
    expect(isMachineResolvable(iceStorm, { slotLevel: 4 })).toBe(false);
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
