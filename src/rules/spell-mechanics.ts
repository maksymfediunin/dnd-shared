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
  /** Чувства носителя («Тёмное зрение», «Видение невидимого», «Истинное зрение»). */
  senses?: { darkvision?: number; truesight?: number; seeInvisible?: true };
  /** Скорости сверх ходьбы («Полёт» — 60 футов). */
  speeds?: { fly?: number };
  /** Помеха по носителю не действует на атакующих со слепым или истинным зрением («Размытый образ»). */
  sightOnlyIncoming?: true;
  /** Преимущество по носителю — только у атакующего, который его видит («Огонь фей»). */
  incomingNeedsSight?: true;
  /** Висит в воздухе: по горизонтали не ходит, вверх и вниз — до 20 футов за ход («Левитация»). */
  levitating?: true;
}

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

/** Когда срабатывает зона: вход, начало и конец хода стоящего, начало и конец хода заклинателя. */
export type ZoneTrigger = 'ENTER' | 'START' | 'END' | 'CASTER_TURN_START' | 'CASTER_TURN_END';

export interface LightSpec {
  /** Футы яркого света; тусклый — сверх него, как в SRD. */
  bright: number;
  dim: number;
  /** Клетки зоны, фишка носителя эффекта или предмет (у существа — как носитель, иначе точка). */
  on: 'ZONE' | 'BEARER' | 'OBJECT';
}

