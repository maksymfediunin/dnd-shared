export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REUSED: 'TOKEN_REUSED',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  REFERENCE_ENTITY_NOT_FOUND: 'REFERENCE_ENTITY_NOT_FOUND',
  REFERENCE_ENTRY_NOT_FOUND: 'REFERENCE_ENTRY_NOT_FOUND',
  USER_BLOCKED: 'USER_BLOCKED',
  CANNOT_MODIFY_SELF: 'CANNOT_MODIFY_SELF',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CHARACTER_NOT_FOUND: 'CHARACTER_NOT_FOUND',
  /**
   * Удалить персонажа нельзя, пока он сидит в незавершённой комнате: на
   * карте осталась бы фишка без листа. Сначала выйти из комнаты.
   */
  CHARACTER_IN_ROOM: 'CHARACTER_IN_ROOM',
  INVALID_ABILITY_SCORES: 'INVALID_ABILITY_SCORES',
  INVALID_CHOICE: 'INVALID_CHOICE',
  LEVEL_UP_NOT_AVAILABLE: 'LEVEL_UP_NOT_AVAILABLE',
  MAX_LEVEL_REACHED: 'MAX_LEVEL_REACHED',
  /**
   * Уровень уже поднят другим запросом — двойной клик или вторая
   * вкладка. Своим кодом, а не INVALID_CHOICE: выбор тут ни при чём,
   * лист надо перечитать.
   */
  LEVEL_UP_CONFLICT: 'LEVEL_UP_CONFLICT',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_CODE_INVALID: 'ROOM_CODE_INVALID',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_ACCESS_BLOCKED: 'ROOM_ACCESS_BLOCKED',
  ROOM_NOT_ACCEPTING: 'ROOM_NOT_ACCEPTING',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  NOT_ROOM_MEMBER: 'NOT_ROOM_MEMBER',
  NOT_GAME_MASTER: 'NOT_GAME_MASTER',
  CANNOT_LEAVE_AS_GM: 'CANNOT_LEAVE_AS_GM',
  DICE_INVALID: 'DICE_INVALID',
  ADVANTAGE_NOT_APPLICABLE: 'ADVANTAGE_NOT_APPLICABLE',
  MESSAGE_TARGET_NOT_MEMBER: 'MESSAGE_TARGET_NOT_MEMBER',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  CHARACTER_LEVEL_OUT_OF_RANGE: 'CHARACTER_LEVEL_OUT_OF_RANGE',
  MAP_NOT_FOUND: 'MAP_NOT_FOUND',
  MAP_CELL_OCCUPIED: 'MAP_CELL_OCCUPIED',
  MAP_CELL_OUT_OF_BOUNDS: 'MAP_CELL_OUT_OF_BOUNDS',
  ENCOUNTER_NOT_FOUND: 'ENCOUNTER_NOT_FOUND',
  ENCOUNTER_ALREADY_ACTIVE: 'ENCOUNTER_ALREADY_ACTIVE',
  ENCOUNTER_NOT_ACTIVE: 'ENCOUNTER_NOT_ACTIVE',
  PARTICIPANT_NOT_FOUND: 'PARTICIPANT_NOT_FOUND',
  COMBAT_NOT_STARTED: 'COMBAT_NOT_STARTED',
  COMBAT_ALREADY_STARTED: 'COMBAT_ALREADY_STARTED',
  COMBAT_NO_PARTICIPANTS: 'COMBAT_NO_PARTICIPANTS',
  /** Атака, заклинание или умение в упрощённом бою — их ведут вживую. */
  COMBAT_SIMPLIFIED: 'COMBAT_SIMPLIFIED',
  /** Тело запроса больше предела сервера — например, слой рисунков. */
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  ACTION_ALREADY_USED: 'ACTION_ALREADY_USED',
  NOT_ENOUGH_MOVEMENT: 'NOT_ENOUGH_MOVEMENT',
  ATTACK_ALREADY_PENDING: 'ATTACK_ALREADY_PENDING',
  ATTACK_NOT_PENDING: 'ATTACK_NOT_PENDING',
  TARGET_OUT_OF_REACH: 'TARGET_OUT_OF_REACH',
  PARTICIPANT_IS_DOWN: 'PARTICIPANT_IS_DOWN',
  INITIATIVE_ALREADY_ROLLED: 'INITIATIVE_ALREADY_ROLLED',
  DEATH_SAVE_NOT_APPLICABLE: 'DEATH_SAVE_NOT_APPLICABLE',
  /** Спасбросок от смерти в этот ход уже брошен — он один за ход (PHB). */
  DEATH_SAVE_ALREADY_ROLLED: 'DEATH_SAVE_ALREADY_ROLLED',
  /** Бьёт тот, кому состояние не даёт действовать. */
  PARTICIPANT_CANNOT_ACT: 'PARTICIPANT_CANNOT_ACT',
  /** Скорость в ноль: схвачен, скован, парализован. */
  PARTICIPANT_CANNOT_MOVE: 'PARTICIPANT_CANNOT_MOVE',
  /**
   * Шаг приближает к источнику испуга. Свой код, а не общий отказ:
   * игрок должен прочитать причину, а не гадать, почему клетка не
   * зелёная.
   */
  MOVE_TOWARDS_FEAR_SOURCE: 'MOVE_TOWARDS_FEAR_SOURCE',
  /** Заклинания нет среди подготовленных этим персонажем. */
  SPELL_NOT_PREPARED: 'SPELL_NOT_PREPARED',
  /** Ячеек этого круга не осталось. */
  NO_SPELL_SLOT: 'NO_SPELL_SLOT',
  /** Ресурса класса (ци, ярость, второе дыхание) не осталось. */
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  /** Встать с земли нельзя: «Жуткий смех» держит лежачим. */
  CANNOT_STAND: 'CANNOT_STAND',
  /** Ресурс заперт на несколько долгих отдыхов («Божественное вмешательство» — 7 дней). */
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  /** Возвращаемые ячейки дороже бюджета восстановления или выше пятого круга. */
  RECOVERY_BUDGET_EXCEEDED: 'RECOVERY_BUDGET_EXCEEDED',
  /** Бонусное действие в этом ходу уже потрачено. */
  BONUS_ACTION_ALREADY_USED: 'BONUS_ACTION_ALREADY_USED',
  /** Умения у персонажа нет или сейчас его не применить. */
  ABILITY_NOT_AVAILABLE: 'ABILITY_NOT_AVAILABLE',
  /** Ячейка круга ниже, чем сам круг заклинания. */
  SPELL_SLOT_TOO_LOW: 'SPELL_SLOT_TOO_LOW',
  SPELL_OUT_OF_RANGE: 'SPELL_OUT_OF_RANGE',
  /**
   * Заклинание бьёт по фишке, а прислали клетку, или наоборот. Свой
   * код, а не общий отказ: игрок должен прочитать, чего именно ждут, —
   * ровно так же подписан и шаг к источнику испуга.
   */
  SPELL_NEEDS_TARGET: 'SPELL_NEEDS_TARGET',
  /**
   * Время сотворения ни действие, ни бонусное действие: реакцию и
   * минуты бой не проводит (`combatCastingTime`).
   */
  SPELL_NOT_IN_COMBAT: 'SPELL_NOT_IN_COMBAT',
  /**
   * Правило PHB: после заклинания бонусным действием в этот ход — только
   * заговор за действие, и наоборот.
   */
  SPELL_BONUS_ACTION_RULE: 'SPELL_BONUS_ACTION_RULE',
  /** Целей больше, чем даёт заклинание на этом круге («Благословение» — троих). */
  SPELL_TOO_MANY_TARGETS: 'SPELL_TOO_MANY_TARGETS',
  /** Цель не та: «Щит» — только на себя, «Удержание» — не на себя. */
  SPELL_TARGET_NOT_ALLOWED: 'SPELL_TARGET_NOT_ALLOWED',
  /**
   * Цели дальше друг от друга, чем позволяет заклинание: «Брызги кислоты»
   * — в 5 футах, «Удержание» — в 30, «Цепная молния» — в 30 от первой.
   */
  SPELL_TARGETS_TOO_FAR: 'SPELL_TARGETS_TOO_FAR',
  /** Клетка переноса («Туманный шаг») занята или дальше дистанции. */
  SPELL_DESTINATION_BLOCKED: 'SPELL_DESTINATION_BLOCKED',
  /**
   * Выбор при сотворении не из того, что даёт заклинание: состояние вне
   * списка «Восстановления», доля «Массового исцеления» сверх запаса или
   * для фишки, которая не цель.
   */
  SPELL_CHOICE_NOT_ALLOWED: 'SPELL_CHOICE_NOT_ALLOWED',
  /** Повтор действием («Огненный клинок») без заклинания, которое его даёт. */
  SPELL_FOLLOW_UP_NOT_AVAILABLE: 'SPELL_FOLLOW_UP_NOT_AVAILABLE',
  /** Реакция до начала своего хода уже потрачена. */
  REACTION_ALREADY_USED: 'REACTION_ALREADY_USED',
  /** Переносить нечего: нет концентрации на метке или её цель ещё на ногах. */
  HUNTERS_MARK_NOT_MOVABLE: 'HUNTERS_MARK_NOT_MOVABLE',
  /** Стабилизировать можно только того, кто умирает: на нуле хитов, жив и не стабилен. */
  TARGET_NOT_DYING: 'TARGET_NOT_DYING',
  OBSTACLE_NOT_FOUND: 'OBSTACLE_NOT_FOUND',
  /**
   * Бонусная атака, шквал — только после совершённого действия «Атака» в
   * этом ходу; после заклинания действием их нет.
   */
  ATTACK_ACTION_REQUIRED: 'ATTACK_ACTION_REQUIRED',
  /** Кость вдохновения у цели уже есть — второй не бывает. */
  ALREADY_INSPIRED: 'ALREADY_INSPIRED',
  /** Цель не годится этому действию: себя, нежить, не в пяти футах. */
  TARGET_INVALID: 'TARGET_INVALID',
  /** Цель неуязвима к этому умению этого источника (устрашение после успеха). */
  TARGET_IMMUNE: 'TARGET_IMMUNE',
  /** Сохранение жизни поднимает не выше половины максимума хитов. */
  HEAL_CAP_EXCEEDED: 'HEAL_CAP_EXCEEDED',
  /** Распределено больше общего запаса (сохранение жизни). */
  POOL_EXCEEDED: 'POOL_EXCEEDED',
  /** В ярости не колдуют. */
  CANNOT_CAST_WHILE_RAGING: 'CANNOT_CAST_WHILE_RAGING',
  /** Метамагия — одна на заклинание (кроме усиленной). */
  ONE_METAMAGIC_PER_SPELL: 'ONE_METAMAGIC_PER_SPELL',
  /** Метамагия к этому заклинанию не подходит. */
  METAMAGIC_NOT_ELIGIBLE: 'METAMAGIC_NOT_ELIGIBLE',
  /** Захват и толчок — не больше чем на размер крупнее себя. */
  TARGET_TOO_LARGE: 'TARGET_TOO_LARGE',
  /** Захват требует свободной руки. */
  NO_FREE_HAND: 'NO_FREE_HAND',
  /** Застигнут врасплох — в первом ходу ни действий, ни шага. */
  SURPRISED: 'SURPRISED',
  /** Открыто окно реакции: сцена ждёт ответов и не меняется (план волны 4, №9). */
  REACTION_WINDOW_OPEN: 'REACTION_WINDOW_OPEN',
  /** Окно, на которое отвечают, уже закрыто или закрывается. */
  REACTION_WINDOW_CLOSED: 'REACTION_WINDOW_CLOSED',
  /** Такого ответа этому участнику окно не предлагало. */
  REACTION_NOT_OFFERED: 'REACTION_NOT_OFFERED',
  /** Участник в этом окне уже ответил. */
  REACTION_ALREADY_ANSWERED: 'REACTION_ALREADY_ANSWERED',
  /** Сцена изменилась, пока действие ждало окна реакции, — повторить действие. */
  SCENE_CHANGED: 'SCENE_CHANGED',
  /** Цель неуязвима к этому состоянию (чистота тела, ауры паладина). */
  CONDITION_IMMUNE: 'CONDITION_IMMUNE',
  /** Спасбросок от смерти — в начале своего хода на нуле хитов, а не в ход падения. */
  DEATH_SAVE_NOT_TURN_START: 'DEATH_SAVE_NOT_TURN_START',
  /** Заклинатель не видит цель или точку («существо, которое вы видите», волна 5). */
  TARGET_NOT_SEEN: 'TARGET_NOT_SEEN',
  /** У цели полное укрытие — к ней нет чистого пути. */
  TARGET_TOTAL_COVER: 'TARGET_TOTAL_COVER',
  /** Спрятаться не от кого: каждый враг видит ясно и укрытия от него нет. */
  CANNOT_HIDE_HERE: 'CANNOT_HIDE_HERE',
  /** «Единство с тенями» — только в тусклом свете или темноте. */
  NOT_IN_DARKNESS: 'NOT_IN_DARKNESS',
  /** Закончить перемещение на жидкости нельзя (движение без доспехов). */
  CANNOT_END_ON_LIQUID: 'CANNOT_END_ON_LIQUID',
  /** Внутри «Тишины» заклинание со словесным компонентом не сотворить. */
  SPELL_SILENCED: 'SPELL_SILENCED',
  /** Подняться в воздух нечем: нет скорости полёта и левитации. */
  CANNOT_FLY: 'CANNOT_FLY',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
