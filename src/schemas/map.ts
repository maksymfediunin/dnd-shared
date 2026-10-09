import { z } from 'zod';
import { conditionCodeSchema, exhaustionLevelSchema } from '../enums/conditions.js';
import {
  MAP_DEFAULT_CELL_SIZE_FEET,
  MAP_GRID_SIDES,
  MAP_MAX_CELL_SIZE_FEET,
  MAP_MAX_DRAWING_POINTS,
  MAP_MAX_GRID,
  MAP_MAX_MONSTER_PRESETS,
  MAP_MAX_MONSTER_QUANTITY,
  MAP_MAX_OBSTACLES,
  MAP_MAX_STROKE_POINTS,
  MAP_MAX_STROKE_WIDTH,
  MAP_MAX_STROKES,
  MAP_MIN_CELL_SIZE_FEET,
  MAP_MIN_GRID,
  MAP_MIN_STROKE_WIDTH,
  MAP_OBSTACLE_MAX_SCALE,
  MAP_OBSTACLE_MIN_SCALE,
  mapBackgroundSchema,
  mapObstacleKindSchema,
  mapTerrainKindSchema,
  STATS_VISIBILITIES,
} from '../enums/map.js';
import { firstObstacleOverlap, obstacleFitsInGrid } from '../rules/obstacles.js';
import { type MapTerrain, terrainOutsideGrid } from '../rules/terrain.js';

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
  // Необязательное с единицей по умолчанию: заготовки и клиенты до
  // появления размера шлют препятствие без него.
  scale: z.number().int().min(MAP_OBSTACLE_MIN_SCALE).max(MAP_OBSTACLE_MAX_SCALE).default(1),
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
 * Слой местности. Лежит ли ключ в сетке, знает только тот, кому
 * известна сетка: `battleMapSaveSchema` ниже и сервис живой сцены.
 * Две цифры на координату — потолок сетки 30. Без ведущих нулей: ключ
 * обязан совпадать с `cellKey`, иначе «05:3» рисовалась бы клеткой
 * (5,3), а правила хода её не видели бы.
 */
export const mapTerrainSchema: z.ZodType<MapTerrain> = z
  .record(z.string().regex(/^(0|[1-9]\d?):(0|[1-9]\d?)$/), mapTerrainKindSchema)
  .refine((terrain) => Object.keys(terrain).length <= MAP_MAX_GRID * MAP_MAX_GRID, {
    message: 'Местности больше, чем клеток',
  });

export const encounterTerrainSaveSchema = z.object({ terrain: mapTerrainSchema });

/**
 * Линия кисти ведущего: координаты и толщина — в клетках, а не в
 * пикселях, чтобы линия масштабировалась с картой и поворачивалась на
 * объёмном виде. Точки — плоским массивом [x1, y1, x2, y2, …]: так слой
 * весит вдвое меньше, чем массивом пар.
 */
export const mapStrokeSchema = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  width: z.number().min(MAP_MIN_STROKE_WIDTH).max(MAP_MAX_STROKE_WIDTH),
  points: z
    .array(z.number().min(0).max(MAP_MAX_GRID))
    .min(4)
    .max(MAP_MAX_STROKE_POINTS * 2)
    .refine((points) => points.length % 2 === 0, { message: 'Координаты — парами' }),
});
export type MapStroke = z.infer<typeof mapStrokeSchema>;

export const mapDrawingsSchema = z
  .array(mapStrokeSchema)
  .max(MAP_MAX_STROKES)
  .refine(
    (drawings) =>
      drawings.reduce((sum, stroke) => sum + stroke.points.length / 2, 0) <= MAP_MAX_DRAWING_POINTS,
    { message: 'Слишком много точек в рисунках' },
  );
export type MapDrawings = z.infer<typeof mapDrawingsSchema>;

export const encounterDrawingsSaveSchema = z.object({ drawings: mapDrawingsSchema });
export type EncounterDrawingsSaveInput = z.infer<typeof encounterDrawingsSaveSchema>;

/**
 * Настройки сцены, которые ведущий меняет по ходу игры. Хиты и КД —
 * порознь: КД чужого героя секретом не считают, а хиты монстра — да.
 * Приходит то, что меняется, — хотя бы одно поле.
 */
export const encounterSettingsSchema = z
  .object({
    hpVisibility: z.enum(STATS_VISIBILITIES).optional(),
    acVisibility: z.enum(STATS_VISIBILITIES).optional(),
  })
  .refine((v) => v.hpVisibility !== undefined || v.acVisibility !== undefined, {
    message: 'Нечего менять',
  });
export type EncounterSettingsInput = z.infer<typeof encounterSettingsSchema>;

/** Ряд клеток к живой сцене — с одного края за раз. */
export const encounterGrowSchema = z.object({ side: z.enum(MAP_GRID_SIDES) });
export type EncounterGrowInput = z.infer<typeof encounterGrowSchema>;

