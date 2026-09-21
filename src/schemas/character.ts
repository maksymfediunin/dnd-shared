import { z } from 'zod';
import {
  ABILITY_CODES,
  abilityCodeSchema,
  alignmentSchema,
  classCodeSchema,
  genderSchema,
  levelChoiceTypeSchema,
  WEAPON_PROPERTIES,
} from '../enums/character.js';
import { POINT_BUY_MAX, POINT_BUY_MIN } from '../rules/abilities.js';

const codeSchema = z.string().trim().min(1).max(100);

/**
 * Границы здесь — границы покупки очков, а не всей шкалы: бюджет в
 * 27 очков проверяет сервис движком, но значение вне 8–15 покупкой
 * не набирается вовсе, и ловить его дешевле схемой.
 */
export const abilityScoreSchema = z.number().int().min(POINT_BUY_MIN).max(POINT_BUY_MAX);

export const abilityScoresSchema = z.object(
  Object.fromEntries(ABILITY_CODES.map((code) => [code, abilityScoreSchema])) as Record<
    (typeof ABILITY_CODES)[number],
    typeof abilityScoreSchema
  >,
);

/** Кость урона вида «2d6»: свободная строка приехала бы в боёвку. */
const damageDiceSchema = z.string().regex(/^\d+d\d+$/);

/**
 * Самодельное оружие описывается теми же полями, что и справочное,
 * чтобы движок правил не различал своё и справочное.
 */
export const customWeaponProfileSchema = z.object({
  category: z.enum(['SIMPLE', 'MARTIAL']),
  rangeType: z.enum(['MELEE', 'RANGED']),
  damageDice: damageDiceSchema,
  damageType: z.string().trim().min(1).max(50),
  versatileDice: damageDiceSchema.optional(),
  properties: z.array(z.enum(WEAPON_PROPERTIES)).default([]),
  normalRange: z.number().int().positive().optional(),
  longRange: z.number().int().positive().optional(),
  throwNormalRange: z.number().int().positive().optional(),
  throwLongRange: z.number().int().positive().optional(),
});

export const customArmorProfileSchema = z.object({
  category: z.enum(['LIGHT', 'MEDIUM', 'HEAVY', 'SHIELD']),
  baseAc: z.number().int().min(1).max(30),
  /** null — предела бонуса Ловкости нет; ноль — Ловкость не учитывается. */
  dexBonusCap: z.number().int().min(0).max(10).nullable().default(null),
  strengthRequirement: z.number().int().min(0).max(30).nullable().default(null),
  stealthDisadvantage: z.boolean().default(false),
});

/**
 * Предмет инвентаря: либо справочный код, либо своё название. Пустой
 * предмет без того и другого показать в листе нечем.
 */
export const characterItemInputSchema = z
  .object({
    itemCode: codeSchema.optional(),
    customName: z.string().trim().min(1).max(120).optional(),
    customWeaponProfile: customWeaponProfileSchema.optional(),
    customArmorProfile: customArmorProfileSchema.optional(),
    quantity: z.number().int().min(1).max(9999).default(1),
    isEquipped: z.boolean().default(false),
    slot: z.string().trim().max(50).optional(),
  })
  .refine((item) => Boolean(item.itemCode ?? item.customName), {
    message: 'Нужен код справочного предмета или своё название',
  });

/** Выбор одного из вариантов стартового снаряжения класса. */
export const equipmentChoiceSchema = z.object({
  choiceIndex: z.number().int().min(0),
  optionIndex: z.number().int().min(0),
});

/**
 * `.strict()` здесь по той же причине, что у updateMeSchema: без него
 * запрос с полем `level` или `ownerId` прошёл бы проверку, и защита
 * зависела бы от того, не забыл ли сервис отфильтровать поле руками.
 */
