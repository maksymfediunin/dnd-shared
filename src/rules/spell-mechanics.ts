import type { AbilityCode } from '../enums/character.js';
import type { ConditionCode } from '../enums/conditions.js';
import type { AdvantageMode } from '../enums/dice.js';
import { isAlly } from './combat.js';
import { type AdvantageEffect, type ConditionEffects, combineAdvantage } from './conditions.js';
import { SPELL_MECHANICS } from './spell-mechanics.data.js';

/**
 * Механика заклинания сверх машинных полей SRD. Источник даёт кости
 * урона, спасбросок и область — но не то, ради чего половину заклинаний
 * и колдуют: «Щит веры» +2 к КД, «Удержание личности» парализует на
 * провале, «Благословение» прибавляет к4. Без этого заклинание
 * тратило ячейку и оставляло на фишке значок без следствий (просьба со
 * стола 2 октября — «все заклинания должны работать как задумано»).
 *
 * Таблица размечена по тексту описания каждого из 319 заклинаний SRD
 * (`spell-mechanics.data.ts`). Запись сверх таблицы не выдумывает
 * ничего: чего примитивами не выразить, лежит в `gm` словами и
 * остаётся ведущему.
 */
export interface SpellModifiers {
  acBonus?: number;
  /** Вычитается из КД («Замедление»). */
  acPenalty?: number;
  /** КД не ниже этого числа («Дубовая кора»). */
  acMinimum?: number;
  /** КД = это + Ловкость, если без доспехов («Доспехи мага»): число считает сервер при сотворении. */
  acBase?: number;
  /** К броскам атаки носителя: «1d4», «-1d4». */
  attackDice?: string;
  /** К спасброскам носителя. */
  saveDice?: string;
  ownAttacks?: AdvantageEffect;
  /** Атаки по носителю. */
  incoming?: AdvantageEffect;
  saveAdvantage?: AbilityCode[];
  saveDisadvantage?: AbilityCode[];
  speedBonusFeet?: number;
  speedMultiplier?: number;
  resistances?: string[];
  /** Плоская прибавка к спасброскам («Охранная связь» +1). */
  saveBonus?: number;
  /** `incoming` — только от атакующих этих типов существ («Защита от добра и зла»). */
  incomingFrom?: string[];
  /**
   * Прибавка к урону попаданий оружием носителя («Божественное
   * благоволение»); `perSlot` — костей за круг ячейки выше. Вид
   * `WEAPON` — того же вида, что и удар («Увеличение»); кости со знаком
   * минус вычитаются («Уменьшение»).
   */
  weaponDamage?: { dice: string; type: string; perSlot?: number };
  noReactions?: boolean;
  /** Носитель не восстанавливает хиты («Леденящее прикосновение»). */
  noHealing?: boolean;
  /**
   * `ownAttacks` — только против одного существа, а не против всех:
   * `true` — против наложившего («Наложение проклятия»: помеха к атакам
   * по заклинателю), `'TARGET'` — против цели, названной при сотворении
   * («Верный удар»). Без этого проклятый мазал по всем, а «Верный удар»
   * давал преимущество и по случайному гоблину.
   */
  vsSourceOnly?: true | 'TARGET';
  /**
   * Сопротивление только немагическому урону этих видов («Каменная
   * кожа»). Магический — заклинание и оружие с чертой «оружие
   * магическое» (Р9 разбора) — проходит целиком: безусловное
   * `resistances` резало и его.
   */
  resistNonmagical?: string[];
  // Волна 8а (план w8, §3.1): проверки, иммунитеты, урон Силой, лечение.
  /** Преимущество к проверкам этих характеристик носителя; `ALL` — всех («Предвидение»). */
  checkAdvantage?: (AbilityCode | 'ALL')[];
  /**
   * Помеха к проверкам этих навыков, кроме как против наложившего
   * («Порабощение»: Внимательность — ко всем, кроме заклинателя).
   */
  checkDisadvantage?: string[];
  /** Прибавка к проверкам навыков («Бесследное передвижение» — Скрытность +10). */
  checkBonus?: Record<string, number>;
  /** Кость к одной проверке характеристики («Указание» 1к4); тратится на ней. */
  checkDice?: string;
  /** Состояния не ложатся от существ этих типов («Защита от добра и зла»). */
  conditionImmunitiesFrom?: { conditions: ConditionCode[]; sourceTypes: string[] };
  /** Иммунитет к видам урона («Пустой разум» — психический). */
  damageImmunities?: string[];
  /** Урон оружием, использующим Силу, — множитель («Луч слабости» — вполовину). */
  weaponDamageMultiplier?: { ability: 'strength'; factor: number };
  /** Встать с земли нельзя («Жуткий смех»). */
  cannotStand?: true;
  /** Не бывает застигнут врасплох («Предвидение»). */
  cannotBeSurprised?: true;
  /** Лечение костями — максимумом («Маяк надежды»). */
  healMaximized?: true;
  /** Спасброски от смерти — с преимуществом («Маяк надежды»). */
  deathSaveAdvantage?: true;
}

/**
 * Оружие, заряженное заклинанием («Дубинка», «Магическое оружие»):
 * магическое (Р9), с прибавкой к атаке и урону или своей костью и
 * заклинательной характеристикой.
 */
export interface WeaponEnchant {
  /** Только эти коды оружия («Дубинка» — дубинка и посох); пусто — любое. */
  weapons?: string[];
  attack?: number;
  damage?: number;
  /** Прибавка по кругу ячейки: «Магическое оружие» +2 с 4-го, +3 с 6-го. */
  bySlot?: Record<number, number>;
  /** Характеристика атаки и урона — заклинательная, а не Сила. */
  ability?: 'SPELLCASTING';
  die?: 'd8';
  magical: true;
}

/** Цели в пределах стольких футов друг от друга, от первой цели или от одной точки. */
export interface TargetSpread {
  withinFeet: number;
  from: 'EACH_OTHER' | 'PRIMARY' | 'POINT';
}

/** Что цель обязана воспринимать: видеть заклинателя, слышать его. */
export type Perceive = 'SEE_CASTER' | 'HEAR';

/**
 * Поводы снятия эффекта без урона (р. 7 плана w8): вред от стороны
 * заклинателя, чужое заклинание по носителю, надетый доспех, недееспособный
 * заклинатель.
 */
