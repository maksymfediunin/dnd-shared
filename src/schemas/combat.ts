import { z } from 'zod';
import {
  ABILITY_CODES,
  abilityCodeSchema,
  characterResourceCodeSchema,
} from '../enums/character.js';
import {
  attackOutcomeSchema,
  CONTINUATION_OPS,
  concentrationOutcomeSchema,
  deathSaveOutcomeSchema,
  INITIATIVE_MAX,
  INITIATIVE_MIN,
  savingThrowOutcomeSchema,
  spellUnresolvedReasonSchema,
} from '../enums/combat.js';
import {
  conditionActionSchema,
  conditionCodeSchema,
  exhaustionLevelSchema,
} from '../enums/conditions.js';
import { advantageModeSchema } from '../enums/dice.js';
import { localeSchema } from '../enums/locale.js';
import { MAP_MAX_GRID } from '../enums/map.js';
import { spellAreaShapeSchema, spellSlotLevelSchema } from '../enums/spells.js';
import { CHOSEN_ATTACK_VARIANTS } from '../rules/monster-actions.js';

/**
 * Бросок инициативы. Пустое тело — «бросаю за себя»; ведущий может
 * указать чужого участника, а `value` вписать вместо броска.
 */
export const initiativeInputSchema = z.object({
  participantId: z.uuid().optional(),
  value: z.number().int().min(INITIATIVE_MIN).max(INITIATIVE_MAX).optional(),
});
export type InitiativeInput = z.infer<typeof initiativeInputSchema>;

/**
 * Начало боя. Пустое тело — обычный бой: маршрут годами принимал POST
 * без тела, и клиент, не знающий упрощённого режима, обязан начинать
 * бой по-прежнему.
 */
export const startCombatInputSchema = z.object({
  simplified: z.boolean().default(false),
});
export type StartCombatInput = z.infer<typeof startCombatInputSchema>;

/** Каким путём атака (вход атаки, строка журнала, вид `ATTACK` списка). */
export const ATTACK_VIA = [
  'ACTION',
  'BONUS',
  'FLURRY',
  'FRENZY',
  'HORDE_BREAKER',
  'READIED',
  /** Легендарное действие монстра в конце чужого хода (волна 7а, р. 8). */
  'LEGENDARY',
] as const;
export type AttackVia = (typeof ATTACK_VIA)[number];

/** Что чародей доплачивает к сотворению: метамагия и стихийное сопротивление. */
export const CAST_OPTIONS = [
  'CAREFUL',
  'DISTANT',
  'EMPOWERED',
  'EXTENDED',
  'HEIGHTENED',
  'QUICKENED',
  'SUBTLE',
  'TWINNED',
  'ELEMENTAL_RESISTANCE',
] as const;
export type CastOption = (typeof CAST_OPTIONS)[number];

/**
 * Атака. Чем бьют — ровно одно из двух: предмет из инвентаря персонажа
 * или действие монстра из бестиария. Ни то, ни другое — нечем бить;
 * и то, и другое — служба выбирала бы за игрока.
 */
export const attackInputSchema = z
  .object({
    /**
     * Чьей фишкой бьём. Игроку эта фишка подставляется сама (его
     * единственный участник сцены); ведущему — как и в остальных
     * действиях хода — участник нужен, только если он бьёт не текущим
     * активным, а какой-то другой фишкой. Схема ролей не знает и
     * ничего не требует — обязательность по роли проверяет служба.
     */
    participantId: z.uuid().optional(),
    targetId: z.uuid(),
    weaponItemId: z.string().trim().min(1).max(64).optional(),
    monsterActionCode: z.string().trim().min(1).max(64).optional(),
    /**
     * Другой урон того же действия монстра: хват двумя руками или бросок
     * издали. Пусто — основной урон. Есть ли такой вариант у действия,
     * проверяет служба.
     */
    variant: z.enum(CHOSEN_ATTACK_VARIANTS).optional(),
    advantageMode: advantageModeSchema.default('NONE'),
    /**
     * Атака бонусным действием: удар без оружия монаха после действия
     * «Атака» или лёгкое оружие во второй руке. Право на неё проверяет
     * служба — по умениям и тому, чем бил первым.
     */
    bonusAction: z.boolean().optional(),
    /**
     * Каким путём атака: действием «Атака», бонусной второй рукой, из
     * шквала, бешенства, сокрушителем орды или подготовленной реакцией.
     * Пусто — `ACTION` (или `BONUS` при `bonusAction` — вкладки со старым
     * фронтом шлют его). Право на путь проверяет служба по списку действий.
     */
    via: z.enum(ATTACK_VIA).optional(),
    /** Безрассудная атака варвара — решается на первой атаке хода. */
    reckless: z.boolean().optional(),
    /**
     * Легендарное действие, которым бьют (`via: 'LEGENDARY'`): «Tail
     * Attack» дракона ссылается на его же «Tail». Цену из пула берёт служба.
     */
    legendaryActionCode: z.string().trim().min(1).max(64).optional(),
    /**
     * Ход властью ведущего, вне правил очереди и бюджета футов. Раньше
     * ведущий был вне правил всегда — и за столом это выходило боком:
     * монстрам футы не списывались никогда, а случайный клик в чужой ход
     * двигал фишку игрока (отчёт 19 сентября). Теперь по умолчанию
     * ведущий играет по тем же правилам, а обход — осознанный шаг,
     * видимый в журнале. Игроку поле не помогает: служба отвечает
     * FORBIDDEN.
     */
    override: z.boolean().optional(),
  })
  .refine((v) => (v.weaponItemId === undefined) !== (v.monsterActionCode === undefined), {
    path: ['weaponItemId'],
    message: 'Ударить можно либо оружием, либо действием монстра',
  });
export type AttackInput = z.infer<typeof attackInputSchema>;

/**
 * Клетка, по которой бьёт заклинание. Границы сетки этой сцены схема
 * не знает — как и `coordinateSchema` в `schemas/map.ts`, она держит
 * только «клетка, а не мусор», а попадание в настоящие размеры карты
 * проверяет служба (`MAP_CELL_OUT_OF_BOUNDS`).
 */
const targetCellSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

/**
 * Сотворение заклинания. Маршрут один на все четыре исхода, потому что
 * играющий выбирает не вид разрешения, а заклинание: какой у него
 * исход — свойство самого заклинания, известное серверу из справочника
 * (§5 дизайна).
 *
 * `slotLevel` отсутствует у кантрипа и обязателен у прочих, но
 * обязательность эту проверяет служба: круг самого заклинания схеме
 * неизвестен — он лежит в справочнике, а не в теле запроса.
 */
