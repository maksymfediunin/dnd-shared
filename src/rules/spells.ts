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
