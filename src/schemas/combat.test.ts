import { describe, expect, it } from 'vitest';
import {
  attackInputSchema,
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

  // `HEAL` ушёл из контракта вместе с хвостом 22: писать им подъём
  // хитов значило оставить снижение без строки вовсе.
  it('вида HEAL в журнале больше нет', () => {
    const res = encounterEventPayloadSchema.safeParse({
      kind: 'HEAL',
      amount: 4,
      hitPointsLeft: 9,
    });

    expect(res.success).toBe(false);
  });
});