export type SpellEndsOn =
  | 'HARMED_BY_CASTER_SIDE'
  | 'TARGETED_BY_SPELL'
  | 'ARMOR_DONNED'
  | 'CASTER_INCAPACITATED';

/**
 * Поправка машинных полей SRD там, где они расходятся с текстом
 * описания: у «Паутины» нет спасброска, у «Божественного
 * благоволения» урон — не удар по цели, а прибавка к оружию. `null` —
 * поля нет вовсе.
 */
export interface SpellFieldOverride {
  attackType?: 'MELEE' | 'RANGED' | null;
  saveAbility?: AbilityCode | null;
  saveHalfOnSuccess?: boolean;
  area?: { shape: 'SPHERE' | 'CUBE' | 'CYLINDER' | 'CONE' | 'LINE'; size: number } | null;
  /** Кости урона SRD — не урон по цели. */
  damage?: false;
  /** Кости лечения SRD — не лечение. */
  heal?: false;
  /** Запись «4d6 + 4d6» — два урона этих видов по порядку. */
  damageTypes?: string[];
  /** Дистанция по тексту, когда SRD пишет «Self», а бьют по другому («Сглаз» — 60 футов). */
  range?: string;
  /** Кости урона по кругу ячейки, которых SRD не несёт («Духовные стражи» — 3к8). */
  damageAtSlotLevel?: Record<string, string>;
  damageType?: string;
}

/** До начала или конца следующего хода заклинателя или цели. */
export interface SpellUntil {
  who: 'CASTER' | 'TARGET';
  at: 'START' | 'END';
}

/**
 * Повторный спасбросок не по умолчанию «в конце хода, успех снимает»:
 * «Призрачный убийца» и «Кошмар» бросают в НАЧАЛЕ хода цели, и провал
 * бьёт (`onFail`); «Страх» даёт бросок, только если цель заклинателя не
 * видит (`when`). Успех, как и прежде, снимает наложенное.
 */
export interface SpellRepeatSave {
  at: 'START' | 'END';
  /** Пусто — той же характеристикой, что и первый спасбросок. */
  ability?: AbilityCode;
  /** Урон на провале; `perSlot` — костей за каждый круг ячейки выше. */
  onFail?: { damage: string; type: string; perSlot?: string };
  /** Бросок только без линии обзора на заклинателя («Страх»). */
  when?: 'NO_LINE_OF_SIGHT';
}

