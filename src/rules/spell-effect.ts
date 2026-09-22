import type { SpellUnresolvedReason } from '../enums/combat.js';
import { type DiceByLevel, damageDiceFor, healDiceFor, parseSpellDice } from './spells.js';

/**
 * Поля справочника, по которым сервер разрешает заклинание машинно.
 * Ровно те, что в схеме отделены комментарием «Ниже — машинная
 * механика», плюс круг самого заклинания: без него не выбрать ступень
 * таблицы костей (кантрип растёт уровнем персонажа, прочие — кругом
 * ячейки). `areaShape` и `areaSizeFeet` сюда не входят — это
 * прицеливание, а не разрешение, и область без урона ничего не считает.
 */
export interface SpellResolutionFields {
  /** Круг заклинания; ноль — кантрип. */
  level: number;
  attackType: string | null;
  saveAbility: string | null;
  damageType: string | null;
  damageAtSlotLevel: DiceByLevel | null;
  damageAtLevel: DiceByLevel | null;
  healAtSlotLevel: DiceByLevel | null;
}

/**
 * Обстоятельства сотворения, от которых зависит выбор ступени таблицы.
 * Оба необязательны: лист персонажа спрашивает признак заранее, когда
 * круг ячейки ещё не выбран, и умолчания тут те же, что у
 * `damageDiceFor` и `healDiceFor` — собственный круг заклинания.
 */
export interface SpellResolutionInput {
  /** Круг потраченной ячейки. У кантрипа ячейки нет вовсе. */
  slotLevel?: number | null;
  /** Уровень заклинателя — им, а не ячейкой, растёт кантрип. */
  casterLevel?: number | null;
  /** Модификатор заклинательной характеристики — «+ MOD» записей SRD. */
  spellcastingModifier?: number;
}

/**
 * Машинный урон заклинания. Три исхода, а не два: `NONE` — урона у
 * заклинания нет вовсе (штатный случай §3 дизайна волны «в»),
 * `UNRESOLVED` — поля есть, а числа не вышло. Различать их надо потому,
 * что в журнале они выглядели одинаково — тишиной, — и разбор спорного
 * момента упирался в неё (§5.2 дизайна куска 8).
 */
export type SpellDamagePlan =
  | { kind: 'DAMAGE'; dice: string | null; modifier: number; type: string }
  | { kind: 'NONE' }
  | { kind: 'UNRESOLVED'; reason: SpellUnresolvedReason };

export function spellDamagePlan(
  spell: SpellResolutionFields,
  { slotLevel, casterLevel, spellcastingModifier = 0 }: SpellResolutionInput = {},
): SpellDamagePlan {
  // Уровень заклинателя не назван — считаем первым: нижняя ступень
  // таблицы кантрипа в SRD всегда «1», поэтому наличие костей от уровня
  // не зависит, а меняется от него только сама запись броска.
  const notation = damageDiceFor({ spell, slotLevel, casterLevel: casterLevel ?? 1 });

  if (!notation) return { kind: 'NONE' };
  // Кости есть, а вида урона нет — придумать его нельзя, и схема
  // строки `DAMAGE` без него запись не пропустит.
  if (!spell.damageType) return { kind: 'UNRESOLVED', reason: 'NO_DAMAGE_TYPE' };

  const parsed = parseSpellDice(notation, spellcastingModifier);
  if (!parsed) return { kind: 'UNRESOLVED', reason: 'UNPARSED_DICE' };

  return { kind: 'DAMAGE', ...parsed, type: spell.damageType };
}

/**
 * Каким из трёх разрешений §5 дизайна пойдёт сотворение. `NONE` —
 * ни одним: строка `CAST` будет, а числа не будет, и эффект применяет
 * ведущий.
 *
 * Порядок здесь несущий, а не для красоты: атака старше спасброска,
 * спасбросок старше лечения. Спасбросок без разобранных костей уходит
 * в `NONE` — считать по нему нечего, а сотворение всё равно состоялось.
 */
export type SpellResolution = 'ATTACK' | 'SAVE' | 'HEAL' | 'NONE';

export function spellResolution(
  spell: SpellResolutionFields,
  input: SpellResolutionInput = {},
): SpellResolution {
  if (spell.attackType !== null) return 'ATTACK';
  if (spell.saveAbility !== null && spellDamagePlan(spell, input).kind === 'DAMAGE') return 'SAVE';
  if (healDiceFor({ spell, slotLevel: input.slotLevel }) !== null) return 'HEAL';
  return 'NONE';
}

/**
 * Дойдёт ли расчёт до числа. Спрашивается до сотворения — листом
 * персонажа для подписи в панели боя, — и отвечает ровно тем же
 * правилом, каким сервер потом выбирает разрешение: иначе в списке
 * выбора «Волшебная стрела» выглядела бы считаемой, ячейка списывалась
 * бы, а в журнале оставалась голая строка `CAST`.
 *
 * Прежний `hasMachineEffect` отвечал на другой вопрос — «есть ли у
 * заклинания хоть одно машинное поле», — и расходился с разрешением на
 * 60 заклинаниях SRD из 319 (30 из 169 на доступных кругах 0–3): у
 * «Волшебной стрелы» кости есть, а ни атаки, ни спасброска нет; у
 * «Удержания личности» спасбросок есть, а костей урона нет.
 *
 * Классификация справочника по этому правилу: из 169 заклинаний кругов
 * 0–3 расчёт доходит до числа у 31 (12 атакой, 13 спасброском, 6
 * лечением). У остальных 138 эффект применяет ведущий, и это штатный
 * случай, а не пробел в данных: у 108 из них машинных полей нет вовсе,
 * у 30 поля есть, но разрешения по ним не выходит.
 *
 * Правило живёт здесь, а не в панели боя и не в презентере: признак
 * нужен и серверу, и клиенту, а второй копии условия хватило бы одной
 * правки, чтобы разъехаться — ровно это и случилось.
 */
export function isMachineResolvable(
  spell: SpellResolutionFields,
  input: SpellResolutionInput = {},
): boolean {
  return spellResolution(spell, input) !== 'NONE';
}
