import { z } from 'zod';
import { paginationSchema } from './common.js';
import { roomStatusSchema, roomVisibilitySchema } from '../enums/room.js';
import { MAX_LEVEL } from '../rules/progression.js';

/**
 * Код приглашения: шесть знаков из алфавита без пар, неразличимых на
 * слух и на глаз (0/O, 1/I/L выброшены) — код диктуют голосом за
 * столом. Хранится в верхнем регистре, на входе к нему и приводится,
 * так что игроку не важно, как он его набрал.
 */
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 6;

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH)
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`));

/**
 * Границы настроек кампании. Верхний предел участников — не вкус, а
 * то, за чем следит боёвка: очередь хода на два десятка человек
 * нежизнеспособна. Уровни — ровно те, что знают таблицы прогрессии.
 */
export const ROOM_MIN_PLAYERS = 1;
export const ROOM_MAX_PLAYERS = 12;
export const ROOM_MAX_PARTS = 50;
export const ROOM_MAX_DURATION_MINUTES = 24 * 60;

const campaignNameSchema = z.string().trim().min(1).max(120);
const descriptionSchema = z.string().trim().max(4000);
const levelSchema = z.number().int().min(1).max(MAX_LEVEL);

const roomSettingsShape = {
  campaignName: campaignNameSchema,
  description: descriptionSchema.optional(),
  visibility: roomVisibilitySchema,
  status: roomStatusSchema,
  maxPlayers: z.number().int().min(ROOM_MIN_PLAYERS).max(ROOM_MAX_PLAYERS),
  minLevel: levelSchema,
  maxLevel: levelSchema,
  // Время начала приходит строкой ISO и хранится в UTC: у стола за
  // одним столом могут сидеть люди из разных поясов.
  startsAt: z.iso.datetime().optional(),
  durationMinutes: z.number().int().min(1).max(ROOM_MAX_DURATION_MINUTES).optional(),
  partsCount: z.number().int().min(1).max(ROOM_MAX_PARTS).optional(),
};

/**
 * Диапазон уровней проверяется одной общей уточнялкой: и при создании,
 * и при правке перепутанные местами границы — одна и та же ошибка.
 */
const withOrderedLevels = <T extends { minLevel?: number; maxLevel?: number }>(
  schema: z.ZodType<T>,
) =>
  schema.refine(
    (value) =>
      value.minLevel === undefined || value.maxLevel === undefined
        ? true
        : value.minLevel <= value.maxLevel,
    { message: 'minLevel не может быть больше maxLevel', path: ['minLevel'] },
  );

/**
 * При создании статус и публичность не обязательны: комната заводится
 * черновиком и приватной. Открыть её — отдельное осознанное действие
 * ведущего, а не то, что случается по умолчанию с пустой формой.
 */
export const roomCreateSchema = withOrderedLevels(
  z.object({
    ...roomSettingsShape,
    visibility: roomVisibilitySchema.default('PRIVATE'),
    status: roomStatusSchema.default('DRAFT'),
  }),
);

export const roomUpdateSchema = withOrderedLevels(
  z
    .object(roomSettingsShape)
    .partial()
    // Пустое тело правки — почти всегда ошибка клиента, а не запрос
    // «ничего не менять»: отвечаем на него внятной валидацией.
    .refine((value) => Object.keys(value).length > 0, { message: 'Нечего менять' }),
);

/**
 * Фильтры каталога. minLevel/maxLevel — пересечение с диапазоном
 * комнаты, а не совпадение: игрок третьего уровня ищет, куда его
 * пустят, а не комнаты «ровно с третьего по третий».
 */
export const roomListQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  visibility: roomVisibilitySchema.optional(),
  status: roomStatusSchema.optional(),
  minLevel: z.coerce.number().int().min(1).max(MAX_LEVEL).optional(),
  maxLevel: z.coerce.number().int().min(1).max(MAX_LEVEL).optional(),
  hasFreeSlots: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  mine: z.enum(['gm', 'player', 'any']).optional(),
});

export const roomJoinByCodeSchema = z.object({ code: roomCodeSchema });

/**
 * Отказ с галочкой «в чёрный список» — то самое место из ТЗ. Причина
 * необязательна и видна только ведущему: это заметка в его журнале,
 * а не объяснение отклонённому.
 */
export const roomRejectSchema = z.object({
  blacklist: z.boolean().default(false),
  reason: z.string().trim().max(500).optional(),
});

export type RoomCreateInput = z.infer<typeof roomCreateSchema>;
export type RoomUpdateInput = z.infer<typeof roomUpdateSchema>;
export type RoomListQuery = z.infer<typeof roomListQuerySchema>;
export type RoomJoinByCodeInput = z.infer<typeof roomJoinByCodeSchema>;
export type RoomRejectInput = z.infer<typeof roomRejectSchema>;
