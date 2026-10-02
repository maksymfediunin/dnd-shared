import type { AbilityCode, ClassCode } from '../enums/character.js';
import { casterKind, pactMagic, spellSlots } from './progression.js';

/**
 * Заклинательная характеристика класса. Таблицами прогрессии её не
 * назвать, но без неё ни сложность спасброска, ни бонус атаки не
 * посчитать, а класс — единственное, от чего она зависит.
 */
const SPELLCASTING_ABILITY: Partial<Record<ClassCode, AbilityCode>> = {
  bard: 'charisma',
  cleric: 'wisdom',
  druid: 'wisdom',
  paladin: 'charisma',
  ranger: 'wisdom',
  sorcerer: 'charisma',
  warlock: 'charisma',
  wizard: 'intelligence',
};

export function spellcastingAbility(classCode: ClassCode): AbilityCode | null {
  return SPELLCASTING_ABILITY[classCode] ?? null;
}

export interface SpellcastingInput {
  proficiencyBonus: number;
  abilityModifier: number;
}

export function spellSaveDc({ proficiencyBonus, abilityModifier }: SpellcastingInput): number {
  return 8 + proficiencyBonus + abilityModifier;
}

export function spellAttackBonus({ proficiencyBonus, abilityModifier }: SpellcastingInput): number {
  return proficiencyBonus + abilityModifier;
}

/**
 * Самый высокий доступный круг. Ноль — заклинаний кругами нет вовсе:
 * так выглядит и воин, и паладин первого уровня.
 */
export function maxSpellLevel(classCode: ClassCode, level: number): number {
  const pact = pactMagic(classCode, level);
  if (pact) return pact.spellLevel;
  return spellSlots(classCode, level).length;
}

export interface SpellsPreparedInput {
  classCode: ClassCode;
  level: number;
  /** Модификатор заклинательной характеристики класса. */
  spellcastingModifier: number;
}

/** Делители уровня для подготовки: паладин считает половину вниз. */
const PREPARING_CLASSES: Partial<Record<ClassCode, number>> = {
  cleric: 1,
  druid: 1,
  wizard: 1,
  paladin: 2,
};

/**
 * Сколько заклинаний персонаж готовит из списка класса. null — класс
 * подготовкой не пользуется: у барда, чародея, колдуна и следопыта
 * есть список известных, а у прочих заклинаний нет вовсе.
 */
export function spellsPrepared({
  classCode,
  level,
  spellcastingModifier,
}: SpellsPreparedInput): number | null {
  const divisor = PREPARING_CLASSES[classCode];
  if (divisor === undefined) return null;

  // Паладин становится заклинателем со второго уровня: пока ячеек
  // нет, готовить попросту нечем.
  if (maxSpellLevel(classCode, level) === 0 && casterKind(classCode) !== 'FULL') return 0;

  return Math.max(1, spellcastingModifier + Math.floor(level / divisor));
}

/**
 * Карта «ступень → запись броска» ровно в том виде, в каком её несёт
 * SRD: ключ — строка, а не число. Разбирать его в число при импорте и
 * собирать обратно при чтении значило бы держать два представления
 * одних данных; здесь ключ разбирается один раз и только на чтение.
 */
export type DiceByLevel = Record<string, string>;

/** Поля механики заклинания, нужные для выбора костей урона. */
export interface SpellDamageSource {
  /** Круг заклинания; ноль — кантрип. */
  level: number;
  /** `{ "3": "8d6", "4": "9d6" }` — кости по кругу потраченной ячейки. */
  damageAtSlotLevel?: DiceByLevel | null;
  /** `{ "1": "1d10", "5": "2d10" }` — кости кантрипа по уровню персонажа. */
  damageAtLevel?: DiceByLevel | null;
}

export interface DamageDiceInput {
  spell: SpellDamageSource;
  /** Круг потраченной ячейки. У кантрипа ячейки нет вовсе. */
  slotLevel?: number | null;
  /** Уровень заклинателя — им, а не ячейкой, растёт кантрип. */
  casterLevel?: number | null;
}

/**
 * Ступень таблицы для уровня: ближайшая снизу, а не точное совпадение.
 * В SRD ступени идут с пропусками («1», «5», «11», «17» у кантрипа) и
 * обрываются там, где перестают расти, — точный поиск оставил бы без
 * костей и персонажа четвёртого уровня, и ячейку девятого круга.
 */
