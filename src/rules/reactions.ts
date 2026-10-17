import type { CharacterResourceCode } from '../enums/character.js';
import type { ParticipantSide } from '../enums/combat.js';
import type { ConditionCode } from '../enums/conditions.js';
import type { AdvantageMode } from '../enums/dice.js';
import type { SizeCategory } from '../enums/size.js';
import type { ReactionOption, WindowEvent } from '../schemas/combat.js';
import { isEnemy, type Placed, reachDistance } from './combat.js';
import { keptDie } from './dice.js';
import { facetsOf, holds } from './mechanics/compute.js';
import type { MechanicsContext, MechanicsHolder, ReactionFacet } from './mechanics/types.js';

/**
 * Окно реакции (дизайн 15 октября, §5; план волны 4): кто вправе
 * ответить на событие и чем, и как ответы меняют бросок и урон. Чистые
 * функции — их зовёт сервер при открытии окна, а фронт подписывает
 * варианты теми же кодами.
 */

/** Сколько окно ждёт ответов, пока не закроется само. */
export const REACTION_WINDOW_MS = 30_000;

/**
 * Окно выбора ведущего во «Вмешательстве» (р. 24) ждёт дольше: ведущий
 * выбирает заклинание и цели из всего списка жреца, а тайм-аут — это
 * «божество промолчало», и спешка отнимала бы у стола удачный к100.
 */
export const DIVINE_CHOICE_WINDOW_MS = 5 * 60_000;

/** Заклинания-реакции, которые предлагает окно (остальные — волна 8). */
export const WINDOW_REACTION_SPELLS = ['shield', 'feather-fall'] as const;

/**
 * Ответы не из реестра: атака при отходе есть у каждого, «Щит» — у
 * знающего заклинание. Их условия (досягаемость, ячейка) решает сервер
 * и передаёт готовыми полями события и участника.
 */
export const BASE_REACTIONS: readonly ReactionFacet[] = [
  {
    kind: 'reaction',
    ability: 'OPPORTUNITY_ATTACK',
    event: ['leavesReach'],
    economy: 'REACTION',
    who: 'other',
    effect: { attack: 'mover' },
  },
  {
    kind: 'reaction',
    ability: 'SHIELD',
    event: ['attackHit'],
    economy: 'REACTION',
    who: 'target',
    effect: { castSpell: 'shield' },
  },
  // Монстры (волна 7а): условия — поля `monster` участника, у прочих их нет.
  {
    kind: 'reaction',
    ability: 'LEGENDARY_TURN',
    event: ['turnEnded'],
    economy: 'FREE',
    who: 'other',
    effect: { legendaryTurn: true },
  },
  {
    kind: 'reaction',
    ability: 'PARRY',
    event: ['attackHit'],
    economy: 'REACTION',
    who: 'target',
    effect: { acBonus: 'parry' },
  },
  // «Пёрышко» (волна 5): реакция на падение — своё или союзника в 60 футах.
  {
    kind: 'reaction',
    ability: 'FEATHER_FALL',
    event: ['falling'],
    economy: 'REACTION',
    who: 'other',
    effect: { castSpell: 'feather-fall' },
  },
];

/** Что окну нужно знать о монстре: счётчики фишки и действия статблока. */
export interface ReactionMonster {
  legendaryResistanceLeft: number;
  /** Остаток пула легендарных; 0 — у монстра их нет или пул пуст. */
  legendaryLeft: number;
  /** Самое дешёвое легендарное действие — дороже остатка пула вставки нет. */
  legendaryCheapest: number | null;
  /** «Parry» статблока: сколько прибавляет к КД; нет — `null`. */
  parryAc: number | null;
}

