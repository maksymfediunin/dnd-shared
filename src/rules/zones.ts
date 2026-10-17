import { type Placed } from './combat.js';
import { type Cell, cellKey, cellsOf, footprint } from './grid.js';
import { spellMechanicFor, type ZoneProps } from './spell-mechanics.js';

/**
 * Зона заклинания как объект сцены (план волны 5, §4.6, решение 2):
 * экземпляр из `data` эффекта `SPELL_AREA`, свойства — из реестра при
 * чтении. Хранится зона по-прежнему эффектом на заклинателе: срок,
 * концентрация и снятие ведущим уже работают там.
 */
export interface SceneZone {
  /** Id эффекта `SPELL_AREA`. */
  id: string;
  spellCode: string;
  variant: string | null;
  /** Кто держит зону — заклинатель. */
  holderId: string;
  cells: ReadonlySet<string>;
  /** Точки зоны («Пляшущие огоньки», «Пылающая сфера», свет на предмете). */
  points: readonly Cell[];
  props: ZoneProps;
  /** Круг ячейки сотворения — «Дневной свет» снимает тьму до 3-го. */
  level: number | null;
}

const EMPTY: ZoneProps = Object.freeze({});

/** Свойства зоны по заклинанию и варианту; нет записи — пусто. */
export function zoneProps(spellCode: string, variant?: string | null): ZoneProps {
  return spellMechanicFor(spellCode, variant)?.zone ?? EMPTY;
}

export function zonesAt(zones: readonly SceneZone[], cell: string): SceneZone[] {
  return zones.filter((zone) => zone.cells.has(cell));
}

/** Стоит ли участник в «Тишине» целиком — каждой своей клеткой (разбор умений §1 п.3). */
export function silencedAt(zones: readonly SceneZone[], placed: Placed): boolean {
  const silent = zones.filter((zone) => zone.props.silence);
  if (silent.length === 0) return false;
  return cellsOf(placed, footprint(placed.size)).every((cell) =>
    silent.some((zone) => zone.cells.has(cellKey(cell))),
  );
}

const overlaps = (a: SceneZone, b: SceneZone) => [...a.cells].some((key) => b.cells.has(key));

/** Какие зоны рассеивает ветер («Порыв ветра» и туман, облака). */
export function dispersedBy(wind: SceneZone, zones: readonly SceneZone[]): string[] {
  if (!wind.props.disperses) return [];
  return zones
    .filter(
      (zone) => zone.id !== wind.id && zone.props.dispersedBy === 'WIND' && overlaps(wind, zone),
    )
    .map((zone) => zone.id);
}

/**
 * Какую тьму снимает свет (Р15): «Дневной свет» — сотворённую ячейкой не
 * выше 3-го круга, «Солнечная вспышка» — любую в своей области.
 */
export function darknessDispelledBy(light: SceneZone, zones: readonly SceneZone[]): string[] {
  const dispel = light.props.dispelDarkness;
  if (!dispel) return [];
  return zones
    .filter(
      (zone) =>
        zone.id !== light.id &&
        zone.props.magicalDarkness &&
        (dispel === 'ALL' || (zone.level ?? 0) <= dispel.upToLevel) &&
        overlaps(light, zone),
    )
    .map((zone) => zone.id);
}
