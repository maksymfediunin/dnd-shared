import type { EffectCode, EffectMechanic } from './types.js';

/**
 * Эффекты со сроком на участнике (`ParticipantEffect.code`) и что они дают, пока висят.
 *
 * Эффекты со сроком «до начала/конца хода такого-то» (`until`) держатся
 * механизмом `data.until`, как у заклинаний; их `expires` — страховка
 * `COMBAT_END`, чтобы ни один не пережил бой.
 */
export const EFFECT_MECHANICS: Readonly<Record<EffectCode, EffectMechanic>> = {
  /**
   * Ярость (SRD): все выгоды — «if you aren't wearing heavy armor».
   * Колдовать и держать концентрацию нельзя — в доспехе тоже.
   */
  RAGE: {
    facets: [
      {
        kind: 'modifier',
        target: 'damage',
        amount: { table: 'rageDamage' },
        source: 'rage',
        when: ['meleeWeapon', 'strengthAttack', 'notHeavyArmor'],
      },
      {
        kind: 'defense',
        resistance: ['bludgeoning', 'piercing', 'slashing'],
        when: ['notHeavyArmor'],
      },
      {
        kind: 'advantage',
        roll: 'save',
        ability: 'strength',
        mode: 'ADVANTAGE',
        when: ['notHeavyArmor'],
      },
      {
        kind: 'advantage',
        roll: 'check',
        ability: 'strength',
        mode: 'ADVANTAGE',
        when: ['notHeavyArmor'],
      },
      { kind: 'rule', rule: 'noSpellcasting' },
    ],
    expires: 'COMBAT_END',
    rounds: 10,
    endsWhenIdle: true,
    endsOnUnconscious: true,
  },
  /**
   * Бешенство берсерка: атака бонусным действием в следующих ходах
   * (список действий, путь `FRENZY`); кончается с яростью — и тогда
   * степень истощения, как бы ярость ни кончилась (SRD «when your rage ends»).
   */
  FRENZY: {
    facets: [],
    expires: 'COMBAT_END',
    endsWithEffect: 'RAGE',
    onEnd: 'exhaustion',
  },
  /** Безрассудная атака: до начала следующего своего хода. */
  RECKLESS: {
    facets: [
      {
        kind: 'advantage',
        roll: 'attack',
        mode: 'ADVANTAGE',
        when: ['ownTurn', 'meleeWeapon', 'strengthAttack'],
      },
      { kind: 'advantage', roll: 'incoming', mode: 'ADVANTAGE' },
    ],
    expires: 'OWN_TURN_START',
  },
  /**
   * Уклонение (и «Терпеливая оборона»). «Пропадает, если недееспособен
   * или скорость 0» — проверяется при чтении (`bearerAlert`), а не
   * снятием во всех путях наложения состояний.
   * ponytail: снятый захват «оживляет» уклонение до начала хода носителя;
   * снятие по событию — волна 4 вместе с фазами окна.
   */
  DODGING: {
    facets: [
      {
        kind: 'advantage',
        roll: 'incoming',
        mode: 'DISADVANTAGE',
        when: ['attackerSeen', 'bearerAlert'],
      },
      {
        kind: 'advantage',
        roll: 'save',
        ability: 'dexterity',
        mode: 'ADVANTAGE',
        when: ['bearerAlert'],
      },
    ],
    expires: 'OWN_TURN_START',
  },
  /** Отход: перемещение до конца хода не провоцирует атак при отходе. */
  DISENGAGED: { facets: [], expires: 'OWN_TURN_END' },
  /** Помощь в атаке: первая атака союзника по названной цели — с преимуществом. */
  HELPED: {
    facets: [
      { kind: 'advantage', roll: 'attack', mode: 'ADVANTAGE', when: ['effectTargetIsTarget'] },
    ],
    expires: 'COMBAT_END',
    until: { who: 'SOURCE', at: 'START' },
    spentBy: 'firstAttackVsTarget',
  },
  /**
   * Помощь в проверке: навык — в данных (`data.skill`), и преимущество
   * даёт проверка навыка, а не грань: навык одного эффекта — не код записи.
   */
  HELPED_CHECK: {
    facets: [],
    expires: 'COMBAT_END',
    until: { who: 'SOURCE', at: 'START' },
    spentBy: 'check',
  },
  /**
   * Засада: от кого спрятался — `data.hiddenFrom`. Следствия даёт общее
   * правило обзора («незримый атакующий»), а не грани: преимущество,
   * помеха и скрытая атака выходят сами.
   */
  HIDDEN: { facets: [], expires: 'COMBAT_END', spentBy: 'ownAttack' },
  /** Подготовленная атака: оружие и цель — в данных; реакцией в чужой ход. */
  READIED: { facets: [], expires: 'OWN_TURN_START' },
  /**
   * Кость вдохновения (`data.die`): свой ответ в окне фазы броска — к
   * атаке, проверке или спасброску; ответ снимает эффект. Вне боя кость не живёт.
   */
  INSPIRED: {
    facets: [
      {
        kind: 'reaction',
        ability: 'INSPIRATION_DIE',
        event: ['attackRolled', 'checkRolled', 'saveRolled'],
        economy: 'FREE',
        who: 'self',
        effect: { addDie: 'effect.die' },
      },
    ],
    expires: 'COMBAT_END',
    rounds: 100,
  },
  /** Изгнание нежити и нечестивых: минута или до любого урона, без реакций. */
  TURNED: {
    facets: [{ kind: 'rule', rule: 'noReactions' }],
    expires: 'COMBAT_END',
    rounds: 10,
    endsOnDamage: true,
  },
  /** Устрашающее присутствие: испуган наложившим до конца его следующего хода. */
  INTIMIDATED: {
    facets: [],
    expires: 'COMBAT_END',
    until: { who: 'SOURCE', at: 'END' },
    condition: 'frightened',
  },
  /** Успех спасброска от устрашения — иммунитет до конца сцены (24 часа длиннее фишки). */
  INTIMIDATE_IMMUNE: { facets: [], expires: 'MANUAL' },
  /** Священное оружие: Харизма (не меньше +1) к атакам выбранным оружием (`data.itemId`). */
  SACRED_WEAPON: {
    facets: [
      {
        kind: 'modifier',
        target: 'attack',
        amount: { ability: 'charisma', min: 1 },
        source: 'sacredWeapon',
        when: ['effectItemIsWeapon'],
      },
      // Оружие светит: 20 футов яркого и 20 тусклого (SRD «emits bright light»).
      { kind: 'light', bright: 20, dim: 20 },
    ],
    expires: 'COMBAT_END',
    rounds: 10,
    endsOnUnconscious: true,
  },
  /** Открытая ладонь: без реакций до конца следующего хода монаха. */
  NO_REACTIONS: {
    facets: [{ kind: 'rule', rule: 'noReactions' }],
    expires: 'COMBAT_END',
    until: { who: 'SOURCE', at: 'END' },
  },
  /** Ошеломляющий удар: ошеломлён до конца следующего хода монаха. */
  STUNNING_STRIKE: {
    facets: [],
    expires: 'COMBAT_END',
    until: { who: 'SOURCE', at: 'END' },
    condition: 'stunned',
  },
  /**
   * Защита от мультиатаки: +4 к КД против того, кто попал (`data.attackerId`),
   * до конца текущего хода. Атакующего сверяет сборка носителя:
   * эффект с чужим `attackerId` в него не входит.
   */
  MULTIATTACK_DEFENSE: {
    facets: [{ kind: 'modifier', target: 'ac', amount: 4 }],
    expires: 'TURN_END',
  },
  /**
   * Противодействие очарованию: до конца следующего хода барда он и
   * союзники в 30 футах, кто его слышит, — с преимуществом против испуга
   * и очарования. Тишина — волна 5.
   */
  COUNTERCHARM: {
    facets: [
      {
        kind: 'zone',
        anchor: 'bearer',
        radiusFeet: 30,
        who: 'selfAndAllies',
        recipient: ['canHearBearer'],
        grants: [
          {
            kind: 'advantage',
            roll: 'save',
            mode: 'ADVANTAGE',
            when: [{ anyOf: [{ vsCondition: 'frightened' }, { vsCondition: 'charmed' }] }],
          },
        ],
      },
    ],
    expires: 'COMBAT_END',
    until: { who: 'BEARER', at: 'END' },
    endsOnIncapacitated: true,
  },
  /**
   * Единство с тенями: невидим, пока не двинется, не совершит действие или
   * реакцию. Бонусное действие не снимает.
   */
  ONE_WITH_SHADOWS: {
    facets: [],
    expires: 'COMBAT_END',
    condition: 'invisible',
    endsOnMove: true,
    endsOnAction: true,
    endsOnReaction: true,
  },
  /** Стихийное сродство: сопротивление виду урона предка на час — переживает бой. */
  ELEMENTAL_AFFINITY: {
    facets: [{ kind: 'defense', resistance: ['SORCERER_ANCESTRY'] }],
    expires: 'MANUAL',
    rounds: 600,
  },
};
