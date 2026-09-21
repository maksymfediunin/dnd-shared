import type { SpellAreaShape } from '../enums/spells.js';
import { type Cell, cellKey, fitsInGrid, type Grid } from './grid.js';

/**
 * Площади поражения на сетке. Живут в пакете по той же причине, что и
 * `reachableCellsFor`: подсветка области на карте и подбор целей на
 * сервере обязаны совпадать до клетки, а две реализации одного правила
 * расходятся при первой же правке (ревью волны «б», находка 3).
 *
 * Множество клеток того же вида `Set<"x:y">`, что и у досягаемости
 * хода, — ключ складывает `cellKey`, и пока он один, разойтись формату
 * нечем.
 */

export interface AreaInput {
  shape: SpellAreaShape;
  /** Радиус сферы, длина линии и конуса, сторона куба — в футах, как в SRD. */
  sizeFeet: number;
  /**
   * Точка приложения. У сферы и цилиндра — центр, у куба — ближний
   * угол, у конуса и линии — клетка заклинателя, от которой они идут.
   */
  origin: Cell;
  /** Куда направлены конус и линия. Прочим формам направление не нужно. */
  towards?: Cell | null;
  cellSizeFeet: number;
  grid: Grid;
}

/**
 * Размер области в клетках. Вниз, а не вверх: клетка, задетая краем
 * области, целиком в неё не входит — иначе подсветка обещала бы
 * игроку одно, а сервер считал бы целями другое.
 */
function sizeInCells(sizeFeet: number, cellSizeFeet: number): number {
  if (sizeFeet <= 0 || cellSizeFeet <= 0) return 0;
  return Math.floor(sizeFeet / cellSizeFeet);
}

/** Направление к цели, снятое до восьми сторон сетки. */
function directionTo(from: Cell, to: Cell): Cell | null {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (dx === 0 && dy === 0) return null;
  return { x: dx, y: dy };
}

/**
 * Смещение клетки в осях направления: «вперёд» и «вбок». Прямая и
 * диагональ считаются порознь, потому что у диагонали своя пара осей:
 * вперёд по ней — дальняя из двух составляющих, вбок — их разница. На
 * сетке D&D диагональ стоит столько же, сколько прямая, поэтому конус
 * по диагонали обязан выйти той же длины и ширины, что и по прямой.
 */
function inDirectionAxes(offset: Cell, direction: Cell): { forward: number; side: number } {
  if (direction.x === 0) return { forward: offset.y * direction.y, side: offset.x };
  if (direction.y === 0) return { forward: offset.x * direction.x, side: offset.y };

  const alongX = offset.x * direction.x;
  const alongY = offset.y * direction.y;
  return { forward: Math.max(alongX, alongY), side: alongX - alongY };
}

/**
 * Клетки области. Пустое множество — законный ответ, а не сбой: так
 * выглядит конус без направления и область, целиком ушедшая за край
 * сетки.
 *
 * Стены область не останавливают: укрытие и линия видимости — своя
 * работа, и делать её заодно волна не будет (§7 дизайна).
 */
export function cellsInArea(input: AreaInput): Set<string> {
  const size = sizeInCells(input.sizeFeet, input.cellSizeFeet);
  const cells = new Set<string>();
  const add = (cell: Cell): void => {
    // Ширина в одну клетку: область меряется клетками, а не фишками,
    // и крупная фишка попадает под неё любой своей клеткой.
    if (fitsInGrid(cell, 1, input.grid)) cells.add(cellKey(cell));
  };

  if (input.shape === 'CUBE') {
    // Угол — ближний к точке приложения, левый верхний, как у `cellsOf`
    // и у CSS grid на фронте: куб ставится от клетки под курсором, а не
    // вокруг неё.
    for (let dy = 0; dy < size; dy += 1) {
      for (let dx = 0; dx < size; dx += 1) {
        add({ x: input.origin.x + dx, y: input.origin.y + dy });
      }
    }
    return cells;
  }

  if (input.shape === 'SPHERE' || input.shape === 'CYLINDER') {
    // Расстояние Чебышёва, а не круг по теореме Пифагора: на сетке
    // D&D диагональ стоит столько же, сколько прямая, и радиус на ней
    // меряется так же (`ring` в grid.ts считает тем же правилом).
    // Цилиндр от сферы неотличим — сетка плоская (§7 дизайна).
    for (let dy = -size; dy <= size; dy += 1) {
      for (let dx = -size; dx <= size; dx += 1) {
        add({ x: input.origin.x + dx, y: input.origin.y + dy });
      }
    }
    return cells;
  }

  // Дальше только конус и линия, и обоим нужно направление. Без него
  // области нет: выдумывать сторону за игрока значило бы накрыть не
  // тех, на кого он показывал.
  const direction = input.towards ? directionTo(input.origin, input.towards) : null;
  if (!direction) return cells;

  if (input.shape === 'LINE') {
    // Клетка заклинателя в линию не входит: линия идёт от него, а не
    // из-под него.
    for (let step = 1; step <= size; step += 1) {
      add({ x: input.origin.x + direction.x * step, y: input.origin.y + direction.y * step });
    }
    return cells;
  }

  // Конус. Ширина на расстоянии равна самому расстоянию — правило
  // книги, положенное на клетки: вбок разрешено настолько, насколько
  // ушли вперёд, деля пополам в обе стороны. Отсюда и отсев клеток
  // позади: у них «вперёд» неположительно, а у клеток сбоку-назад
  // разница по осям всегда больше пройденного вперёд.
  for (let dy = -size; dy <= size; dy += 1) {
    for (let dx = -size; dx <= size; dx += 1) {
      const { forward, side } = inDirectionAxes({ x: dx, y: dy }, direction);
      if (forward < 1 || forward > size) continue;
      if (2 * Math.abs(side) > forward) continue;
      add({ x: input.origin.x + dx, y: input.origin.y + dy });
    }
  }

  return cells;
}
