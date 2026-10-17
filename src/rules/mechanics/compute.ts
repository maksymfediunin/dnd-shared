import type { AbilityCode, CharacterResourceCode } from '../../enums/character.js';
import type { ConditionCode } from '../../enums/conditions.js';
import type { AdvantageMode } from '../../enums/dice.js';
import { SIZE_CATEGORIES } from '../../enums/size.js';
import {
  type ActionEconomy,
  type ActionUnavailableReason,
  type AvailableAction,
  COMBAT_ABILITIES,
  type CombatAbility,
  type ModifierPart,
} from '../../schemas/combat.js';
import { combineAdvantage } from '../conditions.js';
import {
  bardicInspirationDie,
  brutalCriticalDice,
  divineStrikeDice,
  martialArtsDie,
  rageDamageBonus,
  sneakAttackDice,
  songOfRestDie,
  unarmoredMovementBonus,
} from '../progression.js';
import { EFFECT_MECHANICS } from './effects.data.js';
import { FEATURE_MECHANICS } from './features.data.js';
import { TRAIT_MECHANICS } from './traits.data.js';
import type {
  AcFormulaFacet,
  ActionFacet,
  AdvantageFacet,
  Amount,
  AmountTable,
  CastOptionFacet,
  Facet,
  LightFacet,
  MechanicRecord,
  MechanicsContext,
  MechanicsHolder,
  ModifierTarget,
  OnHitFacet,
  Predicate,
  RestActionFacet,
  RuleFacet,
  SpellGrantFacet,
  SpellModifierFacet,
} from './types.js';

/**
 * Вычислитель реестра: собирает грани всех активных источников носителя
 * под конкретный бросок. Чистые функции — их зовёт и сервер (сам
 * бросок), и фронт (подсказка до броска), и вторая копия правила
 * «когда грань действует» разошлась бы с первой.
 */

/**
 * Чья грань проверяется: предикатам `effect*` нужны данные эффекта
 * (`holder.effectData[code]`) — священное оружие помнит предмет, помощь —
 * цель.
 */
export interface FacetOwner {
  code: string;
  h: MechanicsHolder;
}

function testObject(
  p: Exclude<Predicate, string>,
  ctx: MechanicsContext,
  owner?: FacetOwner,
): boolean {
  if ('anyOf' in p) return p.anyOf.some((inner) => test(inner, ctx, owner));
  if ('not' in p) return !test(p.not, ctx, owner);
  if ('bearerNot' in p) {
    const states = ctx.bearer?.conditions;
    return states !== undefined && !p.bearerNot.some((code) => states.includes(code));
  }
  if ('actorImmune' in p) return ctx.actor?.conditionImmunities?.includes(p.actorImmune) === true;
  if ('attackerSizeAtLeast' in p) {
    const size = ctx.actor?.size;
    return (
      size !== undefined &&
      SIZE_CATEGORIES.indexOf(size) >= SIZE_CATEGORIES.indexOf(p.attackerSizeAtLeast)
    );
  }
  if ('vsCondition' in p) return ctx.save?.conditions?.includes(p.vsCondition) === true;
  if ('checkAbility' in p)
    return ctx.check !== undefined && p.checkAbility.includes(ctx.check.ability);
  if ('spellLevelAtLeast' in p) return (ctx.spell?.level ?? -1) >= p.spellLevelAtLeast;
  if ('spellSchool' in p) return ctx.spell?.school?.toLowerCase() === p.spellSchool;
  const feet = ctx.distances?.[p.of];
  return feet !== undefined && feet <= p.withinFeet;
}

