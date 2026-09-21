import { z } from 'zod';

/**
 * Машинная механика заклинания, приезжающая из SRD полями, а не
 * текстом описания. Перечни лежат здесь, а не в `enums/reference.ts`:
 * там список сущностей справочника, а это — значения колонок, которыми
 * бой считает урон и площадь.
 */

/**
 * Вид броска атаки заклинанием. Больше в SRD ничего нет: заклинание
 * либо бьёт как оружие (`attack_type`), либо требует спасброска, либо
 * не считается вовсе.
 */
export const SPELL_ATTACK_TYPES = ['MELEE', 'RANGED'] as const;
export const spellAttackTypeSchema = z.enum(SPELL_ATTACK_TYPES);
export type SpellAttackType = (typeof SPELL_ATTACK_TYPES)[number];

/**
 * Формы области поражения SRD, все пять. Цилиндр отдельным значением
 * хранится и отдаётся справочником, хотя считается как сфера (§7
 * дизайна): подменять его сферой в данных значило бы соврать о самом
 * заклинании, а плоская сетка — свойство карты, а не заклинания.
 */
export const SPELL_AREA_SHAPES = ['SPHERE', 'CUBE', 'CYLINDER', 'CONE', 'LINE'] as const;
export const spellAreaShapeSchema = z.enum(SPELL_AREA_SHAPES);
export type SpellAreaShape = (typeof SPELL_AREA_SHAPES)[number];

/**
 * Круги ячеек. Ноль — это кантрип, а кантрип ячеек не тратит, поэтому
 * круга ноль здесь нет: пустой круг у кантрипа обозначается
 * отсутствием значения, а не нулём (иначе «ячейка нулевого круга»
 * появилась бы и в схеме, и в базе).
 */
export const SPELL_SLOT_MIN_LEVEL = 1;
export const SPELL_SLOT_MAX_LEVEL = 9;

/**
 * Границы круга одной конструкцией: и вход маршрута сотворения, и
 * строка журнала проверяют её этими же числами — повторить форму
 * проверки у каждого себе значит однажды поправить только одну
 * (см. `exhaustionLevelSchema`, хвосты волны «б»).
 */
export const spellSlotLevelSchema = z
  .number()
  .int()
  .min(SPELL_SLOT_MIN_LEVEL)
  .max(SPELL_SLOT_MAX_LEVEL);
