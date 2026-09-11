import { z } from 'zod';
import { paginationSchema } from './common.js';
import { localeSchema } from '../enums/locale.js';

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

export type ReferenceListQuery = z.infer<typeof referenceListQuerySchema>;
