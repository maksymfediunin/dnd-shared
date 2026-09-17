import { describe, expect, it } from 'vitest';
import { roomMessageCreateSchema, roomMessageTemplateSchema } from './message.js';
import { roomCharacterChoiceSchema } from './room.js';

describe('создание сообщения комнаты', () => {
  it('принимает объявление без адресата', () => {
    const result = roomMessageCreateSchema.safeParse({
      kind: 'GM_BROADCAST',
      body: 'Привал у реки',
    });
    expect(result.success).toBe(true);
  });

  it('принимает личное сообщение с адресатом', () => {
    const result = roomMessageCreateSchema.safeParse({
      kind: 'GM_PRIVATE',
      targetUserId: '123e4567-e89b-12d3-a456-426614174000',
      body: 'Ты замечаешь тайник',
    });
    expect(result.success).toBe(true);
  });

  it('отвергает личное без адресата: доставлять его некуда', () => {
    const result = roomMessageCreateSchema.safeParse({
      kind: 'GM_PRIVATE',
      body: 'Ты замечаешь тайник',
    });
    expect(result.success).toBe(false);
  });

  it('отвергает объявление с адресатом: это личное под чужим именем', () => {
    const result = roomMessageCreateSchema.safeParse({
      kind: 'GM_BROADCAST',
      targetUserId: '123e4567-e89b-12d3-a456-426614174000',
      body: 'Привал у реки',
    });
    expect(result.success).toBe(false);
  });

  it('отвергает пустое тело и тело длиннее 4000 знаков', () => {
    expect(roomMessageCreateSchema.safeParse({ kind: 'GM_BROADCAST', body: '   ' }).success).toBe(
      false,
    );
    expect(
      roomMessageCreateSchema.safeParse({ kind: 'GM_BROADCAST', body: 'а'.repeat(4001) }).success,
    ).toBe(false);
  });

  it('обрезает тело по краям', () => {
    const parsed = roomMessageCreateSchema.parse({
      kind: 'GM_BROADCAST',
      body: '  привет  ',
    });
    expect(parsed.body).toBe('привет');
  });
});

describe('шаблон сообщения', () => {
  it('требует непустой заголовок', () => {
    expect(
      roomMessageTemplateSchema.safeParse({ title: '   ', body: 'Привал у реки' }).success,
    ).toBe(false);
    expect(
      roomMessageTemplateSchema.safeParse({ title: 'Привал', body: 'Привал у реки' }).success,
    ).toBe(true);
  });
});

describe('выбор персонажа в комнате', () => {
  it('не принимает null: «играю без листа» из правил комнаты убрано', () => {
    expect(roomCharacterChoiceSchema.safeParse({ characterId: null }).success).toBe(false);
  });

  it('отвергает не-uuid', () => {
    expect(roomCharacterChoiceSchema.safeParse({ characterId: 'не-uuid' }).success).toBe(false);
  });
});
