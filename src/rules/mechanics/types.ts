import type {
  AbilityCode,
  CharacterResourceCode,
  WeaponProperty,
  WeaponRangeType,
} from '../../enums/character.js';
import type { ConditionCode } from '../../enums/conditions.js';
import type { AdvantageMode } from '../../enums/dice.js';
import type { SizeCategory } from '../../enums/size.js';
import type {
  ActionEconomy,
  AttackVia,
  BasicAction,
  CastOption,
  CombatAbility,
  ModifierPart,
  ReactionAbility,
  WindowEvent,
} from '../../schemas/combat.js';

/**
 * Реестр механик (дизайн 15 октября, §3): «код → что делает в бою»
 * декларативной записью из граней. Перечни ниже закрыты нарочно —
 * произвольный код в данных нельзя ни вычислить на фронте, ни проверить
 * тестом полноты. Грани `reaction`, `zone`, `summon`, `transform`
 * объявят их волны (4–7) вместе с первым читателем: тип без читателя —
 * обещание, которое никто не проверяет.
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
  /** Ход носителя — безрассудство (`ctx.turn.isOwn`). */
  | 'ownTurn'
  /** В этом ходу пройдено не больше половины скорости — высшая скрытность. */
  | 'movedAtMostHalfSpeed'
  /** Цель видит атакующего — уклонение (`ctx.roll.targetSeesAttacker`). */
  | 'attackerSeen'
  /** Носитель не недееспособен и скорость больше нуля — уклонение (`ctx.bearer.alert`). */
  | 'bearerAlert'
  /** Оружие — клинок договора (`ctx.weapon.pact`). */
  | 'pactWeapon'
  /** Атака дана шквалом ударов — открытая ладонь. */
  | 'viaFlurry'
  /** Бьют тем предметом, что записан в данных эффекта, — священное оружие. */
  | 'effectItemIsWeapon'
  /** Бьют того, кто записан в данных эффекта, — помощь. */
  | 'effectTargetIsTarget'
  // Волна 4 (разбор умений, П1.1). Обзор и слух до волны 5 — приближение:
  // смотрящий не ослеплён, цель не невидима, слушатель не оглох.
  /** На носителе ярость — бездумная ярость (`holder.effects`). */
  | 'raging'
  /** Носитель в сознании — ауры паладина (`ctx.bearer.conscious`). */
  | 'bearerConscious'
  /** В руке щит — «Оборона» (`ctx.armor.shield`). */
  | 'shield'
  /** Носитель видит бросающего — «Острое словцо» (`ctx.actor.seen`). */
  | 'actorSeen'
  /** Носитель видит источник эффекта со спасброском — чувство опасности. */
  | 'sourceSeen'
  /** Бросающий слышит носителя — «Острое словцо» (`ctx.actor.hearsBearer`). */
  | 'actorHearsBearer'
  /** Получатель ауры слышит её носителя — противодействие очарованию. */
  | 'canHearBearer'
  /** Цель — не носитель: «Оборона» прикрывает другого (`ctx.target.id`, `ctx.bearer.id`). */
  | 'targetNotSelf'
  /** Дальнобойная атака оружием — отражение снарядов (`ctx.attack`). */
  | 'rangedWeaponAttack'
  /** Входящая атака — при отходе: уход от орды (`ctx.attack.isOpportunity`). */
  | 'incomingOpportunityAttack'
  /** Источник спасброска магический — гномья хитрость (`ctx.save.magical`). */
  | 'vsMagic'
  /** Провал даёт урон ядом или «отравлен» — дварфийская стойкость. */
  | 'vsPoison'
  /** Лишний урон не меньше максимума хитов — стойкость полуорка не спасает. */
  | 'killedOutright'
  // Волна 5 (план, §3.2).
  /** Носитель в тусклом свете или темноте — «Единство с тенями» (`ctx.bearer.light`). */
  | 'bearerInDimOrDark'
  /** Спасбросок против растений, мешающих движению, — поступь по земле (`ctx.save.spellTags`). */
  | 'vsImpedingPlants'
  | { anyOf: readonly Predicate[] }
  | { not: Predicate }
  /** На носителе нет ни одного из этих состояний — чувство опасности. */
  | { bearerNot: readonly ConditionCode[] }
  /** У бросающего иммунитет к состоянию — «Острое словцо» и очарование. */
  | { actorImmune: ConditionCode }
  /** Атакующий не меньше этого размера — убийца великанов (`ctx.actor.size`). */
  | { attackerSizeAtLeast: SizeCategory }
  /** Провал спасброска накладывает это состояние — храбрость, стальная воля. */
  | { vsCondition: ConditionCode }
  /** Носитель не дальше стольких футов от цели или атакующего (`ctx.distances`). */
  | { withinFeet: number; of: 'target' | 'attacker' };

