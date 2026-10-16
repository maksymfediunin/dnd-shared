import type { Placed } from './combat.js';
import { reachDistance } from './combat.js';
import type { SpellResolution } from './spell-effect.js';
import { creatureTypeOf, type SpellMechanic, type TargetSpread } from './spell-mechanics.js';

/**
 * Фильтры целей заклинания (план волны 8, р. 5): кто вообще может быть
 * целью и на кого заклинание «не действует». Одна функция на сервер и
 * фронт: серая фишка в прицеле и отказ сервера обязаны совпадать.
 */

/** Цель глазами фильтра — то, что сервер знает о фишке до броска. */
export interface TargetInfo {
  /** Тип существа справочника; у персонажа — `humanoid` (все расы SRD такие). */
  type: string;
  /** Интеллект; у персонажа фильтры по нему не нужны — `null`. */
  intelligence: number | null;
  /** Надет доспех (щит не в счёт). */
  armored: boolean;
  /** Иммунитет к очарованию. */
  immuneToCharm: boolean;
  /** Слышит (не оглох). */
  hears: boolean;
  /** Видит заклинателя. */
  seesCaster: boolean;
}

/**
 * `REJECT` — отказ до траты ячейки (тип не тот, на цели доспех);
 * `NO_EFFECT` — ячейка потрачена, на цели ничего («the spell fails»).
 */
export type TargetVerdict = 'ALLOWED' | 'REJECT' | 'NO_EFFECT';

export function targetVerdict(mechanic: SpellMechanic | null, target: TargetInfo): TargetVerdict {
  const filter = mechanic?.targetFilter;
  const type = creatureTypeOf(target.type);
  if (filter?.types && !filter.types.includes(type)) return 'REJECT';
  if (filter?.noArmor && target.armored) return 'REJECT';
  if (filter?.excludeTypes?.includes(type)) return 'NO_EFFECT';
  const int = target.intelligence;
  if (int !== null && filter?.maxInt !== undefined && int > filter.maxInt) return 'NO_EFFECT';
  if (int !== null && filter?.minInt !== undefined && int < filter.minInt) return 'NO_EFFECT';
  if (filter?.canBeCharmed && target.immuneToCharm) return 'NO_EFFECT';
  if (!perceivesOk(mechanic?.perceives, target)) return 'NO_EFFECT';
  return 'ALLOWED';
}

/** Воспринимает ли цель заклинателя так, как требует заклинание. */
export function perceivesOk(
  list: SpellMechanic['perceives'],
  target: Pick<TargetInfo, 'hears' | 'seesCaster'>,
): boolean {
  return (list ?? []).every((need) => (need === 'HEAR' ? target.hears : target.seesCaster));
}

/**
 * Цели не дальше друг от друга, чем позволяет заклинание. Меряется тем
 * же `reachDistance`, что досягаемость, — по клеткам фишек: соседние по
 * диагонали — 5 футов, через клетку — 10. `POINT` — найдётся клетка
 * сетки, от которой все не дальше (сфера «Массового лечения ран»).
 */
export function spreadOk(
  spread: TargetSpread | undefined,
  targets: readonly Placed[],
  cellSizeFeet: number,
): boolean {
  if (!spread || targets.length < 2) return true;
  const within = (a: Placed, b: Placed) => reachDistance(a, b) * cellSizeFeet <= spread.withinFeet;
  const [first, ...rest] = targets as [Placed, ...Placed[]];
  switch (spread.from) {
    case 'PRIMARY':
      return rest.every((row) => within(first, row));
    case 'EACH_OTHER':
      return targets.every((a, i) => targets.slice(i + 1).every((b) => within(a, b)));
    case 'POINT': {
      const xs = targets.map((t) => t.x);
      const ys = targets.map((t) => t.y);
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1) {
        for (let y = Math.min(...ys); y <= Math.max(...ys); y += 1) {
          const point: Placed = { x, y, size: 'MEDIUM' };
          if (targets.every((t) => within(point, t))) return true;
        }
      }
      return false;
    }
  }
}