/** Участник глазами окна: где стоит, что умеет и что ему ещё можно. */
export interface ReactionMember extends Placed {
  id: string;
  holder: MechanicsHolder;
  armor?: MechanicsContext['armor'];
  resourcesLeft: Partial<Record<CharacterResourceCode, number>>;
  hasUsedReaction: boolean;
  /** Может ответить реакцией: в сознании, не недееспособен, не «без реакций», не застигнут. */
  canReact: boolean;
  conscious: boolean;
  conditions: readonly ConditionCode[];
  conditionImmunities: readonly ConditionCode[];
  /** Заклинания-реакции, которые можно сотворить сейчас (знает, есть ячейка). */
  reactionSpells: readonly (typeof WINDOW_REACTION_SPELLS)[number][];
  size: SizeCategory;
  /** Сторона — правилом `isEnemy`: помеха и вычитание только против врага. */
  side?: ParticipantSide | null;
  monsterId?: string | null;
  /** Свободна ли рука: поймать снаряд и метнуть его нечем, если обе заняты. */
  freeHand?: boolean;
  /** Фишка монстра — счётчики и действия статблока (волна 7а). */
  monster?: ReactionMonster;
  /** Застигнут врасплох — легендарных действий до конца первого хода нет (р. 25 разбора). */
  surprised?: boolean;
  /** Может действовать (не недееспособен) — для легендарной вставки; реакция тут ни при чём. */
  canReactLegendary?: boolean;
}

/** Событие окна: кто бросает, на кого, и что нужно условиям ответов. */
export interface ReactionEvent {
  event: WindowEvent;
  /** Бросающий: атакующий, проверяющий, наносящий урон, уходящий; у спасброска — источник. */
  actorId: string | null;
  /** Цели атаки и урона, бросающие спасбросок, упавшие до нуля. */
  subjectIds: readonly string[];
  attack?: NonNullable<MechanicsContext['attack']>;
  /** Кость к20, ушедшая в итог, — фаза броска на 1 и крите не открывается. */
  natural?: number;
  /** С какой кости крит (чемпион — 19): крит попадает, и словцо его не отменит. */
  critThreshold?: number;
  /** Урон заклинания — его может усилить сам заклинатель. */
  spellDamage?: boolean;
  /** Упавшие до нуля: убит ли на месте (стойкость полуорка не спасает). */
  zeroed?: Readonly<Record<string, { killedOutright: boolean }>>;
  /** Атака при отходе: кого шаг вывел из досягаемости (геометрия — сервер). */
  opportunityReactorIds?: readonly string[];
  cellSizeFeet: number;
}

export interface ReactionResponder {
  participantId: string;
  options: ReactionOption[];
}

/** Чьи броски у события «свои»: атака и проверка — бросающего, спасбросок и ноль — целей. */
function rollerIds(e: ReactionEvent): readonly string[] {
  switch (e.event) {
    case 'saveRolled':
    case 'saveFailed':
    case 'reducedToZero':
    case 'falling':
      return e.subjectIds;
    default:
      return e.actorId ? [e.actorId] : [];
  }
}

/** Ответы носителя — из реестра и встроенные, с кодом умения. */
function reactionFacetsOf(m: ReactionMember): { code: string | null; facet: ReactionFacet }[] {
  return [
    ...facetsOf(m.holder).flatMap(({ code, facet }) =>
      facet.kind === 'reaction' ? [{ code, facet }] : [],
    ),
    ...BASE_REACTIONS.map((facet) => ({ code: null, facet })),
  ];
}

/**
 * Кто вправе ответить на событие и чем (план волны 4, §3.2): грань
 * ответа на это событие, «кто» (сам, цель, другой), дальность, условия,
 * цена и экономика. Фаза броска на натуральных 1 и 20 не открывается —
 * исход уже не изменить (разбор §1.1).
 */