/** Таблицы `progression.ts` по уровню носителя — закрытый перечень. */
export type AmountTable =
  | 'rageDamage'
  | 'martialArtsDie'
  | 'sneakAttackDice'
  | 'unarmoredMovement'
  | 'bardicInspirationDie';

/**
 * Число грани. `{ ability }` — модификатор характеристики носителя: он
 * есть, где под рукой лист (`holder.abilityModifiers`), иначе ноль.
 */
export type Amount =
  | number
  | 'halfProficiency'
  | 'proficiency'
  | 'level'
  | { table: AmountTable }
  | { ability: AbilityCode; min?: number }
  | { times: number; of: Amount }
  | { sum: readonly Amount[]; min?: number };

/** СЛ умения: заклинательная листа или 8 + БМ + модификатор характеристики. */
export type SaveDc = 'spell' | { ability: AbilityCode };

export type ModifierTarget =
  | 'attack'
  /** Спасброски — аура защиты. */
  | 'save'
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
  roll: 'save' | 'check' | 'attack' | 'incoming' | 'initiative';
  ability?: AbilityCode;
  /** Несколько характеристик — гномья хитрость (ИНТ, МДР, ХАР). */
  abilities?: readonly AbilityCode[];
  /** Код навыка справочника («stealth»): проверка только этого навыка. */
  skill?: string;
  mode: 'ADVANTAGE' | 'DISADVANTAGE';
}

/**
 * `'ANCESTRY'` — вид урона драконьего предка драконорождённого
 * (`holder.ancestryDamageType`), `'SORCERER_ANCESTRY'` — предка чародея
 * (`holder.sorcererAncestryDamageType`): у драконорождённого-чародея они
 * могут разниться.
 */
export interface DefenseFacet extends Conditional {
  kind: 'defense';
  resistance?: readonly string[];
  /** Виды урона, которые не проходят вовсе — чистота тела, защита природы. */
  immunity?: readonly string[];
  /** Состояния, которые не ложатся. */
  conditionImmunity?: readonly ConditionCode[];
  /** Иммунитет к состояниям — только от источника этих типов (защита природы). */
  vsSourceType?: readonly string[];
  /** Уже наложенное не снимается, а приостанавливается (бездумная ярость, ауры). */
  suspends?: true;
  /** Иммунитет к болезням; болезни читают черты монстров волны 7. */
  disease?: true;
}

export interface CritFacet {
  kind: 'crit';
  threshold: number;
}

/** Следствие попадания по выбору на шаге урона: спасбросок цели и что на провале. */
export interface Rider {
  save?: { ability: AbilityCode; dc: SaveDc };
  condition?: ConditionCode;
  effect?: EffectCode;
  push?: { feet: number };
  /** Одно на выбор (открытая ладонь) — ключ приходит во входе урона. */
  options?: readonly (Rider & { key: 'PRONE' | 'PUSH' | 'NO_REACTIONS' })[];
}

export interface OnHitFacet extends Conditional {
  kind: 'onHit';
  /** Нет — грань не бросает костей, а несёт следствие (`rider`). */
  dice?: { count: Amount; sides: number; perSlotAbove?: number; max?: number };
  damageType?: 'WEAPON' | string;
  oncePerTurn?: true;
  cost?: 'spellSlot' | { resource: CharacterResourceCode; amount: number };
  rider?: Rider;
  extraVs?: { creatureTypes: readonly string[]; count: number };
}

