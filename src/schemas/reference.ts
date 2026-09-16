import { z } from 'zod';
import { paginationSchema } from './common.js';
import { localeSchema } from '../enums/locale.js';
import { REFERENCE_ENTITIES, type ReferenceEntity } from '../enums/reference.js';

export { REFERENCE_ENTITIES, type ReferenceEntity } from '../enums/reference.js';

export const referenceListQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  locale: localeSchema.optional(),
});

export const spellFilterSchema = z.object({
  level: z.coerce.number().int().min(0).max(9).optional(),
  school: z.string().optional(),
  class: z.string().optional(),
  concentration: z.coerce.boolean().optional(),
  ritual: z.coerce.boolean().optional(),
});

export const monsterFilterSchema = z.object({
  crMin: z.coerce.number().min(0).optional(),
  crMax: z.coerce.number().max(30).optional(),
  type: z.string().optional(),
  size: z.string().optional(),
});

export const itemFilterSchema = z.object({
  kind: z.enum(['WEAPON', 'ARMOR', 'SHIELD', 'GEAR', 'CONSUMABLE']).optional(),
  rarity: z.string().optional(),
  weaponCategory: z.enum(['SIMPLE', 'MARTIAL']).optional(),
  armorCategory: z.enum(['LIGHT', 'MEDIUM', 'HEAVY', 'SHIELD']).optional(),
});

/** Запись справочника: механика плюс тексты выбранного языка. */
export interface ReferenceEntry<T> {
  code: string;
  name: string;
  description: string;
  isFallback: boolean;
  data: T;
}

export interface TranslationCoverage {
  entity: string;
  total: number;
  translated: Record<string, number>;
}

/**
 * Поле таблицы переводов, которое правит редактор. `kind` решает, чем
 * поле рисуется — строкой или textarea, `required` повторяет
 * nullable-колонку в схеме (единственный сейчас необязательный —
 * higherLevels у заклинания).
 */
export interface TranslationField {
  name: string;
  kind: 'line' | 'text';
  required: boolean;
}

/**
 * Что редактор знает о сущности. Приходит с сервера, а не зашито во
 * фронтенде: набор текстов у сущностей разный, и второй его список
 * однажды разошёлся бы с первым молча.
 */
export interface TranslationEntitySchema {
  entity: ReferenceEntity;
  fields: TranslationField[];
}

/**
 * Строка списка в редакторе. `translation` — null, если перевода на
 * выбранный язык ещё нет. `source` — английский оригинал, всегда
 * только для чтения: переводят с него, а не с соседнего перевода;
 * при выбранном английском он не заполняется.
 */
export interface TranslationRecord {
  code: string;
  translation: Record<string, string | null> | null;
  source: Record<string, string | null> | null;
}

/**
 * Файл переводов. `entity` и `locale` лежат внутри, а не только в
 * адресе запроса: файл переживает выгрузку, пересылку и правку, и к
 * моменту загрузки никто уже не помнит, из какой он пары. При
 * загрузке они сверяются с выбранными в интерфейсе.
 */
export const translationFileSchema = z.object({
  entity: z.enum(REFERENCE_ENTITIES),
  locale: localeSchema,
  records: z.record(z.string(), z.record(z.string(), z.string().nullable())),
});

export type TranslationFile = z.infer<typeof translationFileSchema>;

/**
 * Сводка импорта — одна и та же у предпросмотра и у применения,
 * поэтому «что покажут» и «что произойдёт» нельзя описать по-разному.
 * unknownCodes — коды, которых нет в основной таблице: они
 * пропускаются, а не роняют весь файл.
 */
export interface TranslationImportSummary {
  create: number;
  update: number;
  unchanged: number;
  unknownCodes: string[];
}

export type ReferenceListQuery = z.infer<typeof referenceListQuerySchema>;