export const characterCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    raceCode: codeSchema,
    classCode: classCodeSchema,
    /**
     * Подкласс при создании нужен трём классам, у которых он
     * открывается на первом уровне: жрецу, чародею и колдуну. Без
     * этого поля их домен, происхождение и покровитель недостижимы
     * вовсе — повышение уровня спрашивает только про следующий
     * уровень, а первый уже позади. Остальным девяти поле не нужно:
     * им подкласс достанется на втором или третьем.
     */
    subclassCode: codeSchema.optional(),
    backgroundCode: codeSchema,
    gender: genderSchema,
    alignment: alignmentSchema,
    abilities: abilityScoresSchema,
    skillCodes: z.array(codeSchema).max(20).default([]),
    languageCodes: z.array(codeSchema).max(20).default([]),
    equipmentChoices: z.array(equipmentChoiceSchema).max(20).default([]),
    spellCodes: z.array(codeSchema).max(50).default([]),
    /**
     * Характеристики, которые игрок выбрал сам, когда раса даёт выбор
     * вместо жёсткой прибавки: у полуэльфа это «+1 к двум на выбор».
     * Без этого поля полуэльф молча получал только +2 к Харизме, а
     * две трети его расовой прибавки терялись.
     */
    chosenAbilityBonuses: z.array(abilityCodeSchema).max(6).default([]),
    /**
     * Выборы внутри классовых умений первого уровня: боевой стиль
     * воина, экспертиза плута, избранный враг следопыта. Умение
     * называется кодом, значение — кодом выбранного варианта.
     */
    featureChoices: z
      .array(z.object({ featureCode: codeSchema, value: codeSchema }))
      .max(20)
      .default([]),
    publicDescription: z.string().max(5000).optional(),
    biography: z.string().max(20000).optional(),
  })
  .strict();

/**
 * Правка меняет только то, что игрок правит руками. Уровень,
 * характеристики и класс сюда не входят: их меняет повышение уровня,
 * а не свободная правка листа. Портрет приходит отдельным маршрутом
 * загрузки файла.
 */
export const characterUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    alignment: alignmentSchema.optional(),
    publicDescription: z.string().max(5000).nullable().optional(),
    biography: z.string().max(20000).nullable().optional(),
    currentHitPoints: z.number().int().min(0).optional(),
    temporaryHitPoints: z.number().int().min(0).optional(),
    hitDiceRemaining: z.number().int().min(0).optional(),
    inspiration: z.boolean().optional(),
    items: z.array(characterItemInputSchema).max(200).optional(),
    preparedSpellCodes: z.array(codeSchema).max(100).optional(),
  })
  .strict();

/**
 * Отдых восполняет ячейки заклинаний. Вид один — долгий: короткий
 * отдых возвращает ячейки колдуна и классовые ресурсы (ярость, ки),
 * а их эта волна намеренно не трогает. Принимать 'SHORT' и ничего по
 * нему не делать нельзя: лист показал бы невосполненное как
 * восполненное, и игрок ушёл бы в бой с чужими числами.
 */
export const restSchema = z.object({ kind: z.literal('LONG') }).strict();

export const levelChoiceSchema = z.object({
  choiceType: levelChoiceTypeSchema,
  choiceValue: z.string().trim().min(1).max(100),
});

export const levelUpSchema = z
  .object({
    choices: z.array(levelChoiceSchema).max(20).default([]),
  })
  .strict();

export type AbilityScoresInput = z.infer<typeof abilityScoresSchema>;
export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;
export type CharacterUpdateInput = z.infer<typeof characterUpdateSchema>;
export type CharacterItemInput = z.infer<typeof characterItemInputSchema>;
export type CustomWeaponProfile = z.infer<typeof customWeaponProfileSchema>;
export type CustomArmorProfile = z.infer<typeof customArmorProfileSchema>;
export type RestInput = z.infer<typeof restSchema>;
export type LevelChoiceInput = z.infer<typeof levelChoiceSchema>;
export type LevelUpInput = z.infer<typeof levelUpSchema>;