export const castInputSchema = z
  .object({
    /** Чьей фишкой колдуем; правила подстановки те же, что у удара. */
    participantId: z.uuid().optional(),
    /** Код заклинания справочника — тот же, что у `Spell.code`. */
    spellCode: z.string().trim().min(1).max(64),
    slotLevel: spellSlotLevelSchema.optional(),
    targetId: z.uuid().optional(),
    /**
     * Несколько фишек: «Благословение» на троих, лучи «Палящего луча»
     * по разным целям. Для лучей фишка может повторяться — два луча в
     * одну цель. Сколько можно, проверяет служба (`spellTargetLimit`,
     * `spellRayCount`): число зависит от круга ячейки.
     */
    targetIds: z.array(z.uuid()).min(1).max(20).optional(),
    cell: targetCellSchema.optional(),
    /**
     * Клетка переноса — «Туманный шаг», «Переносящая дверь»: цель —
     * сам заклинатель, а куда он встанет, задаёт эта клетка.
     */
    destination: targetCellSchema.optional(),
    /**
     * Вариант заклинания с выбором («Защита от энергии» — вид урона,
     * «Сглаз» — сон, паника, тошнота): ключ из `SpellMechanic.variants`.
     */
    variant: z.string().trim().min(1).max(32).optional(),
    /**
     * Какое состояние снять, если заклинание снимает одно на выбор
     * («Малое восстановление», «Высшее восстановление»). Пусто — первое
     * из наложенных по списку заклинания.
     */
    removeCondition: conditionCodeSchema.optional(),
    /**
     * Как поделить общий запас лечения («Массовое исцеление» — 700 на
     * всех). Пусто — поровну, не выше недостающего каждой цели. Сумму и
     * то, что доли — цели, проверяет служба: запас — свойство заклинания.
     */
    healShares: z
      .array(z.object({ participantId: z.uuid(), amount: z.number().int().min(0).max(1000) }))
      .min(1)
      .max(20)
      .optional(),
    /**
     * Повтор действием того, что заклинание уже дало («Огненный клинок»
     * — атака клинком): не сотворение, ячейки и концентрации не трогает.
     */
    followUp: z.boolean().optional(),
    /**
     * Метамагия и прочее, что чародей доплачивает очками к сотворению.
     * Годность и одну метамагию на заклинание проверяет служба.
     */
    castOptions: z.array(z.enum(CAST_OPTIONS)).max(3).optional(),
    /** Бережное заклинание: кто преуспевает в спасброске без броска. */
    carefulIds: z.array(z.uuid()).max(10).optional(),
    /** Возвышенное заклинание: чей первый спасбросок — с помехой. */
    heightenedId: z.uuid().optional(),
    /** Ход властью ведущего — та же дверь, что и у удара. */
    override: z.boolean().optional(),
  })
  .refine(
    (v) =>
      [v.targetId, v.cell, v.targetIds, v.destination].filter((aim) => aim !== undefined).length ===
      1,
    {
      path: ['targetId'],
      message: 'Заклинание бьёт либо по фишке, либо по фишкам, либо по клетке',
    },
  );
export type CastInput = z.infer<typeof castInputSchema>;

/** Перенос метки охотника на новую цель — бонусным действием, без ячейки. */
export const moveHuntersMarkInputSchema = z.object({
  participantId: z.uuid().optional(),
  targetId: z.uuid(),
  override: z.boolean().optional(),
});
export type MoveHuntersMarkInput = z.infer<typeof moveHuntersMarkInputSchema>;

/**
 * Бросок урона. `amount` — ручная поправка вместо броска, право
 * одного только ведущего: схема ролей не знает, а поле, пришедшее не
 * от ведущего, служба отклоняет `FORBIDDEN` — не бросает кости вместо
 * присланного числа и не молчит.
 */
export const damageInputSchema = z.object({
  amount: z.number().int().min(0).max(999).optional(),
  /**
   * Божественная кара паладина: круг ячейки, потраченной на попадание
   * рукопашным оружием. Пусто — кары нет.
   */
  smiteSlotLevel: spellSlotLevelSchema.optional(),
  /** Ошеломляющий удар монаха на это попадание — за очко ци. */
  stunningStrike: z.boolean().optional(),
  /** Приём открытой ладони на попадание из шквала — одно из трёх. */
  openHand: z.enum(['PRONE', 'PUSH', 'NO_REACTIONS']).optional(),
});

/** Удар без оружия — вместо id предмета в `weaponItemId`. */
export const UNARMED_STRIKE = 'unarmed';

/** Умения, которые сами по себе действие хода (а не прибавка к удару). */
export const COMBAT_ABILITIES = [
  'RAGE',
  'END_RAGE',
  'SECOND_WIND',
  'ACTION_SURGE',
  'INTIMIDATING_PRESENCE',
  'BARDIC_INSPIRATION',
  'TURN_UNDEAD',
  'TURN_THE_UNHOLY',
  'PRESERVE_LIFE',
  'LAY_ON_HANDS',
  'SACRED_WEAPON',
  'END_SACRED_WEAPON',
  'FLURRY_OF_BLOWS',
  'PATIENT_DEFENSE',
  'STEP_OF_THE_WIND',
  'WHOLENESS_OF_BODY',
  'STILLNESS_OF_MIND',
  'CREATE_SPELL_SLOT',
  'CONVERT_SPELL_SLOT',
  'PACT_WEAPON',
  'DISMISS_PACT_WEAPON',
  'BREATH_WEAPON',
  'COUNTERCHARM',
  'END_COUNTERCHARM',
  /** Действие монстра из статблока — какое, говорит `actionCode` (волна 7а). */
  'MONSTER_ACTION',
  /** Бросок перезарядки в начале хода монстра — только строка журнала. */
  'RECHARGE',
] as const;
export type CombatAbility = (typeof COMBAT_ABILITIES)[number];

/**
 * На что открывается окно реакции (разбор умений §1.1): до броска,
 * бросок, исход, урон, после, движение. Событие волны 8
 * (`castDeclared`, `damagedBy`, `readyTrigger`) заведёт волна 8 вместе
 * с первым читателем.
 */
