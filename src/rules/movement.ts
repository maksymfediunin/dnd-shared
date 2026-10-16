import type { ParticipantSide } from '../enums/combat.js';
import { SIZE_CATEGORIES } from '../enums/size.js';
import { isEnemy, type Placed } from './combat.js';
import { cellKey, cellsOf, footprint, type Grid } from './grid.js';
import { type ObstaclePlacement, obstacleBlockedCells } from './obstacles.js';
import type { ZoneProps } from './spell-mechanics.js';
import { MAP_TERRAIN_RULES, type MapTerrain } from './terrain.js';

/**
 * Проходимость клеток для одного шагающего (план волны 5, §4.4): три слоя
 * — местность, препятствия, зоны — и существа на пути. Одна функция на
 * сервер (цена шага) и подсветку на фронте: правила прохода сквозь
 * существ, полёта и поступи по земле иначе разошлись бы молча.
 */

/** Сквозь местность, которую летящий пролетает: пропасть, глубокая вода, лава. */
const FLYOVER = new Set(['CHASM', 'DEEP_WATER', 'LAVA']);

export interface MovementGridInput {
  grid: Grid;
  cellSizeFeet: number;
  terrain?: MapTerrain | null;
  obstacles: readonly (ObstaclePlacement & { blocksMovement: boolean })[];
  zones: readonly { cells: readonly string[]; props: Pick<ZoneProps, 'difficult' | 'ground'> }[];
  mover: Placed & {
    id: string;
    side?: ParticipantSide | null;
    monsterId?: string | null;
    /** На высоте и с полётом: пропасть и вода не держат, наземные зоны и трудность не действуют. */
    flying?: boolean;
    rules?: {
      /** Поступь по земле: немагическая трудность бесплатна. */
      ignoreNonmagicalDifficult?: boolean;
      /** Проворство полуросликов: сквозь любое существо крупнее себя. */
      moveThroughLarger?: boolean;
      /** Движение без доспехов 9: по глубокой воде, но не останавливаясь на ней. */
      liquidWalk?: boolean;
    };
  };
  others: readonly (Placed & {
    id: string;
    side?: ParticipantSide | null;
    monsterId?: string | null;
    isDead: boolean;
  })[];
}

export interface MovementGrid {
  /** Непроходимое. */
  walls: Set<string>;
  /** Трудное: шаг стоит две клетки. */
  difficult: Set<string>;
  /** Цена клетки зоны («Рост растений» — 4). */
  multipliers: Map<string, number>;
  /** Проходимое, но не для остановки: чужие существа, вода под монахом. */
  tokens: Set<string>;
}

const sizeRank = (p: Placed) => SIZE_CATEGORIES.indexOf(p.size);

export function movementGrid(input: MovementGridInput): MovementGrid {
  const { mover } = input;
  const rules = mover.rules ?? {};
  const walls = obstacleBlockedCells(input.obstacles.filter((o) => o.blocksMovement));
  const difficult = new Set<string>();
  const multipliers = new Map<string, number>();
  const tokens = new Set<string>();

  for (const [key, kind] of Object.entries(input.terrain ?? {})) {
    const rule = MAP_TERRAIN_RULES[kind];
    if (rule.blocksMovement) {
      if (mover.flying && FLYOVER.has(kind)) continue;
      if (rules.liquidWalk && kind === 'DEEP_WATER') {
        tokens.add(key);
        continue;
      }
      walls.add(key);
    } else if (rule.difficult && !mover.flying && !rules.ignoreNonmagicalDifficult) {
      difficult.add(key);
    }
  }

  for (const zone of input.zones) {
    if (!zone.props.difficult || (zone.props.ground && mover.flying)) continue;
    for (const key of zone.cells) {
      multipliers.set(key, Math.max(multipliers.get(key) ?? 1, zone.props.difficult));
    }
  }

  // PHB «Moving Around Other Creatures»: сквозь враждебного — только при
  // разнице размеров от двух; пространство любого другого — трудная
  // местность; остановиться в чужом нельзя (решение 23).
  for (const other of input.others) {
    if (other.isDead || other.id === mover.id) continue;
    const gap = sizeRank(other) - sizeRank(mover);
    const passable =
      !isEnemy(mover, other) ||
      Math.abs(gap) >= 2 ||
      (rules.moveThroughLarger === true && gap >= 1);
    for (const cell of cellsOf(other, footprint(other.size))) {
      const key = cellKey(cell);
      if (passable) {
        difficult.add(key);
        tokens.add(key);
      } else {
        walls.add(key);
      }
    }
  }

  return { walls, difficult, multipliers, tokens };
}
