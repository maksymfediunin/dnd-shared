import { describe, expect, it } from 'vitest';
import { combineConditions } from './conditions.js';
import { spellDamagePlan, spellResolution } from './spell-effect.js';
import { SPELL_MECHANICS } from './spell-mechanics.data.js';
import {
  armorClassWithEffects,
  attackDiceFrom,
  creatureTypeOf,
  distributeHealPool,
  endsOnDamageBy,
  hasSpellEffect,
  repeatSaveOf,
  resistancesWithEffects,
  rollSignedDice,
  SPELL_EFFECT_CODE,
  saveAdvantageFrom,
  saveAdvantageSources,
  saveBonusFrom,
  speedWithEffects,
  spellConditionEffects,
  spellEffectSummary,
  spellMechanic,
  spellMechanicFor,
  spellRayCount,
  spellTargetLimit,
  spellVariantKey,
  spentByOwnAttack,
  weaponDamageFrom,
  weaponDiceAtSlot,
} from './spell-mechanics.js';

const on = (spellCode: string, data?: unknown) => ({ code: SPELL_EFFECT_CODE, spellCode, data });

describe('механика заклинаний', () => {
  it('«Щит веры» прибавляет к КД, «Дубовая кора» держит порог поверх прибавки', () => {
    expect(armorClassWithEffects(12, [on('shield-of-faith')])).toBe(14);
    expect(armorClassWithEffects(12, [on('barkskin')])).toBe(16);
    expect(armorClassWithEffects(12, [on('barkskin'), on('shield-of-faith')])).toBe(18);
    expect(armorClassWithEffects(18, [on('barkskin')])).toBe(18);
  });

  it('«Доспехи мага» берут КД, посчитанный при сотворении', () => {
    expect(armorClassWithEffects(12, [on('mage-armor', { acMinimum: 15 })])).toBe(15);
  });

  it('«Ускорение» удваивает скорость и прибавляет к КД, «Замедление» режет', () => {
    expect(speedWithEffects(30, [on('haste')])).toBe(60);
    expect(armorClassWithEffects(15, [on('haste')])).toBe(17);
    expect(speedWithEffects(30, [on('slow')])).toBe(15);
    expect(armorClassWithEffects(15, [on('slow')])).toBe(13);
    expect(speedWithEffects(30, [on('longstrider')])).toBe(40);
  });

  it('«Благословение» и «Порча» — кости со знаком', () => {
    const dice = attackDiceFrom([on('bless'), on('bane')]);
    expect(rollSignedDice(dice, () => 3)).toEqual([
      { spellCode: 'bless', value: 3 },
      { spellCode: 'bane', value: -3 },
    ]);
  });

  it('«Огонь фей» даёт преимущество атакам по носителю, «Размытый образ» — помеху', () => {
    expect(combineConditions([], spellConditionEffects([on('faerie-fire')])).incomingNear).toBe(
      'ADVANTAGE',
    );
    expect(combineConditions([], spellConditionEffects([on('blur')])).incomingFar).toBe(
      'DISADVANTAGE',
    );
    // Сбит с ног и в огне фей: вблизи преимущество, издали — гасятся.
    expect(
      combineConditions([{ code: 'prone' }], spellConditionEffects([on('faerie-fire')]))
        .incomingFar,
    ).toBe('NORMAL');
  });

  it('«Защита от добра и зла» мешает только исчадиям, нежити и подобным', () => {
    const effects = [on('protection-from-evil-and-good')];
    expect(combineConditions([], spellConditionEffects(effects, 'undead')).incomingNear).toBe(
      'DISADVANTAGE',
    );
    expect(combineConditions([], spellConditionEffects(effects, 'humanoid')).incomingNear).toBe(
      'NORMAL',
    );
    expect(combineConditions([], spellConditionEffects(effects)).incomingNear).toBe('NORMAL');
  });

  it('спасброски: преимущество «Ускорения», прибавка «Охранной связи»', () => {
    expect(saveAdvantageFrom([on('haste')], 'dexterity')).toBe('ADVANTAGE');
    expect(saveAdvantageFrom([on('haste')], 'wisdom')).toBe('NONE');
    expect(saveBonusFrom([on('warding-bond')])).toBe(1);
  });

  it('число целей растёт кругом ячейки', () => {
    expect(spellTargetLimit('bless', 1, 1)).toBe(3);
    expect(spellTargetLimit('bless', 1, 3)).toBe(5);
    expect(spellTargetLimit('fire-bolt', 0, null)).toBe(1);
  });

  it('лучи: от уровня заклинателя у взрыва, от ячейки у стрелы', () => {
    expect(spellRayCount('eldritch-blast', 0, null, 4)).toBe(1);
    expect(spellRayCount('eldritch-blast', 0, null, 11)).toBe(3);
    expect(spellRayCount('magic-missile', 1, 2, 3)).toBe(4);
    expect(spellRayCount('scorching-ray', 2, 2, 3)).toBe(3);
    expect(spellRayCount('fire-bolt', 0, null, 3)).toBeNull();
  });

  it('прибавка кары растёт кругом, «Благоволение» — постоянна', () => {
    const smite = SPELL_MECHANICS['branding-smite']?.modifiers?.weaponDamage;
    expect(smite && weaponDiceAtSlot(smite, 2, 4)).toBe('4d6');
    expect(weaponDamageFrom([on('divine-favor')])).toEqual([
      { spellCode: 'divine-favor', dice: '1d4', type: 'radiant' },
    ]);
  });

  it('поправка полей SRD: прибавки к оружию не бьют цель, у паутины есть спасбросок', () => {
    const fields = (code: string, extra: object) => ({
      code,
      level: 1,
      attackType: null,
      saveAbility: null,
      damageType: 'radiant',
      damageAtSlotLevel: null,
      damageAtLevel: null,
      healAtSlotLevel: null,
      ...extra,
    });
    expect(spellResolution(fields('divine-favor', { damageAtSlotLevel: { '1': '1d4' } }))).toBe(
      'NONE',
    );
    expect(spellResolution(fields('web', { level: 2, damageType: null }))).toBe('SAVE_ONLY');
    expect(spellResolution(fields('false-life', { healAtSlotLevel: { '1': '1d4 + 4' } }))).toBe(
      'NONE',
    );
  });

  it('урон двух видов делится по видам', () => {
    const plan = spellDamagePlan(
      {
        code: 'flame-strike',
        level: 5,
        attackType: null,
        saveAbility: 'dex',
        damageType: 'fire',
        damageAtSlotLevel: { '5': '4d6 + 4d6' },
        damageAtLevel: null,
        healAtSlotLevel: null,
      },
      { slotLevel: 5 },
    );
    expect(plan).toEqual({
      kind: 'DAMAGE',
      dice: '4d6',
      modifier: 0,
      type: 'fire',
      extra: [{ dice: '4d6', type: 'radiant' }],
    });
  });

  it('сводка для статуса', () => {
    expect(spellEffectSummary('shield-of-faith')).toEqual([{ key: 'acBonus', value: 2 }]);
    expect(spellEffectSummary('hold-person')).toEqual([{ key: 'repeatSave' }]);
  });

  it('каждая запись таблицы ссылается на допустимые состояния и характеристики', () => {
    const conditions = new Set([
      'blinded',
      'charmed',
      'deafened',
      'frightened',
      'grappled',
      'incapacitated',
      'invisible',
      'paralyzed',
      'petrified',
      'poisoned',
      'prone',
      'restrained',
      'stunned',
      'unconscious',
    ]);
    for (const [code, mechanic] of Object.entries(SPELL_MECHANICS)) {
      for (const c of [...(mechanic.conditions ?? []), ...(mechanic.removesConditions ?? [])]) {
        expect(conditions.has(c), `${code}: ${c}`).toBe(true);
      }
    }
  });

  // Точка — это клетка без существа: цели-фишки у такого заклинания нет,
  // и всё, что ложится на цель или требует её, с точкой спорит.
  it('заклинание в точку не ждёт фишки-цели и не несёт на неё следствий', () => {
    const points = Object.entries(SPELL_MECHANICS).filter(([, mechanic]) => mechanic.point);
    expect(points.map(([code]) => code)).toEqual(
      expect.arrayContaining(['dancing-lights', 'mage-hand', 'minor-illusion', 'wall-of-stone']),
    );
    for (const [code, m] of points) {
      const clash = {
        teleportFeet: m.teleportFeet,
        selfOnly: m.selfOnly,
        notSelf: m.notSelf,
        targets: m.targets,
        rays: m.rays,
        bearer: m.bearer,
        conditions: m.conditions,
        modifiers: m.modifiers,
        variants: m.variants,
      };
      expect(
        Object.fromEntries(Object.entries(clash).filter(([, value]) => value !== undefined)),
        code,
      ).toEqual({});
    }
  });
});

