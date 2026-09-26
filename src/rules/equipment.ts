import type { WeaponCategory, WeaponRangeType } from '../enums/character.js';

/**
 * Состав неоружейных категорий стартового снаряжения SRD 5.1. Импорт
 * справочника категорию снаряжения у предмета не хранит (у него есть
 * только вид GEAR), а она нужна дважды: мастеру — показать, из чего
 * выбирать «любой магический фокус», серверу — проверить, что выбрали
 * именно из него. Справочник SRD неизменен, поэтому таблица, а не
 * новая колонка в базе.
 * ponytail: при своих предметах в справочнике — колонка категорий у Item.
 */
const GEAR_CATEGORIES: Record<string, readonly string[]> = {
  'holy-symbols': ['amulet', 'emblem', 'reliquary'],
  'arcane-foci': ['crystal', 'orb', 'rod', 'staff', 'wand'],
  'druidic-foci': ['sprig-of-mistletoe', 'totem', 'wooden-staff', 'yew-wand'],
  'musical-instruments': [
    'bagpipes',
    'drum',
    'dulcimer',
    'flute',
    'lute',
    'lyre',
    'horn',
    'pan-flute',
    'shawm',
    'viol',
  ],
  'artisans-tools': [
    'alchemists-supplies',
    'brewers-supplies',
    'calligraphers-supplies',
    'carpenters-tools',
    'cartographers-tools',
    'cobblers-tools',
    'cooks-utensils',
    'glassblowers-tools',
    'jewelers-tools',
    'leatherworkers-tools',
    'masons-tools',
    'painters-supplies',
    'potters-tools',
    'smiths-tools',
    'tinkers-tools',
    'weavers-tools',
    'woodcarvers-tools',
  ],
  'gaming-sets': ['dice-set', 'playing-card-set'],
};

/**
 * Оружейные категории выводятся из профиля оружия, а не перечисляются:
 * «простое рукопашное» — это ровно простое оружие ближнего боя, и
 * второй список однажды разошёлся бы со справочником.
 */
const WEAPON_CATEGORIES: Record<string, { category: WeaponCategory; rangeType?: WeaponRangeType }> =
  {
    'simple-weapons': { category: 'SIMPLE' },
    'simple-melee-weapons': { category: 'SIMPLE', rangeType: 'MELEE' },
    'simple-ranged-weapons': { category: 'SIMPLE', rangeType: 'RANGED' },
    'martial-weapons': { category: 'MARTIAL' },
    'martial-melee-weapons': { category: 'MARTIAL', rangeType: 'MELEE' },
    'martial-ranged-weapons': { category: 'MARTIAL', rangeType: 'RANGED' },
  };

export interface CategoryCandidate {
  code: string;
  /** Профиль оружия; у неоружия — `null`. */
  weapon: { category: WeaponCategory; rangeType: WeaponRangeType } | null;
}

/** Известна ли категория вообще — неизвестную выбирать не из чего. */
export function isKnownEquipmentCategory(category: string): boolean {
  return category in GEAR_CATEGORIES || category in WEAPON_CATEGORIES;
}

export function inEquipmentCategory(category: string, item: CategoryCandidate): boolean {
  const gear = GEAR_CATEGORIES[category];
  if (gear) return gear.includes(item.code);
  const weapon = WEAPON_CATEGORIES[category];
  if (!weapon || !item.weapon) return false;
  return (
    item.weapon.category === weapon.category &&
    (weapon.rangeType === undefined || item.weapon.rangeType === weapon.rangeType)
  );
}
