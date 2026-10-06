import type { MapObstacleKind } from '../enums/map.js';
import { type Cell, cellKey, type Grid } from './grid.js';

/**
 * Занятость препятствий. Отдельно от `grid.ts` намеренно: там фишка
 * существа — квадрат со стороной `span`, здесь препятствие —
 * прямоугольник `w×h`. Одно слово «занято» на два разных понятия в
 * одном файле заставляло бы читателя каждый раз выяснять, о каком из
 * них речь.
 */

export interface Footprint {
  w: number;
  h: number;
}

/** Препятствие глазами укладки: вид, угол и множитель размера. */
export interface ObstaclePlacement {
  kind: MapObstacleKind;
  x: number;
  y: number;
  /** Нет — значит 1: записи до появления размера его не несут. */
  scale?: number;
}

/**
 * Сколько клеток занимает вид. Единственная правда об этом на три
 * репозитория: по ней считает проходимость сервер, раскладывает сетку
 * фронт и режет атлас скрипт сборки. Разойтись им нечем.
 */
export const MAP_OBSTACLE_FOOTPRINT: Record<MapObstacleKind, Footprint> = {
  BRANCH: { w: 1, h: 1 },
  BARREL: { w: 1, h: 1 },
  CRATE: { w: 1, h: 1 },
  COLUMN: { w: 1, h: 1 },
  ROCK: { w: 1, h: 1 },
  TABLE: { w: 1, h: 1 },
  BUSH: { w: 1, h: 1 },
  STUMP: { w: 1, h: 1 },
  STICK_H: { w: 2, h: 1 },
  STICK_V: { w: 1, h: 2 },
  LOG_H: { w: 3, h: 1 },
  LOG_V: { w: 1, h: 3 },
  TABLE_LONG_H: { w: 3, h: 1 },
  TABLE_LONG_V: { w: 1, h: 3 },
  COLUMN_FALLEN_H: { w: 3, h: 1 },
  COLUMN_FALLEN_V: { w: 1, h: 3 },
  ROCK_2: { w: 2, h: 2 },
  BUSH_2: { w: 2, h: 2 },
  CRATES_2: { w: 2, h: 2 },
  RUBBLE_2: { w: 2, h: 2 },
  ROCKS_3: { w: 3, h: 2 },
  THICKET_H: { w: 3, h: 2 },
  THICKET_V: { w: 2, h: 3 },
  TREE: { w: 2, h: 2 },
  DEAD_TREE: { w: 1, h: 1 },
  PALM: { w: 1, h: 1 },
  STALAGMITE: { w: 1, h: 1 },
  CRYSTAL: { w: 1, h: 1 },
  REEDS: { w: 1, h: 1 },
  CACTUS: { w: 1, h: 1 },
  ICE_BLOCK: { w: 1, h: 1 },
  SNOWDRIFT_2: { w: 2, h: 2 },
  STATUE: { w: 1, h: 1 },
  ALTAR: { w: 1, h: 1 },
  SARCOPHAGUS_H: { w: 2, h: 1 },
  SARCOPHAGUS_V: { w: 1, h: 2 },
  TOMBSTONE: { w: 1, h: 1 },
  CHEST: { w: 1, h: 1 },
  WELL: { w: 1, h: 1 },
  CAMPFIRE: { w: 1, h: 1 },
  TENT: { w: 2, h: 2 },
  CART_H: { w: 3, h: 2 },
  CART_V: { w: 2, h: 3 },
  FENCE_H: { w: 3, h: 1 },
  FENCE_V: { w: 1, h: 3 },
  BOOKSHELF_H: { w: 2, h: 1 },
  BOOKSHELF_V: { w: 1, h: 2 },
  BED_H: { w: 2, h: 1 },
  BED_V: { w: 1, h: 2 },
  MAST: { w: 1, h: 1 },
  CANNON: { w: 1, h: 1 },
};

/** Отпечаток вида с множителем размера — пропорционально по обеим сторонам. */
export function obstacleFootprint(kind: MapObstacleKind, scale = 1): Footprint {
  const { w, h } = MAP_OBSTACLE_FOOTPRINT[kind];
  return { w: w * scale, h: h * scale };
}

/** Угол — левый верхний, как и у фишки: от него же считает CSS grid. */
export function obstacleCells(kind: MapObstacleKind, origin: Cell, scale = 1): Cell[] {
  const { w, h } = obstacleFootprint(kind, scale);
  const cells: Cell[] = [];

  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) cells.push({ x: origin.x + dx, y: origin.y + dy });
  }

  return cells;
}

export function obstacleFitsInGrid(
  kind: MapObstacleKind,
  origin: Cell,
  grid: Grid,
  scale = 1,
): boolean {
  const { w, h } = obstacleFootprint(kind, scale);

  return (
    origin.x >= 0 && origin.y >= 0 && origin.x + w <= grid.width && origin.y + h <= grid.height
  );
}

export function obstacleBlockedCells(obstacles: readonly ObstaclePlacement[]): Set<string> {
  const set = new Set<string>();

  for (const o of obstacles) {
    for (const cell of obstacleCells(o.kind, { x: o.x, y: o.y }, o.scale)) set.add(cellKey(cell));
  }

  return set;
}

/**
 * Индекс первого препятствия, чей отпечаток лёг на уже занятое. Именно
 * индекс, а не `boolean`: схема сохранения подсвечивает в форме
 * конкретную строку списка, и «где-то пересекается» ей не годится.
 */
export function firstObstacleOverlap(obstacles: readonly ObstaclePlacement[]): number | null {
  const taken = new Set<string>();

  // `.entries()`, а не индекс по `i`: `noUncheckedIndexedAccess` иначе
  // считает `obstacles[i]` возможным `undefined`, хотя цикл сам себя
  // ограничивает длиной массива.
  for (const [i, o] of obstacles.entries()) {
    const cells = obstacleCells(o.kind, { x: o.x, y: o.y }, o.scale);
    if (cells.some((c) => taken.has(cellKey(c)))) return i;
    for (const c of cells) taken.add(cellKey(c));
  }

  return null;
}

/**
 * Препятствие, **накрывающее** клетку. Ластик обязан работать по любой
 * клетке бревна, а не только по той, где его левый верхний угол: по
 * середине жмут чаще, чем по краю.
 */
export function obstacleAtCell<T extends ObstaclePlacement>(
  obstacles: readonly T[],
  cell: Cell,
): T | undefined {
  return obstacles.find((o) => {
    const { w, h } = obstacleFootprint(o.kind, o.scale);
    return cell.x >= o.x && cell.x < o.x + w && cell.y >= o.y && cell.y < o.y + h;
  });
}