/** Эффекты со своей записью в `EFFECT_MECHANICS`. Код совпадает с `activeEffects` ответа. */
export type EffectCode =
  | 'RAGE'
  | 'FRENZY'
  | 'RECKLESS'
  | 'DODGING'
  | 'DISENGAGED'
  | 'HELPED'
  | 'HELPED_CHECK'
  | 'HIDDEN'
  | 'READIED'
  | 'INSPIRED'
  | 'TURNED'
  | 'INTIMIDATED'
  | 'INTIMIDATE_IMMUNE'
  | 'SACRED_WEAPON'
  | 'NO_REACTIONS'
  | 'STUNNING_STRIKE'
  | 'ELEMENTAL_AFFINITY'
  | 'MULTIATTACK_DEFENSE'
  | 'COUNTERCHARM'
  | 'ONE_WITH_SHADOWS';

/**
 * Что нужно ввести, нажимая кнопку. Постоянные варианты лежат здесь;
 * изменчивые (ячейки, предметы, состояния на себе) добавляет сервер.
 */
export interface ActionInputSpec {
  target: 'NONE' | 'CREATURE' | 'ALLY_AND_FOE' | 'ALLOCATE' | 'AREA';
  rangeFeet?: number;
  options?: readonly string[];
}

export interface ActionFacet {
  kind: 'action';
  ability: CombatAbility | BasicAction;
  economy: ActionEconomy;
  resource?: CharacterResourceCode;
  /** Сколько ресурса стоит; по умолчанию 1. `chosen` — число во входе (наложение рук). */
  cost?: number | 'chosen';
  /**
   * Открывает действие наличием ресурса, а не строкой умения — только у
   * трёх действий волны 2 (план волны 3, решение 2): у них в тестах
   * носитель без умений.
   */
  openedByResource?: true;
  /** Эффект, который действие накладывает: пока висит, кнопки нет. */
  applies?: EffectCode;
  /** Кнопка только при эффекте. */
  requiresEffect?: EffectCode;
  /** Только после совершённого действия «Атака» в этом ходу. */
  availableAfter?: 'attackAction';
  input?: ActionInputSpec;
}

/** Переключатели, меняющие выбор характеристики и кости, а не число. */
export interface RuleFacet extends Conditional {
  kind: 'rule';
  rule:
    | 'martialArts'
    | 'offHandAbilityDamage'
    /** Ярость: ни колдовать, ни держать концентрацию. */
    | 'noSpellcasting'
    /** Звериные инстинкты: застигнутый врасплох может войти в ярость. */
    | 'surpriseRageOverride'
    /** Бешенство берсерка — вариант входа в ярость. */
    | 'frenzy'
    | 'noReactions'
    /** Уничтожение нежити: провалившая изгнание нежить с ПО не выше порога гибнет. */
    | 'destroyUndead'
    /** Уклонение: спасбросок Ловкости на половину урона — успех 0, провал половина. */
    | 'evasion'
    /** Магия не усыпляет — наследие фей: «Сон» пропускает, не тратя запас. */
    | 'immuneMagicalSleep'
    // Волна 5: движение и засада.
    /** Немагическая трудная местность бесплатна — поступь по земле. */
    | 'ignoreNonmagicalDifficultTerrain'
    /** Сквозь пространство существа крупнее себя — проворство полуросликов. */
    | 'moveThroughLargerCreatures'
    /** Прятаться за существом хотя бы на размер крупнее — прирождённая скрытность. */
    | 'hideBehindLargerCreature'
    /** По жидкости в свой ход, не останавливаясь на ней, — движение без доспехов 9. */
    | 'wallAndWaterWalk';
}

/** Чувство носителя (план волны 5, §3.2): тёмное или дьявольское зрение. */
export interface SenseFacet {
  kind: 'sense';
  sense: 'darkvision' | 'devilsSight';
  rangeFeet: number;
}

/** Свет от носителя — «Священное оружие» светит как факел. */
export interface LightFacet {
  kind: 'light';
  bright: number;
  dim: number;
}

/** Ресурс вне таблиц классов: максимум 1, свой отдых (§П2 разбора умений). */
export interface ResourceFacet {
  kind: 'resource';
  code: CharacterResourceCode;
  recovery: 'SHORT' | 'LONG';
  fromLevel?: number;
}

/** Выбор у самой атаки: безрассудно, сокрушитель орды. */
export interface AttackOptionFacet {
  kind: 'attackOption';
  option: 'RECKLESS' | 'HORDE_BREAKER';
}