describe('варианты, зоны и следствия урона', () => {
  it('вариант целиком задаёт следствие', () => {
    expect(spellMechanicFor('eyebite', 'sickened')?.conditions).toBeUndefined();
    expect(spellMechanicFor('eyebite', 'sickened')?.modifiers?.ownAttacks).toBe('DISADVANTAGE');
    expect(spellMechanicFor('eyebite', 'asleep')?.conditions).toEqual(['unconscious']);
    expect(spellMechanicFor('protection-from-energy', 'cold')?.modifiers?.resistances).toEqual([
      'cold',
    ]);
    // Без выбора — первый вариант.
    expect(spellVariantKey('fire-shield', null)).toBe('warm');
    expect(spellVariantKey('fire-shield', 'nonsense')).toBe('warm');
    expect(spellVariantKey('bless', 'x')).toBeNull();
  });

  it('эффект помнит вариант: «Защита от энергии» от холода режет холод', () => {
    const effects = [on('protection-from-energy', { variant: 'cold' })];
    expect(resistancesWithEffects([], effects)).toEqual(['cold']);
  });

  it('«Духовные стражи» получили урон и спасбросок, которых нет в SRD', () => {
    const plan = spellDamagePlan(
      {
        code: 'spirit-guardians',
        level: 3,
        attackType: null,
        saveAbility: null,
        damageType: null,
        damageAtSlotLevel: null,
        damageAtLevel: null,
        healAtSlotLevel: null,
      },
      { slotLevel: 4 },
    );
    expect(plan).toEqual({ kind: 'DAMAGE', dice: '4d8', modifier: 0, type: 'radiant' });
  });
});