export const WINDOW_EVENTS = [
  'attackDeclared',
  'attackRolled',
  'checkRolled',
  'saveRolled',
  'saveFailed',
  'attackHit',
  'damageRolled',
  'reducedToZero',
  'attackResolved',
  'leavesReach',
  /** Конец чужого хода — легендарная вставка ведущему (волна 7а, р. 8). */
  'turnEnded',
] as const;
export type WindowEvent = (typeof WINDOW_EVENTS)[number];

/** Ответы в окне: умения и черты из реестра плюс встроенные (атака при отходе, «Щит»). */
export const REACTION_ABILITIES = [
  'PROTECTION',
  'CUTTING_WORDS',
  'INSPIRATION_DIE',
  'INDOMITABLE',
  'DEFLECT_MISSILES',
  'GIANT_KILLER',
  'UNCANNY_DODGE',
  'DARK_ONES_OWN_LUCK',
  'RELENTLESS_ENDURANCE',
  'OPPORTUNITY_ATTACK',
  'SHIELD',
  'EMPOWERED_SPELL',
  /** Монстр с пулом ходит легендарными действиями до начала следующего хода. */
  'LEGENDARY_TURN',
  /** Проваленный спасбросок монстра — успех за счёт «Legendary Resistance». */
  'LEGENDARY_RESISTANCE',
  /** «Parry»: +N к КД против попавшей рукопашной атаки. */
  'PARRY',
] as const;
export type ReactionAbility = (typeof REACTION_ABILITIES)[number];

/** Базовые действия хода — есть у всякого персонажа (§П3 разбора умений). */
export const BASIC_ACTIONS = [
  'DASH',
  'DISENGAGE',
  'DODGE',
  'HELP',
  'HIDE',
  'READY',
  'SEARCH',
  'USE_AN_OBJECT',
  'GRAPPLE',
  'SHOVE',
  'ESCAPE',
] as const;
export type BasicAction = (typeof BASIC_ACTIONS)[number];

/**
 * Чего стоит действие хода: вид действия или ничего (всплеск действий,
 * снятие ярости). `ATTACK` — одна атака из действия «Атака» (захват,
 * толчок): у воина пятого уровня после неё остаётся вторая.
 */
export const ACTION_ECONOMY = [
  'ACTION',
  'BONUS_ACTION',
  'REACTION',
  'FREE',
  'ATTACK',
  /** Легендарное действие монстра: цена — из пула, только во вставке. */
  'LEGENDARY',
] as const;
export type ActionEconomy = (typeof ACTION_ECONOMY)[number];

/** Почему действия сейчас нет — код из ERROR_CODES: переводы `errors.*` у фронта уже есть. */
export const ACTION_UNAVAILABLE_REASONS = [
  'PARTICIPANT_IS_DOWN',
  'NOT_YOUR_TURN',
  'ACTION_ALREADY_USED',
  'BONUS_ACTION_ALREADY_USED',
  'REACTION_ALREADY_USED',
  'RESOURCE_EXHAUSTED',
  'ATTACK_ACTION_REQUIRED',
  'PARTICIPANT_CANNOT_ACT',
  'SURPRISED',
] as const;
export type ActionUnavailableReason = (typeof ACTION_UNAVAILABLE_REASONS)[number];

/**
 * Что нужно ввести, нажимая кнопку: цель, варианты, число из запаса,
 * область. Постоянное — из реестра, изменчивое (ячейки, предметы,
 * остаток запаса) — сервер дописывает к списку.
 */
const actionInputSchema = z.object({
  target: z.enum(['NONE', 'CREATURE', 'ALLY_AND_FOE', 'ALLOCATE', 'AREA']),
  rangeFeet: z.number().int().min(0).nullable(),
  options: z.array(z.string().min(1).max(64)).max(40),
  amount: z.object({ min: z.number().int().min(0), max: z.number().int().min(0) }).nullable(),
  area: z
    .object({
      shape: spellAreaShapeSchema,
      sizeFeet: z.number().int().min(5),
      /** Линия шире клетки — дыхания пяти драконов. */
      widthFeet: z.number().int().min(5).optional(),
    })
    .nullable(),
});
export type ActionInput = z.infer<typeof actionInputSchema>;

const availability = {
  economy: z.enum(ACTION_ECONOMY),
  available: z.boolean(),
  reason: z.enum(ACTION_UNAVAILABLE_REASONS).nullable(),
};

/**
 * Что участник может сделать прямо сейчас (дизайн 15 октября, §4.3):
 * фронт рисует кнопки по этому списку, а не по коду класса, — иначе
 * новое умение без правки фронта не появилось бы. Размеченное
 * объединение по `kind`: `ABILITY` — умения с ресурсом, `BASIC` —
 * базовые действия хода, `ATTACK` — пути атаки, `CAST_OPTION` — что
 * доплатить к сотворению; волна 4 добавит `REACTION`.
 */
export const availableActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ABILITY'),
    ability: z.enum(COMBAT_ABILITIES),
    featureCode: z.string().min(1).max(64),
    resource: z
      .object({
        code: characterResourceCodeSchema,
        left: z.number().int().min(0),
        max: z.number().int().min(1),
      })
      .nullable(),
    ...availability,
    // Необязательно: ответ волны 2 (без ввода) обязан проходить схему —
    // вкладки со старым API в окне выкатки.
    input: actionInputSchema.optional(),
  }),
  z.object({
    kind: z.literal('BASIC'),
    ability: z.enum(BASIC_ACTIONS),
    /** null — базовое; иначе умение, дающее бонусную версию («Хитрое действие»). */
    featureCode: z.string().min(1).max(64).nullable(),
    ...availability,
    input: actionInputSchema,
  }),
  z.object({
    kind: z.literal('ATTACK'),
    via: z.enum(ATTACK_VIA),
    featureCode: z.string().min(1).max(64).nullable(),
    ...availability,
    /** Сколько атак этим путём ещё осталось; null — не считается. */
    left: z.number().int().min(0).nullable(),
    /** Чем можно ударить этим путём; null — любым из `/attacks`. */
    weaponIds: z.array(z.string().min(1).max(64)).nullable(),
    flags: z.array(z.enum(['RECKLESS'])),
  }),
  z.object({
    kind: z.literal('CAST_OPTION'),
    option: z.enum(CAST_OPTIONS),
    featureCode: z.string().min(1).max(64),
    cost: z.union([z.number().int().min(1), z.literal('SPELL_LEVEL')]),
    exclusive: z.boolean(),
    available: z.boolean(),
    reason: z.enum(ACTION_UNAVAILABLE_REASONS).nullable(),
  }),
  /**
   * Действие монстра (волна 7а): дыхание, «Frightful Presence», легендарные.
   * Атаки монстра — путь `ATTACK`; здесь же легендарная ссылка на атаку
   * (`attackCode` — бьют маршрутом атаки с `legendaryActionCode`) и шаг
   * мультиатаки, который не атака (`multiattackStep`).
   */
  z.object({
    kind: z.literal('MONSTER_ACTION'),
    actionCode: z.string().min(1).max(120),
    ...availability,
    usage: z
      .object({
        kind: z.enum(['RECHARGE', 'PER_DAY', 'REST']),
        left: z.number().int().min(0).optional(),
        max: z.number().int().min(1).optional(),
        min: z.number().int().min(2).max(6).optional(),
        ready: z.boolean(),
      })
      .nullable(),
    legendaryCost: z.number().int().min(1).max(3).nullable(),
    multiattackStep: z.boolean(),
    attackCode: z.string().min(1).max(120).nullable(),
    input: actionInputSchema,
  }),
  /** Ответ в открытом окне реакции — есть, только пока окно открыто (план волны 4, №28). */
  z.object({
    kind: z.literal('REACTION'),
    ability: z.enum(REACTION_ABILITIES),
    windowId: z.uuid(),
    featureCode: z.string().min(1).max(64).nullable(),
    ...availability,
  }),
]);
export type AvailableAction = z.infer<typeof availableActionSchema>;

