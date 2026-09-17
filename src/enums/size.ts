import { z } from 'zod';

/**
 * Размер существа. Живёт отдельно от перечня сущностей справочника не
 * ради порядка в файлах: это свойство существа, а не раздел
 * справочника, и спрашивают его из разных мест — раса и монстр берут
 * его как поле, а боевая карта считает по нему, сколько клеток
 * занимает фишка (`footprint` в `rules/grid.ts`). Пока он лежал среди
 * REFERENCE_ENTITIES, правила сетки импортировали перечень разделов
 * справочника ради одного несвязанного с ним типа.
 */
export const SIZE_CATEGORIES = ['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN'] as const;
export const sizeCategorySchema = z.enum(SIZE_CATEGORIES);
export type SizeCategory = (typeof SIZE_CATEGORIES)[number];
