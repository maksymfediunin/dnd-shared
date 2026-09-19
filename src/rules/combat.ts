import type { WeaponProperty, WeaponRangeType } from '../enums/character.js';
import type { DeathSaveOutcome } from '../enums/combat.js';
import type { AdvantageMode } from '../enums/dice.js';
import { diceNotation, keptDie, type RandomSource, rollDice } from './dice.js';
import type { Cell } from './grid.js';

/**
 * Правила боя: чистая арифметика без базы, без Express и без React.
 * Случайность приходит аргументом (`RandomSource`) — иначе бой нечем
 * проверить, а проверять здесь есть что: почти каждое число этого
 * файла игрок увидит своими глазами.
 */

export interface InitiativeEntry {
  id: string;
  initiative: number;
  dexterityModifier: number;
}

/**
 * Очередь хода. Равные числа разводит ловкость (PHB), а совсем равные
 * — идентификатор: порядок обязан быть одним и тем же при каждом
 * чтении, иначе игрок то третий, то четвёртый без всякой причины.
 */
export function initiativeOrder<T extends InitiativeEntry>(participants: T[]): T[] {
  return [...participants].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      b.dexterityModifier - a.dexterityModifier ||
      a.id.localeCompare(b.id),
  );
}

export interface AttackRollResult {
  results: number[];
  total: number;
  notation: string;
  /** Натуральная двадцатка: попадание независимо от КД и двойные кости урона. */
  isCritical: boolean;
  /** Натуральная единица: промах независимо от КД. */
  isCriticalMiss: boolean;
}

export function attackRoll(
  input: { attackBonus: number; advantageMode: AdvantageMode },
  random: RandomSource,
): AttackRollResult {
  const outcome = rollDice(
    {
      diceCount: 1,
      diceSides: 20,
      modifier: input.attackBonus,
      advantageMode: input.advantageMode,
    },
    random,
  );

  // При преимуществе и помехе решает оставленная кость, а не обе: это
  // она определяет крит, и её же видит игрок как «сработавшую». Правило
  // — общее с самим броском (`keptDie`), а не вторая его копия.
  const natural = keptDie(outcome.results, input.advantageMode);

  return {
    results: outcome.results,
    total: outcome.total,
    notation: outcome.notation,
    isCritical: natural === 20,
    isCriticalMiss: natural === 1,
  };
}

export function attackOutcome(input: {
  total: number;
  isCritical: boolean;
  isCriticalMiss: boolean;
  targetArmorClass: number;
}): 'HIT' | 'MISS' {
  if (input.isCriticalMiss) return 'MISS';
  if (input.isCritical) return 'HIT';
  return input.total >= input.targetArmorClass ? 'HIT' : 'MISS';
}

export interface DamageRollResult {
  results: number[];
  amount: number;
  notation: string;
}

/**
 * Разбирает запись вида `2d6` из справочника оружия и бестиария.
 * Бросает при неразобранной записи: опечатка в данных справочника
 * превратится в молчаливо неверный урон, который игрок примет за
 * настоящий. Падение здесь правильнее, чем молчаливая подмена.
 */
function parseDice(dice: string): { count: number; sides: number } {
  const match = /^(\d+)d(\d+)$/i.exec(dice.trim());
  if (!match) throw new Error(`Неразобранная нотация кости: "${dice}"`);
  return { count: Number(match[1]), sides: Number(match[2]) };
}

/**
 * Критическое попадание удваивает **кости**, но не модификатор (PHB).
 * Удваиваются именно броски, а не результат: два кубика по шесть — не
 * то же самое, что один, умноженный на два.
 */
export function damageRoll(
  input: { dice: string; modifier: number; isCritical: boolean },
  random: RandomSource,
): DamageRollResult {
  const { count, sides } = parseDice(input.dice);
  const rolls = input.isCritical ? count * 2 : count;
  const results = Array.from({ length: rolls }, () => random(sides));
  const sum = results.reduce((acc, value) => acc + value, 0);

  return {
    results,
    amount: Math.max(0, sum + input.modifier),
    notation: diceNotation(rolls, sides, input.modifier),
  };
}

/**
 * Урон списывается сначала с временных хитов и не уводит текущие ниже
 * нуля: в 5e нет «минус пяти», есть ноль и спасброски от смерти.
 */
export function applyDamage(input: { current: number; temporary: number; amount: number }): {
  current: number;
  temporary: number;
  temporaryAbsorbed: number;
} {
  const temporaryAbsorbed = Math.min(input.temporary, input.amount);
  const rest = input.amount - temporaryAbsorbed;

  return {
    current: Math.max(0, input.current - rest),
    temporary: input.temporary - temporaryAbsorbed,
    temporaryAbsorbed,
  };
}

export interface DeathSaveResult {
  outcome: DeathSaveOutcome;
  successes: number;
  failures: number;
  /** Не пусто только при двадцатке: персонаж очнулся с одним хитом. */
  hitPoints?: number;
}

/**
 * Спасбросок от смерти со всеми четырьмя особыми случаями PHB.
 * Двадцатка обнуляет счётчики: персонаж больше не умирает, он в
 * сознании.
 */
export function deathSave(input: {
  roll: number;
  successes: number;
  failures: number;
}): DeathSaveResult {
  if (input.roll === 20) {
    return { outcome: 'REVIVED', successes: 0, failures: 0, hitPoints: 1 };
  }

  if (input.roll === 1) {
    const failures = Math.min(3, input.failures + 2);
    return { outcome: failures >= 3 ? 'DEAD' : 'FAILURE', successes: input.successes, failures };
  }

  if (input.roll >= 10) {
    const successes = Math.min(3, input.successes + 1);
    return { outcome: successes >= 3 ? 'STABLE' : 'SUCCESS', successes, failures: input.failures };
  }

  const failures = Math.min(3, input.failures + 1);
  return { outcome: failures >= 3 ? 'DEAD' : 'FAILURE', successes: input.successes, failures };
}

/**
 * Стоимость шага в футах. Расстояние Чебышёва: диагональ стоит
 * столько же, сколько прямая — базовое правило 5e, а не упрощение.
 * Вариант «каждая вторая диагональ дороже» из DMG необязателен и
 * потребовал бы помнить историю шагов внутри хода.
 */
export function movementCost(from: Cell, to: Cell, cellSizeFeet: number): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * cellSizeFeet;
}

/**
 * Бонус атаки оружием. Фехтовальное и дальнобойное — по правилам PHB:
 * первое берёт больший из двух модификаторов, второе всегда ловкость.
 */
export function weaponAttackBonus(input: {
  properties: WeaponProperty[];
  rangeType: WeaponRangeType;
  strengthModifier: number;
  dexterityModifier: number;
  proficiencyBonus: number;
  isProficient: boolean;
}): number {
  const finesse = input.properties.includes('FINESSE');
  const ranged = input.rangeType === 'RANGED';

  const ability = ranged
    ? input.dexterityModifier
    : finesse
      ? Math.max(input.strengthModifier, input.dexterityModifier)
      : input.strengthModifier;

  return ability + (input.isProficient ? input.proficiencyBonus : 0);
}

/**
 * Досягаемость в клетках. Округление вниз, но не до нуля: оружие с
 * досягаемостью меньше клетки всё равно достаёт соседа — иначе на
 * карте с десятифутовой клеткой драться было бы нечем.
 */
export function reachInCells(input: { reachFeet: number; cellSizeFeet: number }): number {
  return Math.max(1, Math.floor(input.reachFeet / input.cellSizeFeet));
}
