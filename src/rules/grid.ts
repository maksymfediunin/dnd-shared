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

/**
 * Ключ клетки для множеств и карт этого файла. Экспортируется, потому
 * что `reachableCells` возвращает карту с такими ключами: сервер ищет
 * в ней клетку назначения, фронт сверяет подсветку, и пока ключ
 * складывает одна функция, разойтись им нечем.
 */
export const cellKey = (cell: Cell): string => `${cell.x}:${cell.y}`;

/**
 * Занятое одним множеством. Препятствие и чужая фишка для укладки
 * неразличимы — разница между ними появится только в куске 7, где
 * сквозь союзника пройти можно, а сквозь колонну нет.
 */
export function blockedCells(placements: Placement[]): Set<string> {
  const set = new Set<string>();

  for (const placement of placements) {
    for (const cell of cellsOf(placement.origin, placement.span)) set.add(cellKey(cell));
  }

  return set;
}

export function isFree(origin: Cell, span: number, grid: Grid, blocked: Set<string>): boolean {
  return (
    fitsInGrid(origin, span, grid) && cellsOf(origin, span).every((c) => !blocked.has(cellKey(c)))
  );
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

export interface ReachInput {
  from: Cell;
  span: number;
  grid: Grid;
  /** Непроходимое: стена, колонна, любое препятствие с `blocksMovement`. */
  walls: Set<string>;
  /** Проходимое, но не для остановки: чужие живые фишки. */
  tokens: Set<string>;
  maxSteps: number;
}

/**
 * Куда фишка дойдёт и во сколько шагов. Обход в ширину, а не круг по
 * расстоянию Чебышёва: круг считает клетку за стеной соседней, и до
 * этой функции сервер списывал за такой шаг цену прямой, а подсветка
 * на фронте уже вела фишку в обход — два правила на одно движение
 * (хвост 21 волны «а»).
 *
 * Шаг стоит одну клетку в любую из восьми сторон: диагональ на сетке
 * D&D не дороже прямой. Футы здесь не считаются — цена клетки в футах
 * зависит от сцены, а не от сетки, и живёт в правилах боя.
 */
export function reachableCells(input: ReachInput): Map<string, number> {
  const reached = new Map<string, number>();
  const seen = new Set([cellKey(input.from)]);
  let frontier: Cell[] = [input.from];

  for (let step = 1; step <= input.maxSteps && frontier.length > 0; step += 1) {
    const next: Cell[] = [];

    for (const from of frontier) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;

          const cell = { x: from.x + dx, y: from.y + dy };
          const key = cellKey(cell);
          if (seen.has(key)) continue;
          if (!isFree(cell, input.span, input.grid, input.walls)) continue;

          seen.add(key);
          next.push(cell);
          // Дорога и остановка — разные вопросы: сквозь союзника
          // проходят, а встать на него нельзя. Поэтому занятая клетка
          // остаётся во фронтире, но в ответ не попадает.
          if (isFree(cell, input.span, input.grid, input.tokens)) reached.set(key, step);
        }
      }
    }

    frontier = next;
  }

  return reached;
}
