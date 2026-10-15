import type { AbilityCode, CharacterResourceCode } from '../../enums/character.js';
import type { AdvantageMode } from '../../enums/dice.js';
import type {
  ActionEconomy,
  ActionUnavailableReason,
  AvailableAction,
  ModifierPart,
} from '../../schemas/combat.js';
import { combineAdvantage } from '../conditions.js';
import {
  martialArtsDie,
  rageDamageBonus,
  sneakAttackDice,
  unarmoredMovementBonus,
} from '../progression.js';
import { EFFECT_MECHANICS } from './effects.data.js';
import { FEATURE_MECHANICS } from './features.data.js';
import { TRAIT_MECHANICS } from './traits.data.js';
import type {
  AcFormulaFacet,
  AdvantageFacet,
  Amount,
  AmountTable,
  Facet,
  MechanicRecord,
  MechanicsContext,
  MechanicsHolder,
  ModifierTarget,
  OnHitFacet,
  Predicate,
  RuleFacet,
} from './types.js';

/**
 * Вычислитель реестра: собирает грани всех активных источников носителя
 * под конкретный бросок. Чистые функции — их зовёт и сервер (сам
 * бросок), и фронт (подсказка до броска), и вторая копия правила
 * «когда грань действует» разошлась бы с первой.
 */

function test(p: Predicate, ctx: MechanicsContext): boolean {
  if (typeof p === 'object') return p.anyOf.some((inner) => test(inner, ctx));
  const { armor, weapon, roll } = ctx;
  switch (p) {
    case 'noArmor':
      return armor !== undefined && armor.worn === null;
    case 'noShield':
      return armor !== undefined && !armor.shield;
    case 'armored':
      return armor !== undefined && armor.worn !== null;
    case 'notHeavyArmor':
      return armor !== undefined && armor.worn !== 'HEAVY';
    case 'meleeWeapon':
      return weapon?.rangeType === 'MELEE';
    case 'rangedWeapon':
      return weapon?.rangeType === 'RANGED';
    case 'finesseOrRanged':
      return (
        weapon !== undefined &&
        (weapon.rangeType === 'RANGED' || weapon.properties.includes('FINESSE'))
      );
    case 'strengthAttack':
      return weapon?.ability === 'strength';
    case 'oneHandedMelee':
      return (
        weapon !== undefined &&
        weapon.rangeType === 'MELEE' &&
        !weapon.properties.includes('TWO_HANDED') &&
        !weapon.offHandWeapon
      );
    case 'advantage':
      return roll?.mode === 'ADVANTAGE';
    case 'notDisadvantage':
      return roll !== undefined && roll.mode !== 'DISADVANTAGE';
    case 'allyAdjacentToTarget':
      return roll?.allyAdjacentToTarget === true;
  }
}

/** Все условия разом; без условий грань действует всегда. */
export function holds(when: readonly Predicate[] | undefined, ctx: MechanicsContext): boolean {
  return (when ?? []).every((p) => test(p, ctx));
}

const TABLES: Record<AmountTable, (level: number) => number> = {
  rageDamage: rageDamageBonus,
  martialArtsDie,
  sneakAttackDice,
  unarmoredMovement: unarmoredMovementBonus,
};

export function amountOf(amount: Amount, h: MechanicsHolder): number {
  if (typeof amount === 'number') return amount;
  if (amount === 'halfProficiency') return Math.floor(h.proficiencyBonus / 2);
  return TABLES[amount.table](h.level);
}

function facetsOfRecord(record: MechanicRecord | undefined): readonly Facet[] {
  return record && 'facets' in record ? record.facets : [];
}

/**
 * Грани всех активных источников носителя: умения, черты, эффекты — в
 * этом порядке. Порядок виден в раскладе броска («+2 дуэлянт» раньше
 * «+2 ярость»), поэтому он часть контракта, а не случайность обхода.
 */