/** Статические свойства зоны (план волны 5, §3.1). */
export interface ZoneProps {
  /** Срабатывания; нет — зона без срабатываний (туман, «Тишина»). */
  on?: readonly ZoneTrigger[];
  /** Срабатывает и при сотворении на тех, кто уже внутри. */
  onCast?: boolean;
  /** Аура — радиус в футах вокруг заклинателя, идёт с ним. */
  aura?: number;
  hostileOnly?: boolean;
  /** Что накладывает на провале — сверх урона. */
  conditions?: ConditionCode[];
  /** Только стоящих на земле (высота 0): «Шипы», «Жир», «Опутывание». */
  ground?: true;
  /**
   * Высота зоны в футах, если её не дают форма и размер области:
   * цилиндр «Лунного луча» — 40 футов при радиусе 5 (ревью 5а, В7).
   */
  heightFeet?: number;
  obscure?: 'LIGHT' | 'HEAVY';
  magicalDarkness?: true;
  silence?: true;
  /** Цена клетки внутри: 2 — труднопроходимо, 4 — «Рост растений». */
  difficult?: 2 | 4;
  /** Пока внутри: скорость вдвое («Духовные стражи»). */
  inside?: { speedMultiplier?: number; hostileOnly?: boolean };
  /** Урон за каждые `perFeet` пути внутри («Шипы»). */
  perMove?: { dice: string; perFeet: number; type: string };
  /** Опутанный этой зоной в начале хода получает урон без броска («Чёрные щупальца»). */
  restrainedTakeDamage?: boolean;
  /** Вырваться — проверка характеристики действием против СЛ заклинания. */
  escape?: { checks: readonly AbilityCode[]; economy?: 'ACTION' };
  /** Концентрирующийся внутри бросает спасбросок концентрации («Ледяная буря»). */
  concentrationSave?: { ability: AbilityCode; on: readonly ZoneTrigger[] };
  /** Двигается: действием, бонусом или сама в начале хода заклинателя. */
  move?: {
    economy: 'ACTION' | 'BONUS_ACTION' | 'CASTER_TURN_START';
    feet?: number;
    direction?: 'ANY' | 'AWAY_FROM_CASTER';
    /** Таран: сдвинутая на существо — спасбросок сразу и встаёт («Пылающая сфера»). */
    ram?: true;
    /** Поворот линии вокруг заклинателя («Порыв ветра»). */
    rotate?: true;
    /** Отдельные точки, а не одна область («Пляшущие огоньки»). */
    points?: number;
  };
  /** Толчок на провале («Порыв ветра»): `on` — когда, `ALONG_LINE` — по линии сотворения. */
  push?: {
    feet: number;
    on?: readonly ZoneTrigger[];
    save?: AbilityCode;
    direction?: 'ALONG_LINE';
  };
  /** Шаг к заклинателю внутри стоит вдвое («Порыв ветра»). */
  approachCost?: 2;
  /** Рассеивается ветром / рассеивает. */
  dispersedBy?: 'WIND';
  disperses?: true;
  /** Снимает магическую тьму: круга не выше `upToLevel` или любую. */
  dispelDarkness?: { upToLevel: number } | 'ALL';
  /** Скрыта от тех, кто не видел сотворения и не нашёл её поиском («Шипы»). */
  hidden?: { check: 'perception' };
  /** Исчезает, нанеся столько урона («Страж веры»). */
  damageCap?: number;
  /** Держится до конца следующего хода заклинателя («Ледяной шторм»). */
  lasts?: 'CASTER_NEXT_TURN_END';
  /** Вид урона срабатывания, когда он не тот, что при появлении («Стена из шипов» — 5б). */
  damageType?: string;
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
  /** Ширина линии области в футах («Порыв ветра» — 10); нет — одна клетка. */
  lineWidthFeet?: number;
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
  targetFilter?: { types?: string[]; maxInt?: number; excludeTypes?: string[] };
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
   * Зона на карте («Духовные стражи», «Лунный луч», «Туманное облако»):
   * статические свойства (план волны 5, решение 2). Экземпляр — клетки,
   * СЛ, урон, счётчики — лежит в `data` эффекта `SPELL_AREA`, а свойства
   * читаются отсюда при каждом обращении: старые зоны получают новые
   * свойства без миграции.
   */
  zone?: ZoneProps;
  /** Свет заклинания (решение 28): на клетках зоны, на носителе или на предмете. */
  light?: LightSpec;
  /**
   * «Существо или точку, которую вы видите» (решение 14): цель или клетка
   * вне обзора заклинателя — 422 `TARGET_NOT_SEEN`. Сверено с текстом SRD
   * тестом `spell-sight.test.ts`.
   */
  seen?: 'TARGET' | 'POINT' | 'BOTH';
  /** Подсвеченный не получает выгоды от невидимости («Огонь фей», «Клеймящая кара»). */
  revealInvisible?: true;
  /** Цель не получает выгоды от укрытия («Священное пламя»). */
  ignoresCover?: true;
  /** Отбор целей пропускает тех, кто не видит заклинателя («Цветные брызги»). */
  perceives?: readonly 'SEE_CASTER'[];
  /** Помеха на спасбросок существам этих типов («Солнечная вспышка»). */
  saveByType?: { disadvantage: readonly string[] };
  /** Метки для предикатов спасброска: растения, мешающие движению (поступь по земле). */
  tags?: readonly 'impedingPlants'[];
  /** Чем кончается для носителя на высоте: падением («Полёт») или плавным спуском («Левитация»). */
  falls?: 'FLY' | 'LEVITATE';
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
      // Свет на носителе и подсветка невидимого («Свет» на щите, «Огонь фей»).
      // Свет зоны («Пляшущие огоньки») живёт на клетках, а не на фишке.
      (mechanic.light !== undefined && mechanic.light.on !== 'ZONE') ||
      mechanic.revealInvisible === true)
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
    if (effect.code !== SPELL_EFFECT_CODE || !effect.spellCode) return [];
    const data = (effect.data ?? null) as {
      acMinimum?: unknown;
      weaponDice?: unknown;
      variant?: unknown;
    } | null;
    const variant = typeof data?.variant === 'string' ? data.variant : null;
    const mechanic = spellMechanicFor(effect.spellCode, variant);
    const modifiers = mechanic?.modifiers;
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