/** Первая линия, выходящая за сетку, или `null`. */
export function drawingOutsideGrid(
  drawings: MapDrawings,
  grid: { width: number; height: number },
): number | null {
  const index = drawings.findIndex((stroke) =>
    stroke.points.some((value, i) => value > (i % 2 === 0 ? grid.width : grid.height)),
  );
  return index === -1 ? null : index;
}
export type EncounterTerrainSaveInput = z.infer<typeof encounterTerrainSaveSchema>;

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
    terrain: mapTerrainSchema.default({}),
    drawings: mapDrawingsSchema.default([]),
  })
  .superRefine((value, ctx) => {
    const grid = { width: value.gridWidth, height: value.gridHeight };

    // Препятствие проверяется отпечатком, а монстр — углом: у фишки
    // монстра размер берётся из бестиария и здесь неизвестен, а у
    // препятствия он есть прямо в виде.
    value.obstacles.forEach((o, i) => {
      if (!obstacleFitsInGrid(o.kind, { x: o.x, y: o.y }, grid, o.scale)) {
        ctx.addIssue({ code: 'custom', path: ['obstacles', i], message: 'Препятствие вне сетки' });
      }
    });

    const overlap = firstObstacleOverlap(value.obstacles);
    if (overlap !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['obstacles', overlap],
        message: 'Препятствия перекрываются',
      });
    }

    value.monsters.forEach((m, i) => {
      if (m.x >= value.gridWidth || m.y >= value.gridHeight) {
        ctx.addIssue({ code: 'custom', path: ['monsters', i], message: 'Монстр вне сетки' });
      }
    });

    const outside = terrainOutsideGrid(value.terrain, grid);
    if (outside !== null) {
      ctx.addIssue({ code: 'custom', path: ['terrain', outside], message: 'Местность вне сетки' });
    }

    const stroke = drawingOutsideGrid(value.drawings, grid);
    if (stroke !== null) {
      ctx.addIssue({ code: 'custom', path: ['drawings', stroke], message: 'Рисунок вне сетки' });
    }
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
    /**
     * Ход властью ведущего, вне правил очереди и бюджета футов. Раньше
     * ведущий был вне правил всегда — и за столом это выходило боком:
     * монстрам футы не списывались никогда, а случайный клик в чужой ход
     * двигал фишку игрока (отчёт 19 сентября). Теперь по умолчанию
     * ведущий играет по тем же правилам, а обход — осознанный шаг,
     * видимый в журнале. Игроку поле не помогает: служба отвечает
     * FORBIDDEN.
     */
    override: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Нечего менять' })
  .superRefine((v, ctx) => {
    if ((v.x === undefined) === (v.y === undefined)) return;

    // Путь указывает на ту координату, которой не хватает, а не всегда
    // на `x`: форма подсвечивает поле по пути ошибки, и на одиноком
    // `y` подсвечивалось бы пустое соседнее поле.
    ctx.addIssue({
      code: 'custom',
      path: [v.x === undefined ? 'x' : 'y'],
      message: 'Координаты меняются парой',
    });
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

/**
 * Наложение состояния ведущим. Срок необязателен: пусто — держится до
 * снятия рукой, и это основной случай, потому что стол ведёт человек.
 * Уровень принимается только у истощения — у остальных состояний
 * степени не бывает, а у истощения он обязателен: без него правила
 * читали бы состояние как первый уровень (`level ?? 1`), панель и значок
 * уровня его не показывали бы, и на экране осталась бы голая надпись
 * «Истощение» (хвосты волны «б», находка 5).
 */
export const conditionApplySchema = z
  .object({
    code: conditionCodeSchema,
    roundsRemaining: z.number().int().min(1).max(100).optional(),
    level: exhaustionLevelSchema.optional(),
    sourceParticipantId: z.uuid().optional(),
    /**
     * Каким заклинанием состояние держится. Необязательное и без
     * привязки к коду состояния — в отличие от `sourceParticipantId`
     * выше, который есть только у испуга: концентрационным заклинанием
     * держится что угодно, от опутывания до паралича. По нему состояние
     * уходит вместе с обрывом концентрации (§6 дизайна волны «в») —
     * без этого поля колонка базы осталась бы мёртвой, а «опутывание»
     * пережило бы своего заклинателя.
     */
    sourceSpellCode: z.string().min(1).max(64).optional(),
  })
  .refine((v) => v.level === undefined || v.code === 'exhaustion', {
    path: ['level'],
    message: 'Уровень есть только у истощения',
  })
  .refine((v) => v.code !== 'exhaustion' || v.level !== undefined, {
    path: ['level'],
    message: 'Уровень истощения обязателен',
  })
  // Симметрично уровню выше: источник кого-то бояться есть только у
  // испуга, у остальных четырнадцати кодов его никто не читает — присланный
  // лёг бы в базу мёртвым грузом (ревью волны «б», находка 4).
  .refine((v) => v.sourceParticipantId === undefined || v.code === 'frightened', {
    path: ['sourceParticipantId'],
    message: 'Источник есть только у испуга',
  });
export type ConditionApplyInput = z.infer<typeof conditionApplySchema>;
