import type { AdvantageMode } from '../enums/dice.js';

/** Отдаёт целое от 1 до `sides` включительно. */
export type RandomSource = (sides: number) => number;

export interface RollRequest {
  diceCount: number;
  diceSides: number;
  modifier: number;
  advantageMode: AdvantageMode;
}

export interface RollOutcome {
  /** Всё выпавшее, включая отброшенное при преимуществе и помехе. */
  results: number[];
  total: number;
  notation: string;
}

/**
 * Запись броска одинакова на всех языках, поэтому хранится строкой, а
 * не собирается заново. Преимущество в неё не попадает: это по-прежнему
 * `1d20+5`, а два выпавших значения видны в `results`.
 */
export function diceNotation(count: number, sides: number, modifier: number): string {
  const base = `${count}d${sides}`;
  if (modifier === 0) return base;
  return `${base}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;
}

/**
 * Кость, которая решает: при преимуществе — большая из двух, при
 * помехе — меньшая, иначе единственная брошенная. Отсюда же берётся
 * натуральная двадцатка для крита и натуральная единица для промаха,
 * поэтому правило живёт в одном месте, а не повторяется в самом броске
 * и в разборе атаки (хвост 13 волны «а» куска 7).
 */
export function keptDie(results: number[], advantageMode: AdvantageMode): number {
  if (advantageMode === 'ADVANTAGE') return Math.max(...results);
  if (advantageMode === 'DISADVANTAGE') return Math.min(...results);
  // Единица, а не ноль: пустого броска не бывает, но если он случится,
  // это промах, а не случайный успех.
  return results[0] ?? 1;
}

export function rollDice(request: RollRequest, random: RandomSource): RollOutcome {
  const { diceCount, diceSides, modifier, advantageMode } = request;
  const notation = diceNotation(diceCount, diceSides, modifier);

  if (advantageMode !== 'NONE') {
    // Схема уже не пустила сюда ничего, кроме одного d20.
    const results = [random(diceSides), random(diceSides)];
    return { results, total: keptDie(results, advantageMode) + modifier, notation };
  }

  const results = Array.from({ length: diceCount }, () => random(diceSides));
  const sum = results.reduce((acc, value) => acc + value, 0);

  return { results, total: sum + modifier, notation };
}
