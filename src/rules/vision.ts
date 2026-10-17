import { type Placed, reachDistance } from './combat.js';
import { type Cell, cellKey, cellsOf, footprint, type Grid } from './grid.js';
import {
  MAP_OBSTACLE_COVER,
  MAP_OBSTACLE_LIGHT,
  type ObstaclePlacement,
  obstacleCells,
} from './obstacles.js';
import type { ZoneProps } from './spell-mechanics.js';
import { MAP_TERRAIN_RULES, type MapTerrain } from './terrain.js';

/**
 * Обзор, свет и укрытие на сетке (план волны 5, §4.1–4.2). Одно правило
 * на сервер и подпись броска на фронте: до волны 5 обзор считала
 * функция-приближение «стоит ли кто-то из двоих в тумане», и каждое
 * правило волн 3–4 («видит атакующего», «может слышать», засада)
 * опиралось на неё. Теперь те же вопросы задаются `sightOf`, а записи
 * реестра не меняются (разбор умений §1 п.2).
 *
 * Координаты отрезков — в клетках, непрерывные: клетка (x, y) занимает
 * квадрат [x, x+1) × [y, y+1), её угол — целые числа, центр — +½.
 */

export type LightLevel = 'BRIGHT' | 'DIM' | 'DARK';
export type Sight = 'CLEAR' | 'OBSCURED' | 'NONE';
export type Cover = 'NONE' | 'HALF' | 'THREE_QUARTERS' | 'TOTAL';

export interface Point {
  x: number;
  y: number;
}

/** Чувства смотрящего в футах; ноль — чувства нет. */
export interface Senses {
  darkvision: number;
  blindsight: number;
  truesight: number;
  devilsSight: number;
  seeInvisible: boolean;
}

export const NO_SENSES: Senses = Object.freeze({
  darkvision: 0,
  blindsight: 0,
  truesight: 0,
  devilsSight: 0,
  seeInvisible: false,
});

/** Источник света: клетки, от которых он светит, и радиусы в футах (тусклый — сверх яркого, как в SRD). */
export interface LightSource {
  cells: readonly Cell[];
  bright: number;
  dim: number;
}

export interface SceneVisionInput {
  grid: Grid;
  cellSizeFeet: number;
  lighting: LightLevel;
  terrain?: MapTerrain | null;
  obstacles: readonly (ObstaclePlacement & { blocksSight?: boolean })[];
  zones: readonly {
    cells: readonly string[];
    props: Pick<ZoneProps, 'obscure' | 'magicalDarkness'>;
  }[];
  lights: readonly LightSource[];
}

export interface SceneVision {
  grid: Grid;
  cellSizeFeet: number;
  /** Гасит обзор и свет: стена, высокое препятствие. */
  opaque: ReadonlySet<string>;
  /** Полное укрытие без заслона обзору (5б — «Силовая стена»); пока пусто. */
  solid: ReadonlySet<string>;
  /** Низкое препятствие: укрытие не больше трёх четвертей. */
  low: ReadonlySet<string>;
  /** Сильное заслонение: туман, облака. */
  heavy: ReadonlySet<string>;
  /** Лёгкое заслонение: паутина, рой насекомых. */
  lightObscured: ReadonlySet<string>;
  /** Магическая тьма: всегда темно, пробивают дьявольское и истинное зрение. */
  magicalDarkness: ReadonlySet<string>;
  /** Освещённость клетки; нет ключа — ярко. */
  light: ReadonlyMap<string, 'DIM' | 'DARK'>;
}

/** То же в массивах — для снимка сцены (JSON не знает множеств). */
export interface SerializedVision {
  grid: Grid;
  cellSizeFeet: number;
  opaque: string[];
  solid: string[];
  low: string[];
  heavy: string[];
  lightObscured: string[];
  magicalDarkness: string[];
  light: [string, 'DIM' | 'DARK'][];
}

const RANK: Record<LightLevel, number> = { DARK: 0, DIM: 1, BRIGHT: 2 };
const BY_RANK: LightLevel[] = ['DARK', 'DIM', 'BRIGHT'];

const center = (cell: Cell): Point => ({ x: cell.x + 0.5, y: cell.y + 0.5 });
const near = (value: number): boolean => Math.abs(value - Math.round(value)) < 1e-9;

