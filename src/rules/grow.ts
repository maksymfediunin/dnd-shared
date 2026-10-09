import type { MapGridChange, MapGridSide } from '../enums/map.js';
import type { Grid } from './grid.js';
import type { MapTerrain } from './terrain.js';

/**
 * Ряд клеток с одного края: насколько меняется сетка и насколько
 * съезжает всё, что на ней стоит. Справа и снизу ряд пристраивается или
 * снимается за краем — содержимое на месте; слева и сверху меняется
 * начало сетки, и всё прежнее съезжает на клетку (наружу при добавлении,
 * внутрь при удалении). Что после сдвига оказалось за краем, отсекает
 * вызывающий — по своим правилам: на живой сцене фишку молча не убрать.
 */
export function resizeShift(
  side: MapGridSide,
  change: MapGridChange,
): { dx: number; dy: number; dw: number; dh: number } {
  const step = change === 'ADD' ? 1 : -1;
  const horizontal = side === 'LEFT' || side === 'RIGHT';
  return {
    dx: side === 'LEFT' ? step : 0,
    dy: side === 'TOP' ? step : 0,
    dw: horizontal ? step : 0,
    dh: horizontal ? 0 : step,
  };
}

/** Ключ клетки `x:y`, сдвинутый на (dx, dy) — им же хранятся зоны заклинаний. */
export function shiftCellKey(key: string, dx: number, dy: number): string {
  const [x, y] = key.split(':').map(Number);
  return `${(x ?? 0) + dx}:${(y ?? 0) + dy}`;
}

/** Клетка ключа внутри сетки — с обеих сторон, а не только справа и снизу. */
export function cellKeyInGrid(key: string, grid: Grid): boolean {
  const [x, y] = key.split(':').map(Number);
  return (
    x !== undefined && y !== undefined && x >= 0 && y >= 0 && x < grid.width && y < grid.height
  );
}

/** Местность, сдвинутая и обрезанная по новой сетке. */
export function shiftTerrain(terrain: MapTerrain, dx: number, dy: number, grid: Grid): MapTerrain {
  return Object.fromEntries(
    Object.entries(terrain)
      .map(([key, kind]) => [shiftCellKey(key, dx, dy), kind] as const)
      .filter(([key]) => cellKeyInGrid(key, grid)),
  );
}

/**
 * Линии, сдвинутые на (dx, dy); линия, хоть одной точкой ушедшая за
 * новый край, убирается целиком — резать её на куски незачем, это
 * пометка, а не стена. Точки плоским списком: чётные по x, нечётные по y.
 */
export function shiftDrawings<T extends { points: number[] }>(
  drawings: T[],
  dx: number,
  dy: number,
  grid: Grid,
): T[] {
  return drawings
    .map((stroke) => ({
      ...stroke,
      points: stroke.points.map((value, i) => value + (i % 2 === 0 ? dx : dy)),
    }))
    .filter((stroke) =>
      stroke.points.every(
        (value, i) => value >= 0 && value <= (i % 2 === 0 ? grid.width : grid.height),
      ),
    );
}