export function reactionResponders(
  members: readonly ReactionMember[],
  e: ReactionEvent,
  sees: (viewerId: string, targetId: string) => boolean,
  hears: (listenerId: string, speakerId: string) => boolean,
): ReactionResponder[] {
  if (
    e.event === 'attackRolled' &&
    e.natural !== undefined &&
    (e.natural === 1 || e.natural >= (e.critThreshold ?? 20))
  ) {
    return [];
  }
  const byId = new Map(members.map((m) => [m.id, m]));
  const actor = e.actorId ? byId.get(e.actorId) : undefined;
  const firstSubject = e.subjectIds[0] ? byId.get(e.subjectIds[0]) : undefined;
  const feet = (a: Placed, b: Placed | undefined) =>
    b ? reachDistance(a, b) * e.cellSizeFeet : undefined;
  const rollers = rollerIds(e);
  const out: ReactionResponder[] = [];

  for (const m of members) {
    const ctx: MechanicsContext = {
      ...(m.armor ? { armor: m.armor } : {}),
      bearer: { id: m.id, conscious: m.conscious, conditions: m.conditions },
      ...(e.subjectIds[0] ? { target: { id: e.subjectIds[0] } } : {}),
      ...(e.attack ? { attack: e.attack } : {}),
      ...(actor
        ? {
            roll: {
              mode: 'NONE',
              allyAdjacentToTarget: false,
              targetSeesAttacker: sees(m.id, actor.id),
            },
            actor: {
              seen: sees(m.id, actor.id),
              hearsBearer: hears(actor.id, m.id),
              conditionImmunities: actor.conditionImmunities,
              size: actor.size,
            },
          }
        : {}),
      ...(e.zeroed?.[m.id] ? { damage: e.zeroed[m.id] } : {}),
      distances: {
        ...(firstSubject ? { target: feet(m, firstSubject) } : {}),
        ...(actor ? { attacker: feet(m, actor) } : {}),
      },
    };
    const options: ReactionOption[] = [];
    for (const { code, facet } of reactionFacetsOf(m)) {
      if (!facet.event.includes(e.event)) continue;
      if (options.some((o) => o.ability === facet.ability)) continue;
      const whoOk =
        facet.who === 'self'
          ? rollers.includes(m.id)
          : facet.who === 'target'
            ? e.subjectIds.includes(m.id)
            : m.id !== e.actorId;
      if (!whoOk) continue;
      if (facet.rangeFeet !== undefined && (!actor || (feet(m, actor) ?? 0) > facet.rangeFeet)) {
        continue;
      }
      if (!holds(facet.when, ctx, code ? { code, h: m.holder } : undefined)) continue;
      const left = facet.cost ? (m.resourcesLeft[facet.cost.resource] ?? 0) : null;
      if (facet.cost && (left ?? 0) < facet.cost.amount) continue;
      if (facet.economy === 'REACTION' && (m.hasUsedReaction || !m.canReact)) continue;
      if (!effectFits(facet, m, e, byId, sees)) continue;
      options.push({
        ability: facet.ability,
        featureCode: code,
        economy: facet.economy,
        resource: facet.cost ? { code: facet.cost.resource, left: left ?? 0 } : null,
        ...(facet.ability === 'DEFLECT_MISSILES'
          ? { canThrowBack: (m.resourcesLeft.KI ?? 0) >= 1 && m.freeHand !== false }
          : {}),
      });
    }
    if (options.length > 0) out.push({ participantId: m.id, options });
  }
  return out;
}