export function facetsOf(h: MechanicsHolder): { code: string; facet: Facet }[] {
  const out: { code: string; facet: Facet }[] = [];
  for (const code of h.features) {
    for (const facet of facetsOfRecord(FEATURE_MECHANICS[code])) out.push({ code, facet });
  }
  for (const code of h.traits) {
    for (const facet of facetsOfRecord(TRAIT_MECHANICS[code])) out.push({ code, facet });
  }
  for (const code of h.effects) {
    for (const facet of EFFECT_MECHANICS[code as keyof typeof EFFECT_MECHANICS]?.facets ?? []) {
      out.push({ code, facet });
    }
  }
  return out;
}

export interface CollectedModifier {
  code: string;
  value: number;
  source?: ModifierPart['source'];
}

export function collectModifiers(
  h: MechanicsHolder,
  target: ModifierTarget,
  ctx: MechanicsContext = {},
): CollectedModifier[] {
  const out: CollectedModifier[] = [];
  for (const { code, facet } of facetsOf(h)) {
    if (facet.kind !== 'modifier' || facet.target !== target) continue;
    if (!holds(facet.when, ctx)) continue;
    out.push({
      code,
      value: amountOf(facet.amount, h),
      ...(facet.source ? { source: facet.source } : {}),
    });
  }
  return out;
}

/** Сумма прибавок цели — для чисел без расклада (скорость, хиты за уровень). */
export function sumModifiers(
  h: MechanicsHolder,
  target: ModifierTarget,
  ctx: MechanicsContext = {},
): number {
  return collectModifiers(h, target, ctx).reduce((total, m) => total + m.value, 0);
}

/** Число атак за действие «Атака»: бо́льшая из граней, не сумма; без граней — одна. */
export function attacksPerActionOf(h: MechanicsHolder): number {
  return Math.max(1, ...collectModifiers(h, 'attacksPerAction').map((m) => m.value));
}

/** Формула КД без доспеха; класс у персонажа один, и формула у него не больше одной. */
export function collectAcFormula(h: MechanicsHolder): AcFormulaFacet | null {
  for (const { facet } of facetsOf(h)) if (facet.kind === 'acFormula') return facet;
  return null;
}

/** Источники преимущества и помехи броску — по одному на грань, для сведения с прочими. */
export function advantageSources(
  h: MechanicsHolder,
  roll: { kind: AdvantageFacet['roll']; ability?: AbilityCode },
  ctx: MechanicsContext = {},
): AdvantageFacet['mode'][] {
  return facetsOf(h).flatMap(({ facet }) =>
    facet.kind === 'advantage' &&
    facet.roll === roll.kind &&
    (facet.ability === undefined || facet.ability === roll.ability) &&
    holds(facet.when, ctx)
      ? [facet.mode]
      : [],
  );
}

/** Преимущество и помеха гасят друг друга, сколько бы их ни было (PHB). */
export function collectAdvantage(
  h: MechanicsHolder,
  roll: { kind: AdvantageFacet['roll']; ability?: AbilityCode },
  ctx: MechanicsContext = {},
): AdvantageMode {
  return combineAdvantage(advantageSources(h, roll, ctx));
}

export function collectDefenses(
  h: MechanicsHolder,
  ctx: MechanicsContext = {},
): { resistances: string[] } {
  const resistances = new Set<string>();
  for (const { facet } of facetsOf(h)) {
    if (facet.kind !== 'defense' || !holds(facet.when, ctx)) continue;
    for (const type of facet.resistance) {
      if (type !== 'ANCESTRY') resistances.add(type);
      else if (h.ancestryDamageType) resistances.add(h.ancestryDamageType);
    }
  }
  return { resistances: [...resistances] };
}

/** Порог крита — наименьший из граней, по умолчанию 20. */
export function collectCrit(h: MechanicsHolder): { threshold: number } {
  let threshold = 20;
  for (const { facet } of facetsOf(h)) {
    if (facet.kind === 'crit') threshold = Math.min(threshold, facet.threshold);
  }
  return { threshold };
}

export function collectOnHit(
  h: MechanicsHolder,
  ctx: MechanicsContext,
): { code: string; facet: OnHitFacet }[] {
  const out: { code: string; facet: OnHitFacet }[] = [];
  for (const { code, facet } of facetsOf(h)) {
    if (facet.kind === 'onHit' && holds(facet.when, ctx)) out.push({ code, facet });
  }
  return out;
}