export interface SpellMechanic {
  /** Фишек-целей: `base` на своём круге, `perSlot` — за каждый круг ячейки выше. */
  targets?: { base: number; perSlot?: number };
  /**
   * Лучи и дротики: каждый — отдельный бросок своей кости по цели,
   * которую заклинатель выбирает лучу. Число — от круга ячейки или
   * уровня заклинателя («Таинственный взрыв»).
   */
  rays?: { base?: number; perSlot?: number; byCasterLevel?: Record<string, number>; dice: string };
  notSelf?: boolean;
  selfOnly?: boolean;
  override?: SpellFieldOverride;
  /**
   * Накладывается: со спасброском — на провале, с атакой — при
   * попадании, иначе — на каждую цель при сотворении.
   */
  conditions?: ConditionCode[];
  modifiers?: SpellModifiers;
  /** Эффект ложится на заклинателя, а не на цель («Меткий удар»). */
  bearer?: 'CASTER';
  /**
   * Спасбросок в конце каждого хода цели; успех снимает наложенное.
   * `true` — той же характеристикой, что и первый; иначе — названной.
   * Объект — когда ритм или следствие другие (`SpellRepeatSave`).
   */
  repeatSave?: boolean | AbilityCode | SpellRepeatSave;
  until?: SpellUntil;
  /**
   * Следствие включается не сразу: «Верный удар» даёт преимущество на
   * СЛЕДУЮЩЕМ ходу заклинателя, а в ход сотворения не действует.
   */
  activeFrom?: 'CASTER_NEXT_TURN';
  temporaryHitPoints?: { dice?: string; flat?: number; perSlot?: number; addModifier?: boolean };
  hitPointBonus?: { flat: number; perSlot?: number };
  /** Снимает все эти состояния разом («Массовое исцеление» — слепоту и глухоту). */
  removesConditions?: ConditionCode[];
  /**
   * Снимает ОДНО из этих состояний — на выбор заклинателя
   * (`CastInput.removeCondition`), по умолчанию первое наложенное.
   * «Восстановления» снимали всё из списка разом. Истощение — на
   * степень, а не целиком («Высшее восстановление»).
   */
  removes?: { choose: 1; conditions: ConditionCode[] };
  /**
   * Лечение — общий запас на всех целей, а не каждой своё («Массовое
   * исцеление»: 700 хитов делятся). Делит заклинатель
   * (`CastInput.healShares`), без выбора — поровну, не выше недостающего.
   */
  healPool?: { total: number; distribute: 'CASTER' };
  /**
   * Кто вообще может быть целью: «Очарование личности» — гуманоид,
   * «Дружба с животными» — зверь. Тип не тот — отказ сотворения;
   * `maxInt` выше — заклинание не действует, ячейка потрачена (SRD: «the
   * spell fails»). `excludeTypes` — целью быть может, но не действует
   * («Массовое исцеление»: «no effect on undead or constructs»).
   */
  targetFilter?: {
    types?: string[];
    maxInt?: number;
    /** Интеллект ниже — не действует («Жуткий смех»: 4 и ниже). */
    minInt?: number;
    excludeTypes?: string[];
    /** Только на существо без доспеха («Доспехи мага») — 422 до ячейки. */
    noArmor?: true;
    /** Не действует на иммунного к очарованию («Порабощение»). */
    canBeCharmed?: true;
  };
  /** Цели не дальше друг от друга, от первой или от точки (р. 5 плана w8). */
  targetSpread?: TargetSpread;
  /** Цель должна видеть или слышать заклинателя — иначе «не действует». */
  perceives?: Perceive[];
  /** Первый спасбросок — с преимуществом, если цель сражается со стороной заклинателя (Р1). */
  saveAdvIfHostile?: true;
  /** Чем ещё кончается, кроме урона (`endsOnDamage`). */
  endsOn?: SpellEndsOn[];
  /** Оружие носителя заряжено («Дубинка», «Магическое оружие»). */
  weaponEnchant?: WeaponEnchant;
  /** Атака заклинанием с преимуществом, если цель в металлическом доспехе («Шокирующая хватка»). */
  advantageIf?: { targetArmor: 'METAL' };
  /** По существам этих типов урон — максимум костей («Усыхание» по растениям). */
  maxDamageVs?: string[];
  /** Спасбросок с помехой у существ этих типов или из неорганики («Дребезги», Р8). */
  saveByType?: { disadvantage: string[] | 'INORGANIC' };
  /** Возвращает умершего не раньше стольких раундов назад, с хитами («Возрождение»). */
  revive?: { withinRounds: number; hp: number };
  /** Предметы заклинателю («Целебные ягоды» — десять ягод). */
  items?: { code: string; count: number };
  /**
   * Второе следствие по существам этих типов — своим эффектом и сроком
   * («Холодное прикосновение»: нежить атакует заклинателя с помехой до
   * конца его следующего хода).
   */
  vsTypes?: { types: string[]; modifiers: SpellModifiers; until: SpellUntil };
  /**
   * Заклинание вне боя (§6 разбора, р. 4 плана w8): сотворить в бою можно,
   * если время сотворения боевое, но следствий нет. Строка — причина.
   */
  outOfCombat?: string;
  /**
   * Действие, доступное, пока держится заклинание: «Огненный клинок»
   * сотворяется бонусом без атаки, а бьют им отдельным действием
   * (`CastInput.followUp`) — без ячейки и не как сотворение.
   */
  followUp?: { economy: 'ACTION'; kind: 'REPEAT_ATTACK'; attack: 'MELEE_SPELL' };
  /** Кончается, когда носитель атакует или колдует («Невидимость», «Святилище»). */
  endsWhenBearerAttacks?: boolean;
  /** Тратится на первой атаке носителя («Меткий удар»). */
  consumedOnOwnAttack?: boolean;
  /** Тратится на первой атаке по носителю («Направляющий снаряд»). */
  consumedOnIncoming?: boolean;
  /** Тратится на первом спасброске носителя («Сопротивление»). */
  consumedOnSave?: boolean;
  /** Заклинатель переносится в клетку в пределах стольких футов. */
  teleportFeet?: number;
  /**
   * Сотворяется в точку, а не в существо: огоньки, рука мага, иллюзия,
   * стена, призыв в свободное место, предмет или труп. Целятся клеткой
   * в пределах дистанции; фишка-цель такому заклинанию ни к чему, и
   * значок на ней врал бы, что заклинание наложено на неё.
   */
  point?: boolean;
  /** Заклинатель лечится на эту долю нанесённого урона («Вампирское прикосновение»). */
  lifesteal?: number;
  /** Действует только на цель с текущими хитами не выше этого («Слово силы: оглушение»). */
  hpThreshold?: number;
  /** Убивает цель с текущими хитами не выше этого («Слово силы: смерть»). */
  killThreshold?: number;
  /** Атакующий носителя проходит спасбросок Мудрости, иначе атака теряется. */
  sanctuary?: boolean;
  /** Сотворяется реакцией — вне своего хода, тратит реакцию. */
  reaction?: boolean;
  /** Эффект считает сервер своим кодом («Цветной шарик» — запас хитов, как у «Сна»). */
  scripted?: boolean;
  /**
   * Кончается, когда носитель получает урон («Гипнотический узор»).
   * `'casterSide'` — только урон от заклинателя или его стороны
   * («Очарование личности»: «you or your companions»); сторона — по
   * `isAlly`, не по виду фишки.
   */
  endsOnDamage?: boolean | 'casterSide';
  /**
   * Получив урон, носитель повторяет спасбросок («Подчинение личности»);
   * `'ADVANTAGE'` — с преимуществом («Жуткий смех Таши»).
   */
  saveOnDamage?: boolean | 'ADVANTAGE';
  /** Временные хиты в начале каждого хода носителя («Героизм»). */
  temporaryHitPointsEachTurn?: { flat?: number; addModifier?: boolean };
  /** Пока держится — эти состояния на носителя не ложатся («Героизм» — испуг). */
  conditionImmunities?: ConditionCode[];
  /**
   * Союзник заклинателя спасброска не бросает — он согласен
   * («Увеличение/уменьшение»: спасбросок только у несогласного).
   */
  willingAllies?: boolean;
  /**
   * Варианты на выбор заклинателя («Защита от энергии» — вид урона,
   * «Сглаз» — сон, паника или тошнота). Выбранный вариант дополняет
   * запись: его поля перекрывают общие. Первый — по умолчанию.
   */
  variants?: SpellVariant[];
  /**
   * Зона на карте («Духовные стражи», «Лунный луч», «Облачко смерти»):
   * держится, пока держится заклинание, и срабатывает на тех, кто в неё
   * входит, начинает или кончает в ней ход. Урон и спасбросок — из
   * полей SRD; `onCast` — срабатывает и при сотворении на тех, кто уже
   * внутри. `aura` — зона идёт с заклинателем, радиус в футах.
   * `hostileOnly` — только по врагам заклинателя.
   */
  zone?: {
    on: ('ENTER' | 'START' | 'END')[];
    onCast?: boolean;
    aura?: number;
    hostileOnly?: boolean;
    /** Что накладывает зона на провале — сверх урона («Паутина» — опутан). */
    conditions?: ConditionCode[];
    /**
     * Уже опутанный этой зоной в начале хода получает урон без броска
     * («Чёрные щупальца»); бросают только неопутанные.
     */
    restrainedTakeDamage?: boolean;
    /** Вид урона срабатывания, когда он не тот, что при появлении («Стена из шипов» — рубящий). */
    damageType?: string;
    /** Провал отбрасывает от заклинателя на столько футов («Порыв ветра»). */
    push?: { feet: number };
  };
  /** Что остаётся ведущему, словами. */
  gm?: string;
}

