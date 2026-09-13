import { describe, it, expect } from 'vitest';
import {
  ROOM_CODE_ALPHABET,
  roomCodeSchema,
  roomCreateSchema,
  roomJoinByCodeSchema,
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
    expect(roomJoinByCodeSchema.parse({ code: 'a2b3c4' })).toEqual({ code: 'A2B3C4' });
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
