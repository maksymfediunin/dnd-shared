import type { MapTerrainKind } from '../enums/map.js';
import type { Grid } from './grid.js';

/**
 * Слой местности: ключ клетки (`cellKey`) → вид. Словарь, а не список:
 * в клетке ровно один вид, и дублей не бывает по построению.
 */
export type MapTerrain = Record<string, MapTerrainKind>;

export interface TerrainRule {
  blocksMovement: boolean;
  /** Хранится на будущее: линию видимости считает кусок 10, не этот. */
  blocksSight: boolean;
  /** Шаг в такую клетку стоит две клетки хода. */
  difficult: boolean;
}

/**
 * Свойства закреплены за видом, а не за клеткой: переключателей у
 * ведущего нет, как нет их у препятствий. Одна таблица на сервер,
 * подсветку и сборщик текстур — разойтись им нечем. Глубокая вода
 * непроходима, а не «вплавь за двойную цену»: реку ведущий рисует
 * преградой, переправу — бродом.
 */
export const MAP_TERRAIN_RULES: Record<MapTerrainKind, TerrainRule> = {
  WALL: { blocksMovement: true, blocksSight: true, difficult: false },
  DEEP_WATER: { blocksMovement: true, blocksSight: false, difficult: false },
  CHASM: { blocksMovement: true, blocksSight: false, difficult: false },
  LAVA: { blocksMovement: true, blocksSight: false, difficult: false },
  SHALLOW_WATER: { blocksMovement: false, blocksSight: false, difficult: true },
  MUD: { blocksMovement: false, blocksSight: false, difficult: true },
  RUBBLE: { blocksMovement: false, blocksSight: false, difficult: true },
  UNDERBRUSH: { blocksMovement: false, blocksSight: false, difficult: true },
};

/**
 * Лежит ли клетка ключа в сетке. Сравнение «меньше», а не «больше или
 * равно» наоборот: у кривого ключа `Number` даёт NaN, и с ним любое
 * сравнение ложно — такая клетка честно оказывается вне сетки.
 */
export function terrainKeyInGrid(key: string, grid: Grid): boolean {
  const [x, y] = key.split(':').map(Number);
  return x !== undefined && y !== undefined && x < grid.width && y < grid.height;
}

/** Первый ключ за краем — схема подсвечивает в ответе именно его. */
export function terrainOutsideGrid(terrain: MapTerrain, grid: Grid): string | null {
  return Object.keys(terrain).find((key) => !terrainKeyInGrid(key, grid)) ?? null;
}

export function terrainCells(
  terrain: MapTerrain,
  test: (rule: TerrainRule) => boolean,
): Set<string> {
  const set = new Set<string>();
  for (const [key, kind] of Object.entries(terrain)) {
    if (test(MAP_TERRAIN_RULES[kind])) set.add(key);
  }
  return set;
}
