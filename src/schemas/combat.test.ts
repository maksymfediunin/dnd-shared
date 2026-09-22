import { describe, expect, it } from 'vitest';
import {
  attackInputSchema,
  castInputSchema,
  damageInputSchema,
  encounterEventPayloadSchema,
  initiativeInputSchema,
} from './combat.js';

describe('attackInputSchema', () => {
  it('принимает атаку оружием персонажа', () => {
    const parsed = attackInputSchema.parse({
      targetId: '11111111-1111-4111-8111-111111111111',
      weaponItemId: 'itm_longsword',
    });

    // Преимущество не указано — значит обычный бросок.
    expect(parsed.advantageMode).toBe('NONE');
  });

  it('принимает атаку действием монстра', () => {
    const parsed = attackInputSchema.parse({
      targetId: '11111111-1111-4111-8111-111111111111',
      monsterActionCode: 'goblin-scimitar',
      advantageMode: 'ADVANTAGE',
    });

    expect(parsed.monsterActionCode).toBe('goblin-scimitar');
  });

  // Ровно один источник удара: иначе непонятно, чем бьют, и служба
  // выбирала бы за игрока.
  it('отвергает оружие и действие монстра разом', () => {
    const res = attackInputSchema.safeParse({
      targetId: '11111111-1111-4111-8111-111111111111',
      weaponItemId: 'itm_longsword',
      monsterActionCode: 'goblin-scimitar',
    });

    expect(res.success).toBe(false);
  });

  it('отвергает удар ничем', () => {
    const res = attackInputSchema.safeParse({
      targetId: '11111111-1111-4111-8111-111111111111',
    });

    expect(res.success).toBe(false);
  });
});

describe('initiativeInputSchema', () => {
  it('пустое тело — бросок за себя', () => {
    expect(initiativeInputSchema.parse({})).toEqual({});
  });

  // Ведущий вписывает число за отставшего: 1к20 плюс модификатор
  // никогда не выходит за эти границы даже у эльфа-плута.
  it('принимает участника и число от ведущего', () => {
    const parsed = initiativeInputSchema.parse({
      participantId: '11111111-1111-4111-8111-111111111111',
      value: 17,
    });

    expect(parsed.value).toBe(17);
  });

  it('отвергает число вне разумных границ', () => {
    expect(initiativeInputSchema.safeParse({ value: 0 }).success).toBe(false);
    expect(initiativeInputSchema.safeParse({ value: 41 }).success).toBe(false);
  });
});

describe('damageInputSchema', () => {
  it('пустое тело — бросок костей оружия', () => {
    expect(damageInputSchema.parse({})).toEqual({});
  });

  // Ведущему бывает нужно вписать урон руками — поправка, о которой
  // система не знает (сопротивление, половина от площади).
  it('принимает число от ведущего', () => {
    expect(damageInputSchema.parse({ amount: 7 }).amount).toBe(7);
  });

  it('отвергает отрицательный урон', () => {
    expect(damageInputSchema.safeParse({ amount: -1 }).success).toBe(false);
  });
});

