import type { MechanicRecord } from './types.js';

/*
 * Стили боя — одна запись на все коды: у воина, паладина и следопыта
 * код разный (`fighter-fighting-style-defense`, `fighting-style-defense`,
 * `ranger-fighting-style-defense`), правило одно.
 */
const ARCHERY: MechanicRecord = {
  facets: [
    { kind: 'modifier', target: 'attack', amount: 2, source: 'archery', when: ['rangedWeapon'] },
  ],
};
const DEFENSE: MechanicRecord = {
  facets: [{ kind: 'modifier', target: 'ac', amount: 1, when: ['armored'] }],
};
const DUELING: MechanicRecord = {
  facets: [
    { kind: 'modifier', target: 'damage', amount: 2, source: 'dueling', when: ['oneHandedMelee'] },
  ],
};
const TWO_WEAPON_FIGHTING: MechanicRecord = {
  facets: [{ kind: 'rule', rule: 'offHandAbilityDamage' }],
};
const SUBCLASS_STEP: MechanicRecord = { holder: 'subclassStep' };
const EXTRA_ATTACK: MechanicRecord = {
  facets: [{ kind: 'modifier', target: 'attacksPerAction', amount: 2 }],
};

/**
 * Умения классов и подклассов (`class-features.json`), включая варианты
 * выбора. Порядок действий (`rage` → `second-wind` → `action-surge-1-use`)
 * — порядок кнопок в списке доступных действий.
 */
export const FEATURE_MECHANICS: Readonly<Record<string, MechanicRecord>> = {
  rage: {
    facets: [
      {
        kind: 'action',
        ability: 'RAGE',
        economy: 'BONUS_ACTION',
        resource: 'RAGE',
        applies: 'RAGE',
      },
      { kind: 'action', ability: 'END_RAGE', economy: 'FREE', requiresEffect: 'RAGE' },
    ],
  },
  // Лечение 1к10 + уровень — ветка службы: грани лечения появятся с волной 3.
  'second-wind': {
    facets: [
      { kind: 'action', ability: 'SECOND_WIND', economy: 'BONUS_ACTION', resource: 'SECOND_WIND' },
    ],
  },
  'action-surge-1-use': {
    facets: [
      { kind: 'action', ability: 'ACTION_SURGE', economy: 'FREE', resource: 'ACTION_SURGE' },
    ],
  },

  'barbarian-unarmored-defense': {
    facets: [{ kind: 'acFormula', base: 10, ability: 'constitution', shield: true }],
  },
  'monk-unarmored-defense': {
    facets: [{ kind: 'acFormula', base: 10, ability: 'wisdom', shield: false }],
  },
  // «13 + Ловкость без доспеха» — та же формула с базой 13 и без второй характеристики.
  'draconic-resilience': {
    facets: [
      { kind: 'acFormula', base: 13, ability: null, shield: true },
      { kind: 'modifier', target: 'hpPerLevel', amount: 1 },
    ],
  },
  'fast-movement': {
    facets: [{ kind: 'modifier', target: 'speed', amount: 10, when: ['notHeavyArmor'] }],
  },
  // Одно умение на все ступени: величина — столбец таблицы монаха.
  'unarmored-movement-1': {
    facets: [
      {
        kind: 'modifier',
        target: 'speed',
        amount: { table: 'unarmoredMovement' },
        when: ['noArmor', 'noShield'],
      },
    ],
  },
  'jack-of-all-trades': {
    facets: [
      { kind: 'modifier', target: 'initiative', amount: 'halfProficiency' },
      { kind: 'modifier', target: 'skill', amount: 'halfProficiency' },
    ],
  },
  'improved-critical': { facets: [{ kind: 'crit', threshold: 19 }] },
  'extra-attack-1': EXTRA_ATTACK,
  'barbarian-extra-attack': EXTRA_ATTACK,
  'monk-extra-attack': EXTRA_ATTACK,
  'paladin-extra-attack': EXTRA_ATTACK,
  'ranger-extra-attack': EXTRA_ATTACK,

  'fighter-fighting-style-archery': ARCHERY,
  'ranger-fighting-style-archery': ARCHERY,
  'fighter-fighting-style-defense': DEFENSE,
  'fighting-style-defense': DEFENSE,
  'ranger-fighting-style-defense': DEFENSE,
  'fighter-fighting-style-dueling': DUELING,
  'fighting-style-dueling': DUELING,
  'ranger-fighting-style-dueling': DUELING,
  'fighter-fighting-style-two-weapon-fighting': TWO_WEAPON_FIGHTING,
  'ranger-fighting-style-two-weapon-fighting': TWO_WEAPON_FIGHTING,

  /*
   * Ступени подкласса: SRD отмечает уровень, на котором подкласс даёт
   * что-то новое, отдельной строкой без механики; само новое — своим
   * кодом (`mindless-rage`). В окне повышения ступень не показывается.
   */
  'primal-path-improvement-1': SUBCLASS_STEP,
  'primal-path-improvement-2': SUBCLASS_STEP,
  'bard-college-improvement-1': SUBCLASS_STEP,
  'divine-domain-improvement-1': SUBCLASS_STEP,
  'divine-domain-improvement-2': SUBCLASS_STEP,
  'divine-domain-improvement-3': SUBCLASS_STEP,
  'druid-circle-improvement-1': SUBCLASS_STEP,
  'druid-circle-improvement-2': SUBCLASS_STEP,
  'martial-archetype-improvement-1': SUBCLASS_STEP,
  'martial-archetype-improvement-2': SUBCLASS_STEP,
  'monastic-tradition-improvement-1': SUBCLASS_STEP,
  'sacred-oath-improvement-1': SUBCLASS_STEP,
  'ranger-archetype-improvement-1': SUBCLASS_STEP,
  'roguish-archetype-improvement-1': SUBCLASS_STEP,
  'sorcerous-origin-improvement-1': SUBCLASS_STEP,
  'otherworldly-patron-improvement-1': SUBCLASS_STEP,
  'otherworldly-patron-improvement-2': SUBCLASS_STEP,
  'arcane-tradition-improvement-1': SUBCLASS_STEP,
  'arcane-tradition-improvement-2': SUBCLASS_STEP,

  'martial-arts': { facets: [{ kind: 'rule', rule: 'martialArts' }] },
  // Раз в ход, сама — на первом попадании, где выполнены условия (PHB).
  'sneak-attack': {
    facets: [
      {
        kind: 'onHit',
        dice: { count: { table: 'sneakAttackDice' }, sides: 6 },
        damageType: 'WEAPON',
        oncePerTurn: true,
        when: [
          'finesseOrRanged',
          'notDisadvantage',
          { anyOf: ['advantage', 'allyAdjacentToTarget'] },
        ],
      },
    ],
  },
  // 2к8 за первый круг, +1к8 за каждый выше — до 5к8; по нежити и исчадиям ещё +1к8.
  'divine-smite': {
    facets: [
      {
        kind: 'onHit',
        dice: { count: 2, sides: 8, perSlotAbove: 1, max: 5 },
        damageType: 'radiant',
        cost: 'spellSlot',
        extraVs: { creatureTypes: ['undead', 'fiend'], count: 1 },
        when: ['meleeWeapon'],
      },
    ],
  },
};
