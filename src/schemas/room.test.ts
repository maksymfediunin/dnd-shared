import { describe, expect, it } from 'vitest';
import {
  ROOM_CODE_ALPHABET,
  roomCharacterChoiceSchema,
  roomCodeSchema,
  roomCreateSchema,
  roomInviteSchema,
  roomJoinByCodeSchema,
  roomJoinSchema,
  roomListQuerySchema,
  roomRejectSchema,
  roomUpdateSchema,
} from './room.js';

const validRoom = {
  campaignName: 'Проклятие Страда',
  maxPlayers: 5,
  minLevel: 1,
  maxLevel: 5,
};

describe('код комнаты', () => {
  it('приводит регистр и пробелы: код диктуют голосом и набирают как придётся', () => {
    expect(roomCodeSchema.parse('  a2b3c4 ')).toBe('A2B3C4');
  });

  it('не пускает знаки, неразличимые на слух и на глаз', () => {
    for (const forbidden of ['0', 'O', '1', 'I', 'L']) {
      expect(ROOM_CODE_ALPHABET).not.toContain(forbidden);
    }
    expect(roomCodeSchema.safeParse('A2B3C0').success).toBe(false);
  });

  it('требует ровно шесть знаков', () => {
    expect(roomCodeSchema.safeParse('A2B3C').success).toBe(false);
    expect(roomCodeSchema.safeParse('A2B3C4D').success).toBe(false);
  });

  it('в теле заявки лежит тот же код', () => {
    const characterId = '7f1a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b';
    expect(roomJoinByCodeSchema.parse({ code: 'a2b3c4', characterId })).toEqual({
      code: 'A2B3C4',
      characterId,
    });
  });
});

describe('вступление с персонажем', () => {
  const characterId = '7f1a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b';

  it('без персонажа за стол не садятся', () => {
    expect(roomJoinSchema.safeParse({}).success).toBe(false);
    expect(roomJoinByCodeSchema.safeParse({ code: 'A2B3C4' }).success).toBe(false);
  });

  it('«играю без листа» больше не проходит ни в одной из трёх схем', () => {
    expect(roomJoinSchema.safeParse({ characterId: null }).success).toBe(false);
    expect(roomJoinByCodeSchema.safeParse({ code: 'A2B3C4', characterId: null }).success).toBe(
      false,
    );
    expect(roomCharacterChoiceSchema.safeParse({ characterId: null }).success).toBe(false);
  });

  it('принимает настоящий id персонажа', () => {
    expect(roomCharacterChoiceSchema.parse({ characterId })).toEqual({ characterId });
  });
});

describe('приглашение по почте', () => {
  it('приводит адрес к нижнему регистру: зовут того же, кто регистрировался', () => {
    expect(roomInviteSchema.parse({ email: '  Ivan@Mail.RU ' })).toEqual({
      email: 'ivan@mail.ru',
    });
  });

  it('не пускает то, что почтой не является', () => {
    expect(roomInviteSchema.safeParse({ email: 'не почта' }).success).toBe(false);
  });
});

describe('создание комнаты', () => {
  it('без публичности и статуса заводит приватный черновик', () => {
    const parsed = roomCreateSchema.parse(validRoom);
    expect(parsed.visibility).toBe('PRIVATE');
    expect(parsed.status).toBe('DRAFT');
  });

  it('не пускает перепутанный диапазон уровней', () => {
    const result = roomCreateSchema.safeParse({ ...validRoom, minLevel: 4, maxLevel: 2 });
    expect(result.success).toBe(false);
  });

  it('не пускает уровень выше таблиц правил', () => {
    expect(roomCreateSchema.safeParse({ ...validRoom, maxLevel: 6 }).success).toBe(false);
  });

  it('не пускает пустое название кампании', () => {
    expect(roomCreateSchema.safeParse({ ...validRoom, campaignName: '   ' }).success).toBe(false);
  });

  it('принимает необязательные поля кампании', () => {
    const parsed = roomCreateSchema.parse({
      ...validRoom,
      startsAt: '2026-10-01T18:00:00.000Z',
      durationMinutes: 240,
      partsCount: 3,
    });
    expect(parsed.partsCount).toBe(3);
  });
});

describe('правка комнаты', () => {
  it('меняет одно поле', () => {
    expect(roomUpdateSchema.parse({ status: 'ACTIVE' })).toEqual({ status: 'ACTIVE' });
  });

  it('пустое тело — ошибка, а не «ничего не менять»', () => {
    expect(roomUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('перепутанный диапазон ловится и при правке', () => {
    expect(roomUpdateSchema.safeParse({ minLevel: 5, maxLevel: 1 }).success).toBe(false);
  });

  it('одну границу уровня менять можно: вторая проверится сервисом по базе', () => {
    expect(roomUpdateSchema.parse({ minLevel: 3 })).toEqual({ minLevel: 3 });
  });
});

describe('каталог и отказ', () => {
  it('разбирает фильтры из строки запроса', () => {
    const parsed = roomListQuerySchema.parse({
      page: '2',
      perPage: '10',
      minLevel: '3',
      hasFreeSlots: 'true',
      mine: 'gm',
    });
    expect(parsed).toMatchObject({ page: 2, perPage: 10, minLevel: 3, hasFreeSlots: true });
  });

  it('каталог без сортировки — ближайшие игры сверху, чужой порядок отвергается', () => {
    expect(roomListQuerySchema.parse({}).sort).toBe('STARTS_ASC');
    expect(roomListQuerySchema.parse({ sort: 'CREATED_DESC' }).sort).toBe('CREATED_DESC');
    expect(roomListQuerySchema.safeParse({ sort: 'name' }).success).toBe(false);
  });

  it('отказ по умолчанию не заносит в чёрный список', () => {
    expect(roomRejectSchema.parse({})).toEqual({ blacklist: false });
  });

  it('отказ с баном принимает причину', () => {
    expect(roomRejectSchema.parse({ blacklist: true, reason: 'грубит' })).toEqual({
      blacklist: true,
      reason: 'грубит',
    });
  });
});