/** Расстояние Чебышёва между клетками — как всё прочее на сетке D&D. */
const cellGap = (a: Cell, b: Cell): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * Чист ли отрезок от препятствий (решение 9). Выборка точек с шагом ⅛
 * клетки: точка внутри клетки проверяется по ней, точка на грани — по
 * обеим клеткам (отрезок вдоль стены из двух клеток не проходит между
 * ними, а вдоль одинокой — касается и не перекрыт), точка в углу сетки
 * пропускается — диагональ мимо двух угловых стен проходит.
 *
 * ponytail: осколок угла уже ⅛ клетки выборка не заметит; если всплывёт —
 * точный обход клеток (Amanatides–Woo).
 */
export function segmentClear(a: Point, b: Point, blocked: ReadonlySet<string>): boolean {
  if (blocked.size === 0) return true;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 8));
  for (let i = 1; i < steps; i += 1) {
    const px = a.x + (dx * i) / steps;
    const py = a.y + (dy * i) / steps;
    const onX = near(px);
    const onY = near(py);
    if (onX && onY) continue;
    if (onX) {
      const x = Math.round(px);
      const y = Math.floor(py);
      if (blocked.has(`${x - 1}:${y}`) && blocked.has(`${x}:${y}`)) return false;
      continue;
    }
    if (onY) {
      const x = Math.floor(px);
      const y = Math.round(py);
      if (blocked.has(`${x}:${y - 1}`) && blocked.has(`${x}:${y}`)) return false;
      continue;
    }
    if (blocked.has(`${Math.floor(px)}:${Math.floor(py)}`)) return false;
  }
  return true;
}

/** Клетки, через которые идёт отрезок, — для заслонения на линии. */
function cellsOnSegment(a: Point, b: Point): Set<string> {
  const out = new Set<string>();
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 8));
  for (let i = 0; i <= steps; i += 1) {
    const px = a.x + (dx * i) / steps;
    const py = a.y + (dy * i) / steps;
    if (near(px) || near(py)) continue;
    out.add(`${Math.floor(px)}:${Math.floor(py)}`);
  }
  return out;
}

const cellOfKey = (key: string): Cell => {
  const [x, y] = key.split(':').map(Number);
  return { x: x ?? 0, y: y ?? 0 };
};

/**
 * Свойства клеток сцены по трём слоям (решение 4): местность, препятствия
 * по виду (решение 11) и зоны заклинаний. Свет — от источников прямой
 * линией, непрозрачное его гасит; магическая тьма темна всегда.
 */
export function sceneVision(input: SceneVisionInput): SceneVision {
  const opaque = new Set<string>();
  const low = new Set<string>();
  const heavy = new Set<string>();
  const lightObscured = new Set<string>();
  const magicalDarkness = new Set<string>();

  for (const [key, kind] of Object.entries(input.terrain ?? {})) {
    if (MAP_TERRAIN_RULES[kind].blocksSight) opaque.add(key);
  }
  for (const o of input.obstacles) {
    const cover = o.blocksSight ? 'HIGH' : MAP_OBSTACLE_COVER[o.kind];
    if (cover === 'NONE') continue;
    for (const cell of obstacleCells(o.kind, { x: o.x, y: o.y }, o.scale)) {
      (cover === 'HIGH' ? opaque : low).add(cellKey(cell));
    }
  }
  for (const zone of input.zones) {
    for (const key of zone.cells) {
      // Тьма — свой слой: туман дьявольское зрение не пробивает, а тьму — да.
      if (zone.props.magicalDarkness) magicalDarkness.add(key);
      else if (zone.props.obscure === 'HEAVY') heavy.add(key);
      else if (zone.props.obscure === 'LIGHT') lightObscured.add(key);
    }
  }

  const light = new Map<string, 'DIM' | 'DARK'>();
  const base = RANK[input.lighting];
  const levels = new Map<string, number>();
  const raise = (key: string, rank: number) => {
    if (rank > (levels.get(key) ?? base)) levels.set(key, rank);
  };
  if (base < RANK.BRIGHT) {
    for (const source of input.lights) {
      const reach = Math.floor((source.bright + source.dim) / input.cellSizeFeet);
      const brightCells = Math.floor(source.bright / input.cellSizeFeet);
      for (const from of source.cells) {
        for (let y = from.y - reach; y <= from.y + reach; y += 1) {
          for (let x = from.x - reach; x <= from.x + reach; x += 1) {
            if (x < 0 || y < 0 || x >= input.grid.width || y >= input.grid.height) continue;
            const cell = { x, y };
            const gap = cellGap(from, cell);
            if (gap > 0 && !segmentClear(center(from), center(cell), opaque)) continue;
            raise(cellKey(cell), gap <= brightCells && source.bright > 0 ? RANK.BRIGHT : RANK.DIM);
          }
        }
      }
    }
    for (let y = 0; y < input.grid.height; y += 1) {
      for (let x = 0; x < input.grid.width; x += 1) {
        const key = cellKey({ x, y });
        const rank = levels.get(key) ?? base;
        if (rank < RANK.BRIGHT) light.set(key, rank === RANK.DIM ? 'DIM' : 'DARK');
      }
    }
  }
  for (const key of magicalDarkness) light.set(key, 'DARK');

  return {
    grid: input.grid,
    cellSizeFeet: input.cellSizeFeet,
    opaque,
    solid: new Set(),
    low,
    heavy,
    lightObscured,
    magicalDarkness,
    light,
  };
}

