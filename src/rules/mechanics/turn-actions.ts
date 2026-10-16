import type { AvailableAction } from '../../schemas/combat.js';
import { BASIC_ACTIONS } from '../../schemas/combat.js';
import { BASIC_ACTION_RECORDS, isBasicAction } from './basic.data.js';
import {
  type AvailableActionsInput,
  actionInputOf,
  availableActions,
  collectCastOptions,
  economyReason,
  facetsOf,
} from './compute.js';
import { FEATURE_MECHANICS } from './features.data.js';

type Basic = Extract<AvailableAction, { kind: 'BASIC' }>;
type Attack = Extract<AvailableAction, { kind: 'ATTACK' }>;
type CastOptionEntry = Extract<AvailableAction, { kind: 'CAST_OPTION' }>;

/**
 * Весь список действий хода (план волны 3, §4.1): умения (вид `ABILITY`,
 * контракт волны 2), базовые действия, пути атаки и что можно доплатить
 * к сотворению. Изменчивое — предметы, ячейки, оружие пути — дописывает
 * сервер: здесь только правило «можно ли сейчас».
 */
export function turnActions(input: AvailableActionsInput): AvailableAction[] {
  return [
    ...availableActions(input),
    ...basicActions(input),
    ...attackActions(input),
    ...castOptionActions(input),
  ];
}

export function basicActions(input: AvailableActionsInput): Basic[] {
  if (input.state?.surprised) return [];
  const out: Basic[] = [];
  const entry = (
    ability: Basic['ability'],
    economy: Basic['economy'],
    featureCode: string | null,
  ): Basic => {
    const record = BASIC_ACTION_RECORDS[ability];
    const reason = economyReason(input, economy);
    return {
      kind: 'BASIC',
      ability,
      featureCode,
      economy,
      available: reason === null,
      reason,
      input: actionInputOf(record.input ?? { target: 'NONE' }),
    };
  };
  for (const ability of BASIC_ACTIONS) {
    // Высвобождаться не из чего.
    if (ability === 'ESCAPE' && !input.state?.grappled) continue;
    out.push(entry(ability, BASIC_ACTION_RECORDS[ability].economy, null));
  }
  // Бонусные версии — гранями умений носителя, в порядке реестра.
  for (const [code, record] of Object.entries(FEATURE_MECHANICS)) {
    if (!input.holder.features.has(code)) continue;
    for (const facet of 'facets' in record && record.facets ? record.facets : []) {
      if (facet.kind === 'action' && isBasicAction(facet.ability)) {
        out.push(entry(facet.ability, facet.economy, code));
      }
    }
  }
  return out;
}

/**
 * Пути атаки. Действие «Атака» — счётчик атак; бонусная (вторая рука,
 * боевые искусства) — только после него; удары шквала, бешенство,
 * сокрушитель орды и подготовленная атака — когда их открыло своё.
 */
export function attackActions(input: AvailableActionsInput): Attack[] {
  const { holder: h, state } = input;
  if (state?.surprised) return [];
  const has = (option: 'RECKLESS' | 'HORDE_BREAKER') =>
    facetsOf(h).some(({ facet }) => facet.kind === 'attackOption' && facet.option === option);
  const out: Attack[] = [];
  const push = (
    via: Attack['via'],
    economy: Attack['economy'],
    featureCode: string | null,
    reason: Attack['reason'],
    extra: Partial<Attack> = {},
  ) =>
    out.push({
      kind: 'ATTACK',
      via,
      featureCode,
      economy,
      available: reason === null,
      reason,
      left: null,
      weaponIds: null,
      flags: [],
      ...extra,
    });

  push('ACTION', 'ACTION', null, economyReason(input, 'ATTACK'), {
    left: state?.attacksLeft ?? null,
    // Безрассудство решается на первой атаке хода (SRD «when you make your
    // first attack on your turn») — любой, выгода только подходящим.
    flags: has('RECKLESS') && input.isTurn && !state?.attackedThisTurn ? ['RECKLESS'] : [],
  });
  const martialArts = facetsOf(h).some(
    ({ facet }) => facet.kind === 'rule' && facet.rule === 'martialArts',
  );
  push(
    'BONUS',
    'BONUS_ACTION',
    martialArts ? 'martial-arts' : null,
    economyReason(input, 'BONUS_ACTION', { afterAttackAction: 'started' }),
  );
  if ((state?.flurryStrikesLeft ?? 0) > 0) {
    // Бонусное действие уже потрачено самим шквалом — удары идут даром.
    push(
      'FLURRY',
      'BONUS_ACTION',
      'flurry-of-blows',
      economyReason(input, 'FREE', { strike: true }),
      {
        left: state?.flurryStrikesLeft ?? 0,
        weaponIds: ['unarmed'],
      },
    );
  }
  const frenzyRound = h.effectData?.FRENZY?.round;
  if (
    h.effects.includes('FRENZY') &&
    typeof frenzyRound === 'number' &&
    (state?.round ?? 0) > frenzyRound
  ) {
    push('FRENZY', 'BONUS_ACTION', 'frenzy', economyReason(input, 'BONUS_ACTION'));
  }
  if (
    has('HORDE_BREAKER') &&
    input.isTurn &&
    state?.hasLastWeaponAttack &&
    !state.hordeBreakerUsed
  ) {
    push(
      'HORDE_BREAKER',
      'FREE',
      'hunters-prey-horde-breaker',
      economyReason(input, 'FREE', { strike: true }),
    );
  }
  if (h.effects.includes('READIED') && !input.isTurn) {
    push('READIED', 'REACTION', null, economyReason(input, 'REACTION'));
  }
  return out;
}

/**
 * Что чародей может доплатить. Годность по заклинанию решает
 * `castOptionEligible` у самого сотворения — здесь только очки.
 */
export function castOptionActions(input: AvailableActionsInput): CastOptionEntry[] {
  const points = input.resources.find((r) => r.code === 'SORCERY_POINT');
  const left = points ? Math.max(0, points.max - points.used) : 0;
  return collectCastOptions(input.holder).map(({ code, facet }) => {
    const cost = facet.cost === 'spellLevelMin1' ? 'SPELL_LEVEL' : facet.cost;
    // Упавший не колдует — и доплачивать ему не к чему (порядок причин §4.1).
    const reason = input.isDown
      ? 'PARTICIPANT_IS_DOWN'
      : left < (typeof cost === 'number' ? cost : 1)
        ? 'RESOURCE_EXHAUSTED'
        : null;
    return {
      kind: 'CAST_OPTION',
      option: facet.option,
      featureCode: code,
      cost,
      exclusive: facet.exclusive === true,
      available: reason === null,
      reason,
    };
  });
}