/**
 * Сколько костей бросает грань: число, плюс за каждый круг ячейки выше
 * первого, не больше предела, плюс лишние против названных видов
 * существ (кара по нежити и исчадиям — сверх предела, PHB).
 */
export function onHitDiceCount(
  facet: OnHitFacet,
  h: MechanicsHolder,
  input: { slotLevel?: number; creatureType?: string | null } = {},
): number {
  const above = facet.dice.perSlotAbove
    ? facet.dice.perSlotAbove * Math.max(0, (input.slotLevel ?? 1) - 1)
    : 0;
  const base = amountOf(facet.dice.count, h) + above;
  const capped = facet.dice.max !== undefined ? Math.min(facet.dice.max, base) : base;
  const type = input.creatureType?.toLowerCase() ?? '';
  const extra = facet.extraVs?.creatureTypes.includes(type) ? facet.extraVs.count : 0;
  return capped + extra;
}

export function hasRule(h: MechanicsHolder, rule: RuleFacet['rule']): boolean {
  return facetsOf(h).some(({ facet }) => facet.kind === 'rule' && facet.rule === rule);
}

export interface AvailableActionsInput {
  holder: MechanicsHolder;
  /** Максимум по классу и уровню и сколько потрачено. */
  resources: readonly { code: CharacterResourceCode; max: number; used: number }[];
  economy: { hasUsedAction: boolean; hasUsedBonusAction: boolean; hasUsedReaction: boolean };
  isTurn: boolean;
}

const ECONOMY_REASON: Partial<Record<ActionEconomy, ActionUnavailableReason>> = {
  ACTION: 'ACTION_ALREADY_USED',
  BONUS_ACTION: 'BONUS_ACTION_ALREADY_USED',
  REACTION: 'REACTION_ALREADY_USED',
};

/**
 * Действия умений, какие у носителя есть сейчас, — в порядке записей
 * реестра. Действие с ресурсом открывается наличием ресурса (максимум
 * больше нуля), а не строкой умения: ресурс выдаётся по классу и уровню
 * вместе с умением, и так было до реестра (решение 2 плана волны 2).
 * Причина недоступности — первая по порядку: чужой ход (кроме реакции),
 * потраченный вид действия, исчерпанный ресурс.
 */
export function availableActions(input: AvailableActionsInput): AvailableAction[] {
  const { holder: h, economy, isTurn } = input;
  const used = {
    ACTION: economy.hasUsedAction,
    BONUS_ACTION: economy.hasUsedBonusAction,
    REACTION: economy.hasUsedReaction,
    FREE: false,
  } satisfies Record<ActionEconomy, boolean>;
  const out: AvailableAction[] = [];
  for (const [code, record] of Object.entries(FEATURE_MECHANICS)) {
    for (const facet of facetsOfRecord(record)) {
      if (facet.kind !== 'action') continue;
      const resource = facet.resource
        ? input.resources.find((r) => r.code === facet.resource && r.max > 0)
        : undefined;
      const owned = facet.resource
        ? resource !== undefined
        : facet.requiresEffect
          ? h.effects.includes(facet.requiresEffect)
          : h.features.has(code);
      if (!owned) continue;
      if (facet.applies && h.effects.includes(facet.applies)) continue;
      const left = resource ? Math.max(0, resource.max - resource.used) : null;
      const reason: ActionUnavailableReason | null =
        !isTurn && facet.economy !== 'REACTION'
          ? 'NOT_YOUR_TURN'
          : used[facet.economy]
            ? (ECONOMY_REASON[facet.economy] ?? null)
            : left === 0
              ? 'RESOURCE_EXHAUSTED'
              : null;
      out.push({
        kind: 'ABILITY',
        ability: facet.ability,
        featureCode: code,
        economy: facet.economy,
        resource:
          resource && left !== null ? { code: resource.code, left, max: resource.max } : null,
        available: reason === null,
        reason,
      });
    }
  }
  return out;
}

/** Заглушка ступени подкласса — строка без механики, которую окно повышения не показывает. */
export function isSubclassStep(code: string): boolean {
  const record = FEATURE_MECHANICS[code];
  return record !== undefined && 'holder' in record && record.holder === 'subclassStep';
}