/** Вариант заклинания с выбором: ключ для входа сотворения и следствие. */
export interface SpellVariant {
  key: string;
  conditions?: ConditionCode[];
  modifiers?: SpellModifiers;
  temporaryHitPoints?: SpellMechanic['temporaryHitPoints'];
  /** «Сглаз»: урон будит спящего, но панику и тошноту не снимает. */
  endsOnDamage?: SpellMechanic['endsOnDamage'];
  /** «Сглаз»: от тошноты спасаются в конце хода, от сна и паники — нет. */
  repeatSave?: SpellMechanic['repeatSave'];
}

export function spellMechanic(code: string): SpellMechanic | null {
  return SPELL_MECHANICS[code] ?? null;
}

/**
 * Механика с выбранным вариантом: следствие целиком берётся из варианта
 * — у «Сглаза» тошнота не пугает, хоть паника и пугает. Ключ не назван
 * или не найден — первый вариант: заклинание с выбором без выбора не
 * сотворяют, и молча остаться без следствия хуже.
 */
export function spellMechanicFor(code: string, variant?: string | null): SpellMechanic | null {
  const base = spellMechanic(code);
  if (!base?.variants?.length) return base;
  const chosen = base.variants.find((v) => v.key === variant) ?? base.variants[0];
  if (!chosen) return base;
  const {
    conditions: _c,
    modifiers: _m,
    temporaryHitPoints: _t,
    endsOnDamage: _e,
    repeatSave: _r,
    ...rest
  } = base;
  return {
    ...rest,
    ...(chosen.conditions ? { conditions: chosen.conditions } : {}),
    ...(chosen.modifiers ? { modifiers: chosen.modifiers } : {}),
    ...(chosen.temporaryHitPoints ? { temporaryHitPoints: chosen.temporaryHitPoints } : {}),
    ...(chosen.endsOnDamage !== undefined ? { endsOnDamage: chosen.endsOnDamage } : {}),
    ...(chosen.repeatSave !== undefined ? { repeatSave: chosen.repeatSave } : {}),
  };
}

/**
 * Тип существа для фильтра целей: рой («swarm of Tiny beasts») — того же
 * типа, что и его существа. Без этого стая крыс не была бы зверем для
 * «Дружбы с животными».
 */
export function creatureTypeOf(type: string): string {
  const lower = type.trim().toLowerCase();
  return /^swarm of \w+ (\w+?)s$/.exec(lower)?.[1] ?? lower;
}

/**
 * Повторный спасбросок записи одной формой: `true` и код характеристики
 * — прежний ритм «в конце хода», объект — как задан. `null` — повтора нет.
 */
export function repeatSaveOf(mechanic: SpellMechanic | null): SpellRepeatSave | null {
  const repeat = mechanic?.repeatSave;
  if (!repeat) return null;
  if (repeat === true) return { at: 'END' };
  if (typeof repeat === 'string') return { at: 'END', ability: repeat };
  return repeat;
}

/** Ключ выбранного варианта: названный, если он есть у заклинания, иначе первый. */
export function spellVariantKey(code: string, variant?: string | null): string | null {
  const variants = spellMechanic(code)?.variants;
  if (!variants?.length) return null;
  return (variants.find((v) => v.key === variant) ?? variants[0])?.key ?? null;
}

/** Оставляет ли заклинание на цели что-то, что система считает сама. */
export function hasSpellEffect(mechanic: SpellMechanic | null): boolean {
  return (
    mechanic !== null &&
    // Внебоевое следа на фишке не оставляет (р. 4 плана w8).
    mechanic.outOfCombat === undefined &&
    ((mechanic.conditions?.length ?? 0) > 0 ||
      (mechanic.modifiers !== undefined && Object.keys(mechanic.modifiers).length > 0) ||
      mechanic.repeatSave === true ||
      mechanic.repeatSave !== undefined ||
      mechanic.temporaryHitPointsEachTurn !== undefined ||
      (mechanic.conditionImmunities?.length ?? 0) > 0 ||
      (mechanic.variants?.length ?? 0) > 0 ||
      // «Внушение»: ни состояния, ни поправок — но эффект на цели нужен,
      // иначе снимать уроном нечего; «Огненный клинок» — то, чем бьют.
      mechanic.endsOnDamage !== undefined ||
      mechanic.followUp !== undefined ||
      mechanic.weaponEnchant !== undefined ||
      (mechanic.endsOn?.length ?? 0) > 0)
  );
}

/**
 * Сколько фишек можно взять целью. Один — по умолчанию: и у большинства
 * заклинаний цель одна, и область целей не выбирает вовсе.
 */
export function spellTargetLimit(
  code: string,
  spellLevel: number,
  slotLevel: number | null,
): number {
  const targets = spellMechanic(code)?.targets;
  if (!targets) return 1;
  const above = slotLevel === null ? 0 : Math.max(0, slotLevel - spellLevel);
  return targets.base + (targets.perSlot ?? 0) * above;
}

/** Эффект на участнике в том виде, в каком его держат и сервер, и снимок сцены. */
export interface SpellEffectRow {
  code: string;
  spellCode?: string | null;
  data?: unknown;
  /** Кто наложил — для следствий «только против наложившего» (`vsSourceOnly`). */
  sourceId?: string | null;
}

/** Код эффекта заклинания на цели — тот же, что `SPELL_EFFECT` сервера. */
export const SPELL_EFFECT_CODE = 'SPELL';

/**
 * Второе следствие заклинания по типу цели (`vsTypes`) — своим кодом: у
 * эффекта цели ключ «участник, код, источник, заклинание» один, а сроки у
 * двух следствий разные («Холодное прикосновение» на нежити).
 */
export const SPELL_RIDER_CODE = 'SPELL_RIDER';

interface ActiveModifiers {
  spellCode: string;
  modifiers: SpellModifiers;
  /** Против кого действует `ownAttacks` при `vsSourceOnly`; `null` — против всех. */
  onlyAgainst: string | null;
  /** Только в собственный ход носителя («Верный удар» — «on your next turn»). */
  ownTurnOnly: boolean;
}

/**
 * Включилось ли следствие: «Верный удар» (`activeFrom`) спит до
 * следующего хода заклинателя. Ход сотворения виден по сроку: конец
 * этого хода ещё не прошёл, пока `until.skip` не сброшен (`untilData`
 * службы сотворения).
 */
