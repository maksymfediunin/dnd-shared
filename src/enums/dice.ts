import { z } from 'zod';

/**
 * Преимущество и помеха — не свойство любого броска, а правило для
 * одного d20: «брось два и возьми лучший». У 3d6 его не бывает, и
 * проверку этого несёт схема броска, а не перечисление.
 */
export const ADVANTAGE_MODES = ['NONE', 'ADVANTAGE', 'DISADVANTAGE'] as const;
export const advantageModeSchema = z.enum(ADVANTAGE_MODES);
export type AdvantageMode = (typeof ADVANTAGE_MODES)[number];

/** Скрытый бросок доступен только ведущему — это проверяет сервис. */
export const DICE_VISIBILITIES = ['PUBLIC', 'GM_ONLY'] as const;
export const diceVisibilitySchema = z.enum(DICE_VISIBILITIES);
export type DiceVisibility = (typeof DICE_VISIBILITIES)[number];

/** Кости из набора для настольной игры; d100 — пара d10 в наборе. */
export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
export const DICE_MIN_COUNT = 1;
export const DICE_MAX_COUNT = 20;
/** Больше по модулю не даёт ни одна поправка правил 2014 года. */
export const DICE_MODIFIER_LIMIT = 20;

/**
 * Видов сообщений два, а не четыре, как в §6.4 общего ТЗ: игроки не
 * пишут (голос в Meet), а системному событию в этом куске неоткуда
 * взяться — первое появится в куске 7.
 */
export const ROOM_MESSAGE_KINDS = ['GM_BROADCAST', 'GM_PRIVATE'] as const;
export const roomMessageKindSchema = z.enum(ROOM_MESSAGE_KINDS);
export type RoomMessageKind = (typeof ROOM_MESSAGE_KINDS)[number];
