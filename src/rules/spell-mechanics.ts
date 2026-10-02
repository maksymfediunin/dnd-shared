import type { AbilityCode } from '../enums/character.js';
import type { ConditionCode } from '../enums/conditions.js';
import type { AdvantageMode } from '../enums/dice.js';
import type { AdvantageEffect, ConditionEffects } from './conditions.js';
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
   */
  repeatSave?: boolean | AbilityCode;
  until?: SpellUntil;
  temporaryHitPoints?: { dice?: string; flat?: number; perSlot?: number; addModifier?: boolean };
  hitPointBonus?: { flat: number; perSlot?: number };
  removesConditions?: ConditionCode[];
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
  /** Отталкивание от заклинателя на провале или при попадании. */
  pushFeet?: number;
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
  /** Кончается, когда носитель получает урон («Гипнотический узор», «Очарование личности»). */
  endsOnDamage?: boolean;
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
  const { conditions: _c, modifiers: _m, temporaryHitPoints: _t, ...rest } = base;
  return {
    ...rest,
    ...(chosen.conditions ? { conditions: chosen.conditions } : {}),
    ...(chosen.modifiers ? { modifiers: chosen.modifiers } : {}),
    ...(chosen.temporaryHitPoints ? { temporaryHitPoints: chosen.temporaryHitPoints } : {}),
  };
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
      (mechanic.variants?.length ?? 0) > 0)
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
}

/** Код эффекта заклинания на цели — тот же, что `SPELL_EFFECT` сервера. */
export const SPELL_EFFECT_CODE = 'SPELL';

interface ActiveModifiers {
  spellCode: string;
  modifiers: SpellModifiers;
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
    const modifiers = spellMechanicFor(effect.spellCode, variant)?.modifiers;
    if (!modifiers) return [];
    const computed: SpellModifiers = {};
    if (typeof data?.acMinimum === 'number') computed.acMinimum = data.acMinimum;
    if (typeof data?.weaponDice === 'string' && modifiers.weaponDamage) {
      computed.weaponDamage = { ...modifiers.weaponDamage, dice: data.weaponDice };
    }
    return [{ spellCode: effect.spellCode, modifiers: { ...modifiers, ...computed } }];
  });
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
): ConditionEffects[] {
  return activeSpellModifiers(effects).map(({ modifiers }) => {
    const incomingApplies =
      modifiers.incomingFrom === undefined ||
      (attackerType != null && modifiers.incomingFrom.includes(attackerType.toLowerCase()));
    const incoming = incomingApplies ? (modifiers.incoming ?? 'NORMAL') : 'NORMAL';
    return {
      cannotAct: false,
      speed: 'NORMAL',
      ownAttacks: modifiers.ownAttacks ?? 'NORMAL',
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

export function resistancesWithEffects(
  base: readonly string[],
  effects: readonly SpellEffectRow[],
): string[] {
  const extra = activeSpellModifiers(effects).flatMap(
    ({ modifiers }) => modifiers.resistances ?? [],
  );
  return [...new Set([...base, ...extra])];
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
  const active = activeSpellModifiers(effects);
  const up = active.some(({ modifiers }) => modifiers.saveAdvantage?.includes(ability));
  const down = active.some(({ modifiers }) => modifiers.saveDisadvantage?.includes(ability));
  if (up === down) return 'NONE';
  return up ? 'ADVANTAGE' : 'DISADVANTAGE';
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
  | { key: 'resistances'; value: string[] }
  | { key: 'weaponDamage'; value: string; type: string }
  | { key: 'noReactions' | 'noHealing' | 'repeatSave' | 'endsWhenBearerAttacks' };

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
  if (m.weaponDamage) {
    items.push({ key: 'weaponDamage', value: m.weaponDamage.dice, type: m.weaponDamage.type });
  }
  if (m.noReactions) items.push({ key: 'noReactions' });
  if (m.noHealing) items.push({ key: 'noHealing' });
  if (mechanic.repeatSave) items.push({ key: 'repeatSave' });
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