describe('пустые записи', () => {
  // Без записи тест полноты не отличил бы «считает SRD» от «забыли».
  it('14 заклинаний, которые целиком считают поля SRD и код, — с записью {}', () => {
    for (const code of [
      'circle-of-death',
      'cure-wounds',
      'darkness',
      'fireball',
      'fog-cloud',
      'healing-word',
      'hunters-mark',
      'inflict-wounds',
      'lightning-bolt',
      'poison-spray',
      'sleep',
      'spare-the-dying',
      'stinking-cloud',
      'thunderwave',
    ]) {
      expect(SPELL_MECHANICS[code], code).toEqual({});
    }
  });
});

describe('источники преимущества спасброска', () => {
  // Сведённый режим терял бы источники: «и то и другое» плюс ещё одно
  // преимущество со стороны дали бы преимущество вместо обычного броска.
  it('по источнику на эффект, а не сведённым режимом', () => {
    const effects = [
      { code: SPELL_EFFECT_CODE, spellCode: 'enlarge-reduce', data: { variant: 'enlarge' } },
      { code: SPELL_EFFECT_CODE, spellCode: 'bestow-curse', data: { variant: 'str' } },
    ];
    expect(saveAdvantageSources(effects, 'strength').sort()).toEqual(['ADVANTAGE', 'DISADVANTAGE']);
    expect(saveAdvantageFrom(effects, 'strength')).toBe('NONE');
  });
});

