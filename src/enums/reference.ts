import { z } from 'zod';

export const REFERENCE_ENTITIES = [
  'races',
  'racial-traits',
  'classes',
  'subclasses',
  'class-features',
  'backgrounds',
  'skills',
  'languages',
  'items',
  'weapon-profiles',
  'armor-profiles',
  'spells',
  'spell-classes',
  'conditions',
  'monsters',
  'monster-actions',
] as const;

export type ReferenceEntity = (typeof REFERENCE_ENTITIES)[number];

/**
 * Размер существа: одно перечисление на расу и на монстра. Нужен
 * боевой карте — по нему считается, сколько клеток занимает фишка
 * (`footprint` в `rules/grid.ts`).
 */
export const SIZE_CATEGORIES = ['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN'] as const;
export const sizeCategorySchema = z.enum(SIZE_CATEGORIES);
export type SizeCategory = (typeof SIZE_CATEGORIES)[number];