function isDormant(mechanic: SpellMechanic, data: unknown): boolean {
  if (mechanic.activeFrom !== 'CASTER_NEXT_TURN') return false;
  const skip = (data as { until?: { skip?: unknown } } | null)?.until?.skip;
  return typeof skip === 'number' && skip > 0;
}

/**
 * Следствия, которые держатся на участнике сейчас. Число, посчитанное
 * при сотворении (КД «Доспехов мага» от Ловкости носителя, кости кары
 * от круга ячейки), лежит в `data` эффекта и перекрывает табличное.
 */
export function activeSpellModifiers(effects: readonly SpellEffectRow[]): ActiveModifiers[] {
  return effects.flatMap((effect) => {
    const rider = effect.code === SPELL_RIDER_CODE;
    if ((effect.code !== SPELL_EFFECT_CODE && !rider) || !effect.spellCode) return [];
    const data = (effect.data ?? null) as {
      acMinimum?: unknown;
      weaponDice?: unknown;
      variant?: unknown;
    } | null;
    const variant = typeof data?.variant === 'string' ? data.variant : null;
    const mechanic = spellMechanicFor(effect.spellCode, variant);
    // Второе следствие по типу цели — со своими поправками.
    const modifiers = rider ? mechanic?.vsTypes?.modifiers : mechanic?.modifiers;
    if (!mechanic || !modifiers || isDormant(mechanic, effect.data)) return [];
    const computed: SpellModifiers = {};
    if (typeof data?.acMinimum === 'number') computed.acMinimum = data.acMinimum;
    if (typeof data?.weaponDice === 'string' && modifiers.weaponDamage) {
      computed.weaponDamage = { ...modifiers.weaponDamage, dice: data.weaponDice };
    }
    const targetId = (effect.data as { targetId?: unknown } | null)?.targetId;
    const onlyAgainst =
      modifiers.vsSourceOnly === 'TARGET'
        ? typeof targetId === 'string'
          ? targetId
          : ''
        : modifiers.vsSourceOnly
          ? (effect.sourceId ?? '')
          : null;
    return [
      {
        spellCode: effect.spellCode,
        modifiers: { ...modifiers, ...computed },
        onlyAgainst,
        ownTurnOnly: mechanic.activeFrom !== undefined,
      },
    ];
  });
}

/**
 * Тратит ли атака по этой цели эффект «на первую атаку» носителя:
 * спящий («Верный удар» в ход сотворения) не тратится, привязанный к
 * цели — только атакой по ней.
 */
export function spentByOwnAttack(
  effect: SpellEffectRow,
  targetId: string,
  /** Бьёт ли носитель в свой ход — атака при отходе в чужой «Верный удар» не тратит. */
  bearerTurn = true,
): boolean {
  const [active] = activeSpellModifiers([effect]);
  if (active) {
    if (active.ownTurnOnly && !bearerTurn) return false;
    return active.onlyAgainst === null || active.onlyAgainst === targetId;
  }
  // Без поправок атаки (`consumedOnOwnAttack` у прибавки к урону) — не
  // моё дело решать здесь; спящее — не тратится.
  const mechanic = effect.spellCode ? spellMechanic(effect.spellCode) : null;
  return mechanic !== null && !isDormant(mechanic, effect.data);
}

/**
 * Следствия заклинаний в форме таблицы состояний — чтобы бросок
 * сводился одним `combineConditions`. `attackerType` — тип существа
 * атакующего: «Защита от добра и зла» мешает не всем, а исчадиям,
 * нежити и прочим из `incomingFrom`. Не назван — такая помеха не
 * действует: угадывать атакующего правило не берётся.
 */
export function spellConditionEffects(
  effects: readonly SpellEffectRow[],
  attackerType?: string | null,
  /**
   * С кем носитель меряется в этом броске: цель его атаки. Следствия
   * «только против наложившего» (`vsSourceOnly`) без неё не действуют.
   */
  againstId?: string | null,
  /** Сейчас ход носителя; не назван — считается, что да. */
  bearerTurn = true,
): ConditionEffects[] {
  return activeSpellModifiers(effects).map(({ modifiers, onlyAgainst, ownTurnOnly }) => {
    const incomingApplies =
      modifiers.incomingFrom === undefined ||
      (attackerType != null && modifiers.incomingFrom.includes(attackerType.toLowerCase()));
    const incoming = incomingApplies ? (modifiers.incoming ?? 'NORMAL') : 'NORMAL';
    return {
      cannotAct: false,
      speed: 'NORMAL',
      ownAttacks:
        (onlyAgainst === null || onlyAgainst === againstId) && (!ownTurnOnly || bearerTurn)
          ? (modifiers.ownAttacks ?? 'NORMAL')
          : 'NORMAL',
      incomingNear: incoming,
      incomingFar: incoming,
      meleeAutoCrit: false,
      keepsAwayFromSource: false,
    };
  });
}

/**
 * КД с заклинаниями: прибавки складываются, нижние пороги — берётся
 * больший. Порог применяется к уже сложенному: «Дубовая кора» под
 * «Щитом веры» даёт 18, а не 16 (PHB: «AC can't be less than 16»).
 */
export function armorClassWithEffects(base: number, effects: readonly SpellEffectRow[]): number {
  let bonus = 0;
  let floor = Number.NEGATIVE_INFINITY;
  for (const { modifiers } of activeSpellModifiers(effects)) {
    bonus += (modifiers.acBonus ?? 0) - (modifiers.acPenalty ?? 0);
    if (modifiers.acMinimum !== undefined) floor = Math.max(floor, modifiers.acMinimum);
  }
  return Math.max(base + bonus, floor + bonus, floor);
}

/** Скорость с заклинаниями: прибавки, затем множители («Ускорение» ×2, «Замедление» ×½). */
export function speedWithEffects(speed: number, effects: readonly SpellEffectRow[]): number {
  let feet = speed;
  let factor = 1;
  for (const { modifiers } of activeSpellModifiers(effects)) {
    feet += modifiers.speedBonusFeet ?? 0;
    factor *= modifiers.speedMultiplier ?? 1;
  }
  return Math.max(0, Math.floor(feet * factor));
}

/**
 * Сопротивления с заклинаниями. `magical` — урон магический (заклинание
 * или оружие с чертой «оружие магическое», Р9): «Каменная кожа» его не
 * режет.
 */