/** Что можно доплатить к сотворению (метамагия, стихийное сопротивление). */
export interface CastOptionFacet {
  kind: 'castOption';
  option: CastOption;
  /** Очков чародейства; `spellLevelMin1` — круг, у заговора 1 (удвоение). */
  cost: number | 'spellLevelMin1';
  /** Одна такая на заклинание (вся метамагия, кроме усиленной). */
  exclusive?: true;
}

/** Поправка заклинания: стихийное сродство — модификатор к одному броску урона. */
export interface SpellModifierFacet {
  kind: 'spellModifier';
  effect: 'addAbilityToOneDamageRoll';
  ability: AbilityCode;
  when: 'sorcererAncestryDamage';
}

/**
 * Следствие события, а не броска: благословение Тёмного на добивании,
 * защита от мультиатаки на попадании по носителю.
 */
export type TriggerFacet =
  | { kind: 'trigger'; on: 'reduceHostileToZero'; tempHp: Amount }
  | { kind: 'trigger'; on: 'hitByAttack'; applyEffect: EffectCode };

/**
 * Ответ в окне реакции (дизайн 15 октября, §5; разбор умений §1.1).
 * `who` — кто вправе: бросающий сам (`self`), цель события (`target`)
 * или другой участник (`other`).
 */
export interface ReactionFacet extends Conditional {
  kind: 'reaction';
  ability: ReactionAbility;
  event: readonly WindowEvent[];
  economy: 'REACTION' | 'FREE';
  who: 'self' | 'target' | 'other';
  /** Дальность до бросающего. */
  rangeFeet?: number;
  cost?: { resource: CharacterResourceCode; amount: number };
  effect: ReactionEffect;
}

export type ReactionEffect =
  | { imposeDisadvantage: true }
  /** Кость к броску: своя грань или из данных эффекта (вдохновение — `data.die`). */
  | { addDie: { sides: number } | 'effect.die' }
  /** Кость из броска: число граней — `Amount` (кость вдохновения барда). */
  | { subtractDie: Amount }
  | { rerollSave: true }
  | { halveDamage: true }
  /** Уменьшение урона на кость и прибавки; поймал — метнуть за ци (отражение). */
  | { reduceDamage: { sides: number; plus: readonly Amount[] }; catchMissile?: true }
  | { setHp: 1 }
  | { attack: 'attacker' | 'mover' }
  | { castSpell: 'shield' | 'feather-fall' }
  /** Урон падения меньше на число («Медленное падение» — 5 × уровень монаха). */
  | { reduceFallDamage: Amount }
  /** Переброс малых костей урона своего заклинания (усиленное). */
  | { empower: true };

/**
 * Аура (разбор П1.5, `zone anchor:'bearer'`): грани получают носитель и
 * союзники в радиусе. Зоны-объекты на карте — волна 5.
 */
export interface ZoneFacet extends Conditional {
  kind: 'zone';
  anchor: 'bearer';
  radiusFeet: number;
  who: 'selfAndAllies';
  /** Условия на получателе (слышит носителя). */
  recipient?: readonly Predicate[];
  grants: readonly Facet[];
}

/** Переброс кости, ушедшей в итог, — «Везучий» (П4 #56). */
export interface RerollFacet {
  kind: 'reroll';
  die: 'd20';
  on: readonly number[];
  rolls: readonly ('attack' | 'check' | 'save')[];
}

