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
  'slow-fall': { outOfCombat: 'падений на карте нет; с толчком с обрыва — реакция волны 4' },
  'hide-in-plain-sight': { outOfCombat: 'маскировка минутой подготовки' },
  'evocation-savant': { outOfCombat: 'цена переписи в книгу' },
  'eldritch-invocation-eyes-of-the-rune-keeper': { outOfCombat: 'чтение' },
  'eldritch-invocation-book-of-ancient-secrets': {
    outOfCombat: 'только ритуалы — 10 минут и дольше',
  },
  'eldritch-invocation-voice-of-the-chain-master': { outOfCombat: 'разведка через фамильяра' },
};