/** Состояния-благо: невидимость — не вред цели, хоть и «накладывается». */
const HARMLESS_CONDITIONS = ['invisible'];

/**
 * Вредно ли заклинание цели (р. 7 плана w8): урон, спасбросок, атака,
 * наложенное состояние или поправка во вред. Читают «Святилище» (вредное по носителю — сперва
 * спасбросок) и снятие очарования вредом стороны заклинателя.
 */
export function isHarmful(mechanic: SpellMechanic | null, resolution: SpellResolution): boolean {
  if (mechanic?.outOfCombat !== undefined) return false;
  if (['ATTACK', 'SAVE', 'SAVE_ONLY', 'AUTO_DAMAGE'].includes(resolution)) return true;
  const conditions = [
    ...(mechanic?.conditions ?? []),
    ...(mechanic?.variants ?? []).flatMap((v) => v.conditions ?? []),
  ];
  if (conditions.some((code) => !HARMLESS_CONDITIONS.includes(code))) return true;
  // Поправки во вред носителю («Неодолимый танец»: помеха и атаки по нему с преимуществом).
  return [mechanic?.modifiers, ...(mechanic?.variants ?? []).map((v) => v.modifiers)].some(
    (m) =>
      m !== undefined &&
      (m.ownAttacks === 'DISADVANTAGE' ||
        m.incoming === 'ADVANTAGE' ||
        (m.saveDisadvantage?.length ?? 0) > 0 ||
        (m.checkDisadvantage?.length ?? 0) > 0 ||
        (m.acPenalty ?? 0) > 0 ||
        m.noReactions === true ||
        m.noHealing === true ||
        m.cannotStand === true ||
        m.weaponDamageMultiplier !== undefined ||
        (m.speedMultiplier ?? 1) < 1),
  );
}

/**
 * Существа из неорганики — камень, кристалл, металл (Р8 разбора
 * заклинаний): «Дребезги» бьют их с помехой на спасбросок. Список закрыт:
 * признака в бестиарии нет, а разбирать текст описания на каждом броске
 * незачем. Плотяной голем и ковёр-душитель — не неорганика.
 */
export const INORGANIC_MONSTERS: readonly string[] = [
  'animated-armor',
  'flying-sword',
  'clay-golem',
  'iron-golem',
  'stone-golem',
  'shield-guardian',
  'earth-elemental',
  'gargoyle',
  'xorn',
];

/** Спасбросок этой цели — с помехой по типу (`saveByType`)? */
export function saveDisadvantageByType(
  mechanic: SpellMechanic | null,
  target: { type: string; monsterCode: string | null },
): boolean {
  const rule = mechanic?.saveByType?.disadvantage;
  if (!rule) return false;
  if (rule === 'INORGANIC') return INORGANIC_MONSTERS.includes(target.monsterCode ?? '');
  return rule.includes(creatureTypeOf(target.type));
}

/** Металлические доспехи справочника — «Шокирующая хватка» по ним с преимуществом. */
export const METAL_ARMOR_ITEMS: readonly string[] = [
  'chain-shirt',
  'scale-mail',
  'breastplate',
  'half-plate-armor',
  'ring-mail',
  'chain-mail',
  'splint-armor',
  'plate-armor',
];

/**
 * Монстры SRD в металлическом доспехе — по `armor_class[].armor`
 * бестиария (импорт поля не везёт, список закрыт), плюс оживлённые доспехи.
 */
export const METAL_ARMORED_MONSTERS: readonly string[] = [
  'animated-armor',
  'deep-gnome-svirfneblin',
  'drow',
  'duergar',
  'erinyes',
  'fire-giant',
  'guard',
  'half-red-dragon-veteran',
  'hobgoblin',
  'knight',
  'noble',
  'oni',
  'priest',
  'storm-giant',
  'veteran',
];