export function serializeVision(v: SceneVision): SerializedVision {
  return {
    grid: v.grid,
    cellSizeFeet: v.cellSizeFeet,
    opaque: [...v.opaque],
    solid: [...v.solid],
    low: [...v.low],
    heavy: [...v.heavy],
    lightObscured: [...v.lightObscured],
    magicalDarkness: [...v.magicalDarkness],
    light: [...v.light.entries()],
  };
}

export function deserializeVision(s: SerializedVision): SceneVision {
  return {
    grid: s.grid,
    cellSizeFeet: s.cellSizeFeet,
    opaque: new Set(s.opaque),
    solid: new Set(s.solid),
    low: new Set(s.low),
    heavy: new Set(s.heavy),
    lightObscured: new Set(s.lightObscured),
    magicalDarkness: new Set(s.magicalDarkness),
    light: new Map(s.light),
  };
}

/** Смотрящий: где стоит, на какой высоте (в клетках), чем видит, ослеплён ли. */
export interface Looker extends Placed {
  z?: number;
  senses: Senses;
  blinded: boolean;
}

/** Цель взгляда: невидима ли и подсвечена ли («Огонь фей» снимает выгоду невидимости). */
export interface Looked extends Placed {
  z?: number;
  invisible: boolean;
  revealed: boolean;
}

const feetBetween = (
  a: Placed & { z?: number },
  b: Placed & { z?: number },
  cellSizeFeet: number,
) => reachDistance(a, b) * cellSizeFeet;

function squareCorners(p: Placed): Point[] {
  const span = footprint(p.size);
  return [
    { x: p.x, y: p.y },
    { x: p.x + span, y: p.y },
    { x: p.x, y: p.y + span },
    { x: p.x + span, y: p.y + span },
  ];
}

function squareCenter(p: Placed): Point {
  const span = footprint(p.size);
  return { x: p.x + span / 2, y: p.y + span / 2 };
}

/** Есть ли линия обзора (DMG): от какой-нибудь точки одного пространства к другому. */
export function hasLineOfSight(a: Placed, b: Placed, opaque: ReadonlySet<string>): boolean {
  if (opaque.size === 0) return true;
  const from = [squareCenter(a), ...squareCorners(a)];
  const to = [squareCenter(b), ...squareCorners(b)];
  return from.some((p) => to.some((q) => segmentClear(p, q, opaque)));
}

/** Пробивает ли смотрящий магическую тьму на этом расстоянии. */
const piercesDarkness = (senses: Senses, feet: number) =>
  senses.devilsSight >= feet || senses.truesight >= feet;

/**
 * Освещённость клетки глазами смотрящего: тёмное зрение в своём радиусе
 * поднимает тьму до тусклого и тусклый до яркого; дьявольское и истинное
 * — сразу до яркого, и в магической тьме тоже.
 */
export function cellLightFor(viewer: Looker, cell: string, v: SceneVision): LightLevel {
  const at = cellOfKey(cell);
  const feet = feetBetween(viewer, { ...at, size: 'MEDIUM' }, v.cellSizeFeet);
  if (v.magicalDarkness.has(cell)) return piercesDarkness(viewer.senses, feet) ? 'BRIGHT' : 'DARK';
  const level = v.light.get(cell) ?? 'BRIGHT';
  if (level === 'BRIGHT' || piercesDarkness(viewer.senses, feet)) return 'BRIGHT';
  if (viewer.senses.darkvision >= feet) return BY_RANK[RANK[level] + 1] as LightLevel;
  return level;
}

