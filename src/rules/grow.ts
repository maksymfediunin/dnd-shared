import type { MapGridSide } from '../enums/map.js';
import type { MapTerrain } from './terrain.js';

/**
 * Ряд клеток с одного края: на сколько растёт сетка и на сколько
 * сдвигается всё, что на ней стоит. Справа и снизу ряд пристраивается
 * за краем — содержимое на месте; слева и сверху новые клетки встают
 * в начало, и всё прежнее съезжает на одну.
 */
export function growShift(side: MapGridSide): { dx: number; dy: number; dw: number; dh: number } {
  return {
    dx: side === 'LEFT' ? 1 : 0,
    dy: side === 'TOP' ? 1 : 0,
    dw: side === 'LEFT' || side === 'RIGHT' ? 1 : 0,
    dh: side === 'TOP' || side === 'BOTTOM' ? 1 : 0,
  };
}

/** Ключ клетки `x:y`, сдвинутый на (dx, dy) — им же хранятся зоны заклинаний. */
export function shiftCellKey(key: string, dx: number, dy: number): string {
  const [x, y] = key.split(':').map(Number);
  return `${(x ?? 0) + dx}:${(y ?? 0) + dy}`;
}

export function shiftTerrain(terrain: MapTerrain, dx: number, dy: number): MapTerrain {
  return Object.fromEntries(
    Object.entries(terrain).map(([key, kind]) => [shiftCellKey(key, dx, dy), kind]),
  );
}

/** Точки линии плоским списком `[x1, y1, x2, y2, …]` — чётные по x, нечётные по y. */
export function shiftDrawings<T extends { points: number[] }>(
  drawings: T[],
  dx: number,
  dy: number,
): T[] {
  return drawings.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((value, i) => value + (i % 2 === 0 ? dx : dy)),
  }));
}