function test(p: Predicate, ctx: MechanicsContext, owner?: FacetOwner): boolean {
  if (typeof p === 'object') return testObject(p, ctx, owner);
  const { armor, weapon, roll } = ctx;
  const data = owner ? owner.h.effectData?.[owner.code] : undefined;
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
    case 'ownTurn':
      return ctx.turn?.isOwn === true;
    case 'movedAtMostHalfSpeed':
      return ctx.turn?.movedAtMostHalf === true;
    case 'attackerSeen':
      return roll?.targetSeesAttacker === true;
    case 'bearerAlert':
      return ctx.bearer?.alert === true;
    case 'pactWeapon':
      return weapon?.pact === true;
    case 'viaFlurry':
      return ctx.attack?.via === 'FLURRY';
    case 'effectItemIsWeapon':
      return data?.itemId !== undefined && data.itemId === weapon?.itemId;
    case 'effectTargetIsTarget':
      return data?.targetId !== undefined && data.targetId === ctx.target?.id;
    case 'raging':
      return owner?.h.effects.includes('RAGE') === true;
    case 'bearerConscious':
      return ctx.bearer?.conscious === true;
    case 'shield':
      return armor?.shield === true;
    case 'actorSeen':
      return ctx.actor?.seen === true;
    case 'sourceSeen':
      return ctx.save?.sourceSeen === true;
    case 'actorHearsBearer':
      return ctx.actor?.hearsBearer === true;
    case 'canHearBearer':
      return ctx.recipient?.hearsBearer === true;
    case 'targetNotSelf':
      return (
        ctx.target?.id !== undefined &&
        ctx.bearer?.id !== undefined &&
        ctx.target.id !== ctx.bearer.id
      );
    case 'rangedWeaponAttack':
      return ctx.attack?.range === 'RANGED' && ctx.attack.weapon === true;
    case 'incomingOpportunityAttack':
      return ctx.attack?.isOpportunity === true;
    case 'vsMagic':
      return ctx.save?.magical === true;
    case 'vsPoison':
      return (
        ctx.save?.damageTypes?.includes('poison') === true ||
        ctx.save?.conditions?.includes('poisoned') === true
      );
    case 'killedOutright':
      return ctx.damage?.killedOutright === true;
    case 'bearerInDimOrDark':
      return ctx.bearer?.light === 'DIM' || ctx.bearer?.light === 'DARK';
    case 'vsImpedingPlants':
      return ctx.save?.spellTags?.includes('impedingPlants') === true;
    case 'weaponItem':
      return weapon !== undefined && weapon.itemId !== undefined && weapon.itemId !== 'unarmed';
    case 'weaponAttack':
      return ctx.attack?.weapon === true;
    case 'meleeWeaponAttack':
      // Брошенный кинжал — оружие ближнего боя, но атака дальнобойная.
      return (
        ctx.attack?.weapon === true && ctx.attack.range === 'MELEE' && weapon?.rangeType === 'MELEE'
      );
    case 'meleeAttack':
      return ctx.attack?.range === 'MELEE';
    case 'twoHandedGrip':
      return weapon?.twoHanded === true;
    case 'targetBelowMaxHp':
      return ctx.target?.belowMaxHp === true;
    case 'notProficientCheck':
      return ctx.check?.proficient === false;
    case 'spellRestoresHp':
      return ctx.spell?.restoresHp === true;
    case 'cantrip':
      return ctx.spell?.level === 0;
    case 'spellForcesSave':
      return ctx.spell?.forcesSave === true;
    case 'classSpell':
      return ctx.spell?.classSpell === true;
    case 'sorcererAncestryDamage': {
      const type = owner?.h.sorcererAncestryDamageType;
      return !!type && ctx.spell?.damageType?.toLowerCase() === type;
    }
  }
}

/** Все условия разом; без условий грань действует всегда. */
export function holds(
  when: readonly Predicate[] | undefined,
  ctx: MechanicsContext,
  owner?: FacetOwner,
): boolean {
  return (when ?? []).every((p) => test(p, ctx, owner));
}

const TABLES: Record<AmountTable, (level: number) => number> = {
  rageDamage: rageDamageBonus,
  martialArtsDie,
  sneakAttackDice,
  unarmoredMovement: unarmoredMovementBonus,
  bardicInspirationDie,
  songOfRestDie,
  brutalCriticalDice,
  divineStrikeDice,
};

/** Что числу нужно сверх носителя: круг ячейки сотворения (`spellLevel`). */
export interface AmountContext {
  spellLevel?: number;
}