export type Facet =
  | ModifierFacet
  | AcFormulaFacet
  | AdvantageFacet
  | DefenseFacet
  | CritFacet
  | OnHitFacet
  | ActionFacet
  | RuleFacet
  | ResourceFacet
  | AttackOptionFacet
  | CastOptionFacet
  | SpellModifierFacet
  | TriggerFacet
  | ReactionFacet
  | ZoneFacet
  | RerollFacet
  | SenseFacet
  | LightFacet;

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
  /** `TURN_END` — конец текущего хода, чей бы он ни был (защита от мультиатаки). */
  expires: 'OWN_TURN_START' | 'OWN_TURN_END' | 'TURN_END' | 'COMBAT_END' | 'MANUAL';
  rounds?: number;
  /**
   * «До конца следующего хода наложившего» — тем же механизмом `data.until`,
   * что у заклинаний: наложено в его ход — конец этого хода не считается.
   */
  until?: { who: 'SOURCE' | 'BEARER'; at: 'START' | 'END' };
  /** Ярость: свой ход кончился без атаки и без полученного урона. */
  endsWhenIdle?: true;
  endsOnUnconscious?: true;
  /** Носитель стал недееспособен — противодействие очарованию. */
  endsOnIncapacitated?: true;
  /** Кончается вместе с этим эффектом носителя (бешенство — с яростью). */
  endsWithEffect?: EffectCode;
  /** Что оставляет по себе (бешенство — степень истощения). */
  onEnd?: 'exhaustion';
  /** Любой урон по носителю снимает (изгнание). */
  endsOnDamage?: true;
  /** Чем тратится: своей атакой, первой атакой по цели из данных, своей проверкой. */
  spentBy?: 'ownAttack' | 'firstAttackVsTarget' | 'check';
  /** Состояние, которое эффект держит на носителе (испуг устрашения, ошеломление). */
  condition?: ConditionCode;
  /**
   * Снимается шагом, действием или реакцией носителя («Единство с тенями»:
   * «until you move or take an action or a reaction»). Бонусное — не снимает.
   * Снимает общий хук после операции, сравнивая экономику и пройденное.
   */
  endsOnMove?: true;
  endsOnAction?: true;
  endsOnReaction?: true;
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
  /** Вид урона драконьего предка чародея (`dragon-ancestor-*`); нет — не чародей. */
  sorcererAncestryDamageType?: string | null;
  /** Есть, где лист под рукой (атака, список, сотворение); нет — грани с `{ ability }` дают 0. */
  abilityModifiers?: Readonly<Partial<Record<AbilityCode, number>>>;
  /** Данные эффектов по коду — для предикатов `effect*` (священное оружие, помощь). */
  effectData?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

export interface MechanicsContext {
  armor?: { worn: 'LIGHT' | 'MEDIUM' | 'HEAVY' | null; shield: boolean };
  weapon?: {
    rangeType: WeaponRangeType;
    properties: readonly WeaponProperty[];
    ability: 'strength' | 'dexterity';
    offHandWeapon: boolean;
    /** Предмет листа (`CharacterItem.id`) или `unarmed`. */
    itemId?: string;
    /** Клинок договора колдуна. */
    pact?: boolean;
  };
  roll?: {
    mode: AdvantageMode;
    allyAdjacentToTarget: boolean;
    /** Видит ли цель атакующего; нет поля — не видит (условие ложно). */
    targetSeesAttacker?: boolean;
  };
  turn?: { isOwn: boolean; movedAtMostHalf: boolean };
  target?: { id: string };
  attack?: {
    via?: AttackVia;
    range?: 'MELEE' | 'RANGED';
    /** Атака оружием (не заклинанием). */
    weapon?: boolean;
    spell?: boolean;
    isOpportunity?: boolean;
  };
  bearer?: {
    alert?: boolean;
    id?: string;
    conscious?: boolean;
    conditions?: readonly ConditionCode[];
    /** Освещённость клетки носителя — «Единство с тенями». */
    light?: 'BRIGHT' | 'DIM' | 'DARK';
  };
  /** Тот, кто бросает (атакует, проверяет), глазами носителя грани. */
  actor?: {
    seen?: boolean;
    hearsBearer?: boolean;
    conditionImmunities?: readonly ConditionCode[];
    size?: SizeCategory;
  };
  /** Получатель ауры — слышит ли носителя (противодействие очарованию). */
  recipient?: { hearsBearer: boolean };
  /** Спасбросок: против чего (П1.1). */
  save?: {
    ability?: AbilityCode;
    magical?: boolean;
    conditions?: readonly ConditionCode[];
    damageTypes?: readonly string[];
    sourceSeen?: boolean;
    /** Метки заклинания источника (`SpellMechanic.tags`) — поступь по земле. */
    spellTags?: readonly string[];
  };
  damage?: { killedOutright: boolean };
  /** Расстояние от носителя в футах. */
  distances?: { target?: number; attacker?: number };
}