/** Вариант ответа участнику в окне. */
export const reactionOptionSchema = z.object({
  ability: z.enum(REACTION_ABILITIES),
  /** Умение или черта, давшая ответ; у встроенных (атака при отходе, «Щит») — null. */
  featureCode: z.string().min(1).max(64).nullable(),
  economy: z.enum(['REACTION', 'FREE']),
  resource: z
    .object({ code: characterResourceCodeSchema, left: z.number().int().min(0) })
    .nullable(),
  /** Отражение снарядов: можно ли заранее выбрать «метнуть, если поймаю» (есть ци). */
  canThrowBack: z.boolean().optional(),
});
export type ReactionOption = z.infer<typeof reactionOptionSchema>;

/**
 * Окно реакции в снимке сцены (план волны 4, §5.2). Исход в фазе
 * броска не показывается: открытие окна не должно выдавать провал.
 */
export const reactionWindowViewSchema = z.object({
  id: z.uuid(),
  event: z.enum(WINDOW_EVENTS),
  expiresAt: z.iso.datetime(),
  actorParticipantId: z.uuid().nullable(),
  subjectIds: z.array(z.uuid()).max(40),
  /** Фаза 1: кости и итог, без исхода и без сложности. */
  roll: z
    .object({
      results: z.array(z.number().int().min(1).max(100)).max(20),
      total: z.number().int(),
    })
    .optional(),
  /** Фаза 3: брошенный урон до вычитаний. */
  damage: z.object({ amount: z.number().int().min(0), damageType: z.string().max(40) }).optional(),
  /**
   * Окно закрывается — ответы уже не принимаются, идёт продолжение.
   * Без поля панель звала бы нажать кнопку, на которую сервер ответит 409.
   */
  closingAt: z.iso.datetime().nullable().optional(),
  responders: z
    .array(
      z.object({
        participantId: z.uuid(),
        /**
         * Варианты ответа. Игроку у монстра пусто: чем ответит монстр,
         * решает ведущий, и подсказка о его умениях — его тайна.
         */
        options: z.array(reactionOptionSchema).max(12),
        answered: z.boolean(),
        /** Свой бросок ответчика, когда бросков несколько (спасбросок по площади). */
        roll: z
          .object({
            results: z.array(z.number().int().min(1).max(100)).max(20),
            total: z.number().int(),
          })
          .optional(),
      }),
    )
    .max(40),
});
export type ReactionWindowView = z.infer<typeof reactionWindowViewSchema>;

/** Ответ в окне: вариант или `null` — «пропустить». */
export const reactionAnswerSchema = z.object({
  participantId: z.uuid(),
  ability: z.enum(REACTION_ABILITIES).nullable(),
  /** Отражение снарядов: метнуть пойманный снаряд за очко ци. */
  throwBack: z.boolean().optional(),
});
export type ReactionAnswerInput = z.infer<typeof reactionAnswerSchema>;

export const participantActionsResponseSchema = z.object({ data: z.array(availableActionSchema) });
export type ParticipantActionsResponse = z.infer<typeof participantActionsResponseSchema>;

/**
 * Действие хода — умение или базовое действие, одним маршрутом: что
 * нужно ввести, говорит запись списка (`input`), а проверяет служба.
 */
export const abilityInputSchema = z.object({
  participantId: z.uuid().optional(),
  ability: z.enum([...COMBAT_ABILITIES, ...BASIC_ACTIONS]),
  /** Та же кнопка бонусным действием: хитрое действие, быстрые руки. */
  economy: z.enum(ACTION_ECONOMY).optional(),
  targetId: z.uuid().optional(),
  /** «Помощь» в атаке — [союзник, враг]; в проверке — [союзник]. */
  targetIds: z.array(z.uuid()).min(1).max(20).optional(),
  /** Клетка прицела оружия дыхания. */
  cell: targetCellSchema.optional(),
  /** Вариант: круг ячейки, предмет, навык, состояние, способ толчка. */
  option: z.string().trim().min(1).max(64).optional(),
  /** Наложение рук — сколько хитов из запаса. */
  amount: z.number().int().min(1).max(200).optional(),
  /** `MONSTER_ACTION`: код действия монстра (`MonsterAction.code`). */
  actionCode: z.string().trim().min(1).max(120).optional(),
  /** Сохранение жизни — кому сколько. */
  allocations: z
    .array(z.object({ participantId: z.uuid(), amount: z.number().int().min(1).max(200) }))
    .min(1)
    .max(20)
    .optional(),
  override: z.boolean().optional(),
});
export type AbilityInput = z.infer<typeof abilityInputSchema>;
export type DamageInput = z.infer<typeof damageInputSchema>;

/**
 * Спасбросок от смерти. Пустое тело — за себя броском сервера;
 * ведущий может указать участника и вписать выпавшее число вместо
 * броска — тем же правом, каким он вписывает инициативу.
 */
export const deathSaveInputSchema = z.object({
  participantId: z.uuid().optional(),
  roll: z.number().int().min(1).max(20).optional(),
});
export type DeathSaveInput = z.infer<typeof deathSaveInputSchema>;