describe('encounterEventPayloadSchema', () => {
  it('разбирает запись об атаке', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'ATTACK',
      weaponName: 'Длинный меч',
      notation: '1d20+5',
      results: [14],
      total: 19,
      targetArmorClass: 15,
      outcome: 'HIT',
      isCritical: false,
    });

    expect(parsed).toMatchObject({ kind: 'ATTACK', outcome: 'HIT' });
  });

  it('разбирает запись об уроне', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'DAMAGE',
      notation: '1d8+3',
      results: [5],
      amount: 8,
      damageType: 'slashing',
      temporaryAbsorbed: 0,
      hitPointsLeft: 4,
    });

    expect(parsed).toMatchObject({ kind: 'DAMAGE', amount: 8 });
  });

  // Форма записи зависит от вида события: запись об уроне без числа —
  // это испорченная строка журнала, и показать её нечем.
  it('отвергает запись об уроне без числа', () => {
    const res = encounterEventPayloadSchema.safeParse({
      kind: 'DAMAGE',
      notation: '1d8+3',
      results: [5],
    });

    expect(res.success).toBe(false);
  });

  // Ручной урон ведущего — не бросок: костей не было, и притворяться
  // ими нечем. `amount` при этом может быть больше ста — потолка на
  // кость, — и без пустого `results` эта же запись не читалась бы
  // обратно.
  // `notation` нет вовсе, а не русская подпись вроде «вручную»:
  // приложение трёхъязычное, а переводить строку, уже лежащую в базе,
  // нечем — подпись для ручного урона подбирает фронт по признаку
  // пустого `results`.
  it('разбирает ручной урон без записи броска и больше ста', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'DAMAGE',
      results: [],
      amount: 150,
      damageType: 'slashing',
      temporaryAbsorbed: 0,
      hitPointsLeft: 0,
    });

    expect(parsed).toMatchObject({ kind: 'DAMAGE', amount: 150, results: [] });
    expect(parsed).not.toHaveProperty('notation');
  });
  // Ручная правка хитов ведущим — не урон и не лечение, а поправка, и
  // читается она как поправка. До хвоста 22 подъём писался строкой
  // `HEAL`, а снижение не писалось вовсе: у `DAMAGE` обязателен тип
  // урона, которого у правки нет.
  it('разбирает ручное снижение хитов ведущим', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'HP_ADJUST',
      delta: -7,
      hitPointsLeft: 5,
    });

    expect(parsed).toMatchObject({ kind: 'HP_ADJUST', delta: -7 });
  });
  // Правка, ничего не изменившая, — это не строка журнала, а шум: по
  // журналу разбирают спорный момент, и «ведущий поправил хиты на
  // ноль» в таком разборе не значит ничего.
  it('отвергает правку хитов без изменения', () => {
    const res = encounterEventPayloadSchema.safeParse({
      kind: 'HP_ADJUST',
      delta: 0,
      hitPointsLeft: 5,
    });

    expect(res.success).toBe(false);
  });

  // `HEAL` вернулся волной «в» уже с исполнителем — настоящим лечением
  // заклинанием, а не подъёмом хитов правкой ведущего: подъём правкой
  // так и остаётся `HP_ADJUST` (хвост 22).
  it('разбирает строку о лечении заклинанием', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'HEAL',
      spellCode: 'cure-wounds',
      notation: '1d8+3',
      results: [5],
      amount: 8,
    });

    expect(parsed).toMatchObject({ kind: 'HEAL', spellCode: 'cure-wounds', amount: 8 });
  });

  it('лечение без заклинания — не строка журнала: правка хитов пишется своим видом', () => {
    const res = encounterEventPayloadSchema.safeParse({
      kind: 'HEAL',
      amount: 4,
      hitPointsLeft: 9,
    });

    expect(res.success).toBe(false);
  });

  it('разбирает сотворение по цели', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'CAST',
      spellCode: 'cure-wounds',
      slotLevel: 1,
      targetIds: ['11111111-1111-4111-8111-111111111111'],
    });

    expect(parsed).toMatchObject({ kind: 'CAST', slotLevel: 1 });
  });

  // Кантрип ячейки не тратит, и круг у его строки пустой — не ноль:
  // нулевого круга ячеек не бывает вовсе.
  it('сотворение кантрипа идёт без круга ячейки', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'CAST',
      spellCode: 'fire-bolt',
      slotLevel: null,
      targetIds: ['11111111-1111-4111-8111-111111111111'],
    });

    expect(parsed).toMatchObject({ slotLevel: null });
  });

  // Клетки области кладутся теми же ключами, какие складывает `cellKey`
  // и возвращает `cellsInArea`: подсветка на карте и разбор строки
  // журнала должны видеть одни и те же клетки.
  it('сотворение по площади помнит её клетки', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'CAST',
      spellCode: 'fireball',
      slotLevel: 3,
      targetIds: [],
      areaCells: ['4:4', '5:4', '4:5'],
    });

    expect(parsed).toMatchObject({ areaCells: ['4:4', '5:4', '4:5'] });
  });

  it('клетка области чужого вида не проходит', () => {
    const res = encounterEventPayloadSchema.safeParse({
      kind: 'CAST',
      spellCode: 'fireball',
      slotLevel: 3,
      targetIds: [],
      areaCells: ['4,4'],
    });

    expect(res.success).toBe(false);
  });

  // Молчание сервера («урона нет») должно быть объяснимо: строка `CAST`
  // несёт причину, по которой машинный расчёт не вышел, хотя машинные
  // поля у заклинания есть.
  it('сотворение помнит причину непосчитанного урона', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'CAST',
      spellCode: 'sleep',
      slotLevel: 1,
      targetIds: [],
      unresolvedReason: 'NO_DAMAGE_TYPE',
    });

    expect(parsed).toMatchObject({ unresolvedReason: 'NO_DAMAGE_TYPE' });
  });

  // Третьего значения причины нет: цена успеха `other` до сотворения не
  // доживает, импорт схлопывает её в обычное отсутствие эффекта (§5.2
  // дизайна куска 8) — восстанавливать его здесь не входит в задачу.
  it('чужое значение причины не проходит', () => {
    const res = encounterEventPayloadSchema.safeParse({
      kind: 'CAST',
      spellCode: 'sleep',
      slotLevel: 1,
      targetIds: [],
      unresolvedReason: 'OTHER_SUCCESS_COST',
    });

    expect(res.success).toBe(false);
  });

  it('разбирает спасбросок цели против заклинания', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'SAVE',
      spellCode: 'fireball',
      ability: 'dexterity',
      notation: '1d20+2',
      results: [11],
      total: 13,
      dc: 16,
      outcome: 'FAILURE',
    });

    expect(parsed).toMatchObject({ kind: 'SAVE', dc: 16, outcome: 'FAILURE' });
  });

  // Без сложности по броску нечего разбирать — а разбор спорного
  // момента за столом начинается именно с этой строки (§6 дизайна).
  it('спасбросок без сложности не проходит', () => {
    const res = encounterEventPayloadSchema.safeParse({
      kind: 'SAVE',
      spellCode: 'fireball',
      ability: 'dexterity',
      notation: '1d20+2',
      results: [11],
      total: 13,
      outcome: 'FAILURE',
    });

    expect(res.success).toBe(false);
  });

  it('разбирает удержанную концентрацию со спасброском', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'CONCENTRATION',
      spellCode: 'hold-person',
      outcome: 'KEPT',
      notation: '1d20+2',
      results: [15],
      total: 17,
      dc: 10,
    });

    expect(parsed).toMatchObject({ kind: 'CONCENTRATION', outcome: 'KEPT', dc: 10 });
  });

  // Концентрация рвётся и без броска — смертью носителя и новым
  // концентрационным заклинанием (§6 дизайна). Записать такому обрыву
  // выдуманный бросок хуже, чем оставить его без броска.
  it('разбирает обрыв концентрации без броска', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'CONCENTRATION',
      spellCode: 'hold-person',
      outcome: 'BROKEN',
      results: [],
    });

    expect(parsed).toMatchObject({ outcome: 'BROKEN' });
  });

  it('чужой исход концентрации не проходит', () => {
    const res = encounterEventPayloadSchema.safeParse({
      kind: 'CONCENTRATION',
      spellCode: 'hold-person',
      outcome: 'LOST',
      results: [],
    });

    expect(res.success).toBe(false);
  });

  it('разбирает строку о наложенном состоянии', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'CONDITION',
      code: 'frightened',
      action: 'APPLIED',
      roundsRemaining: 2,
    });

    expect(parsed).toMatchObject({ kind: 'CONDITION', code: 'frightened', action: 'APPLIED' });
  });

  it('строка об истечении срока не требует ни уровня, ни остатка', () => {
    const parsed = encounterEventPayloadSchema.parse({
      kind: 'CONDITION',
      code: 'poisoned',
      action: 'EXPIRED',
    });

    expect(parsed).toMatchObject({ action: 'EXPIRED' });
  });
});