function diceAtOrBelow(table: DiceByLevel | null | undefined, level: number): string | null {
  if (!table) return null;

  let bestStep = Number.NEGATIVE_INFINITY;
  let bestDice: string | null = null;

  for (const [key, dice] of Object.entries(table)) {
    const step = Number(key);
    if (!Number.isFinite(step) || step > level || step <= bestStep) continue;
    bestStep = step;
    bestDice = dice;
  }

  return bestDice;
}

/**
 * Кости урона заклинания. `null` — машинного урона у заклинания нет, и
 * это штатный случай, а не пробел в данных: машинных полей нет больше
 * чем у половины заклинаний кругов 0–3, и такое заклинание всё равно
 * сотворяется — эффект применяет ведущий (§3 дизайна).
 *
 * Кантрип и заклинание с ячейкой разведены по кругу самого заклинания,
 * а не по наличию таблицы: кантрип ячейки не тратит никогда, и брать
 * ему ступень по кругу ячейки было бы нечем.
 */
export function damageDiceFor({ spell, slotLevel, casterLevel }: DamageDiceInput): string | null {
  if (spell.level === 0) {
    if (casterLevel === undefined || casterLevel === null) return null;
    return diceAtOrBelow(spell.damageAtLevel, casterLevel);
  }

  // Ячейка не названа — заклинание сотворено своим кругом: у ступеней
  // таблицы SRD нижняя как раз он.
  return diceAtOrBelow(spell.damageAtSlotLevel, slotLevel ?? spell.level);
}

/**
 * Круги ячеек, какие у персонажа вообще бывают. Не остаток: сколько
 * потрачено, знает только лист (`CharacterSpellSlot`), а правило —
 * какие круги ему предлагать.
 */
export function slotLevelsAvailable(classCode: ClassCode, level: number): number[] {
  const pact = pactMagic(classCode, level);
  // У колдуна все ячейки одного круга. Перечислять ему круги ниже
  // значило бы показать в панели ячейки, которых у него нет.
  if (pact) return [pact.spellLevel];

  return spellSlots(classCode, level)
    .map((count, index) => ({ count, slotLevel: index + 1 }))
    .filter((row) => row.count > 0)
    .map((row) => row.slotLevel);
}

/** Поля механики заклинания, нужные для выбора костей лечения. */
export interface SpellHealSource {
  /** Круг заклинания. Лечащих кантрипов в SRD нет вовсе. */
  level: number;
  /** `{ "1": "1d8 + MOD" }` — кости по кругу потраченной ячейки. */
  healAtSlotLevel?: DiceByLevel | null;
}

export interface HealDiceInput {
  spell: SpellHealSource;
  /** Круг потраченной ячейки. */
  slotLevel?: number | null;
}

/**
 * Кости лечения заклинания. Рядом с `damageDiceFor` и тем же
 * `diceAtOrBelow`, а не своей копией выбора ступени на сервере:
 * «ступень не выше круга» — одно правило, и разойтись двум его
 * прочтениям нечем, только пока оно одно (та же причина, что у
 * `cellsInArea` в §7 дизайна).
 *
 * Запись возвращается как есть, вместе с «+ MOD» источника: сколько
 * прибавит модификатор заклинателя, знает тот, кто бросает, а
 * подставлять его здесь значило бы тащить в правило весь лист.
 *
 * `null` — заклинание не лечит: у сотворения тогда другое разрешение
 * (§5 дизайна).
 */
export function healDiceFor({ spell, slotLevel }: HealDiceInput): string | null {
  // Ячейка не названа — заклинание сотворено своим кругом, тем же
  // умолчанием, что и у костей урона.
  return diceAtOrBelow(spell.healAtSlotLevel, slotLevel ?? spell.level);
}

/**
 * Запись броска из SRD, разобранная на кости и прибавку. Источник
 * пишет их одной строкой и в трёх видах: «8d6», «3d4 + 3» и
 * «1d8 + MOD», где MOD — модификатор заклинательной характеристики.
 * Голое число («10» у лечения высоких кругов) — не бросок вовсе, и
 * кости у него пусты.
 */
export interface SpellDiceRoll {
  /** `null` — броска нет, есть только число прибавки. */
  dice: string | null;
  modifier: number;
  /**
   * Прибавка — модификатор заклинателя («+ MOD» записи SRD), а не число
   * самого заклинания: стол видит её как «Мудрость +3», а не «+3»
   * (docs/2026-10-02-roll-modifier-parts-design.md). Только `true` —
   * чтобы прочие разборы оставались прежней формы.
   */
  fromCaster?: true;
}