/**
 * Стабилизация упавшего соседа — проверка Мудрости (Медицина) СЛ 10
 * действием (PHB). Цель обязательна: стабилизируют не себя.
 */
export const stabilizeInputSchema = z.object({
  participantId: z.uuid().optional(),
  targetId: z.uuid(),
  override: z.boolean().optional(),
});
export type StabilizeInput = z.infer<typeof stabilizeInputSchema>;

/** Чей ход закончить; пустое тело — свой. */
export const endTurnInputSchema = z.object({
  participantId: z.uuid().optional(),
});
export type EndTurnInput = z.infer<typeof endTurnInputSchema>;

const rollShape = {
  /** Запись броска одинакова на всех языках — хранится строкой. */
  notation: z.string().min(1).max(32),
  /** Всё выпавшее, включая отброшенное при преимуществе. */
  results: z.array(z.number().int().min(1).max(100)).min(1).max(20),
};

/**
 * Что ответы в окне сделали с броском или уроном (вдохновение +4,
 * словцо −3, уклонение вдвое): кто, чем и на сколько.
 */
const adjustmentsSchema = z
  .array(
    z.object({
      ability: z.enum(REACTION_ABILITIES),
      participantId: z.uuid(),
      /** Со знаком; у деления пополам — сколько срезано. */
      value: z.number().int(),
    }),
  )
  .max(10)
  .optional();

/** Переброшенная кость («Везучий», «Несгибаемость») — что выпало до переброса. */
const rerolledSchema = z.number().int().min(1).max(20).optional();

/** Проверка навыка в строке умения: чей бросок и из чего сложен. */
const checkSchema = z.object({
  skill: z.string().min(1).max(64),
  ...rollShape,
  total: z.number().int(),
  modifierParts: z
    .array(z.object({ source: z.string().min(1).max(40), value: z.number().int() }))
    .max(10)
    .optional(),
  /** Чья проверка, если не того, кто действует (защищающийся в захвате). */
  participantId: z.uuid().optional(),
  /** Преимущество или помеха проверки (ярость — Сила, засада — бег): две кости в `results`. */
  advantageMode: advantageModeSchema.optional(),
  adjustments: adjustmentsSchema,
  rerolled: rerolledSchema,
});

/**
 * Форма `payload` зависит от вида события, поэтому это размеченное
 * объединение, а не общий мешок: запись об уроне без числа — это
 * испорченная строка журнала, и показать её нечем.
 */
/**
 * Откуда взялось слагаемое бонуса атаки или урона: характеристика,
 * мастерство или умение. Нужно столу, чтобы видеть, из чего сложено
 * «+5», а не верить числу (docs/2026-10-01-modifier-breakdown-design.md).
 */
export const MODIFIER_SOURCES = [
  ...ABILITY_CODES,
  'proficiency',
  'archery',
  'dueling',
  'rage',
  'unarmed',
  /**
   * Кость заклинания на носителе («Благословение» +1к4, «Порча» −1к4) —
   * код в `spellCode`. Им же — число в кости самого заклинания
   * («Волшебная стрела» 1к4+1): то слагаемое ничьё, кроме заклинания.
   */
  'spell',
  /** Вторая порция мастерства у навыка с компетентностью. */
  'expertise',
  /** Мастер на все руки барда: половина мастерства к проверке без владения. */
  'jackOfAllTrades',
  /** Священное оружие паладина — Харизма к атаке выбранным оружием. */
  'sacredWeapon',
  /** Аура защиты паладина — его Харизма к спасброску. */
  'aura',
  /** Стихийное сродство чародея — Харизма к одному броску урона. */
  'elementalAffinity',
  /**
   * Поправка руками к броску стола («+2 от зелья»): всё, чем присланный
   * модификатор расходится с листом (docs/2026-10-02-roll-modifier-parts-design.md).
   */
  'custom',
] as const;

export const modifierPartSchema = z.object({
  source: z.enum(MODIFIER_SOURCES),
  value: z.number().int(),
  spellCode: z.string().min(1).max(64).optional(),
});
export type ModifierPart = z.infer<typeof modifierPartSchema>;

/**
 * Необязательный: у монстра частей нет (бестиарий даёт одно число), и
 * записи журнала, сделанные до расклада, его не несут.
 */
export const modifierPartsSchema = z.array(modifierPartSchema).max(10).optional();