describe('castInputSchema', () => {
  const targetId = '11111111-1111-4111-8111-111111111111';

  it('принимает сотворение по фишке', () => {
    const parsed = castInputSchema.parse({ spellCode: 'cure-wounds', slotLevel: 1, targetId });

    expect(parsed).toMatchObject({ spellCode: 'cure-wounds', slotLevel: 1 });
  });

  it('принимает сотворение по клетке', () => {
    const parsed = castInputSchema.parse({
      spellCode: 'fireball',
      slotLevel: 3,
      cell: { x: 4, y: 7 },
    });

    expect(parsed.cell).toEqual({ x: 4, y: 7 });
  });

  // Ровно одно из двух, как у удара оружием: заклинание бьёт либо по
  // фишке, либо по точке, и выбирать за игрока служба не должна.
  it('отвергает цель и клетку разом', () => {
    const res = castInputSchema.safeParse({
      spellCode: 'fireball',
      slotLevel: 3,
      targetId,
      cell: { x: 4, y: 7 },
    });

    expect(res.success).toBe(false);
  });

  it('отвергает сотворение в никуда', () => {
    expect(castInputSchema.safeParse({ spellCode: 'fireball', slotLevel: 3 }).success).toBe(false);
  });

  it('кантрип идёт без круга ячейки', () => {
    const parsed = castInputSchema.parse({ spellCode: 'fire-bolt', targetId });

    expect(parsed.slotLevel).toBeUndefined();
  });

  it('круга ноль и круга десять не бывает', () => {
    expect(
      castInputSchema.safeParse({ spellCode: 'fireball', slotLevel: 0, targetId }).success,
    ).toBe(false);
    expect(
      castInputSchema.safeParse({ spellCode: 'fireball', slotLevel: 10, targetId }).success,
    ).toBe(false);
  });

  it('заклинание без кода не сотворяется', () => {
    expect(castInputSchema.safeParse({ spellCode: '  ', targetId }).success).toBe(false);
  });
});
