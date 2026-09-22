import { z } from 'zod';

/**
 * Состояние боя — отдельно от `status` сцены, который означает
 * видимость карты. Карту выводят на стол заранее, а бой начинают
 * отдельным нажатием; между этими моментами фишки ходят свободно.
 */
export const COMBAT_STATUSES = ['NONE', 'ROLLING_INITIATIVE', 'FIGHTING'] as const;
export const combatStatusSchema = z.enum(COMBAT_STATUSES);
export type CombatStatus = (typeof COMBAT_STATUSES)[number];

/**
 * Виды строк журнала. `ROUND` — не действие участника, а отметка
 * «пошёл следующий круг»: по ней журнал делится на раунды при чтении.
 *
 * `HP_ADJUST` — ручная правка хитов ведущим в обе стороны, и она же
 * единственный подъём хитов без заклинания. `HEAL` рядом с ней — не
 * повтор: волной «а» этим видом писалась как раз правка, отчего
 * снижение той же правкой не писалось ничем (хвост 22), а теперь у
 * него есть свой исполнитель — лечение заклинанием с ячейкой и
 * броском.
 *
 * `CONDITION` — наложение, снятие и истечение состояния. `CAST` — само
 * сотворение (§6.7 общего ТЗ); строк у одного сотворения бывает
 * несколько, потому что атака заклинанием и урон пишутся теми же
 * `ATTACK` и `DAMAGE`, что и удар оружием.
 *
 * `CONCENTRATION` общим ТЗ не обещан, но без него спасбросок за
 * удержание пришлось бы прятать в `DEATH_SAVE` или в `CAST` — разные
 * события с разным разбором (§8 дизайна волны «в»).
 *
 * `SAVE` — спасбросок ЦЕЛИ против заклинания. Не обещан общим ТЗ по
 * той же причине, что и `CONCENTRATION`, и заведён по той же нужде: без
 * него сотворение со спасбросоком писало `CAST` и по строке `DAMAGE` на
 * цель, а кости, модификатор и сложность терялись вовсе — тогда как
 * §6 дизайна прямо говорит, что спор за столом начинается с броска.
 * Отдельным видом, а не полем внутри `DAMAGE`: спасбросок бывает и без
 * урона (успех при цене `none`), и прятать его в строку, которой в этом
 * случае нет, значило бы терять его снова.
 */
export const ENCOUNTER_EVENT_KINDS = [
  'INITIATIVE',
  'MOVE',
  'ATTACK',
  'DAMAGE',
  'CAST',
  'SAVE',
  'HEAL',
  'CONCENTRATION',
  'HP_ADJUST',
  'CONDITION',
  'DEATH_SAVE',
  'END_TURN',
  'ROUND',
] as const;
export const encounterEventKindSchema = z.enum(ENCOUNTER_EVENT_KINDS);
export type EncounterEventKind = (typeof ENCOUNTER_EVENT_KINDS)[number];

/**
 * Чего не хватило машинному расчёту урона у сотворённого заклинания.
 * Перечнем, а не инлайновым `z.enum` в схеме строки: значения выходят
 * из сервера в журнал и оттуда — в ключ перевода, и третья причина,
 * добавленная когда-нибудь, должна ломать сверку локалей, а не
 * показывать за столом сырой ключ.
 *
 * Два случая, и они различимы, а не свёрнуты в общее «не смогли»:
 * разбор спорного момента за столом начинается с вопроса, чего именно
 * не хватило. `NO_DAMAGE_TYPE` — кости в SRD есть, вида урона нет
 * (`sleep`, `prismatic-spray`), а схема строки `DAMAGE` вид требует;
 * придумывать его нельзя. `UNPARSED_DICE` — запись костей вида
 * `2d8 + 4d6`, которую разбор не берёт.
 */
export const SPELL_UNRESOLVED_REASONS = ['NO_DAMAGE_TYPE', 'UNPARSED_DICE'] as const;
export const spellUnresolvedReasonSchema = z.enum(SPELL_UNRESOLVED_REASONS);
export type SpellUnresolvedReason = (typeof SPELL_UNRESOLVED_REASONS)[number];

/** Исход броска атаки. Промах по единице — тоже `MISS`. */
export const ATTACK_OUTCOMES = ['HIT', 'MISS'] as const;
export const attackOutcomeSchema = z.enum(ATTACK_OUTCOMES);
export type AttackOutcomeKind = (typeof ATTACK_OUTCOMES)[number];

/**
 * Исход спасброска за концентрацию. Два значения, а не «успех/провал»:
 * концентрация рвётся и без броска — смертью носителя и новым
 * концентрационным заклинанием (§6 дизайна), и такой обрыв подписан
 * тем же `BROKEN`, что и провал.
 */
export const CONCENTRATION_OUTCOMES = ['KEPT', 'BROKEN'] as const;
export const concentrationOutcomeSchema = z.enum(CONCENTRATION_OUTCOMES);
export type ConcentrationOutcome = (typeof CONCENTRATION_OUTCOMES)[number];

/**
 * Исход спасброска цели против заклинания. Два значения, а не пять, как
 * у спасброска от смерти: у того исход меняет состояние умирания
 * (стабилен, мёртв, поднят), а этот решает только цену — полный урон
 * или половина, и саму цену держит заклинание, а не бросок.
 */
export const SAVING_THROW_OUTCOMES = ['SUCCESS', 'FAILURE'] as const;
export const savingThrowOutcomeSchema = z.enum(SAVING_THROW_OUTCOMES);
export type SavingThrowOutcome = (typeof SAVING_THROW_OUTCOMES)[number];

/** Исход спасброска от смерти — им же подписывается строка журнала. */
export const DEATH_SAVE_OUTCOMES = ['SUCCESS', 'FAILURE', 'STABLE', 'DEAD', 'REVIVED'] as const;
export const deathSaveOutcomeSchema = z.enum(DEATH_SAVE_OUTCOMES);
export type DeathSaveOutcome = (typeof DEATH_SAVE_OUTCOMES)[number];

/**
 * Верхняя граница инициативы, которую ведущий вписывает руками. 1к20
 * плюс модификатор ловкости с любыми бонусами уровня 20 не выходит за
 * сорок; граница нужна, чтобы опечатка в три нуля не ломала очередь.
 */
export const INITIATIVE_MIN = 1;
export const INITIATIVE_MAX = 40;