/** Условия, которых нет в предикатах: им нужны поля события, а не носителя. */
function effectFits(
  facet: ReactionFacet,
  m: ReactionMember,
  e: ReactionEvent,
  members: ReadonlyMap<string, ReactionMember>,
  sees: (viewerId: string, targetId: string) => boolean,
): boolean {
  const effect = facet.effect;
  // Помеха «Обороны» и кость словца — против врага (решение 30 плана
  // волны 4): союзнику они только мешали бы, а окно спрашивало бы зря.
  if ('imposeDisadvantage' in effect || 'subtractDie' in effect) {
    const actor = e.actorId ? members.get(e.actorId) : undefined;
    if (!actor || !isEnemy(m, actor)) return false;
  }
  // Невероятное уклонение — от попавшей атаки, а не от урона по площади.
  if ('halveDamage' in effect) return e.attack !== undefined;
  if ('empower' in effect) return e.spellDamage === true;
  if ('forceSuccess' in effect) return (m.monster?.legendaryResistanceLeft ?? 0) > 0;
  if ('legendaryTurn' in effect) {
    // Недееспособный и застигнутый легендарными не действуют (р. 8 плана волны 7).
    const pool = m.monster;
    // Подлежащие конца хода — кто вставку только что сыграл (р. 9 плана волны 7).
    return (
      !e.subjectIds.includes(m.id) &&
      pool !== undefined &&
      pool.legendaryCheapest !== null &&
      pool.legendaryLeft >= pool.legendaryCheapest &&
      m.canReactLegendary !== false &&
      !m.surprised
    );
  }
  if ('acBonus' in effect) {
    // «Parry»: «one melee attack that would hit it» — любая рукопашная,
    // заклинанием тоже, которую монстр видит (р. 12). Крит окна
    // `attackHit` не открывает вовсе — КД против него ничего не решает.
    const actor = e.actorId ? members.get(e.actorId) : undefined;
    return (
      (m.monster?.parryAc ?? null) !== null &&
      e.attack?.range === 'MELEE' &&
      actor !== undefined &&
      sees(m.id, actor.id)
    );
  }
  if ('castSpell' in effect) {
    if (!m.reactionSpells.includes(effect.castSpell)) return false;
    // «Пёрышко» — падающий в 60 футах от заклинателя (SRD).
    if (effect.castSpell !== 'feather-fall') return true;
    return e.subjectIds.some((id) => {
      const faller = members.get(id);
      return faller !== undefined && reachDistance(m, faller) * e.cellSizeFeet <= 60;
    });
  }
  if ('attack' in effect && effect.attack === 'mover') {
    // Отход: перемещение до конца хода ударов вслед не провоцирует (§П3.2).
    const mover = e.actorId ? members.get(e.actorId) : undefined;
    return (
      e.opportunityReactorIds?.includes(m.id) === true &&
      mover !== undefined &&
      !mover.holder.effects.includes('DISENGAGED') &&
      sees(m.id, mover.id)
    );
  }
  return true;
}

/** Бросок после прибавок и вычитаний ответов (вдохновение, удача, словцо). */
export function adjustRoll(
  total: number,
  applied: readonly { add?: number; subtract?: number }[],
): number {
  return applied.reduce((sum, a) => sum + (a.add ?? 0) - (a.subtract ?? 0), total);
}

/**
 * Урон после ответов (разбор §1 п.9): вычитания — из всего урона атаки,
 * начиная с первой части (вид оружия), остаток со следующих; затем
 * деление пополам — по каждой части, вниз. Сопротивление и уязвимость
 * идут после, у вызывающего, — по виду каждой части.
 */
export function adjustDamage<P extends { amount: number }>(
  parts: readonly P[],
  applied: { subtract: readonly number[]; halve: boolean },
): P[] {
  let left = applied.subtract.reduce((sum, v) => sum + v, 0);
  return parts.map((part) => {
    const cut = Math.min(part.amount, left);
    left -= cut;
    const after = part.amount - cut;
    return { ...part, amount: applied.halve ? Math.floor(after / 2) : after };
  });
}

/**
 * Урон спасброска: успех — половина или ничего, провал — всё. Уклонение
 * монаха и плута (спасбросок Ловкости на половину): успех — ноль,
 * провал — половина. Округление вниз.
 */
export function saveDamageAmount(
  rolled: number,
  success: boolean,
  halfOnSuccess: boolean,
  evasion: boolean,
): number {
  if (evasion && halfOnSuccess) return success ? 0 : Math.floor(rolled / 2);
  if (!success) return rolled;
  return halfOnSuccess ? Math.floor(rolled / 2) : 0;
}

/**
 * «Везучий»: перебросить кость к20, которая ушла бы в итог, если на ней
 * выпало значение из `faces` (П4 #56). С преимуществом [1, 12] в итог
 * идёт 12 — переброса нет; с помехой [1, 15] — единица, и её место
 * занимает новая кость.
 */
export function rerollKeptOne(
  results: readonly number[],
  mode: AdvantageMode,
  random: (sides: number) => number,
  faces: readonly number[] = [1],
): { results: number[]; rerolled: number | null } {
  if (results.length === 0) return { results: [], rerolled: null };
  const kept = keptDie([...results], mode);
  if (!faces.includes(kept)) return { results: [...results], rerolled: null };
  const index = results.indexOf(kept);
  const next = [...results];
  next[index] = random(20);
  return { results: next, rerolled: kept };
}