describe('волна 1б: записи по букве SRD', () => {
  const party = { id: 'p1', side: 'PARTY' as const };
  const ally = { id: 'p2', side: 'PARTY' as const };
  const ogre = { id: 'm1', side: 'HOSTILE' as const, monsterId: 'ogre' };

  it('«Массовое исцеление»: 700 поровну, не выше недостающего, лишнее — остальным', () => {
    expect(
      distributeHealPool(700, [
        { id: 'a', missing: 50 },
        { id: 'b', missing: 120 },
        { id: 'c', missing: 30 },
      ]),
    ).toEqual({ a: 50, b: 120, c: 30 });
    expect(
      distributeHealPool(700, [
        { id: 'a', missing: 500 },
        { id: 'b', missing: 500 },
        { id: 'c', missing: 100 },
      ]),
    ).toEqual({ a: 300, b: 300, c: 100 });
    // Остаток от деления — первым по порядку.
    expect(
      distributeHealPool(10, [
        { id: 'a', missing: 9 },
        { id: 'b', missing: 9 },
        { id: 'c', missing: 9 },
      ]),
    ).toEqual({ a: 4, b: 3, c: 3 });
    expect(distributeHealPool(10, [{ id: 'a', missing: 0 }])).toEqual({ a: 0 });
  });

  it('повторный спасбросок одной формой: прежние записи — в конце хода', () => {
    expect(repeatSaveOf(spellMechanic('hold-person'))).toEqual({ at: 'END' });
    expect(repeatSaveOf(spellMechanic('phantasmal-killer'))).toMatchObject({
      at: 'START',
      onFail: { damage: '4d10', type: 'psychic', perSlot: '1d10' },
    });
    expect(repeatSaveOf(spellMechanic('fear'))).toEqual({ at: 'END', when: 'NO_LINE_OF_SIGHT' });
    expect(repeatSaveOf(spellMechanic('fireball'))).toBeNull();
  });

  it('«Наложение проклятия», атаки: помеха только по наложившему', () => {
    const cursed = [
      {
        code: SPELL_EFFECT_CODE,
        spellCode: 'bestow-curse',
        data: { variant: 'attacks' },
        sourceId: 'p1',
      },
    ];
    const vs = (id: string | null) =>
      combineConditions([], spellConditionEffects(cursed, null, id)).ownAttacks;
    expect(vs('p1')).toBe('DISADVANTAGE');
    expect(vs('p2')).toBe('NORMAL');
    expect(vs(null)).toBe('NORMAL');
  });

  it('«Верный удар»: спит в ход сотворения, потом — только по названной цели', () => {
    const dormant = on('true-strike', {
      targetId: 'm1',
      until: { participantId: 'p1', at: 'END', skip: 1 },
    });
    const awake = on('true-strike', {
      targetId: 'm1',
      until: { participantId: 'p1', at: 'END', skip: 0 },
    });
    const own = (row: typeof awake, id: string) =>
      combineConditions([], spellConditionEffects([row], null, id)).ownAttacks;
    expect(own(dormant, 'm1')).toBe('NORMAL');
    expect(own(awake, 'm1')).toBe('ADVANTAGE');
    expect(own(awake, 'm2')).toBe('NORMAL');
    expect(spentByOwnAttack(dormant, 'm1')).toBe(false);
    expect(spentByOwnAttack(awake, 'm2')).toBe(false);
    expect(spentByOwnAttack(awake, 'm1')).toBe(true);
  });

  it('«Каменная кожа» режет только немагическое', () => {
    expect(resistancesWithEffects([], [on('stoneskin')])).toEqual([
      'bludgeoning',
      'piercing',
      'slashing',
    ]);
    expect(resistancesWithEffects([], [on('stoneskin')], true)).toEqual([]);
    expect(spellEffectSummary('stoneskin')).toEqual([
      { key: 'resistNonmagical', value: ['bludgeoning', 'piercing', 'slashing'] },
    ]);
  });

  it('урон от стороны заклинателя снимает очарование, от чужой — нет; узор — от любого', () => {
    const charm = on('charm-person');
    expect(endsOnDamageBy(charm, ally, party)).toBe(true);
    expect(endsOnDamageBy(charm, party, party)).toBe(true);
    expect(endsOnDamageBy(charm, ogre, party)).toBe(false);
    expect(endsOnDamageBy(charm, null, party)).toBe(false);
    // Сторона, а не вид фишки: монстр на стороне партии — спутник.
    expect(endsOnDamageBy(charm, { ...ogre, side: 'PARTY' }, party)).toBe(true);
    expect(endsOnDamageBy(on('hypnotic-pattern'), null, null)).toBe(true);
  });

  it('«Сглаз»: урон снимает только сон', () => {
    expect(endsOnDamageBy(on('eyebite', { variant: 'asleep' }), null, null)).toBe(true);
    expect(endsOnDamageBy(on('eyebite', { variant: 'sickened' }), null, null)).toBe(false);
    expect(endsOnDamageBy(on('eyebite', { variant: 'panicked' }), null, null)).toBe(false);
  });

  it('«Внушение» оставляет эффект — иначе урону снимать нечего', () => {
    expect(hasSpellEffect(spellMechanic('suggestion'))).toBe(true);
    expect(hasSpellEffect(spellMechanic('flame-blade'))).toBe(true);
  });

  it('рой зверей — зверь; прочие типы — как есть', () => {
    expect(creatureTypeOf('swarm of Tiny beasts')).toBe('beast');
    expect(creatureTypeOf('Humanoid')).toBe('humanoid');
    expect(creatureTypeOf('beast')).toBe('beast');
  });

  it('«Сглаз»: от тошноты — спасбросок в конце хода, от сна и паники — нет', () => {
    expect(repeatSaveOf(spellMechanicFor('eyebite', 'sickened'))).toEqual({ at: 'END' });
    expect(repeatSaveOf(spellMechanicFor('eyebite', 'asleep'))).toBeNull();
    expect(repeatSaveOf(spellMechanicFor('eyebite', 'panicked'))).toBeNull();
  });

  it('«Верный удар» — только в свой ход: атака при отходе его не берёт и не тратит', () => {
    const awake = on('true-strike', {
      targetId: 'm1',
      until: { participantId: 'p1', at: 'END', skip: 0 },
    });
    expect(
      combineConditions([], spellConditionEffects([awake], null, 'm1', false)).ownAttacks,
    ).toBe('NORMAL');
    expect(spentByOwnAttack(awake, 'm1', false)).toBe(false);
  });

  it('подпись повтора говорит, когда бросают', () => {
    expect(spellEffectSummary('phantasmal-killer')).toContainEqual({ key: 'repeatSaveStart' });
    expect(spellEffectSummary('fear')).toContainEqual({ key: 'repeatSaveUnseen' });
    expect(spellEffectSummary('hold-person')).toEqual([{ key: 'repeatSave' }]);
    expect(spellEffectSummary('eyebite', { variant: 'sickened' })).toContainEqual({
      key: 'repeatSave',
    });
  });

  // Ступени «Божественного слова» — волна 8 (`hpTiers`); до неё текст
  // ведущему обязан хотя бы не путать «оглохла» с «ошеломлена».
  it('«Божественное слово»: при ≤50 хитов — оглохла, а не ошеломлена', () => {
    expect(spellMechanic('divine-word')?.gm).toMatch(/≤50 хп оглохла 1 мин/);
  });
});