/**
 * Правило обзора (решение 7), проверки по порядку: слепое зрение,
 * слепота, линия обзора, невидимость, сильное заслонение и тьма на
 * линии, освещённость клетки цели, засада. Темнота **между** двумя
 * зрению не мешает (освещённую цель видно через тёмное поле), туман —
 * мешает.
 */
export function sightOf(
  viewer: Looker,
  target: Looked,
  v: SceneVision,
  opts: { hiddenFromViewer?: boolean } = {},
): Sight {
  const feet = feetBetween(viewer, target, v.cellSizeFeet);
  const line = hasLineOfSight(viewer, target, v.opaque);
  if (viewer.senses.blindsight > 0 && viewer.senses.blindsight >= feet && line) return 'CLEAR';
  if (viewer.blinded || !line) return 'NONE';
  const trueSees = viewer.senses.truesight >= feet;
  if (target.invisible && !target.revealed && !viewer.senses.seeInvisible && !trueSees) {
    return 'NONE';
  }

  const targetCells = cellsOf(target, footprint(target.size)).map(cellKey);
  const onLine = new Set([
    ...cellsOf(viewer, footprint(viewer.size)).map(cellKey),
    ...targetCells,
    ...cellsOnSegment(squareCenter(viewer), squareCenter(target)),
  ]);
  for (const key of onLine) {
    if (v.heavy.has(key)) return 'NONE';
    if (v.magicalDarkness.has(key) && !piercesDarkness(viewer.senses, feet)) return 'NONE';
  }

  const best = Math.max(...targetCells.map((key) => RANK[cellLightFor(viewer, key, v)]));
  if (best === RANK.DARK) return 'NONE';
  if (opts.hiddenFromViewer) return 'NONE';
  if (best === RANK.DIM || targetCells.some((key) => v.lightObscured.has(key))) return 'OBSCURED';
  return 'CLEAR';
}

/** Прибавка укрытия к КД и спасброскам Ловкости. Полное — не прибавка, а запрет цели. */
export const COVER_BONUS: Record<Cover, number> = {
  NONE: 0,
  HALF: 2,
  THREE_QUARTERS: 5,
  TOTAL: 0,
};

const COVER_RANK: Cover[] = ['NONE', 'HALF', 'THREE_QUARTERS', 'TOTAL'];

/**
 * Укрытие цели от атакующего или от точки исхода области (решения 9–10,
 * правило DMG): от угла клетки атакующего к четырём углам клетки цели;
 * берутся лучший для атакующего угол и лучшая клетка цели. Перекрыто 1–2
 * линии — половинное, 3–4 — три четверти, все четыре стеной — полное.
 * Существа (кроме двоих) дают не больше половинного, низкие преграды — не
 * больше трёх четвертей, а с высоты от десяти футов (`aloft`) низкие не в счёт.
 */
export function coverOf(
  from: Placed | { point: Point },
  target: Placed,
  v: SceneVision,
  creatures: readonly Placed[],
  opts: { aloft?: boolean } = {},
): Cover {
  const hard = new Set([...v.opaque, ...v.solid]);
  const lowCells = opts.aloft ? new Set<string>() : v.low;
  const bodies = new Set<string>();
  for (const c of creatures) {
    for (const cell of cellsOf(c, footprint(c.size))) bodies.add(cellKey(cell));
  }
  if (hard.size === 0 && lowCells.size === 0 && bodies.size === 0) return 'NONE';

  const origins: Point[] =
    'point' in from
      ? [from.point]
      : cellsOf(from, footprint(from.size)).flatMap((cell) =>
          squareCorners({ x: cell.x, y: cell.y, size: 'MEDIUM' }),
        );
  let best = COVER_RANK.length - 1;
  for (const origin of origins) {
    for (const cell of cellsOf(target, footprint(target.size))) {
      let byHard = 0;
      let byLow = 0;
      let byBody = 0;
      for (const corner of squareCorners({ x: cell.x, y: cell.y, size: 'MEDIUM' })) {
        if (!segmentClear(origin, corner, hard)) byHard += 1;
        else if (!segmentClear(origin, corner, lowCells)) byLow += 1;
        else if (!segmentClear(origin, corner, bodies)) byBody += 1;
      }
      const blocked = byHard + byLow + byBody;
      let rank = byHard === 4 ? 3 : blocked >= 3 ? 2 : blocked >= 1 ? 1 : 0;
      if (byHard === 0 && byLow === 0) rank = Math.min(rank, 1);
      best = Math.min(best, rank);
      if (best === 0) return 'NONE';
    }
  }
  return COVER_RANK[best] as Cover;
}