export const encounterEventPayloadSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('INITIATIVE'),
    ...rollShape,
    total: z.number().int(),
    /** Откуда модификатор; у ручной инициативы ведущего частей нет — никто не бросал. */
    modifierParts: modifierPartsSchema,
  }),
  z.object({
    kind: z.literal('MOVE'),
    from: z.object({ x: z.number().int(), y: z.number().int() }),
    to: z.object({ x: z.number().int(), y: z.number().int() }),
    feet: z.number().int().min(0),
    feetLeft: z.number().int().min(0),
  }),
  z.object({
    kind: z.literal('ATTACK'),
    /** Подпись, если перевода на языке зрителя нет: предмет, придуманный
     * игроком, и события, записанные до `weaponNames`. */
    weaponName: z.string().min(1).max(120),
    /**
     * Название на каждом языке — у оружия из справочника, действия
     * монстра и заклинания. Кодом, как у `CAST`, тут не обойтись: оружие
     * бывает предметом самого персонажа, а действие монстра по одному
     * коду справочник не отдаёт. Одна строка на языке по умолчанию
     * показывала англоязычному столу украинское «Рапіра».
     */
    weaponNames: z.partialRecord(localeSchema, z.string().min(1).max(120)).optional(),
    /** Скрытая атака, заработанная броском: кости к6, которые добавит урон. */
    sneakAttackDice: z.number().int().min(1).max(20).optional(),
    /** На урон этого попадания можно наложить божественную кару. */
    canSmite: z.boolean().optional(),
    /** Цель под меткой охотника бьющего: урон добавит 1к6 (на крите 2к6). */
    huntersMarkDice: z.number().int().min(1).max(2).optional(),
    /**
     * Прибавки заклинаний к урону этого удара («Божественное
     * благоволение» 1к4 излучением, «Клеймящая кара» 2к6) — каждая
     * ляжет своей строкой урона своего вида.
     */
    spellDamage: z
      .array(
        z.object({
          spellCode: z.string().min(1).max(64),
          dice: z.string().regex(/^-?\d+d\d+$/),
          type: z.string().min(1).max(40),
        }),
      )
      .max(5)
      .optional(),
    /**
     * «Святилище» на цели: атакующий провалил спасбросок Мудрости, и
     * атака потеряна — бросок попадания не делался.
     */
    sanctuary: z
      .object({
        ...rollShape,
        total: z.number().int(),
        dc: z.number().int().min(1),
      })
      .optional(),
    /** Атака заклинанием — каким. */
    spellCode: z.string().min(1).max(64).optional(),
    /** Атака при отходе — реакция, брошенная сервером сама (§6 дизайна доработок). */
    opportunity: z.boolean().optional(),
    /**
     * Удар по ответу окна реакции (волна 4): убийца великанов — реакцией,
     * метание пойманного снаряда — той же реакцией, что и отражение.
     */
    reaction: z.enum(['GIANT_KILLER', 'DEFLECT_MISSILES']).optional(),
    /** Каким путём атака (нет у строк до волны 3 — это было действие или бонус). */
    via: z.enum(ATTACK_VIA).optional(),
    /** Чем били — предмет листа или `unarmed`: вторая рука сверяется с ним. */
    weaponItemId: z.string().min(1).max(64).optional(),
    /** Безрассудная атака. */
    reckless: z.boolean().optional(),
    /** На это попадание можно наложить ошеломляющий удар. */
    canStun: z.boolean().optional(),
    /** Попадание из шквала монаха открытой ладони — выбор приёма на шаге урона. */
    openHand: z.boolean().optional(),
    /** Усиленное заклинание: сколько костей урона перебросить. */
    empoweredDice: z.number().int().min(1).max(10).optional(),
    /**
     * Источник урона для оговорок защиты (план волны 7, р. 13): оружие
     * магическое, серебрёное, адамантиновое. Нет — обычная сталь.
     */
    magical: z.literal(true).optional(),
    silvered: z.literal(true).optional(),
    adamantine: z.literal(true).optional(),
    /** Легендарное действие, которым ударили, и его цена. */
    legendaryActionCode: z.string().min(1).max(120).optional(),
    legendaryCost: z.number().int().min(1).max(3).optional(),
    /** «Parry» цели обратил попадание в промах: на сколько поднял КД. */
    parried: z.number().int().min(1).max(10).optional(),
    /** Из чего сложен бонус к попаданию; сумма частей — модификатор броска. */
    attackParts: modifierPartsSchema,
    ...rollShape,
    total: z.number().int(),
    targetArmorClass: z.number().int(),
    outcome: attackOutcomeSchema,
    isCritical: z.boolean(),
    /**
     * Чем сведён бросок: преимущество или помеха — две кости в `results`
     * не говорят, какая из них взята. Нет — честный бросок или строка до
     * волны 3.
     */
    advantageMode: advantageModeSchema.optional(),
    /** Ответы в окне, менявшие бросок (вдохновение, словцо), — уже внутри `total`. */
    adjustments: adjustmentsSchema,
    /** «Везучий»: единица, переброшенная до окна. */
    rerolled: rerolledSchema,
  }),
  z.object({
    kind: z.literal('DAMAGE'),
    /**
     * Нет вовсе у ручного урона ведущего: костей не бросали, записи
     * броска для них нет — а хранить в базе готовую подпись вроде
     * «вручную» нельзя, приложение трёхъязычное, и переводить строку,
     * которая уже легла в базу, нечем. Подпись для этого случая
     * подбирает фронт сам, по признаку пустого `results` ниже, каждый
     * на своём языке. У настоящего броска `notation` есть всегда — те
     * же кости, что и везде (`rollShape` вне этой ветки).
     */
    notation: rollShape.notation.optional(),
    /**
     * Пусто у ручного урона ведущего: числа не бросали, а вписали.
     * Настоящий бросок кладёт сюда те же кости, что и везде, с тем же
     * потолком в сто на кость — `amount`, итог, ограничен отдельно и
     * до девятисот девяноста девяти: это уже не кость, а сумма.
     */
    results: z.array(z.number().int().min(1).max(100)).max(20),
    amount: z.number().int().min(0),
    damageType: z.string().min(1).max(40),
    /** Кости сверху от умений — подписать строку журнала. */
    sneakAttackDice: z.number().int().min(1).max(20).optional(),
    smiteDice: z.number().int().min(1).max(20).optional(),
    huntersMarkDice: z.number().int().min(1).max(2).optional(),
    /**
     * Прибавки заклинаний к урону удара («Божественное благоволение»
     * 1к4 излучением) — уже внутри `amount`, каждая со своим видом:
     * сопротивление режет их порознь.
     */
    spellBonus: z
      .array(
        z.object({
          // Нет у второго вида урона атаки монстра («plus 2к6 огнём»):
          // прибавка его собственная, а не заклинания.
          spellCode: z.string().min(1).max(64).optional(),
          notation: rollShape.notation,
          results: z.array(z.number().int().min(1).max(100)).max(20),
          // Со знаком: «Уменьшение» отнимает 1к4 от удара.
          amount: z.number().int(),
          type: z.string().min(1).max(40),
        }),
      )
      .max(5)
      .optional(),
    /** Из чего сложен модификатор урона; нет у ручного урона ведущего. */
    damageParts: modifierPartsSchema,
    temporaryAbsorbed: z.number().int().min(0),
    hitPointsLeft: z.number().int().min(0),
    /** Ответы в окне урона (словцо, уклонение, отражение) — уже внутри `amount`. */
    adjustments: adjustmentsSchema,
    /** Урон не прошёл: иммунитет цели к его виду. */
    immune: z.literal(true).optional(),
  }),
  z.object({
    kind: z.literal('CAST'),
    /**
     * Код, а не название: приложение трёхъязычное, и подпись строки
     * фронт берёт из справочника на языке стола — как он делает это со
     * строкой состояния. Название оружия в `ATTACK` лежит строкой
     * потому, что оружием бывает предмет самого персонажа, которого в
     * справочнике нет вовсе.
     */
    spellCode: z.string().min(1).max(64),
    /** Пусто у кантрипа: ячейки он не тратит, а нулевого круга не бывает. */
    slotLevel: spellSlotLevelSchema.nullable(),
    /**
     * Кого накрыло. Пустой список законен: заклинание без машинной
     * механики и промах по пустой клетке целей не задели, а строка о
     * сотворении всё равно нужна — ячейка потрачена.
     */
    targetIds: z.array(z.uuid()).max(40),
    /**
     * Клетки области теми же ключами, какие складывает `cellKey` и
     * возвращает `cellsInArea`: подсветка на карте и разбор строки
     * журнала обязаны видеть одни и те же клетки. Пусто у заклинания
     * по фишке — области у него нет. Потолок — вся сетка: прежние 400
     * клеток роняли сотворение «Дневного света» и «Солнечного взрыва»
     * отказом проверки, а область больше сетки не бывает.
     */
    areaCells: z
      .array(z.string().regex(/^\d+:\d+$/))
      .max(MAP_MAX_GRID * MAP_MAX_GRID)
      .optional(),
    /**
     * Почему машинного расчёта не вышло, хотя машинные поля у
     * заклинания есть. Пусто — расчёт был (или заклинание машинных
     * полей не имеет вовсе, и это видно ещё в панели: там подпись
     * «эффект применяет ведущий»). Сами значения и их разбор — в
     * `SPELL_UNRESOLVED_REASONS`.
     */
    unresolvedReason: spellUnresolvedReasonSchema.optional(),
    /**
     * Запас хитов «Сна» — брошенное и итог. `targetIds` у него — те,
     * кто уснул, а не все в области.
     */
    pool: z
      .object({
        ...rollShape,
        total: z.number().int().min(0),
      })
      .optional(),
    /** Перенос метки охотника с упавшей цели: не сотворение, ячейки нет. */
    moved: z.boolean().optional(),
    /** Кого отбросило («Волна грома» на провале) и куда. */
    pushed: z
      .array(z.object({ participantId: z.uuid(), x: z.number().int(), y: z.number().int() }))
      .max(40)
      .optional(),
    /** Куда перенёсся заклинатель («Туманный шаг»). */
    teleported: z.object({ x: z.number().int(), y: z.number().int() }).optional(),
    /** На кого легло следствие заклинания (провалившие спасбросок, задетые атакой). */
    affectedIds: z.array(z.uuid()).max(40).optional(),
    /** Временные хиты («Ложная жизнь») — кому и сколько. */
    temporaryHitPoints: z
      .array(z.object({ participantId: z.uuid(), amount: z.number().int().min(0) }))
      .max(40)
      .optional(),
    /** Прибавка к пределу хитов («Подмога»). */
    hitPointBonus: z
      .array(z.object({ participantId: z.uuid(), amount: z.number().int().min(0) }))
      .max(40)
      .optional(),
    /** Снятые состояния («Малое восстановление»). */
    removedConditions: z
      .array(z.object({ participantId: z.uuid(), code: conditionCodeSchema }))
      .max(40)
      .optional(),
    /** Убитые словом силы. */
    killed: z.array(z.uuid()).max(40).optional(),
    /** Сотворено реакцией — вне своего хода. */
    reaction: z.boolean().optional(),
    /** «Щит» превратил незакрытое попадание в промах. */
    turnedHitIntoMiss: z.boolean().optional(),
    /**
     * «Святилище» на цели: заклинатель провалил спасбросок Мудрости, и
     * против этой цели заклинание потеряно.
     */
    sanctuaryBlocked: z.array(z.uuid()).max(40).optional(),
    /** Выбранный вариант («Защита от энергии» — какой вид урона). */
    variant: z.string().min(1).max(32).optional(),
    /** Повтор действием («Огненный клинок» — удар клинком), не сотворение: ячейки нет. */
    followUp: z.boolean().optional(),
    /**
     * На ком заклинание не подействовало без броска: «Дружба с
     * животными» на зверя с Интеллектом 4 и выше — ячейка потрачена.
     */
    spellFailedIds: z.array(z.uuid()).max(40).optional(),
  }),
  z
    .object({
      kind: z.literal('SAVE'),
      /**
       * Чей это бросок, строка говорит колонкой `targetParticipantId` —
       * той же, какой говорит о цели урон: спасбросок бросает цель, и
       * второго имени для того же участника в payload быть не должно.
       * Против чего — заклинание или умение (изгнание, устрашение): ровно
       * одно из двух.
       */
      spellCode: z.string().min(1).max(64).optional(),
      featureCode: z.string().min(1).max(64).optional(),
      /** Против чего бросали: спасбросок заклинания — не всегда ловкость. */
      ability: abilityCodeSchema,
      // Броска нет у неуязвимой цели (`immune`): записи костей у неё нет.
      notation: rollShape.notation.optional(),
      results: z.array(z.number().int().min(1).max(100)).max(20),
      total: z.number().int().optional(),
      /** Сложность заклинателя — без неё по броску нечего разбирать. */
      dc: z.number().int().min(1),
      outcome: savingThrowOutcomeSchema,
      /** База спасброска — характеристика и мастерство; уже внутри `total`. */
      modifierParts: modifierPartsSchema,
      /** Кости заклинаний на бросающем («Благословение», «Порча») — уже внутри `total`. */
      bonusParts: modifierPartsSchema,
      /** Преимущество или помеха от заклинаний («Ускорение» — Ловкость). */
      advantageMode: advantageModeSchema.optional(),
      /** Повторный спасбросок в конце хода цели: успех снимает наложенное. */
      repeat: z.boolean().optional(),
      /** Спасбросок от урона по носителю («Подчинение личности»). */
      onDamage: z.boolean().optional(),
      /** Сработала зона заклинания: вошёл, начал или кончил в ней ход. */
      trigger: z.enum(['ENTER', 'START', 'END']).optional(),
      /** Заклинатель, чья это сложность, — если не он сейчас ходит («Святилище»). */
      casterParticipantId: z.uuid().optional(),
      /** Ответы в окне (вдохновение, удача Тёмного) — уже внутри `total`. */
      adjustments: adjustmentsSchema,
      /** Прежний к20 до переброса («Везучий», «Несгибаемость»). */
      rerolled: rerolledSchema,
      /** Броска не было: цель неуязвима ко всему, что даёт провал (план волны 4, №21). */
      immune: z.literal(true).optional(),
      /** Провал обращён в успех «Legendary Resistance» (волна 7а, р. 11). */
      legendaryResistance: z.literal(true).optional(),
    })
    .refine((v) => (v.spellCode === undefined) !== (v.featureCode === undefined), {
      path: ['spellCode'],
      message: 'Спасбросок против заклинания либо умения',
    }),
  z.object({
    kind: z.literal('HEAL'),
    /** Лечение бывает только заклинанием: правку хитов пишет `HP_ADJUST`. */
    spellCode: z.string().min(1).max(64),
    ...rollShape,
    amount: z.number().int().min(0),
    /** Откуда модификатор кости: характеристика заклинателя или само заклинание. */
    modifierParts: modifierPartsSchema,
    /** Лечение не прошло: на цели «Леденящее прикосновение». */
    blocked: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('CONCENTRATION'),
    spellCode: z.string().min(1).max(64),
    outcome: concentrationOutcomeSchema,
    /**
     * Броска может не быть вовсе: концентрация рвётся смертью носителя
     * и новым концентрационным заклинанием (§6 дизайна), и там никто
     * ничего не бросал. Записать такому обрыву выдуманный бросок хуже,
     * чем оставить его без броска, — по журналу разбирают спорный
     * момент. Форма пустого броска та же, что у ручного урона ведущего
     * в `DAMAGE`: `results` пуст, `notation` нет.
     */
    notation: rollShape.notation.optional(),
    results: z.array(z.number().int().min(1).max(100)).max(20),
    total: z.number().int().optional(),
    /** Сложность спасброска: `max(10, половина урона)`. */
    dc: z.number().int().min(1).optional(),
    /** База спасброска Телосложения и кости заклинаний на носителе — как у `SAVE`. */
    modifierParts: modifierPartsSchema,
    bonusParts: modifierPartsSchema,
  }),
  z.object({
    kind: z.literal('HP_ADJUST'),
    /**
     * Со знаком: подъём и снижение — одна строка, а не две разные.
     * Ноль отвергается — правка, ничего не изменившая, в разборе
     * спорного момента не значит ничего, а строку журнала занимает.
     */
    delta: z
      .number()
      .int()
      .refine((v) => v !== 0, 'Правка хитов обязана что-то менять'),
    hitPointsLeft: z.number().int().min(0),
  }),
  z.object({
    kind: z.literal('CONDITION'),
    code: conditionCodeSchema,
    action: conditionActionSchema,
    /** Только у истощения — у остальных состояний степени не бывает. */
    level: exhaustionLevelSchema.optional(),
    /** Пусто у состояния без срока: оно держится до снятия рукой. */
    roundsRemaining: z.number().int().min(0).max(100).optional(),
  }),
  z.object({
    kind: z.literal('DEATH_SAVE'),
    ...rollShape,
    total: z.number().int(),
    outcome: deathSaveOutcomeSchema,
    successes: z.number().int().min(0).max(3),
    failures: z.number().int().min(0).max(3),
    /** Прибавки к спасброску (аура защиты, «Благословение») — уже внутри `total`. */
    bonusParts: modifierPartsSchema,
    adjustments: adjustmentsSchema,
    rerolled: rerolledSchema,
  }),
  z.object({
    kind: z.literal('STABILIZE'),
    /** Проверка Мудрости (Медицина) против СЛ 10; у «Ухода за умирающим» броска нет. */
    notation: rollShape.notation.optional(),
    results: z.array(z.number().int().min(1).max(100)).max(20),
    total: z.number().int().optional(),
    spellCode: z.string().min(1).max(64).optional(),
    success: z.boolean(),
  }),
  z.object({ kind: z.literal('END_TURN') }),
  z.object({
    kind: z.literal('ABILITY'),
    ability: z.enum([...COMBAT_ABILITIES, ...BASIC_ACTIONS]),
    /** Бонусная версия базового действия (хитрое действие, быстрые руки). */
    economy: z.enum(ACTION_ECONOMY).optional(),
    /** Выбранный вариант: круг ячейки, предмет, навык, состояние. */
    option: z.string().min(1).max(64).optional(),
    targetIds: z.array(z.uuid()).max(40).optional(),
    /** Кому сколько вылечено (сохранение жизни, наложение рук, зелье). */
    heals: z
      .array(z.object({ participantId: z.uuid(), amount: z.number().int().min(0) }))
      .max(40)
      .optional(),
    /** Проверка навыка (засада, поиск). */
    check: checkSchema.optional(),
    /** Встречная проверка (захват, толчок, высвобождение). */
    opposed: checkSchema.optional(),
    success: z.boolean().optional(),
    slotLevel: spellSlotLevelSchema.optional(),
    /** Очки чародейства, полученные или потраченные. */
    sorceryPoints: z.number().int().min(0).optional(),
    /** Сгоревшие сверх максимума очки при превращении ячейки. */
    lost: z.number().int().min(0).optional(),
    /** Второе дыхание: брошенное и вылеченное. */
    notation: z.string().min(1).max(32).optional(),
    results: z.array(z.number().int().min(1).max(100)).max(20).optional(),
    amount: z.number().int().min(0).optional(),
    /**
     * Снятие ярости само (бездействие, ноль хитов, срок): сколько раундов
     * у неё оставалось — по ним перемотка хода восстанавливает эффект.
     */
    roundsRemaining: z.number().int().min(0).nullable().optional(),
    /** Действие монстра (`MONSTER_ACTION`, `RECHARGE`) — код статблока. */
    actionCode: z.string().min(1).max(120).optional(),
    /** Перезарядка: к6 и готово ли. */
    roll: z.number().int().min(1).max(6).optional(),
    ready: z.boolean().optional(),
    /** Легендарное — сколько стоило из пула. */
    legendaryCost: z.number().int().min(1).max(3).optional(),
    /** Шаг мультиатаки — действие хода не тратил. */
    multiattackStep: z.literal(true).optional(),
  }),
  z.object({ kind: z.literal('ROUND'), round: z.number().int().min(1) }),
  /**
   * Ответ в окне реакции: кто (`actorParticipantId`) и чем; на кого —
   * `targetParticipantId`. Число — брошенная кость ответа, если была.
   */
  z.object({
    kind: z.literal('REACTION'),
    ability: z.enum(REACTION_ABILITIES),
    featureCode: z.string().min(1).max(64).nullable(),
    value: z.number().int().optional(),
  }),
  /**
   * Продолжение окна реакции не удалось: операция не сыграна, сцена
   * осталась, какой была до неё (записи операции — одной транзакцией).
   * Строкой журнала, а не только логом сервера: иначе ответ «потерялся»
   * бы молча, и стол не узнал бы, почему удар так и не случился.
   * `code` — код ошибки (`ERROR_CODES`), `TAPE_DIVERGED` — разошлась лента
   * костей (дефект движка), `INTERNAL` — прочее.
   */
  z.object({
    kind: z.literal('CONTINUATION_FAILED'),
    op: z.enum(CONTINUATION_OPS),
    code: z.string().min(1).max(64),
  }),
]);
export type EncounterEventPayload = z.infer<typeof encounterEventPayloadSchema>;
