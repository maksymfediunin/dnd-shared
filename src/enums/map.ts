import { z } from 'zod';

/** Четыре встроенных фона из ТЗ и CUSTOM — картинка, загруженная ведущим. */
export const MAP_BACKGROUNDS = ['FOREST', 'TAVERN', 'DUNGEON', 'RUINS', 'CUSTOM'] as const;
export const mapBackgroundSchema = z.enum(MAP_BACKGROUNDS);
export type MapBackground = (typeof MAP_BACKGROUNDS)[number];

/**
 * Набор препятствий из ТЗ («ветки/бочки/ящики/колоны»), дополненный
 * камнем, столом и лесной мелочью. Вид означает не только картинку, но
 * и отпечаток: длина бревна — часть вида, а не поле записи, потому что
 * спрайт рисуется под конкретную длину (§4 дизайна). Пары `_H`/`_V` —
 * цена снятого поворота: в трёх четвертях вертикальный вариант не
 * получается поворотом горизонтального, у него другой свет (§6).
 */
export const MAP_OBSTACLE_KINDS = [
  'BRANCH',
  'BARREL',
  'CRATE',
  'COLUMN',
  'ROCK',
  'TABLE',
  'BUSH',
  'STUMP',
  'STICK_H',
  'STICK_V',
  'LOG_H',
  'LOG_V',
  'TABLE_LONG_H',
  'TABLE_LONG_V',
  'COLUMN_FALLEN_H',
  'COLUMN_FALLEN_V',
  'ROCK_2',
  'BUSH_2',
  'CRATES_2',
  'RUBBLE_2',
  'ROCKS_3',
  'THICKET_H',
  'THICKET_V',
] as const;
export const mapObstacleKindSchema = z.enum(MAP_OBSTACLE_KINDS);
export type MapObstacleKind = (typeof MAP_OBSTACLE_KINDS)[number];

/** PREPARED — развёрнута, но игрокам не видна; ACTIVE — на столе. */
export const ENCOUNTER_STATUSES = ['PREPARED', 'ACTIVE', 'FINISHED'] as const;
export const encounterStatusSchema = z.enum(ENCOUNTER_STATUSES);
export type EncounterStatus = (typeof ENCOUNTER_STATUSES)[number];

/**
 * Границы сетки. 30 клеток по 5 футов — это 150 футов, дальше любого
 * оружия ближнего боя и почти любого заклинания; на телефоне в 390 px
 * клетка уже и так 12 px.
 */
export const MAP_MIN_GRID = 5;
export const MAP_MAX_GRID = 30;
export const MAP_DEFAULT_CELL_SIZE_FEET = 5;
/**
 * Сторона клетки в футах. Пять — правило D&D, но карта таверны бывает
 * и мельче, а карта осады крепости — крупнее; предел сверху держит
 * подпись расстояний в разумных числах.
 */
export const MAP_MIN_CELL_SIZE_FEET = 1;
export const MAP_MAX_CELL_SIZE_FEET = 20;

/** Пределы одного сохранения: это карта, а не склад. */
export const MAP_MAX_OBSTACLES = 200;
export const MAP_MAX_MONSTER_PRESETS = 30;
export const MAP_MAX_MONSTER_QUANTITY = 12;
