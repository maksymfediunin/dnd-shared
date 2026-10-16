import type { Facet, MechanicRecord } from './types.js';

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
/**
 * «Оборона» — у воина и паладина код разный, правило одно: реакцией
 * помеха атаке по соседу носителя щита, которого атакующий видит.
 */
const PROTECTION: MechanicRecord = {
  facets: [
    {
      kind: 'reaction',
      ability: 'PROTECTION',
      event: ['attackDeclared'],
      economy: 'REACTION',
      who: 'other',
      when: ['shield', 'attackerSeen', 'targetNotSelf', { withinFeet: 5, of: 'target' }],
      effect: { imposeDisadvantage: true },
    },
  ],
};
/** Уклонение монаха и плута: спасбросок Ловкости на половину урона. */
const EVASION: MechanicRecord = { facets: [{ kind: 'rule', rule: 'evasion' }] };
/** Аура паладина: грани на себя и союзников в 10 футах, пока носитель в сознании. */
const aura = (grants: readonly Facet[]): MechanicRecord => ({
  facets: [
    {
      kind: 'zone',
      anchor: 'bearer',
      radiusFeet: 10,
      who: 'selfAndAllies',
      when: ['bearerConscious'],
      grants,
    },
  ],
});
const CHOICE: MechanicRecord = { holder: 'choice' };
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
        openedByResource: true,
        applies: 'RAGE',
      },
      { kind: 'action', ability: 'END_RAGE', economy: 'FREE', requiresEffect: 'RAGE' },
    ],
  },
  // Лечение 1к10 + уровень — ветка службы: грани лечения появятся с волной 3.
  'second-wind': {
    facets: [
      {
        kind: 'action',
        ability: 'SECOND_WIND',
        economy: 'BONUS_ACTION',
        resource: 'SECOND_WIND',
        openedByResource: true,
      },
    ],
  },
  'action-surge-1-use': {
    facets: [
      {
        kind: 'action',
        ability: 'ACTION_SURGE',
        economy: 'FREE',
        resource: 'ACTION_SURGE',
        openedByResource: true,
      },
    ],
  },

  // Волна 3: действия умений (план волны 3, §3). Порядок — порядок кнопок.
  'intimidating-presence': {
    facets: [
      {
        kind: 'action',
        ability: 'INTIMIDATING_PRESENCE',
        economy: 'ACTION',
        input: { target: 'CREATURE', rangeFeet: 30 },
      },
    ],
  },
  'bardic-inspiration-d6': {
    facets: [
      {
        kind: 'action',
        ability: 'BARDIC_INSPIRATION',
        economy: 'BONUS_ACTION',
        resource: 'BARDIC_INSPIRATION',
        input: { target: 'CREATURE', rangeFeet: 60 },
      },
    ],
  },
  'channel-divinity-turn-undead': {
    facets: [
      {
        kind: 'action',
        ability: 'TURN_UNDEAD',
        economy: 'ACTION',
        resource: 'CHANNEL_DIVINITY',
        input: { target: 'NONE', rangeFeet: 30 },
      },
    ],
  },
  'channel-divinity-turn-the-unholy': {
    facets: [
      {
        kind: 'action',
        ability: 'TURN_THE_UNHOLY',
        economy: 'ACTION',
        resource: 'CHANNEL_DIVINITY',
        input: { target: 'NONE', rangeFeet: 30 },
      },
    ],
  },
  'channel-divinity-preserve-life': {
    facets: [
      {
        kind: 'action',
        ability: 'PRESERVE_LIFE',
        economy: 'ACTION',
        resource: 'CHANNEL_DIVINITY',
        input: { target: 'ALLOCATE', rangeFeet: 30 },
      },
    ],
  },
  'lay-on-hands': {
    facets: [
      {
        kind: 'action',
        ability: 'LAY_ON_HANDS',
        economy: 'ACTION',
        resource: 'LAY_ON_HANDS',
        cost: 'chosen',
        input: { target: 'CREATURE', rangeFeet: 5, options: ['HEAL', 'CURE_POISON'] },
      },
    ],
  },
  // Свет — гранью эффекта (волна 5), магичность оружия — волна 7 (`PARTIAL`).
  'channel-divinity-sacred-weapon': {
    facets: [
      {
        kind: 'action',
        ability: 'SACRED_WEAPON',
        economy: 'ACTION',
        resource: 'CHANNEL_DIVINITY',
        applies: 'SACRED_WEAPON',
        input: { target: 'NONE' },
      },
      {
        kind: 'action',
        ability: 'END_SACRED_WEAPON',
        economy: 'FREE',
        requiresEffect: 'SACRED_WEAPON',
      },
    ],
  },
  'flurry-of-blows': {
    facets: [
      {
        kind: 'action',
        ability: 'FLURRY_OF_BLOWS',
        economy: 'BONUS_ACTION',
        resource: 'KI',
        availableAfter: 'attackAction',
      },
    ],
  },
  'patient-defense': {
    facets: [
      {
        kind: 'action',
        ability: 'PATIENT_DEFENSE',
        economy: 'BONUS_ACTION',
        resource: 'KI',
        applies: 'DODGING',
      },
    ],
  },
  'step-of-the-wind': {
    facets: [
      {
        kind: 'action',
        ability: 'STEP_OF_THE_WIND',
        economy: 'BONUS_ACTION',
        resource: 'KI',
        input: { target: 'NONE', options: ['DASH', 'DISENGAGE'] },
      },
    ],
  },
  'wholeness-of-body': {
    facets: [
      { kind: 'resource', code: 'WHOLENESS_OF_BODY', recovery: 'LONG' },
      {
        kind: 'action',
        ability: 'WHOLENESS_OF_BODY',
        economy: 'ACTION',
        resource: 'WHOLENESS_OF_BODY',
      },
    ],
  },
  // Варианты — испуг и очарование на себе (сервер дописывает).
  'stillness-of-mind': {
    facets: [
      {
        kind: 'action',
        ability: 'STILLNESS_OF_MIND',
        economy: 'ACTION',
        input: { target: 'NONE' },
      },
    ],
  },
  // Круги ячеек — по остатку очков (сервер дописывает варианты).
  'flexible-casting-creating-spell-slots': {
    facets: [
      {
        kind: 'action',
        ability: 'CREATE_SPELL_SLOT',
        economy: 'BONUS_ACTION',
        resource: 'SORCERY_POINT',
        cost: 'chosen',
        input: { target: 'NONE' },
      },
    ],
  },
  'flexible-casting-converting-spell-slot': {
    facets: [
      {
        kind: 'action',
        ability: 'CONVERT_SPELL_SLOT',
        economy: 'BONUS_ACTION',
        input: { target: 'NONE' },
      },
    ],
  },
  // Магичность клинка — волна 7 (`PARTIAL`); варианты — рукопашное оружие справочника.
  'pact-of-the-blade': {
    facets: [
      {
        kind: 'action',
        ability: 'PACT_WEAPON',
        economy: 'ACTION',
        input: { target: 'NONE' },
      },
      { kind: 'action', ability: 'DISMISS_PACT_WEAPON', economy: 'FREE' },
    ],
  },
  'cunning-action': {
    facets: [
      { kind: 'action', ability: 'DASH', economy: 'BONUS_ACTION' },
      { kind: 'action', ability: 'DISENGAGE', economy: 'BONUS_ACTION' },
      { kind: 'action', ability: 'HIDE', economy: 'BONUS_ACTION' },
    ],
  },
  'fast-hands': {
    facets: [{ kind: 'action', ability: 'USE_AN_OBJECT', economy: 'BONUS_ACTION' }],
  },

  'reckless-attack': { facets: [{ kind: 'attackOption', option: 'RECKLESS' }] },
  frenzy: { facets: [{ kind: 'rule', rule: 'frenzy' }] },
  'feral-instinct': {
    facets: [
      { kind: 'advantage', roll: 'initiative', mode: 'ADVANTAGE' },
      { kind: 'rule', rule: 'surpriseRageOverride' },
    ],
  },
  'destroy-undead-cr-1-2-or-below': { facets: [{ kind: 'rule', rule: 'destroyUndead' }] },
  'open-hand-technique': {
    facets: [
      {
        kind: 'onHit',
        when: ['viaFlurry'],
        rider: {
          options: [
            {
              key: 'PRONE',
              save: { ability: 'dexterity', dc: { ability: 'wisdom' } },
              condition: 'prone',
            },
            {
              key: 'PUSH',
              save: { ability: 'strength', dc: { ability: 'wisdom' } },
              push: { feet: 15 },
            },
            { key: 'NO_REACTIONS', effect: 'NO_REACTIONS' },
          ],
        },
      },
    ],
  },
  // Без «раз в ход»: каждое попадание — снова за очко ци.
  'stunning-strike': {
    facets: [
      {
        kind: 'onHit',
        when: ['meleeWeapon'],
        cost: { resource: 'KI', amount: 1 },
        rider: {
          save: { ability: 'constitution', dc: { ability: 'wisdom' } },
          effect: 'STUNNING_STRIKE',
        },
      },
    ],
  },
  'supreme-sneak': {
    facets: [
      {
        kind: 'advantage',
        roll: 'check',
        skill: 'stealth',
        mode: 'ADVANTAGE',
        when: ['movedAtMostHalfSpeed'],
      },
    ],
  },
  'hunters-prey-horde-breaker': { facets: [{ kind: 'attackOption', option: 'HORDE_BREAKER' }] },
  'metamagic-careful-spell': {
    facets: [{ kind: 'castOption', option: 'CAREFUL', cost: 1, exclusive: true }],
  },
  'metamagic-distant-spell': {
    facets: [{ kind: 'castOption', option: 'DISTANT', cost: 1, exclusive: true }],
  },
  // Решение — после броска урона, ответом в окне (волна 4); заранее при
  // сотворении — как в волне 3. Кости выбирает сервер: самые малые ниже среднего.
  'metamagic-empowered-spell': {
    facets: [
      { kind: 'castOption', option: 'EMPOWERED', cost: 1 },
      {
        kind: 'reaction',
        ability: 'EMPOWERED_SPELL',
        event: ['damageRolled'],
        economy: 'FREE',
        who: 'self',
        cost: { resource: 'SORCERY_POINT', amount: 1 },
        effect: { empower: true },
      },
    ],
  },
  'metamagic-extended-spell': {
    facets: [{ kind: 'castOption', option: 'EXTENDED', cost: 1, exclusive: true }],
  },
  'metamagic-heightened-spell': {
    facets: [{ kind: 'castOption', option: 'HEIGHTENED', cost: 3, exclusive: true }],
  },
  'metamagic-quickened-spell': {
    facets: [{ kind: 'castOption', option: 'QUICKENED', cost: 2, exclusive: true }],
  },
  // Снимает отказ «Тишины» (волна 5); контрзаклинание — волна 8 (`PARTIAL`).
  'metamagic-subtle-spell': {
    facets: [{ kind: 'castOption', option: 'SUBTLE', cost: 1, exclusive: true }],
  },
  'metamagic-twinned-spell': {
    facets: [{ kind: 'castOption', option: 'TWINNED', cost: 'spellLevelMin1', exclusive: true }],
  },
  'elemental-affinity': {
    facets: [
      {
        kind: 'spellModifier',
        effect: 'addAbilityToOneDamageRoll',
        ability: 'charisma',
        when: 'sorcererAncestryDamage',
      },
      { kind: 'castOption', option: 'ELEMENTAL_RESISTANCE', cost: 1 },
    ],
  },
  'dark-ones-blessing': {
    facets: [
      {
        kind: 'trigger',
        on: 'reduceHostileToZero',
        tempHp: { sum: [{ ability: 'charisma' }, 'level'], min: 1 },
      },
    ],
  },
  'eldritch-invocation-thirsting-blade': {
    facets: [{ kind: 'modifier', target: 'attacksPerAction', amount: 2, when: ['pactWeapon'] }],
  },

  // Волна 4: реакции и спасброски (план волны 4, §3.2).
  'indomitable-1-use': {
    facets: [
      { kind: 'resource', code: 'INDOMITABLE', recovery: 'LONG' },
      {
        kind: 'reaction',
        ability: 'INDOMITABLE',
        event: ['saveFailed'],
        economy: 'FREE',
        who: 'self',
        cost: { resource: 'INDOMITABLE', amount: 1 },
        effect: { rerollSave: true },
      },
    ],
  },
  // Фаза броска, а не исхода — сознательно строже буквы (П4 #47).
  'dark-ones-own-luck': {
    facets: [
      { kind: 'resource', code: 'DARK_ONES_OWN_LUCK', recovery: 'SHORT' },
      {
        kind: 'reaction',
        ability: 'DARK_ONES_OWN_LUCK',
        event: ['checkRolled', 'saveRolled'],
        economy: 'FREE',
        who: 'self',
        cost: { resource: 'DARK_ONES_OWN_LUCK', amount: 1 },
        effect: { addDie: { sides: 10 } },
      },
    ],
  },
  'danger-sense': {
    facets: [
      {
        kind: 'advantage',
        roll: 'save',
        ability: 'dexterity',
        mode: 'ADVANTAGE',
        when: ['sourceSeen', { bearerNot: ['blinded', 'deafened', 'incapacitated'] }],
      },
    ],
  },
  'mindless-rage': {
    facets: [
      {
        kind: 'defense',
        conditionImmunity: ['charmed', 'frightened'],
        suspends: true,
        when: ['raging'],
      },
    ],
  },
  // Болезней в приложении нет — флаг читают черты монстров волны 7.
  'natures-ward': {
    facets: [
      {
        kind: 'defense',
        conditionImmunity: ['charmed', 'frightened'],
        vsSourceType: ['elemental', 'fey'],
      },
      { kind: 'defense', immunity: ['poison'], conditionImmunity: ['poisoned'], disease: true },
    ],
  },
  'fighter-fighting-style-protection': PROTECTION,
  'fighting-style-protection': PROTECTION,
  'deflect-missiles': {
    facets: [
      {
        kind: 'reaction',
        ability: 'DEFLECT_MISSILES',
        event: ['damageRolled'],
        economy: 'REACTION',
        who: 'target',
        when: ['rangedWeaponAttack'],
        effect: {
          reduceDamage: { sides: 10, plus: [{ ability: 'dexterity' }, 'level'] },
          catchMissile: true,
        },
      },
    ],
  },
  'monk-evasion': EVASION,
  'rogue-evasion': EVASION,
  'purity-of-body': {
    facets: [
      { kind: 'defense', immunity: ['poison'], conditionImmunity: ['poisoned'], disease: true },
    ],
  },
  // Прибавка — Харизма носителя ауры, а не получателя: грань несёт его лист.
  'aura-of-protection': aura([
    { kind: 'modifier', target: 'save', amount: { ability: 'charisma', min: 1 }, source: 'aura' },
  ]),
  'aura-of-devotion': aura([{ kind: 'defense', conditionImmunity: ['charmed'], suspends: true }]),
  'aura-of-courage': aura([{ kind: 'defense', conditionImmunity: ['frightened'], suspends: true }]),
  'hunters-prey-giant-killer': {
    facets: [
      {
        kind: 'reaction',
        ability: 'GIANT_KILLER',
        event: ['attackResolved'],
        economy: 'REACTION',
        who: 'target',
        when: [{ attackerSizeAtLeast: 'LARGE' }, { withinFeet: 5, of: 'attacker' }, 'attackerSeen'],
        effect: { attack: 'attacker' },
      },
    ],
  },
  'defensive-tactics-escape-the-horde': {
    facets: [
      {
        kind: 'advantage',
        roll: 'incoming',
        mode: 'DISADVANTAGE',
        when: ['incomingOpportunityAttack'],
      },
    ],
  },
  'defensive-tactics-multiattack-defense': {
    facets: [{ kind: 'trigger', on: 'hitByAttack', applyEffect: 'MULTIATTACK_DEFENSE' }],
  },
  'defensive-tactics-steel-will': {
    facets: [
      { kind: 'advantage', roll: 'save', mode: 'ADVANTAGE', when: [{ vsCondition: 'frightened' }] },
    ],
  },
  'uncanny-dodge': {
    facets: [
      {
        kind: 'reaction',
        ability: 'UNCANNY_DODGE',
        event: ['damageRolled'],
        economy: 'REACTION',
        who: 'target',
        when: ['attackerSeen'],
        effect: { halveDamage: true },
      },
    ],
  },
  // Иммунные к очарованию — волна 7: иммунитетов монстров в справочнике
  // пока нет, предикат объявлен сразу (решение 23 плана волны 4).
  'cutting-words': {
    facets: [
      {
        kind: 'reaction',
        ability: 'CUTTING_WORDS',
        event: ['attackRolled', 'checkRolled', 'damageRolled'],
        economy: 'REACTION',
        who: 'other',
        rangeFeet: 60,
        when: ['actorSeen', 'actorHearsBearer', { not: { actorImmune: 'charmed' } }],
        cost: { resource: 'BARDIC_INSPIRATION', amount: 1 },
        effect: { subtractDie: { table: 'bardicInspirationDie' } },
      },
    ],
  },
  countercharm: {
    facets: [
      { kind: 'action', ability: 'COUNTERCHARM', economy: 'ACTION', applies: 'COUNTERCHARM' },
      {
        kind: 'action',
        ability: 'END_COUNTERCHARM',
        economy: 'FREE',
        requiresEffect: 'COUNTERCHARM',
      },
    ],
  },
  'arcane-recovery': {
    facets: [{ kind: 'resource', code: 'ARCANE_RECOVERY', recovery: 'LONG' }],
  },
  'natural-recovery': {
    facets: [{ kind: 'resource', code: 'NATURAL_RECOVERY', recovery: 'LONG' }],
  },
  'divine-intervention': {
    facets: [{ kind: 'resource', code: 'DIVINE_INTERVENTION', recovery: 'LONG' }],
  },
  'eldritch-invocation-thief-of-five-fates': {
    facets: [{ kind: 'resource', code: 'THIEF_OF_FIVE_FATES', recovery: 'LONG' }],
  },
  'eldritch-invocation-mire-the-mind': {
    facets: [{ kind: 'resource', code: 'MIRE_THE_MIND', recovery: 'LONG' }],
  },
  'eldritch-invocation-sign-of-ill-omen': {
    facets: [{ kind: 'resource', code: 'SIGN_OF_ILL_OMEN', recovery: 'LONG' }],
  },
  'eldritch-invocation-bewitching-whispers': {
    facets: [{ kind: 'resource', code: 'BEWITCHING_WHISPERS', recovery: 'LONG' }],
  },
  'eldritch-invocation-dreadful-word': {
    facets: [{ kind: 'resource', code: 'DREADFUL_WORD', recovery: 'LONG' }],
  },
  'eldritch-invocation-sculptor-of-flesh': {
    facets: [{ kind: 'resource', code: 'SCULPTOR_OF_FLESH', recovery: 'LONG' }],
  },
  'eldritch-invocation-minions-of-chaos': {
    facets: [{ kind: 'resource', code: 'MINIONS_OF_CHAOS', recovery: 'LONG' }],
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
  // По жидкости в свой ход без доспеха и щита; остановиться на ней нельзя.
  'unarmored-movement-2': {
    facets: [{ kind: 'rule', rule: 'wallAndWaterWalk', when: ['noArmor', 'noShield', 'ownTurn'] }],
  },
  // Немагическая трудность бесплатна; против растений-помех — преимущество.
  'druid-lands-stride': {
    facets: [
      { kind: 'rule', rule: 'ignoreNonmagicalDifficultTerrain' },
      { kind: 'advantage', roll: 'save', mode: 'ADVANTAGE', when: ['vsImpedingPlants'] },
    ],
  },
  'ranger-lands-stride': {
    facets: [
      { kind: 'rule', rule: 'ignoreNonmagicalDifficultTerrain' },
      { kind: 'advantage', roll: 'save', mode: 'ADVANTAGE', when: ['vsImpedingPlants'] },
    ],
  },
  'eldritch-invocation-devils-sight': {
    facets: [{ kind: 'sense', sense: 'devilsSight', rangeFeet: 120 }],
  },
  // Бросать действие можно и на свету — служба ответит NOT_IN_DARKNESS.
  'eldritch-invocation-one-with-shadows': {
    facets: [
      {
        kind: 'action',
        ability: 'ONE_WITH_SHADOWS',
        economy: 'ACTION',
        applies: 'ONE_WITH_SHADOWS',
        input: { target: 'NONE' },
      },
    ],
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

  // Пометки: механики в бою нет, и запись говорит почему (§3.3 дизайна, §4 плана, §17 разбора умений).
  // Выбор: механику несёт выбранное (стиль, подкласс, предок), а не сама строка выбора.
  'barbarian-ability-score-improvement-1': CHOICE,
  'barbarian-ability-score-improvement-2': CHOICE,
  'bard-ability-score-improvement-1': CHOICE,
  'bard-ability-score-improvement-2': CHOICE,
  'cleric-ability-score-improvement-1': CHOICE,
  'cleric-ability-score-improvement-2': CHOICE,
  'druid-ability-score-improvement-1': CHOICE,
  'druid-ability-score-improvement-2': CHOICE,
  'fighter-ability-score-improvement-1': CHOICE,
  'fighter-ability-score-improvement-2': CHOICE,
  'fighter-ability-score-improvement-3': CHOICE,
  'monk-ability-score-improvement-1': CHOICE,
  'monk-ability-score-improvement-2': CHOICE,
  'paladin-ability-score-improvement-1': CHOICE,
  'paladin-ability-score-improvement-2': CHOICE,
  'ranger-ability-score-improvement-1': CHOICE,
  'ranger-ability-score-improvement-2': CHOICE,
  'rogue-ability-score-improvement-1': CHOICE,
  'rogue-ability-score-improvement-2': CHOICE,
  'rogue-ability-score-improvement-3': CHOICE,
  'sorcerer-ability-score-improvement-1': CHOICE,
  'sorcerer-ability-score-improvement-2': CHOICE,
  'warlock-ability-score-improvement-1': CHOICE,
  'warlock-ability-score-improvement-2': CHOICE,
  'wizard-ability-score-improvement-1': CHOICE,
  'wizard-ability-score-improvement-2': CHOICE,
  'primal-path': CHOICE,
  'bard-college': CHOICE,
  'divine-domain': CHOICE,
  'druid-circle': CHOICE,
  'circle-of-the-land': CHOICE,
  'martial-archetype': CHOICE,
  'monastic-tradition': CHOICE,
  'sacred-oath': CHOICE,
  'ranger-archetype': CHOICE,
  'roguish-archetype': CHOICE,
  'sorcerous-origin': CHOICE,
  'dragon-ancestor': CHOICE,
  'otherworldly-patron': CHOICE,
  'arcane-tradition': CHOICE,
  'fighter-fighting-style': CHOICE,
  'paladin-fighting-style': CHOICE,
  'ranger-fighting-style': CHOICE,
  'additional-fighting-style': CHOICE,
  'metamagic-1': CHOICE,
  'metamagic-2': CHOICE,
  'eldritch-invocations': CHOICE,
  'pact-boon': CHOICE,
  'hunters-prey': CHOICE,
  'defensive-tactics': CHOICE,
  'circle-of-the-land-arctic': CHOICE,
  'circle-of-the-land-coast': CHOICE,
  'circle-of-the-land-desert': CHOICE,
  'circle-of-the-land-forest': CHOICE,
  'circle-of-the-land-grassland': CHOICE,
  'circle-of-the-land-mountain': CHOICE,
  'circle-of-the-land-swamp': CHOICE,
  'dragon-ancestor-black---acid-damage': CHOICE,
  'dragon-ancestor-blue---lightning-damage': CHOICE,
  'dragon-ancestor-brass---fire-damage': CHOICE,
  'dragon-ancestor-bronze---lightning-damage': CHOICE,
  'dragon-ancestor-copper---acid-damage': CHOICE,
  'dragon-ancestor-gold---fire-damage': CHOICE,
  'dragon-ancestor-green---poison-damage': CHOICE,
  'dragon-ancestor-red---fire-damage': CHOICE,
  'dragon-ancestor-silver---cold-damage': CHOICE,
  'dragon-ancestor-white---cold-damage': CHOICE,
  // Ступеньки: число растёт по таблице progression.ts, механику несёт первая ступень.
  'bardic-inspiration-d8': { tableDriven: 'bardic-inspiration-d6' },
  'bardic-inspiration-d10': { tableDriven: 'bardic-inspiration-d6' },
  'song-of-rest-d8': { tableDriven: 'song-of-rest-d6' },
  'channel-divinity-2-rest': { tableDriven: 'channel-divinity-1-rest' },
  'destroy-undead-cr-1-or-below': { tableDriven: 'destroy-undead-cr-1-2-or-below' },
  'wild-shape-cr-1-2-or-below-no-flying-speed': {
    tableDriven: 'wild-shape-cr-1-4-or-below-no-flying-or-swim-speed',
  },
  'wild-shape-cr-1-or-below': { tableDriven: 'wild-shape-cr-1-4-or-below-no-flying-or-swim-speed' },
  // Действуют через лист: ячейки, известные заклинания, владения, компетентность.
  'spellcasting-bard': { sheet: 'spellcasting' },
  'spellcasting-cleric': { sheet: 'spellcasting' },
  'spellcasting-druid': { sheet: 'spellcasting' },
  'spellcasting-paladin': { sheet: 'spellcasting' },
  'spellcasting-ranger': { sheet: 'spellcasting' },
  'spellcasting-sorcerer': { sheet: 'spellcasting' },
  'spellcasting-wizard': { sheet: 'spellcasting' },
  'pact-magic': { sheet: 'spellcasting' },
  'domain-spells-1': { sheet: 'subclassSpells' },
  'domain-spells-2': { sheet: 'subclassSpells' },
  'domain-spells-3': { sheet: 'subclassSpells' },
  'domain-spells-4': { sheet: 'subclassSpells' },
  'domain-spells-5': { sheet: 'subclassSpells' },
  'circle-spells-1': { sheet: 'subclassSpells' },
  'circle-spells-2': { sheet: 'subclassSpells' },
  'circle-spells-3': { sheet: 'subclassSpells' },
  'circle-spells-4': { sheet: 'subclassSpells' },
  'oath-spells': { sheet: 'subclassSpells' },
  'bard-expertise-1': { sheet: 'expertise' },
  'bard-expertise-2': { sheet: 'expertise' },
  'rogue-expertise-1': { sheet: 'expertise' },
  'rogue-expertise-2': { sheet: 'expertise' },
  'bonus-proficiencies': { sheet: 'proficiencies' },
  'bonus-proficiency': { sheet: 'proficiencies' },
  'additional-magical-secrets': { sheet: 'spells' },
  'magical-secrets-1': { sheet: 'spells' },
  'bonus-cantrip': { sheet: 'spells' },
  'pact-of-the-tome': { sheet: 'spells' },
  'font-of-inspiration': { sheet: 'resourceRecovery' },
  // Ресурсы из таблиц классов: максимум и отдых — в `progression.ts`.
  ki: { sheet: 'resources' },
  'font-of-magic': { sheet: 'resources' },
  'channel-divinity-1-rest': { sheet: 'resources' },
  'channel-divinity': { sheet: 'resources' },
  'eldritch-invocation-beguiling-influence': { sheet: 'proficiencies' },
  // Вне боя (§1 дизайна: исследование и быт — вне программы).
  druidic: { outOfCombat: 'тайный язык друидов' },
  'thieves-cant': { outOfCombat: 'воровской жаргон' },
  'divine-sense': { outOfCombat: 'обнаружение — разведка' },
  'primeval-awareness': { outOfCombat: 'обнаружение — разведка' },
  'natural-explorer-1-terrain-type': { outOfCombat: 'путешествие' },
  'natural-explorer-2-terrain-types': { outOfCombat: 'путешествие' },
  'natural-explorer-3-terrain-types': { outOfCombat: 'путешествие' },
  'favored-enemy-1-type': { outOfCombat: 'выслеживание и знания' },
  'favored-enemy-2-types': { outOfCombat: 'выслеживание и знания' },
  'second-story-work': { outOfCombat: 'лазание и прыжки — падений и высоты на карте нет' },
  // Окно падения (волна 5): урон − 5 × уровень монаха; ноль — не лежит.
  'slow-fall': {
    facets: [
      {
        kind: 'reaction',
        ability: 'SLOW_FALL',
        event: ['falling'],
        economy: 'REACTION',
        who: 'self',
        effect: { reduceFallDamage: { times: 5, of: 'level' } },
      },
    ],
  },
  'hide-in-plain-sight': { outOfCombat: 'маскировка минутой подготовки' },
  'evocation-savant': { outOfCombat: 'цена переписи в книгу' },
  'eldritch-invocation-eyes-of-the-rune-keeper': { outOfCombat: 'чтение' },
  'eldritch-invocation-book-of-ancient-secrets': {
    outOfCombat: 'только ритуалы — 10 минут и дольше',
  },
  'eldritch-invocation-voice-of-the-chain-master': { outOfCombat: 'разведка через фамильяра' },
};