/** Атакующий глазами следствий на носителе: тип существа и видит ли он носителя. */
export interface AttackerView {
  type?: string | null;
  /** Видит ли носителя — «Огонь фей» помогает только видящему. Нет — видит. */
  seesBearer?: boolean;
  /** Слепое или истинное зрение в досягаемости — «Размытый образ» не мешает. */
  nonSightSense?: boolean;
}

/**
 * Следствия заклинаний в форме таблицы состояний — чтобы бросок
 * сводился одним `combineConditions`. `attacker` — тип существа
 * атакующего (строкой, как до волны 5) или его вид целиком: «Защита от
 * добра и зла» мешает не всем, а исчадиям и нежити; «Размытый образ» не
 * мешает слепому и истинному зрению; «Огонь фей» помогает только
 * видящему. Тип не назван — такая помеха не действует.
 */
export function spellConditionEffects(
  effects: readonly SpellEffectRow[],
  attacker?: string | null | AttackerView,
  /**
   * С кем носитель меряется в этом броске: цель его атаки. Следствия
   * «только против наложившего» (`vsSourceOnly`) без неё не действуют.
   */
  againstId?: string | null,
  /** Сейчас ход носителя; не назван — считается, что да. */
  bearerTurn = true,
): ConditionEffects[] {
  const view: AttackerView =
    typeof attacker === 'object' && attacker !== null ? attacker : { type: attacker ?? null };
  const attackerType = view.type ?? null;
  return activeSpellModifiers(effects).map(({ modifiers, onlyAgainst, ownTurnOnly }) => {
    const incomingApplies =
      (modifiers.incomingFrom === undefined ||
        (attackerType != null && modifiers.incomingFrom.includes(attackerType.toLowerCase()))) &&
      !(modifiers.sightOnlyIncoming && view.nonSightSense) &&
      !(modifiers.incomingNeedsSight && view.seesBearer === false);
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

/** Чувства от заклинаний на носителе: большее из радиусов, «видит невидимое» — любое. */
export function spellSensesFrom(effects: readonly SpellEffectRow[]): {
  darkvision: number;
  truesight: number;
  seeInvisible: boolean;
} {
  const out = { darkvision: 0, truesight: 0, seeInvisible: false };
  for (const { modifiers } of activeSpellModifiers(effects)) {
    out.darkvision = Math.max(out.darkvision, modifiers.senses?.darkvision ?? 0);
    out.truesight = Math.max(out.truesight, modifiers.senses?.truesight ?? 0);
    out.seeInvisible ||= modifiers.senses?.seeInvisible === true;
  }
  return out;
}

/** Скорость полёта от заклинаний («Полёт»); ноль — не летает. */
export function flySpeedFrom(effects: readonly SpellEffectRow[]): number {
  return Math.max(0, ...activeSpellModifiers(effects).map((m) => m.modifiers.speeds?.fly ?? 0));
}

/** Висит ли носитель «Левитацией». */
export function isLevitating(effects: readonly SpellEffectRow[]): boolean {
  return activeSpellModifiers(effects).some((m) => m.modifiers.levitating === true);
}

/**
 * Свет и подсветка эффекта на носителе. «Клеймящая кара» лежит на
 * заклинателе до удара и светить не должна: её свет — на поражённом,
 * куда эффект переходит с пометкой `data.branded`.
 */
export function bearerLightOf(effect: SpellEffectRow): {
  light: LightSpec | null;
  reveals: boolean;
} {
  if (effect.code !== SPELL_EFFECT_CODE || !effect.spellCode)
    return { light: null, reveals: false };
  const variant = (effect.data as { variant?: unknown } | null)?.variant;
  const mechanic = spellMechanicFor(effect.spellCode, typeof variant === 'string' ? variant : null);
  if (!mechanic) return { light: null, reveals: false };
  const branded = (effect.data as { branded?: unknown } | null)?.branded === true;
  if (mechanic.consumedOnOwnAttack && !branded) return { light: null, reveals: false };
  return {
    light: mechanic.light && mechanic.light.on !== 'ZONE' ? mechanic.light : null,
    reveals: mechanic.revealInvisible === true,
  };
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
