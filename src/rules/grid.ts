import type { SizeCategory } from '../enums/size.js';

/**
 * Укладка фишек на сетке: чистая арифметика без базы и без React.
 * Здесь же она и проверяется — в куске 7 к этим функциям добавится
 * стоимость перемещения в футах, а правила укладки останутся теми же.
 */

export interface Cell {
  x: number;
  y: number;
}

export interface Grid {
  width: number;
  height: number;
}

/**
 * Фишка на сетке. Хранится углом и стороной квадрата, а не списком
 * своих клеток: огр — это одна фишка в одной клетке, которая задевает
 * четыре, и стоит ему сдвинуться, список пришлось бы пересобирать
 * целиком. Из угла и стороны список получается когда нужен (`cellsOf`),
 * обратно — нет.
 */
export interface Placement {
  origin: Cell;
  span: number;
}

/**
 * Сколько клеток по стороне занимает существо (PHB, «Размер
 * существ»). Мелочь и средние — одна клетка; дальше квадрат растёт.
 */
const FOOTPRINTS: Record<SizeCategory, number> = {
  TINY: 1,
  SMALL: 1,
  MEDIUM: 1,
  LARGE: 2,
  HUGE: 3,
  GARGANTUAN: 4,
};

export function footprint(size: SizeCategory): number {
  return FOOTPRINTS[size];
}

/**
 * Клетки под фишкой. Нужна везде, где занятость считается по клеткам,
 * а не по фишкам: проверка «свободно ли» обязана видеть все четыре
 * клетки огра, иначе в три из них встанет кто-то ещё. Угол — левый
 * верхний, потому что от него же считает CSS grid на фронте.
 */
export function cellsOf(origin: Cell, span: number): Cell[] {
  const cells: Cell[] = [];

  for (let dy = 0; dy < span; dy += 1) {
    for (let dx = 0; dx < span; dx += 1) {
      cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
  }

  return cells;
}

export function fitsInGrid(origin: Cell, span: number, grid: Grid): boolean {
  return (
    origin.x >= 0 &&
    origin.y >= 0 &&
    origin.x + span <= grid.width &&
    origin.y + span <= grid.height
  );
}

const key = (cell: Cell): string => `${cell.x}:${cell.y}`;

/**
 * Занятое одним множеством. Препятствие и чужая фишка для укладки
 * неразличимы — разница между ними появится только в куске 7, где
 * сквозь союзника пройти можно, а сквозь колонну нет.
 */
export function blockedCells(placements: Placement[]): Set<string> {
  const set = new Set<string>();

  for (const placement of placements) {
    for (const cell of cellsOf(placement.origin, placement.span)) set.add(key(cell));
  }

  return set;
}

export function isFree(origin: Cell, span: number, grid: Grid, blocked: Set<string>): boolean {
  return fitsInGrid(origin, span, grid) && cellsOf(origin, span).every((c) => !blocked.has(key(c)));
}

/**
 * Кольцо клеток на расстоянии `radius` от центра — квадратное, как и
 * положено сетке D&D, где диагональ стоит столько же, сколько прямая.
 */
function ring(center: Cell, radius: number): Cell[] {
  if (radius === 0) return [center];

  const cells: Cell[] = [];

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
      cells.push({ x: center.x + dx, y: center.y + dy });
    }
  }

  return cells;
}

/**
 * Ближайшая свободная клетка обходом по расширяющимся кольцам. Так
 * `quantity: 3` у пресета ставит гоблинов кучкой вокруг заданной
 * клетки, а не раскидывает по углам. `null` — места нет во всей сетке.
 */
export function findFreeCell(
  start: Cell,
  span: number,
  grid: Grid,
  blocked: Set<string>,
): Cell | null {
  const maxRadius = Math.max(grid.width, grid.height);

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (const cell of ring(start, radius)) {
      if (isFree(cell, span, grid, blocked)) return cell;
    }
  }

  return null;
}

/**
 * Место игрока при развёртывании — нижний край карты слева направо.
 * `index` задаёт, откуда начинать поиск: партия встаёт по порядку, а
 * не в одну кучу. Если край занят, ищем ближайшее свободное выше.
 */
export function bottomEdgeStart(
  index: number,
  span: number,
  grid: Grid,
  blocked: Set<string>,
): Cell | null {
  const y = grid.height - span;
  if (y < 0) return null;

  for (let x = Math.min(index, Math.max(grid.width - span, 0)); x + span <= grid.width; x += 1) {
    if (isFree({ x, y }, span, grid, blocked)) return { x, y };
  }

  return findFreeCell({ x: 0, y }, span, grid, blocked);
}