export function resistancesWithEffects(
  base: readonly string[],
  effects: readonly SpellEffectRow[],
  magical = false,
): string[] {
  const extra = activeSpellModifiers(effects).flatMap(({ modifiers }) => [
    ...(modifiers.resistances ?? []),
    ...(magical ? [] : (modifiers.resistNonmagical ?? [])),
  ]);
  return [...new Set([...base, ...extra])];
}

/** Участник для стороны: id, сторона и признак монстра (`sideOf`). */
type SidedParticipant = Parameters<typeof isAlly>[0];

/**
 * Снимает ли урон эффект заклинания на носителе: «Гипнотический узор» —
 * любой урон, «Очарование личности» (`'casterSide'`) — только урон от
 * заклинателя или его стороны. Бьющий неизвестен (ведущий правит хиты
 * рукой) — сторону он не называет, и такое заклинание держится.
 */
export function endsOnDamageBy(
  effect: SpellEffectRow,
  dealer: SidedParticipant | null,
  caster: SidedParticipant | null,
): boolean {
  if (effect.code !== SPELL_EFFECT_CODE || !effect.spellCode) return false;
  const variant = (effect.data as { variant?: unknown } | null)?.variant;
  const ends = spellMechanicFor(
    effect.spellCode,
    typeof variant === 'string' ? variant : null,
  )?.endsOnDamage;
  if (ends === true) return true;
  return ends === 'casterSide' && dealer !== null && caster !== null && isAlly(dealer, caster);
}

/**
 * Общий запас лечения поровну (`healPool`): каждой цели не больше
 * недостающего, а то, что ей не нужно, делится между остальными — уровень
 * «доливается» до тех пор, пока хватает запаса. Остаток от деления — по
 * одному первым по порядку. Возвращает долю каждой цели.
 */
export function distributeHealPool(
  total: number,
  needs: readonly { id: string; missing: number }[],
): Record<string, number> {
  const missing = (need: { missing: number }) => Math.max(0, need.missing);
  const used = (level: number) =>
    needs.reduce((sum, need) => sum + Math.min(missing(need), level), 0);
  let level = 0;
  let top = Math.max(0, ...needs.map(missing));
  while (level < top) {
    const mid = Math.ceil((level + top) / 2);
    if (used(mid) <= total) level = mid;
    else top = mid - 1;
  }
  let left = total - used(level);
  const shares: Record<string, number> = {};
  for (const need of needs) {
    const extra = left > 0 && missing(need) > level ? 1 : 0;
    left -= extra;
    shares[need.id] = Math.min(missing(need), level) + extra;
  }
  return shares;
}

/**
 * Заклинания воскрешения для «Божественного вмешательства» (р. 24): у
 * «Оживления» и «Воскрешений» время сотворения — час, в бою их творит
 * только божество, и запись у них — пометка вне боя. Здесь — что они
 * делают с мёртвым на сцене: давность (`null` — любая) и хиты.
 */
export const REVIVAL_SPELLS: Readonly<
  Record<string, { withinRounds: number | null; hp: 'ONE' | 'MAX' }>
> = {
  revivify: { withinRounds: 10, hp: 'ONE' },
  'raise-dead': { withinRounds: null, hp: 'ONE' },
  resurrection: { withinRounds: null, hp: 'MAX' },
  'true-resurrection': { withinRounds: null, hp: 'MAX' },
};

/** Кость прибавки со знаком: «-1d4» вычитается («Порча»). */
export interface SignedDice {
  spellCode: string;
  count: number;
  sides: number;
  sign: 1 | -1;
}

function signedDice(spellCode: string, notation: string): SignedDice | null {
  const match = /^([+-])?\s*(\d+)d(\d+)$/i.exec(notation.trim());
  if (!match) return null;
  return {
    spellCode,
    sign: match[1] === '-' ? -1 : 1,
    count: Number(match[2]),
    sides: Number(match[3]),
  };
}

export function attackDiceFrom(effects: readonly SpellEffectRow[]): SignedDice[] {
  return activeSpellModifiers(effects).flatMap(({ spellCode, modifiers }) => {
    const dice = modifiers.attackDice ? signedDice(spellCode, modifiers.attackDice) : null;
    return dice ? [dice] : [];
  });
}

export function saveDiceFrom(effects: readonly SpellEffectRow[]): SignedDice[] {
  return activeSpellModifiers(effects).flatMap(({ spellCode, modifiers }) => {
    const dice = modifiers.saveDice ? signedDice(spellCode, modifiers.saveDice) : null;
    return dice ? [dice] : [];
  });
}

/** Бросает прибавочные кости и отдаёт их слагаемыми — по одному на заклинание. */
export function rollSignedDice(
  dice: readonly SignedDice[],
  random: (sides: number) => number,
): { spellCode: string; value: number }[] {
  return dice.map((entry) => {
    let sum = 0;
    for (let i = 0; i < entry.count; i += 1) sum += random(entry.sides);
    return { spellCode: entry.spellCode, value: entry.sign * sum };
  });
}

/** Преимущество спасброска этой характеристики от заклинаний — помеха и преимущество гасят друг друга. */
export function saveAdvantageFrom(
  effects: readonly SpellEffectRow[],
  ability: AbilityCode,
): AdvantageMode {
  return combineAdvantage(saveAdvantageSources(effects, ability));
}

/** Источники по одному на заклинание — для сведения вместе с прочими (ярость, правило). */
export function saveAdvantageSources(
  effects: readonly SpellEffectRow[],
  ability: AbilityCode,
): ('ADVANTAGE' | 'DISADVANTAGE')[] {
  return activeSpellModifiers(effects).flatMap(({ modifiers }) => [
    ...(modifiers.saveAdvantage?.includes(ability) ? ['ADVANTAGE' as const] : []),
    ...(modifiers.saveDisadvantage?.includes(ability) ? ['DISADVANTAGE' as const] : []),
  ]);
}

export function weaponDamageFrom(
  effects: readonly SpellEffectRow[],
): { spellCode: string; dice: string; type: string }[] {
  return activeSpellModifiers(effects).flatMap(({ spellCode, modifiers }) =>
    modifiers.weaponDamage ? [{ spellCode, ...modifiers.weaponDamage }] : [],
  );
}