export function amountOf(amount: Amount, h: MechanicsHolder, extra: AmountContext = {}): number {
  if (typeof amount === 'number') return amount;
  if (amount === 'halfProficiency') return Math.floor(h.proficiencyBonus / 2);
  if (amount === 'halfProficiencyUp') return Math.ceil(h.proficiencyBonus / 2);
  if (amount === 'proficiency') return h.proficiencyBonus;
  if (amount === 'level') return h.level;
  if (amount === 'spellLevel') return extra.spellLevel ?? 0;
  if ('table' in amount) return TABLES[amount.table](h.level);
  if ('ability' in amount) {
    const value = h.abilityModifiers?.[amount.ability] ?? 0;
    return amount.min !== undefined ? Math.max(amount.min, value) : value;
  }
  if ('halfUp' in amount) return Math.ceil(amountOf(amount.halfUp, h, extra) / 2);
  if ('times' in amount) return amount.times * amountOf(amount.of, h, extra);
  const sum = amount.sum.reduce((total: number, part) => total + amountOf(part, h, extra), 0);
  return amount.min !== undefined ? Math.max(amount.min, sum) : sum;
}

function facetsOfRecord(record: MechanicRecord | undefined): readonly Facet[] {
  return record?.facets ?? [];
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
    if (!holds(facet.when, ctx, { code, h })) continue;
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

/**
 * Число атак за действие «Атака»: бо́льшая из граней, не сумма; без
 * граней — одна. Контекст — ради жаждущего клинка: две атаки только
 * клинком договора.
 */
export function attacksPerActionOf(h: MechanicsHolder, ctx: MechanicsContext = {}): number {
  return Math.max(1, ...collectModifiers(h, 'attacksPerAction', ctx).map((m) => m.value));
}

/** Формула КД без доспеха; класс у персонажа один, и формула у него не больше одной. */
export function collectAcFormula(h: MechanicsHolder): AcFormulaFacet | null {
  for (const { facet } of facetsOf(h)) if (facet.kind === 'acFormula') return facet;
  return null;
}

/** Источники преимущества и помехи броску — по одному на грань, для сведения с прочими. */
export interface AdvantageRoll {
  kind: AdvantageFacet['roll'];
  ability?: AbilityCode;
  /** Навык проверки: грань с навыком действует только на него. */
  skill?: string;
}

export function advantageSources(
  h: MechanicsHolder,
  roll: AdvantageRoll,
  ctx: MechanicsContext = {},
): AdvantageFacet['mode'][] {
  return facetsOf(h).flatMap(({ code, facet }) =>
    facet.kind === 'advantage' &&
    facet.roll === roll.kind &&
    (facet.ability === undefined || facet.ability === roll.ability) &&
    (facet.abilities === undefined ||
      (roll.ability !== undefined && facet.abilities.includes(roll.ability))) &&
    (facet.skill === undefined || facet.skill === roll.skill) &&
    holds(facet.when, ctx, { code, h })
      ? [facet.mode]
      : [],
  );
}

/** Преимущество и помеха гасят друг друга, сколько бы их ни было (PHB). */
export function collectAdvantage(
  h: MechanicsHolder,
  roll: AdvantageRoll,
  ctx: MechanicsContext = {},
): AdvantageMode {
  return combineAdvantage(advantageSources(h, roll, ctx));
}

/** Иммунитет к состоянию: приостанавливает ли уже наложенное и от кого действует. */
export interface ConditionImmunity {
  code: ConditionCode;
  suspends: boolean;
  /** Только против источника этих типов существ; нет — против любого. */
  vsSourceType?: readonly string[];
}

export interface CollectedDefenses {
  resistances: string[];
  immunities: string[];
  conditionImmunities: ConditionImmunity[];
}

/**
 * Защита носителя: сопротивления, иммунитеты к урону и к состояниям.
 * Грани аур (`auraGrants`) приходят сюда вторым списком: защита ауры
 * преданности — та же грань `defense`, только чужая.
 */
export function collectDefenses(
  h: MechanicsHolder,
  ctx: MechanicsContext = {},
  extra: readonly { code: string; facet: Facet; h: MechanicsHolder }[] = [],
): CollectedDefenses {
  const resistances = new Set<string>();
  const immunities = new Set<string>();
  const conditionImmunities: ConditionImmunity[] = [];
  const all = [...facetsOf(h).map((entry) => ({ ...entry, h })), ...extra];
  for (const { code, facet, h: owner } of all) {
    if (facet.kind !== 'defense' || !holds(facet.when, ctx, { code, h: owner })) continue;
    // Исчадная стойкость не режет магическое и серебряное оружие (П1.4).
    // Без контекста удара (лист, снимок участника) её нет вовсе: снимок
    // резал бы и магический меч, а вид меняется на отдыхе посреди сцены.
    if (
      facet.except &&
      (!ctx.attack || (ctx.attack.weapon === true && ctx.attack.magicalWeapon === true))
    ) {
      continue;
    }
    for (const type of facet.resistance ?? []) {
      const resolved =
        type === 'ANCESTRY'
          ? h.ancestryDamageType
          : type === 'SORCERER_ANCESTRY'
            ? (h.sorcererAncestryDamageType ?? null)
            : type === 'CHOSEN'
              ? (h.fiendishResilienceType ?? null)
              : type;
      if (resolved) resistances.add(resolved);
    }
    for (const type of facet.immunity ?? []) immunities.add(type);
    for (const condition of facet.conditionImmunity ?? []) {
      conditionImmunities.push({
        code: condition,
        suspends: facet.suspends === true,
        ...(facet.vsSourceType ? { vsSourceType: facet.vsSourceType } : {}),
      });
    }
  }
  return {
    resistances: [...resistances],
    immunities: [...immunities],
    conditionImmunities,
  };
}

/**
 * Иммунен ли к состоянию от этого источника: без оговорки — всегда, с
 * оговоркой типа (защита природы) — только против элементалей и фей.
 * `sourceType` неизвестен — оговорка не срабатывает.
 */
export function immuneToCondition(
  immunities: readonly ConditionImmunity[],
  code: ConditionCode,
  sourceType?: string | null,
): boolean {
  return immunities.some(
    (row) =>
      row.code === code &&
      (row.vsSourceType === undefined ||
        (sourceType != null && row.vsSourceType.includes(sourceType.toLowerCase()))),
  );
}

/** Кто держит ауру глазами того, на кого она ляжет. */
export interface AuraSource {
  holder: MechanicsHolder;
  /** Расстояние от носителя ауры до получателя в футах. */
  distanceFeet: number;
  /** Союзник получателю (себе — союзник). */
  ally: boolean;
  /** Носитель ауры в сознании. */
  conscious: boolean;
  /** Получатель слышит носителя — противодействие очарованию. */
  recipientHearsBearer: boolean;
}

/**
 * Грани аур, что ложатся на получателя (разбор П1.5): носитель в радиусе,
 * союзник, условия ауры и получателя выполнены. Одноимённые не
 * складываются — из двух аур защиты остаётся бо́льшая прибавка (П4 #33).
 * Грань несёт своего носителя: прибавка «Харизма» — Харизма паладина.
 */
export function auraGrants(
  sources: readonly AuraSource[],
): { code: string; facet: Facet; h: MechanicsHolder }[] {
  const best = new Map<string, { code: string; facet: Facet; h: MechanicsHolder; value: number }>();
  for (const source of sources) {
    if (!source.ally) continue;
    for (const { code, facet } of facetsOf(source.holder)) {
      if (facet.kind !== 'zone' || source.distanceFeet > facet.radiusFeet) continue;
      const bearerCtx: MechanicsContext = { bearer: { conscious: source.conscious } };
      if (!holds(facet.when, bearerCtx, { code, h: source.holder })) continue;
      const recipientCtx: MechanicsContext = {
        recipient: { hearsBearer: source.recipientHearsBearer },
      };
      if (!holds(facet.recipient, recipientCtx, { code, h: source.holder })) continue;
      facet.grants.forEach((grant, index) => {
        const key = `${code}#${index}`;
        const value = grant.kind === 'modifier' ? amountOf(grant.amount, source.holder) : 0;
        const kept = best.get(key);
        if (!kept || value > kept.value) {
          best.set(key, { code, facet: grant, h: source.holder, value });
        }
      });
    }
  }
  return [...best.values()].map(({ code, facet, h }) => ({ code, facet, h }));
}

/** Какие выпавшие на к20 значения носитель перебрасывает сам («Везучий»: единица). */
export function collectReroll(h: MechanicsHolder, roll: 'attack' | 'check' | 'save'): number[] {
  return facetsOf(h).flatMap(({ facet }) =>
    facet.kind === 'reroll' && facet.die === 'd20' && facet.rolls.includes(roll)
      ? [...facet.on]
      : [],
  );
}

/**
 * Какие значения костей урона атаки носитель перебрасывает (бой большим
 * оружием: 1 и 2): каждая кость один раз, новое значение берётся (П4 №23).
 */
export function collectDamageRerolls(h: MechanicsHolder, ctx: MechanicsContext): number[] {
  return [
    ...new Set(
      facetsOf(h).flatMap(({ code, facet }) =>
        facet.kind === 'reroll' && facet.die === 'damageDie' && holds(facet.when, ctx, { code, h })
          ? [...facet.on]
          : [],
      ),
    ),
  ].sort((a, b) => a - b);
}

/**
 * Крит: порог — наименьший из граней (по умолчанию 20); лишние кости
 * оружия на крите — сумма граней, чьи условия держатся (жестокий крит и
 * свирепые атаки складываются). Без контекста лишних костей нет.
 */
export function collectCrit(
  h: MechanicsHolder,
  ctx?: MechanicsContext,
): { threshold: number; extraWeaponDice: number } {
  let threshold = 20;
  let extraWeaponDice = 0;
  for (const { code, facet } of facetsOf(h)) {
    if (facet.kind !== 'crit') continue;
    if (facet.threshold !== undefined) threshold = Math.min(threshold, facet.threshold);
    if (facet.extraWeaponDice !== undefined && ctx && holds(facet.when, ctx, { code, h })) {
      extraWeaponDice += amountOf(facet.extraWeaponDice, h);
    }
  }
  return { threshold, extraWeaponDice };
}

export function collectOnHit(
  h: MechanicsHolder,
  ctx: MechanicsContext,
): { code: string; facet: OnHitFacet }[] {
  const out: { code: string; facet: OnHitFacet }[] = [];
  for (const { code, facet } of facetsOf(h)) {
    if (facet.kind === 'onHit' && holds(facet.when, ctx, { code, h })) out.push({ code, facet });
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
  const dice = facet.dice;
  if (!dice) return 0;
  const above = dice.perSlotAbove ? dice.perSlotAbove * Math.max(0, (input.slotLevel ?? 1) - 1) : 0;
  const base = amountOf(dice.count, h) + above;
  const capped = dice.max !== undefined ? Math.min(dice.max, base) : base;
  const type = input.creatureType?.toLowerCase() ?? '';
  const extra = facet.extraVs?.creatureTypes.includes(type) ? facet.extraVs.count : 0;
  return capped + extra;
}

export function hasRule(h: MechanicsHolder, rule: RuleFacet['rule']): boolean {
  return facetsOf(h).some(({ facet }) => facet.kind === 'rule' && facet.rule === rule);
}

/** То же с условиями грани: движение без доспехов — без доспеха и щита, в свой ход. */
export function ruleHolds(
  h: MechanicsHolder,
  rule: RuleFacet['rule'],
  ctx: MechanicsContext,
): boolean {
  return facetsOf(h).some(
    ({ code, facet }) =>
      facet.kind === 'rule' && facet.rule === rule && holds(facet.when, ctx, { code, h }),
  );
}

/** Чувства носителя из реестра (черты, воззвания): большее из радиусов по виду. */
export function collectSenses(h: MechanicsHolder): { darkvision: number; devilsSight: number } {
  const out = { darkvision: 0, devilsSight: 0 };
  for (const { facet } of facetsOf(h)) {
    if (facet.kind === 'sense') out[facet.sense] = Math.max(out[facet.sense], facet.rangeFeet);
  }
  return out;
}

/** Свет от носителя («Священное оружие»). */
export function collectLights(h: MechanicsHolder): LightFacet[] {
  return facetsOf(h).flatMap(({ facet }) => (facet.kind === 'light' ? [facet] : []));
}

/** Что носитель может доплатить к сотворению — по грани на вариант, с кодом умения. */
export function collectCastOptions(h: MechanicsHolder): { code: string; facet: CastOptionFacet }[] {
  return facetsOf(h).flatMap(({ code, facet }) =>
    facet.kind === 'castOption' ? [{ code, facet }] : [],
  );
}

/**
 * Поправки заклинания носителя, чьи условия держатся для этого сотворения
 * (`ctx.spell`). Без контекста — все: лист показывает, что умение есть.
 */
export function collectSpellModifiers(
  h: MechanicsHolder,
  ctx?: MechanicsContext,
): { code: string; facet: SpellModifierFacet }[] {
  return facetsOf(h).flatMap(({ code, facet }) =>
    facet.kind === 'spellModifier' &&
    (!ctx ||
      ((facet.spell === undefined || facet.spell === ctx.spell?.code) &&
        holds(facet.when, ctx, { code, h })))
      ? [{ code, facet }]
      : [],
  );
}

/**
 * Дарованные заклинания носителя (П1.10) — с кодом умения или черты.
 * Ступень с `fromLevel` выше уровня носителя ещё не открыта.
 */
export function grantedSpells(h: MechanicsHolder): { code: string; facet: SpellGrantFacet }[] {
  return facetsOf(h).flatMap(({ code, facet }) =>
    facet.kind === 'spellGrant' && (facet.fromLevel ?? 0) <= h.level ? [{ code, facet }] : [],
  );
}

/** Действия короткого отдыха носителя (восстановление ячеек). */
export function restActions(h: MechanicsHolder): { code: string; facet: RestActionFacet }[] {
  return facetsOf(h).flatMap(({ code, facet }) =>
    facet.kind === 'restAction' ? [{ code, facet }] : [],
  );
}

/** Бюджет восстановления: сумма кругов ячеек, которые можно вернуть. */
export function restBudget(facet: RestActionFacet, h: MechanicsHolder): number {
  return amountOf(facet.budget, h);
}

/** Грань кости «Песни отдыха» носителя; 0 — песни нет. */
export function songOfRestSides(h: MechanicsHolder): number {
  return Math.max(
    0,
    ...facetsOf(h).flatMap(({ facet }) =>
      facet.kind === 'trigger' && facet.on === 'shortRestHitDice'
        ? [amountOf(facet.extraHeal.sides, h)]
        : [],
    ),
  );
}

/**
 * Сколько заклинатель лечит себе, вылечив заклинанием другого
 * (благословенный целитель); 0 — грани нет или условия не держатся.
 */
export function healOtherSelfAmount(
  h: MechanicsHolder,
  ctx: MechanicsContext,
  slotLevel: number,
): number {
  return Math.max(
    0,
    ...facetsOf(h).flatMap(({ code, facet }) =>
      facet.kind === 'trigger' &&
      facet.on === 'healOtherWithSpell' &&
      holds(facet.when, ctx, { code, h })
        ? [amountOf(facet.healSelf, h, { spellLevel: slotLevel })]
        : [],
    ),
  );
}

/**
 * Временные хиты за добивание враждебного (благословение Тёмного); 0 —
 * такой грани нет. Враждебность и «до нуля» решает вызывающий: у него
 * хиты цели до и после.
 */
export function onKillTempHp(h: MechanicsHolder): number {
  const triggers = facetsOf(h).flatMap(({ facet }) =>
    facet.kind === 'trigger' && facet.on === 'reduceHostileToZero' ? [facet] : [],
  );
  return Math.max(0, ...triggers.map((facet) => amountOf(facet.tempHp, h)));
}

export interface AvailableActionsInput {
  holder: MechanicsHolder;
  /** Максимум по классу и уровню и сколько потрачено; `lockedRests` — заперт на отдыхи. */
  resources: readonly {
    code: CharacterResourceCode;
    max: number;
    used: number;
    lockedRests?: number;
  }[];
  economy: { hasUsedAction: boolean; hasUsedBonusAction: boolean; hasUsedReaction: boolean };
  isTurn: boolean;
  /** На нуле хитов не действуют — причина раньше всех прочих. */
  isDown?: boolean;
  /**
   * Обход ведущего: он правит стол и снимает очередь и экономику хода (так
   * было и до волны 2); пустой ресурс не снимает — заряда нет и у него.
   */
  override?: boolean;
  /** Состояние хода сверх экономики — волна 3; нет — как в волне 2. */
  state?: TurnState;
}

/** Что о ходе участника известно сверх потраченных видов действия. */
export interface TurnState {
  /** Оцепенение и всё, что его включает. */
  cannotAct: boolean;
  /** Застигнут врасплох — первый ход боя. */
  surprised: boolean;
  grappled: boolean;
  /** Опутан зоной, из которой вырываются проверкой («Паутина», волна 5). */
  restrainedByZone?: boolean;
  /** Действие «Атака» в этом ходу совершено (всплеск его не сбрасывает). */
  attackActionTaken: boolean;
  /**
   * Сколько атак действия «Атака» ещё осталось: ноль, если действие
   * потрачено чем угодно (заклинанием тоже).
   */
  attacksLeft: number;
  /** В этом ходу уже была атака — безрассудство решается на первой. */
  attackedThisTurn: boolean;
  /** Удары шквала, ещё не сделанные. */
  flurryStrikesLeft: number;
  hordeBreakerUsed: boolean;
  /** В этом ходу была атака оружием — сокрушитель орды бьёт тем же. */
  hasLastWeaponAttack: boolean;
  round: number;
  /**
   * Реакции нет вовсе (приём открытой ладони, изгнание, «Шоковое
   * касание»): подготовленная атака — тоже реакция. Нет поля — может.
   */
  noReactions?: boolean;
}

const ECONOMY_REASON: Partial<Record<ActionEconomy, ActionUnavailableReason>> = {
  ACTION: 'ACTION_ALREADY_USED',
  ATTACK: 'ACTION_ALREADY_USED',
  BONUS_ACTION: 'BONUS_ACTION_ALREADY_USED',
  REACTION: 'REACTION_ALREADY_USED',
};

/**
 * Почему действие этого вида сейчас недоступно — один порядок на весь
 * список (план волны 3, §4.1): упавший, чужой ход (кроме реакции),
 * оцепенение, потраченный вид действия, «сперва действие „Атака“».
 * Исчерпанный ресурс — последним, его решает вызывающий: у него цена.
 */
export function economyReason(
  input: AvailableActionsInput,
  economy: ActionEconomy,
  options: {
    /**
     * Только после действия «Атака»: `started` — начатого (вторая рука,
     * боевые искусства), `finished` — всех его атак (шквал, ревью волны 3).
     */
    afterAttackAction?: 'started' | 'finished';
    /** Удар даром (шквал, сокрушитель орды) — оцепеневший его не нанесёт. */
    strike?: boolean;
  } = {},
): ActionUnavailableReason | null {
  const { override = false, state } = input;
  if (input.isDown) return 'PARTICIPANT_IS_DOWN';
  if (!override && !input.isTurn && economy !== 'REACTION') return 'NOT_YOUR_TURN';
  if (!override && (economy !== 'FREE' || options.strike) && state?.cannotAct) {
    return 'PARTICIPANT_CANNOT_ACT';
  }
  if (!override && economy === 'REACTION' && state?.noReactions) return 'PARTICIPANT_CANNOT_ACT';
  const used = {
    ACTION: input.economy.hasUsedAction,
    // Атака из действия «Атака» — пока у него остались атаки.
    ATTACK: state ? state.attacksLeft === 0 : input.economy.hasUsedAction,
    BONUS_ACTION: input.economy.hasUsedBonusAction,
    REACTION: input.economy.hasUsedReaction,
    FREE: false,
  } satisfies Record<ActionEconomy, boolean>;
  if (!override && used[economy]) return ECONOMY_REASON[economy] ?? null;
  if (
    !override &&
    options.afterAttackAction &&
    (!state?.attackActionTaken ||
      (options.afterAttackAction === 'finished' && state.attacksLeft > 0))
  ) {
    return 'ATTACK_ACTION_REQUIRED';
  }
  return null;
}

/** Ввод действия как его отдаёт список: постоянное из реестра, изменчивое — пусто. */
export function actionInputOf(
  spec: NonNullable<ActionFacet['input']>,
  extraOptions: readonly string[] = [],
): NonNullable<Extract<AvailableAction, { kind: 'BASIC' }>['input']> {
  return {
    target: spec.target,
    rangeFeet: spec.rangeFeet ?? null,
    options: [...(spec.options ?? []), ...extraOptions],
    amount: null,
    area: null,
  };
}

const isCombatAbility = (ability: ActionFacet['ability']): ability is CombatAbility =>
  (COMBAT_ABILITIES as readonly string[]).includes(ability);

/**
 * Действия умений, какие у носителя есть сейчас, — в порядке записей
 * реестра. Открывает действие владение кодом умения (решение 2 плана
 * волны 3): канал божественности делят изгнание и подклассовые
 * действия, и по ресурсу «Сохранение жизни» досталось бы любому жрецу.
 * Три действия волны 2 открываются ресурсом (`openedByResource`).
 * Базовые действия (рывок «Хитрого действия») — не здесь, а в
 * `turnActions`: у них свой вид в списке.
 */
export function availableActions(input: AvailableActionsInput): AvailableAction[] {
  const { holder: h, state } = input;
  if (state?.surprised) return surprisedActions(input);
  const out: AvailableAction[] = [];
  const sources = [
    ...Object.entries(FEATURE_MECHANICS).map(([code, record]) => ({
      code,
      record,
      has: h.features.has(code),
    })),
    ...Object.entries(TRAIT_MECHANICS).map(([code, record]) => ({
      code,
      record,
      has: h.traits.has(code),
    })),
  ];
  for (const { code, record, has } of sources) {
    for (const facet of facetsOfRecord(record)) {
      if (facet.kind !== 'action' || !isCombatAbility(facet.ability)) continue;
      const resource = facet.resource
        ? input.resources.find((r) => r.code === facet.resource && r.max > 0)
        : undefined;
      const owned = facet.openedByResource
        ? resource !== undefined
        : facet.requiresEffect
          ? h.effects.includes(facet.requiresEffect)
          : has && (!facet.resource || resource !== undefined);
      if (!owned) continue;
      if (facet.applies && h.effects.includes(facet.applies)) continue;
      const left = resource ? Math.max(0, resource.max - resource.used) : null;
      const cost = typeof facet.cost === 'number' ? facet.cost : 1;
      const reason =
        economyReason(input, facet.economy, {
          ...(facet.availableAfter === 'attackAction'
            ? { afterAttackAction: 'finished' as const }
            : {}),
        }) ??
        ((resource?.lockedRests ?? 0) > 0
          ? 'RESOURCE_LOCKED'
          : left !== null && left < cost
            ? 'RESOURCE_EXHAUSTED'
            : null);
      // Бешенство — вариант входа в ярость, а не своя кнопка: решается в
      // момент входа (SRD «when you enter your rage»).
      const options = facet.ability === 'RAGE' && hasRule(h, 'frenzy') ? ['FRENZY'] : [];
      const spec = facet.input ?? (options.length > 0 ? { target: 'NONE' as const } : undefined);
      out.push({
        kind: 'ABILITY',
        ability: facet.ability,
        featureCode: code,
        economy: facet.economy,
        resource:
          resource && left !== null ? { code: resource.code, left, max: resource.max } : null,
        available: reason === null,
        reason,
        ...(spec ? { input: actionInputOf(spec, options) } : {}),
      });
    }
  }
  return out;
}

/**
 * Застигнутый врасплох в первом ходу не действует вовсе (§П3.15); с
 * «Звериными инстинктами» — только вход в ярость, и после неё ход
 * обычный (снимает внезапность служба).
 */
function surprisedActions(input: AvailableActionsInput): AvailableAction[] {
  if (!hasRule(input.holder, 'surpriseRageOverride')) return [];
  return availableActions({
    ...input,
    state: { ...(input.state as TurnState), surprised: false },
  }).filter((action) => action.kind === 'ABILITY' && action.ability === 'RAGE');
}

/** Заглушка ступени подкласса — строка без механики, которую окно повышения не показывает. */
export function isSubclassStep(code: string): boolean {
  const record = FEATURE_MECHANICS[code];
  return record !== undefined && 'holder' in record && record.holder === 'subclassStep';
}
