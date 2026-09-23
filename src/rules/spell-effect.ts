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
 * Чем сотворение разрешается. Спрашивается дважды и одинаково: листом
 * персонажа — для подписи в панели, до выбора ячейки; сервером — при
 * самом сотворении. Второй копии этого условия быть не должно, она уже
 * однажды разъехалась.
 *
 * Порядок несущий, а не для красоты: атака старше спасброска с уроном,
 * тот старше лечения, а два последних вида — то, что остаётся, когда
 * ни один из первых трёх не подошёл.
 *
 * `AUTO_DAMAGE` — кости разобрались, а проверять попадание нечем.
 * `SAVE_ONLY` — спасбросок есть, урона по нему нет: бросок система
 * катит и пишет, эффект применяет ведущий. `NONE` — ни числа, ни
 * броска; строка `CAST` всё равно будет.
 *
 * Классификация справочника по этому правилу — из 169 заклинаний
 * кругов 0–3: атакой 12, спасброском с уроном 13, лечением 6, уроном
 * без броска 7, только спасброском 22, ничем 109. Из всех 319 — 16,
 * 39, 10, 9, 50 и 195.
 *
 * Разницу между `AUTO_DAMAGE` и `NONE` делает разбор костей, а не их
 * наличие: у части заклинаний запись вида `2d8 + 4d6` не берётся, и
 * они остаются за ведущим вместе с причиной в журнале.
 */
export type SpellResolution = 'ATTACK' | 'SAVE' | 'HEAL' | 'AUTO_DAMAGE' | 'SAVE_ONLY' | 'NONE';

export function spellResolution(
  spell: SpellResolutionFields,
  input: SpellResolutionInput = {},
): SpellResolution {
  const damage = spellDamagePlan(spell, input);

  if (spell.attackType !== null) return 'ATTACK';
  if (spell.saveAbility !== null && damage.kind === 'DAMAGE') return 'SAVE';
  if (healDiceFor({ spell, slotLevel: input.slotLevel }) !== null) return 'HEAL';
  // Урон без броска: кости разобрались, а проверять попадание нечем —
  // ни атаки, ни спасброска. «Волшебная стрела» бьёт наверняка, и это
  // не пробел данных, а само правило заклинания.
  if (damage.kind === 'DAMAGE') return 'AUTO_DAMAGE';
  // Спасбросок без урона: бросок система катит и пишет в журнал, а что
  // накладывается на провале — не знает. Поля состояния в SRD нет,
  // только текст описания, и придумывать таблицу «заклинание →
  // состояние» руками значило бы завести данные, которых не привозит
  // импорт (§3 дизайна волны «в»).
  if (spell.saveAbility !== null) return 'SAVE_ONLY';
  return 'NONE';
}