export function blocksReactions(effects: readonly SpellEffectRow[]): boolean {
  return activeSpellModifiers(effects).some(({ modifiers }) => modifiers.noReactions === true);
}

/**
 * Что заклинание делает с носителем — короткими пунктами для статуса
 * («+2 КД», «атаки по нему с преимуществом»). Ключи — для перевода на
 * фронте, а не готовый текст: пакет языков не знает.
 */
export type SpellEffectSummaryItem =
  | { key: 'acBonus' | 'acPenalty' | 'acMinimum' | 'speedBonus' | 'saveBonus'; value: number }
  | { key: 'speedMultiplier'; value: number }
  | { key: 'attackDice' | 'saveDice'; value: string }
  | { key: 'ownAttacks' | 'incoming'; value: AdvantageEffect }
  | { key: 'saveAdvantage' | 'saveDisadvantage'; value: AbilityCode[] }
  | { key: 'resistances' | 'resistNonmagical'; value: string[] }
  | { key: 'weaponDamage'; value: string; type: string }
  | {
      key:
        | 'noReactions'
        | 'noHealing'
        | 'repeatSave'
        | 'repeatSaveStart'
        | 'repeatSaveUnseen'
        | 'endsWhenBearerAttacks';
    };

export function spellEffectSummary(spellCode: string, data?: unknown): SpellEffectSummaryItem[] {
  const variant = (data as { variant?: unknown } | null | undefined)?.variant;
  const mechanic = spellMechanicFor(spellCode, typeof variant === 'string' ? variant : null);
  if (!mechanic) return [];
  const [active] = activeSpellModifiers([{ code: SPELL_EFFECT_CODE, spellCode, data }]);
  const m = active?.modifiers ?? {};
  const items: SpellEffectSummaryItem[] = [];
  if (m.acBonus) items.push({ key: 'acBonus', value: m.acBonus });
  if (m.acPenalty) items.push({ key: 'acPenalty', value: m.acPenalty });
  if (m.acMinimum !== undefined) items.push({ key: 'acMinimum', value: m.acMinimum });
  else if (m.acBase !== undefined) items.push({ key: 'acMinimum', value: m.acBase });
  if (m.attackDice) items.push({ key: 'attackDice', value: m.attackDice });
  if (m.saveDice) items.push({ key: 'saveDice', value: m.saveDice });
  if (m.saveBonus) items.push({ key: 'saveBonus', value: m.saveBonus });
  if (m.ownAttacks && m.ownAttacks !== 'NORMAL')
    items.push({ key: 'ownAttacks', value: m.ownAttacks });
  if (m.incoming && m.incoming !== 'NORMAL') items.push({ key: 'incoming', value: m.incoming });
  if (m.saveAdvantage?.length) items.push({ key: 'saveAdvantage', value: m.saveAdvantage });
  if (m.saveDisadvantage?.length)
    items.push({ key: 'saveDisadvantage', value: m.saveDisadvantage });
  if (m.speedBonusFeet) items.push({ key: 'speedBonus', value: m.speedBonusFeet });
  if (m.speedMultiplier && m.speedMultiplier !== 1) {
    items.push({ key: 'speedMultiplier', value: m.speedMultiplier });
  }
  if (m.resistances?.length) items.push({ key: 'resistances', value: m.resistances });
  if (m.resistNonmagical?.length) {
    items.push({ key: 'resistNonmagical', value: m.resistNonmagical });
  }
  if (m.weaponDamage) {
    items.push({ key: 'weaponDamage', value: m.weaponDamage.dice, type: m.weaponDamage.type });
  }
  if (m.noReactions) items.push({ key: 'noReactions' });
  if (m.noHealing) items.push({ key: 'noHealing' });
  // Ритм повтора виден в подписи: «Призрачный убийца» бросает в начале
  // хода и бьёт на провале, «Страх» — только не видя заклинателя.
  const repeat = repeatSaveOf(mechanic);
  if (repeat) {
    items.push({
      key:
        repeat.at === 'START'
          ? 'repeatSaveStart'
          : repeat.when === 'NO_LINE_OF_SIGHT'
            ? 'repeatSaveUnseen'
            : 'repeatSave',
    });
  }
  if (mechanic.endsWhenBearerAttacks) items.push({ key: 'endsWhenBearerAttacks' });
  return items;
}

/** Плоская прибавка к спасброскам от заклинаний. */
export function saveBonusFrom(effects: readonly SpellEffectRow[]): number {
  return activeSpellModifiers(effects).reduce(
    (sum, { modifiers }) => sum + (modifiers.saveBonus ?? 0),
    0,
  );
}

export function blocksHealing(effects: readonly SpellEffectRow[]): boolean {
  return activeSpellModifiers(effects).some(({ modifiers }) => modifiers.noHealing === true);
}

/**
 * Поля SRD с поправкой по тексту описания (`SpellMechanic.override`).
 * Сервер и лист персонажа спрашивают разрешение заклинания через неё,
 * а не через сырые поля: иначе «Божественное благоволение» снова било
 * бы цель костями своей прибавки.
 */
export function withSpellOverride<
  T extends {
    code?: string;
    attackType: string | null;
    saveAbility: string | null;
    damageAtSlotLevel: unknown;
    damageAtLevel: unknown;
    healAtSlotLevel: unknown;
  },
>(spell: T): T {
  const override = spell.code ? spellMechanic(spell.code)?.override : undefined;
  if (!override) return spell;
  const next = { ...spell } as T & {
    saveHalfOnSuccess?: boolean;
    areaShape?: string | null;
    areaSizeFeet?: number | null;
  };
  if (override.attackType !== undefined) next.attackType = override.attackType;
  if (override.saveAbility !== undefined) next.saveAbility = override.saveAbility;
  if (override.saveHalfOnSuccess !== undefined) next.saveHalfOnSuccess = override.saveHalfOnSuccess;
  if (override.damage === false) {
    next.damageAtSlotLevel = null;
    next.damageAtLevel = null;
  }
  if (override.heal === false) next.healAtSlotLevel = null;
  if (override.damageAtSlotLevel) next.damageAtSlotLevel = override.damageAtSlotLevel;
  if (override.damageType && 'damageType' in spell) {
    (next as { damageType?: string }).damageType = override.damageType;
  }
  if (override.range !== undefined && 'range' in spell)
    (next as { range?: string }).range = override.range;
  if (override.area !== undefined && 'areaShape' in spell) {
    next.areaShape = override.area?.shape ?? null;
    next.areaSizeFeet = override.area?.size ?? null;
  }
  return next;
}

