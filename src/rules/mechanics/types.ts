import type {
  AbilityCode,
  CharacterResourceCode,
  WeaponProperty,
  WeaponRangeType,
} from '../../enums/character.js';
import type { AdvantageMode } from '../../enums/dice.js';
import type { ActionEconomy, CombatAbility, ModifierPart } from '../../schemas/combat.js';

/**
 * Реестр механик (дизайн 15 октября, §3): «код → что делает в бою»
 * декларативной записью из граней. Перечни ниже закрыты нарочно —
 * произвольный код в данных нельзя ни вычислить на фронте, ни проверить
 * тестом полноты. Грани `reaction`, `trigger`, `zone`, `summon`,
 * `transform`, `resource` объявят их волны (3–7) вместе с первым
 * читателем: тип без читателя — обещание, которое никто не проверяет.
 */

/** Закрытый перечень условий. Нужного поля в контексте нет — условие ложно. */
export type Predicate =
  | 'noArmor'
  | 'noShield'
  | 'armored'
  | 'notHeavyArmor'
  | 'meleeWeapon'
  | 'rangedWeapon'
  | 'finesseOrRanged'
  | 'strengthAttack'
  /** Рукопашное, не двуручное, во второй руке нет оружия. */
  | 'oneHandedMelee'
  | 'advantage'
  | 'notDisadvantage'
  | 'allyAdjacentToTarget'
  | { anyOf: readonly Predicate[] };

/** Таблицы `progression.ts` по уровню носителя — закрытый перечень. */
export type AmountTable = 'rageDamage' | 'martialArtsDie' | 'sneakAttackDice' | 'unarmoredMovement';

/** Число грани: литерал, половина мастерства или таблица. */
export type Amount = number | 'halfProficiency' | { table: AmountTable };

export type ModifierTarget =
  | 'attack'
  | 'damage'
  | 'ac'
  | 'speed'
  | 'initiative'
  | 'skill'
  | 'hpPerLevel'
  /** Складывается максимумом, а не суммой: две «дополнительные атаки» — всё равно две. */
  | 'attacksPerAction';

interface Conditional {
  /** Все условия разом (И). */
  when?: readonly Predicate[];
}

export interface ModifierFacet extends Conditional {
  kind: 'modifier';
  target: ModifierTarget;
  amount: Amount;
  /** Подпись в раскладе броска — только из существующих MODIFIER_SOURCES. */
  source?: ModifierPart['source'];
}

/** КД вместо формулы «10 + Ловкость»: защита без доспехов и драконья стойкость. */
export interface AcFormulaFacet {
  kind: 'acFormula';
  base: number;
  ability: AbilityCode | null;
  shield: boolean;
}

export interface AdvantageFacet extends Conditional {
  kind: 'advantage';
  roll: 'save' | 'check' | 'attack' | 'incoming';
  ability?: AbilityCode;
  mode: 'ADVANTAGE' | 'DISADVANTAGE';
}

/** `'ANCESTRY'` — вид урона выбранного драконьего предка (`holder.ancestryDamageType`). */
export interface DefenseFacet extends Conditional {
  kind: 'defense';
  resistance: readonly string[];
}

export interface CritFacet {
  kind: 'crit';
  threshold: number;
}

export interface OnHitFacet extends Conditional {
  kind: 'onHit';
  dice: { count: Amount; sides: number; perSlotAbove?: number; max?: number };
  damageType: 'WEAPON' | string;
  oncePerTurn?: true;
  cost?: 'spellSlot';
  extraVs?: { creatureTypes: readonly string[]; count: number };
}

/** Эффекты со своей записью в `EFFECT_MECHANICS`. Код совпадает с `activeEffects` ответа. */
export type EffectCode = 'RAGE';

export interface ActionFacet {
  kind: 'action';
  ability: CombatAbility;
  economy: ActionEconomy;
  /** Открывает действие наличием ресурса, а не строкой умения (план волны 2, решение 2). */
  resource?: CharacterResourceCode;
  /** Пока эффект висит, кнопки нет. */
  applies?: EffectCode;
  /** Кнопка только при эффекте. */
  requiresEffect?: EffectCode;
}

/** Переключатели, меняющие выбор характеристики и кости, а не число. */
export interface RuleFacet {
  kind: 'rule';
  rule: 'martialArts' | 'offHandAbilityDamage';
}

export type Facet =
  | ModifierFacet
  | AcFormulaFacet
  | AdvantageFacet
  | DefenseFacet
  | CritFacet
  | OnHitFacet
  | ActionFacet
  | RuleFacet;

type MarkKey = 'outOfCombat' | 'holder' | 'tableDriven' | 'sheet';
/** Ровно одно поле из перечисленных — прочие запрещены типом (`never`). */
type Only<K extends 'facets' | MarkKey, V> = { [P in K]: V } & {
  [P in Exclude<'facets' | MarkKey, K>]?: never;
};

/**
 * Запись: грани или ровно одна пометка, почему граней нет (§3.3
 * дизайна). Поля `gm` в типе нет — его и не напишешь; запись с гранями
 * пометок не несёт, и две пометки разом тип тоже не пропустит. Что
 * строка пометки не пустая, проверяет тест полноты — типом это не
 * выразить.
 */
export type MechanicRecord =
  | Only<'facets', readonly Facet[]>
  | Only<'outOfCombat', string>
  /** `subclassStep` — заглушка ступени подкласса: в окне повышения не показывается. */
  | Only<'holder', 'choice' | 'subclassStep'>
  /** Ступенька, чьё число приходит из `progression.ts`; значение — код первой ступени. */
  | Only<'tableDriven', string>
  /** Действует через лист: владения, компетентность, ячейки, заклинания подкласса. */
  | Only<'sheet', string>;

export interface EffectMechanic {
  facets: readonly Facet[];
  expires: 'OWN_TURN_START' | 'OWN_TURN_END' | 'COMBAT_END';
  rounds?: number;
  /** Ярость: свой ход кончился без атаки и без полученного урона. */
  endsWhenIdle?: true;
  endsOnUnconscious?: true;
}

/**
 * Кто бросает. Сервер собирает из строки персонажа и участника; у
 * монстра `features` и `traits` пусты (до волны 7).
 */
export interface MechanicsHolder {
  level: number;
  /** CharacterFeature ∪ значения FEATURE_OPTION (стили боя). */
  features: ReadonlySet<string>;
  /** Коды черт источника; из предков — только выбранный. */
  traits: ReadonlySet<string>;
  /** Коды эффектов участника с записью в EFFECT_MECHANICS. */
  effects: readonly string[];
  proficiencyBonus: number;
  ancestryDamageType: string | null;
}

export interface MechanicsContext {
  armor?: { worn: 'LIGHT' | 'MEDIUM' | 'HEAVY' | null; shield: boolean };
  weapon?: {
    rangeType: WeaponRangeType;
    properties: readonly WeaponProperty[];
    ability: 'strength' | 'dexterity';
    offHandWeapon: boolean;
  };
  roll?: { mode: AdvantageMode; allyAdjacentToTarget: boolean };
}
