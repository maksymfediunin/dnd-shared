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

/**
 * Боеприпасы SRD и чем ими стреляют. Серебро и адамантин стрелы решает
 * стопка боеприпаса, а не лук (р. 13 плана волны 7, ревью 7а п. 9):
 * серебрёный лук оборотню ничего не делает, серебряная стрела — делает.
 * ponytail: таблица SRD; свои боеприпасы — когда появится категория у Item.
 */
const AMMUNITION_BY_WEAPON: Readonly<Record<string, string>> = {
  longbow: 'arrow',
  shortbow: 'arrow',
  'crossbow-light': 'crossbow-bolt',
  'crossbow-hand': 'crossbow-bolt',
  'crossbow-heavy': 'crossbow-bolt',
  sling: 'sling-bullet',
  blowgun: 'blowgun-needle',
};

const AMMUNITION_CODES: ReadonlySet<string> = new Set(Object.values(AMMUNITION_BY_WEAPON));

/** Оружие SRD стреляет боеприпасом (лук, арбалет, праща, духовая трубка). */
export function shootsAmmunition(weaponCode: string | null | undefined): boolean {
  return weaponCode != null && AMMUNITION_BY_WEAPON[weaponCode] !== undefined;
}

/** Стопка — боеприпас вообще (строка инвентаря с кодом стрелы, болта…). */
export function isAmmunition(itemCode: string | null | undefined): boolean {
  return itemCode != null && AMMUNITION_CODES.has(itemCode);
}

/**
 * Годится ли боеприпас к оружию: у оружия SRD — свой вид, у самодельного
 * со свойством «боеприпас» — любой.
 */
export function ammunitionFits(
  weaponCode: string | null | undefined,
  ammoCode: string | null | undefined,
): boolean {
  if (!isAmmunition(ammoCode)) return false;
  const wanted = weaponCode ? AMMUNITION_BY_WEAPON[weaponCode] : undefined;
  return wanted === undefined || wanted === ammoCode;
}