/**
 * Разбор записи броска. `null` — запись, которой правило не знает
 * («2d8 + 4d6» у пары заклинаний высоких кругов): считать её наугад
 * хуже, чем не считать вовсе, — сотворение тогда проходит без машинного
 * урона, а эффект применяет ведущий (§3 дизайна).
 *
 * Живёт здесь, а не рядом с сотворением на сервере, потому что от
 * разбора зависит и признак `isMachineResolvable`, который лист отдаёт
 * панели боя: разойдись эти двое — в панели снова появилось бы обещание
 * расчёта, которого не будет.
 */
export function parseSpellDice(
  notation: string,
  spellcastingModifier: number,
): SpellDiceRoll | null {
  const match = /^(?:(\d+d\d+)(?:\s*\+\s*(\d+|mod))?|(\d+))$/i.exec(notation.trim());
  if (!match) return null;

  const [, dice, bonus, flat] = match;
  if (flat !== undefined) return { dice: null, modifier: Number(flat) };

  const fromCaster = bonus?.toLowerCase() === 'mod';
  const modifier = bonus === undefined ? 0 : fromCaster ? spellcastingModifier : Number(bonus);
  return { dice: dice as string, modifier, ...(fromCaster ? { fromCaster: true as const } : {}) };
}

/** Дистанция «касание» — соседняя клетка, как у ближнего оружия (PHB). */
const TOUCH_FEET = 5;

/**
 * Дистанция «на себя»: у таких заклинаний точка приложения — сам
 * заклинатель, а не клетка под курсором. Проверять её футами нечем и
 * незачем — конус огня из ладоней меряется своей длиной, а не
 * дистанцией.
 */
/** Раундов в минуте боя (PHB: раунд — шесть секунд). */
const ROUNDS_PER_MINUTE = 10;

/**
 * Сколько держится эффект заклинания на сцене: `INSTANT` — нисколько,
 * число — раундов (до минуты включительно), `LONG` — дольше боя (час,
 * восемь часов, «пока не рассеют»): такой эффект живёт до конца сцены
 * или пока его не снимет ведущий.
 */
export function spellEffectDuration(duration: string): 'INSTANT' | 'LONG' | number {
  const normalized = duration
    .trim()
    .toLowerCase()
    .replace(/^up to /, '');
  if (normalized === 'instantaneous') return 'INSTANT';
  const match = /^(\d+)\s+(round|minute)s?$/.exec(normalized);
  if (!match) return 'LONG';
  const rounds = Number(match[1]) * (match[2] === 'minute' ? ROUNDS_PER_MINUTE : 1);
  return rounds <= ROUNDS_PER_MINUTE ? rounds : 'LONG';
}

export type CombatCastingTime = 'ACTION' | 'BONUS_ACTION' | 'REACTION';

/**
 * Чем сотворяется заклинание в бою. `null` — бой его не проводит: всё,
 * что длится минуты. Бонусное действие тратит своё, а не действие (§2
 * дизайна метки охотника); реакция («Щит») — свою, и в чужой ход.
 */
export function combatCastingTime(castingTime: string): CombatCastingTime | null {
  const normalized = castingTime.trim().toLowerCase();
  if (normalized === '1 action') return 'ACTION';
  if (normalized === '1 bonus action') return 'BONUS_ACTION';
  if (normalized.startsWith('1 reaction')) return 'REACTION';
  return null;
}

export function isSelfRange(range: string): boolean {
  return range.trim().toLowerCase().startsWith('self');
}

/**
 * Дистанция заклинания в футах. `null` — не измерить: в SRD
 * встречаются «Sight», «Unlimited» и «Special», и отказывать по
 * дистанции, которой не знаешь, значило бы придумывать правило за
 * книгу. Такое заклинание сотворяется без проверки дальности — тем же
 * решением, каким система не считает то, чего не умеет (§3 дизайна волны «в»).
 */
export function spellRangeFeet(range: string): number | null {
  const normalized = range.trim().toLowerCase();
  if (normalized.startsWith('touch')) return TOUCH_FEET;

  const match = /^(\d+)\s*(?:feet|foot|ft)/.exec(normalized);
  return match ? Number(match[1]) : null;
}
