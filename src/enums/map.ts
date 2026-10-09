import { z } from 'zod';

/**
 * Встроенные фоны — четыре из ТЗ и десять локаций второго набора — и
 * CUSTOM, картинка, загруженная ведущим. CUSTOM последним: порядок
 * повторяет выбор фона в редакторе.
 */
export const MAP_BACKGROUNDS = [
  'FOREST',
  'TAVERN',
  'DUNGEON',
  'RUINS',
  'CAVE',
  'SWAMP',
  'SNOW',
  'DESERT',
  'COAST',
  'MEADOW',
  'CASTLE',
  'TEMPLE',
  'GRAVEYARD',
  'SHIP',
  'CUSTOM',
] as const;
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
  // Второй набор: природа новых локаций, погост и храм, лагерь и дорога,
  // покои и корабль.
  'TREE',
  'DEAD_TREE',
  'PALM',
  'STALAGMITE',
  'CRYSTAL',
  'REEDS',
  'CACTUS',
  'ICE_BLOCK',
  'SNOWDRIFT_2',
  'STATUE',
  'ALTAR',
  'SARCOPHAGUS_H',
  'SARCOPHAGUS_V',
  'TOMBSTONE',
  'CHEST',
  'WELL',
  'CAMPFIRE',
  'TENT',
  'CART_H',
  'CART_V',
  'FENCE_H',
  'FENCE_V',
  'BOOKSHELF_H',
  'BOOKSHELF_V',
  'BED_H',
  'BED_V',
  'MAST',
  'CANNON',
] as const;
export const mapObstacleKindSchema = z.enum(MAP_OBSTACLE_KINDS);
export type MapObstacleKind = (typeof MAP_OBSTACLE_KINDS)[number];

/**
 * Местность — то, что ведущий рисует кистью по клеткам (дизайн 7
 * октября): не предмет на клетке, а сама клетка. Порядок — как в
 * палитре: сначала то, что не пройти, потом то, что съедает ход.
 */
export const MAP_TERRAIN_KINDS = [
  'WALL',
  'DEEP_WATER',
  'CHASM',
  'LAVA',
  'SHALLOW_WATER',
  'MUD',
  'RUBBLE',
  'UNDERBRUSH',
] as const;
export const mapTerrainKindSchema = z.enum(MAP_TERRAIN_KINDS);
export type MapTerrainKind = (typeof MAP_TERRAIN_KINDS)[number];

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
 * Рисунки кистью ведущего (дизайн 9 октября). Пределы держат слой сцены,
 * который целиком уходит каждому зрителю при каждой правке, в разумном
 * весе: три сотни линий по паре тысяч точек — уже десятки килобайт.
 */
export const MAP_MAX_STROKES = 300;
export const MAP_MAX_STROKE_POINTS = 2000;
export const MAP_MIN_STROKE_WIDTH = 0.02;
export const MAP_MAX_STROKE_WIDTH = 1;

/**
 * Чьи хиты и КД видит игрок (дизайн 9 октября): только своей фишки,
 * героев или всех, включая монстров. Задаёт ведущий на всю сцену.
 */
export const STATS_VISIBILITIES = ['OWN', 'PARTY', 'ALL'] as const;
export type StatsVisibility = (typeof STATS_VISIBILITIES)[number];
/**
 * Сторона клетки в футах. Пять — правило D&D, но карта таверны бывает
 * и мельче, а карта осады крепости — крупнее; предел сверху держит
 * подпись расстояний в разумных числах.
 */
export const MAP_MIN_CELL_SIZE_FEET = 1;
export const MAP_MAX_CELL_SIZE_FEET = 20;

/** Пределы одного сохранения: это карта, а не склад. */
export const MAP_MAX_OBSTACLES = 200;
/**
 * Множитель размера препятствия: отпечаток вида `w×h` становится
 * `w·s × h·s`. Целый — сетка не знает полклеток; не меньше единицы — у
 * бревна 3×1 целого пропорционального уменьшения нет. Предел сверху —
 * бревно 9×3 уже треть самой большой карты.
 */
export const MAP_OBSTACLE_MIN_SCALE = 1;
export const MAP_OBSTACLE_MAX_SCALE = 3;
export const MAP_MAX_MONSTER_PRESETS = 30;
export const MAP_MAX_MONSTER_QUANTITY = 12;
