import { z } from 'zod';
import {
  MAP_DEFAULT_CELL_SIZE_FEET,
  MAP_MAX_CELL_SIZE_FEET,
  MAP_MAX_GRID,
  MAP_MAX_MONSTER_PRESETS,
  MAP_MAX_MONSTER_QUANTITY,
  MAP_MAX_OBSTACLES,
  MAP_MIN_CELL_SIZE_FEET,
  MAP_MIN_GRID,
  MAP_ROTATION_STEP,
  mapBackgroundSchema,
  mapObstacleKindSchema,
} from '../enums/map.js';

/**
 * Потолок координаты — предельная сетка, а не сетка этой карты: о ней
 * схема поля не знает. Соответствие настоящим размерам проверяется
 * ниже, в superRefine, и это не дублирование, а две разные проверки.
 */
const coordinateSchema = z
  .number()
  .int()
  .min(0)
  .max(MAP_MAX_GRID - 1);
const gridSideSchema = z.number().int().min(MAP_MIN_GRID).max(MAP_MAX_GRID);
const monsterCodeSchema = z.string().trim().min(1).max(64);

export const mapObstacleInputSchema = z.object({
  kind: mapObstacleKindSchema,
  x: coordinateSchema,
  y: coordinateSchema,
  rotation: z
    .number()
    .int()
    .min(0)
    .max(360 - MAP_ROTATION_STEP)
    .refine((n) => n % MAP_ROTATION_STEP === 0, { message: 'Поворот кратен 45°' })
    .default(0),
  blocksMovement: z.boolean().default(true),
  blocksSight: z.boolean().default(false),
});
export type MapObstacleInput = z.infer<typeof mapObstacleInputSchema>;

export const mapMonsterPresetInputSchema = z.object({
  monsterCode: monsterCodeSchema,
  x: coordinateSchema,
  y: coordinateSchema,
  quantity: z.number().int().min(1).max(MAP_MAX_MONSTER_QUANTITY).default(1),
});
export type MapMonsterPresetInput = z.infer<typeof mapMonsterPresetInputSchema>;

/**
 * Одна схема на создание и на сохранение: `POST` заводит заготовку с
 * пустыми списками, `PUT` заменяет содержимое целиком. Две почти
 * одинаковые схемы разъехались бы на первой же правке.
 */
export const battleMapSaveSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    background: mapBackgroundSchema.default('DUNGEON'),
    gridWidth: gridSideSchema,
    gridHeight: gridSideSchema,
    cellSizeFeet: z
      .number()
      .int()
      .min(MAP_MIN_CELL_SIZE_FEET)
      .max(MAP_MAX_CELL_SIZE_FEET)
      .default(MAP_DEFAULT_CELL_SIZE_FEET),
    obstacles: z.array(mapObstacleInputSchema).max(MAP_MAX_OBSTACLES).default([]),
    monsters: z.array(mapMonsterPresetInputSchema).max(MAP_MAX_MONSTER_PRESETS).default([]),
  })
  .superRefine((value, ctx) => {
    const outside = (p: { x: number; y: number }): boolean =>
      p.x >= value.gridWidth || p.y >= value.gridHeight;

    value.obstacles.forEach((o, i) => {
      if (outside(o)) {
        ctx.addIssue({ code: 'custom', path: ['obstacles', i], message: 'Препятствие вне сетки' });
      }
    });
    value.monsters.forEach((m, i) => {
      if (outside(m)) {
        ctx.addIssue({ code: 'custom', path: ['monsters', i], message: 'Монстр вне сетки' });
      }
    });
  });
export type BattleMapSaveInput = z.infer<typeof battleMapSaveSchema>;

export const encounterDeploySchema = z.object({ mapId: z.uuid() });
export type EncounterDeployInput = z.infer<typeof encounterDeploySchema>;

/**
 * Что кому из этого можно — решает сервис, а не схема: игроку из всего
 * набора доступна только пара координат своей фишки.
 */
export const participantUpdateSchema = z
  .object({
    x: coordinateSchema.optional(),
    y: coordinateSchema.optional(),
    isVisibleToPlayers: z.boolean().optional(),
    currentHitPoints: z.number().int().min(0).optional(),
    temporaryHitPoints: z.number().int().min(0).optional(),
    displayName: z.string().trim().min(1).max(60).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Нечего менять' })
  .refine((v) => (v.x === undefined) === (v.y === undefined), {
    path: ['x'],
    message: 'Координаты меняются парой',
  });
export type ParticipantUpdateInput = z.infer<typeof participantUpdateSchema>;

export const participantAddSchema = z.object({
  monsterCode: monsterCodeSchema,
  x: coordinateSchema,
  y: coordinateSchema,
  quantity: z.number().int().min(1).max(MAP_MAX_MONSTER_QUANTITY).default(1),
  isVisibleToPlayers: z.boolean().default(true),
});
export type ParticipantAddInput = z.infer<typeof participantAddSchema>;
