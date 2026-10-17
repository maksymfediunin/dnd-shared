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
   * Точка приложения. У сферы и цилиндра — левый верхний угол клетки
   * (пересечение линий сетки), у куба — ближний угол, у конуса и
   * линии — клетка заклинателя, от которой они идут.
   */
  origin: Cell;
  /**
   * Область исходит от существа, а не от точки: так у заклинания «на
   * себя». Сфера и цилиндр идут от его клетки во все стороны — у средней
   * фишки на клетку шире, чем от точки; куб примыкает к нему со стороны
   * `towards`.
   */
  fromCreature?: boolean;
  /** Куда направлены конус, линия и куб «на себя». Прочим формам направление не нужно. */
  towards?: Cell | null;
  /** Ширина линии в футах — у пяти дыханий 10 фт; нет — одна клетка. */
  widthFeet?: number;
  /**
   * Сторона фишки в клетках, от которой идут конус и линия (`origin` — её
   * левый верхний угол). Огромный дракон дышит из-под центра, а не из
   * угла: сторона берётся от центра фишки, начало — клетка её края со
   * стороны цели. Нет — одна клетка, как у средней фишки.
   */
  span?: number;
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
 * Откуда и куда идут конус и линия. У средней фишки — от её клетки. У
 * крупной сторона берётся от фишки целиком: по оси, где цель в пределах
 * фишки, хода нет, иначе — к цели; начало — клетка края со стороны цели,
 * поперёк — та, что напротив цели (SRD: точка начала конуса — любая на
 * краю существа). От геометрического центра у фишки 2×2 цель прямо под
 * левым столбцом ушла бы в диагональ мимо себя.
 */
function edgeTowards(
  corner: Cell,
  span: number,
  towards: Cell,
): { origin: Cell; direction: Cell } | null {
  const step = (axis: 'x' | 'y') =>
    towards[axis] < corner[axis] ? -1 : towards[axis] > corner[axis] + span - 1 ? 1 : 0;
  const direction = { x: step('x'), y: step('y') };
  if (direction.x === 0 && direction.y === 0) return null;
  const along = (axis: 'x' | 'y') =>
    direction[axis] > 0
      ? corner[axis] + span - 1
      : direction[axis] < 0
        ? corner[axis]
        : towards[axis];
  return { origin: { x: along('x'), y: along('y') }, direction };
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

  if (input.shape === 'CUBE' && input.fromCreature) {
    // Куб «на себя» («Волна грома») исходит от заклинателя: примыкает к
    // нему с выбранной стороны, а сам заклинатель в него не входит. Раньше
    // куб ложился от его клетки вправо-вниз — заклинатель всегда попадал
    // под собственную волну, а направить её было нельзя (отчёт со стола
    // 1 октября). По прямой куб стоит по центру стороны, по диагонали —
    // от угла.
    const direction = input.towards ? directionTo(input.origin, input.towards) : null;
    if (!direction) return cells;
    const along = (step: number, axis: number, centre: number): number =>
      step === 0
        ? centre - Math.floor((size - 1) / 2) + axis
        : step > 0
          ? centre + 1 + axis
          : centre - size + axis;
    for (let dy = 0; dy < size; dy += 1) {
      for (let dx = 0; dx < size; dx += 1) {
        add({
          x: along(direction.x, dx, input.origin.x),
          y: along(direction.y, dy, input.origin.y),
        });
      }
    }
    return cells;
  }

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
    // От точки — пересечения линий (DMG, области на сетке): радиус 20 фт
    // — 40 фт поперёк, восемь клеток, а не девять, как выходило от
    // центра клетки (отчёт со стола 1 октября про «Сон»).
    // Меньше клетки — одна клетка у точки, как и было: пустая область
    // молча сотворяла бы заклинание ни по кому.
    const last = input.fromCreature ? size : Math.max(size - 1, 0);
    for (let dy = -size; dy <= last; dy += 1) {
      for (let dx = -size; dx <= last; dx += 1) {
        add({ x: input.origin.x + dx, y: input.origin.y + dy });
      }
    }
    return cells;
  }

  // Дальше только конус и линия, и обоим нужно направление. Без него
  // области нет: выдумывать сторону за игрока значило бы накрыть не
  // тех, на кого он показывал.
  const from = input.towards ? edgeTowards(input.origin, input.span ?? 1, input.towards) : null;
  if (!from) return cells;
  const { origin, direction } = from;

  if (input.shape === 'LINE') {
    // Клетка заклинателя в линию не входит: линия идёт от него, а не
    // из-под него.
    // Шире клетки — полосы рядом, вбок по правую руку от направления.
    const width = Math.max(
      1,
      sizeInCells(input.widthFeet ?? input.cellSizeFeet, input.cellSizeFeet),
    );
    for (let step = 1; step <= size; step += 1) {
      for (let lane = 0; lane < width; lane += 1) {
        add({
          x: origin.x + direction.x * step - direction.y * lane,
          y: origin.y + direction.y * step + direction.x * lane,
        });
      }
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
      add({ x: origin.x + dx, y: origin.y + dy });
    }
  }

  return cells;
}

/**
 * Точка, от которой считается площадь. Конус и линия идут от
 * заклинателя — им нужна сторона, а не центр; «на себя» тоже ставит
 * область себе под ноги (огненные ладони, громовая волна). Всё
 * остальное ложится в клетку, по которой ударили.
 *
 * Переехала сюда из dnd-api: подсветка на карте ставила куб громовой
 * волны в клетку курсора, а сервер — под заклинателя, и игрок видел
 * одну область, а под удар попадала другая.
 */
export function areaOriginFor(input: {
  shape: SpellAreaShape;
  selfRange: boolean;
  casterCell: Cell;
  aimCell: Cell;
}): Cell {
  const fromCaster = input.selfRange || input.shape === 'CONE' || input.shape === 'LINE';
  return fromCaster ? input.casterCell : input.aimCell;
}