/**
 * Сколько лучей у заклинания с лучами; `null` — лучей нет. У
 * «Таинственного взрыва» число растёт уровнем заклинателя, у
 * «Волшебной стрелы» и «Палящего луча» — кругом ячейки.
 */
export function spellRayCount(
  code: string,
  spellLevel: number,
  slotLevel: number | null,
  casterLevel: number,
): number | null {
  const rays = spellMechanic(code)?.rays;
  if (!rays) return null;
  if (rays.byCasterLevel) {
    let count = 1;
    for (const [level, value] of Object.entries(rays.byCasterLevel)) {
      if (casterLevel >= Number(level)) count = Math.max(count, value);
    }
    return count;
  }
  const above = slotLevel === null ? 0 : Math.max(0, slotLevel - spellLevel);
  return (rays.base ?? 1) + (rays.perSlot ?? 0) * above;
}

/**
 * Запись «4d6 + 4d6» по видам урона (`override.damageTypes`):
 * «Удар пламени» — огонь и излучение. `null` — запись не делится на
 * столько частей, сколько видов названо.
 */
export function splitDamageByType(
  notation: string,
  types: readonly string[],
): { dice: string; type: string }[] | null {
  const parts = notation.split('+').map((part) => part.trim());
  if (parts.length !== types.length || !parts.every((part) => /^\d+d\d+$/i.test(part))) return null;
  return parts.map((dice, index) => ({ dice, type: types[index] as string }));
}

/** Кости прибавки к урону оружием на этом круге: база плюс `perSlot` за круг выше. */
export function weaponDiceAtSlot(
  weaponDamage: NonNullable<SpellModifiers['weaponDamage']>,
  spellLevel: number,
  slotLevel: number | null,
): string {
  const match = /^(\d+)d(\d+)$/i.exec(weaponDamage.dice.trim());
  if (!match || !weaponDamage.perSlot || slotLevel === null) return weaponDamage.dice;
  const count = Number(match[1]) + weaponDamage.perSlot * Math.max(0, slotLevel - spellLevel);
  return `${count}d${match[2]}`;
}

/** Иммунитеты к урону от заклинаний на носителе («Пустой разум»). */
export function damageImmunitiesFrom(effects: readonly SpellEffectRow[]): string[] {
  return [
    ...new Set(
      activeSpellModifiers(effects).flatMap(({ modifiers }) => modifiers.damageImmunities ?? []),
    ),
  ];
}

/** Есть ли на носителе поправка-признак (`healMaximized`, `cannotStand`…). */
export function spellFlagOn(
  effects: readonly SpellEffectRow[],
  flag: 'healMaximized' | 'deathSaveAdvantage' | 'cannotStand' | 'cannotBeSurprised',
): boolean {
  return activeSpellModifiers(effects).some(({ modifiers }) => modifiers[flag] === true);
}

/** Множитель урона оружием Силой («Луч слабости» — ½); 1 — поправки нет. */
export function strengthDamageFactor(effects: readonly SpellEffectRow[]): number {
  return activeSpellModifiers(effects).reduce(
    (factor, { modifiers }) => factor * (modifiers.weaponDamageMultiplier?.factor ?? 1),
    1,
  );
}

/**
 * Состояния, которые не ложатся на носителя от существа этого типа
 * («Защита от добра и зла»: очарование и испуг от нежити и прочих).
 * Тип источника неизвестен — защита не срабатывает.
 */
export function conditionImmunitiesFromSpells(
  effects: readonly SpellEffectRow[],
  sourceType: string | null | undefined,
): ConditionCode[] {
  if (!sourceType) return [];
  const type = creatureTypeOf(sourceType);
  return activeSpellModifiers(effects).flatMap(({ modifiers }) =>
    modifiers.conditionImmunitiesFrom?.sourceTypes.includes(type)
      ? modifiers.conditionImmunitiesFrom.conditions
      : [],
  );
}

/** Проверка навыка или характеристики носителя глазами заклинаний на нём. */
export interface SpellCheckMods {
  advantage: ('ADVANTAGE' | 'DISADVANTAGE')[];
  /** Плоские прибавки — слагаемым на заклинание. */
  bonus: { spellCode: string; value: number }[];
  /** Кости к проверке («Указание»): тратят свой эффект. */
  dice: { spellCode: string; dice: string; effectIndex: number }[];
}

/**
 * Поправки проверки от заклинаний на носителе (§3.1 плана w8):
 * преимущество по характеристике, помеха навыка «против всех, кроме
 * наложившего» (`againstId` — на кого смотрят), прибавка навыка, кость.
 */
export function spellCheckMods(
  effects: readonly SpellEffectRow[],
  check: { ability: AbilityCode; skill?: string | null; againstId?: string | null },
): SpellCheckMods {
  const out: SpellCheckMods = { advantage: [], bonus: [], dice: [] };
  effects.forEach((effect, effectIndex) => {
    const [active] = activeSpellModifiers([effect]);
    if (!active) return;
    const m = active.modifiers;
    if (m.checkAdvantage?.some((code) => code === 'ALL' || code === check.ability)) {
      out.advantage.push('ADVANTAGE');
    }
    // «Порабощение»: помеха — к проверке против кого-то, кроме заклинателя;
    // проверка без того, на кого смотрят, помехи не получает.
    if (
      check.skill &&
      m.checkDisadvantage?.includes(check.skill) &&
      check.againstId != null &&
      check.againstId !== effect.sourceId
    ) {
      out.advantage.push('DISADVANTAGE');
    }
    const bonus = check.skill ? m.checkBonus?.[check.skill] : undefined;
    if (bonus) out.bonus.push({ spellCode: active.spellCode, value: bonus });
    if (m.checkDice) out.dice.push({ spellCode: active.spellCode, dice: m.checkDice, effectIndex });
  });
  return out;
}
