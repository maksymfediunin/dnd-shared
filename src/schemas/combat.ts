import { z } from 'zod';
import { ABILITY_CODES, abilityCodeSchema } from '../enums/character.js';
import {
  attackOutcomeSchema,
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
import { spellSlotLevelSchema } from '../enums/spells.js';

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
    advantageMode: advantageModeSchema.default('NONE'),
    /**
     * Атака бонусным действием: удар без оружия монаха после действия
     * «Атака» или лёгкое оружие во второй руке. Право на неё проверяет
     * служба — по умениям и тому, чем бил первым.
     */
    bonusAction: z.boolean().optional(),
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
    cell: targetCellSchema.optional(),
    /** Ход властью ведущего — та же дверь, что и у удара. */
    override: z.boolean().optional(),
  })
  .refine((v) => (v.targetId === undefined) !== (v.cell === undefined), {
    path: ['targetId'],
    message: 'Заклинание бьёт либо по фишке, либо по клетке',
  });
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
});

/** Удар без оружия — вместо id предмета в `weaponItemId`. */
export const UNARMED_STRIKE = 'unarmed';

/** Умения, которые сами по себе действие хода (а не прибавка к удару). */
export const COMBAT_ABILITIES = ['RAGE', 'END_RAGE', 'SECOND_WIND', 'ACTION_SURGE'] as const;
export type CombatAbility = (typeof COMBAT_ABILITIES)[number];

export const abilityInputSchema = z.object({
  participantId: z.uuid().optional(),
  ability: z.enum(COMBAT_ABILITIES),
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
] as const;

export const modifierPartSchema = z.object({
  source: z.enum(MODIFIER_SOURCES),
  value: z.number().int(),
});
export type ModifierPart = z.infer<typeof modifierPartSchema>;

/**
 * Необязательный: у монстра частей нет (бестиарий даёт одно число), и
 * записи журнала, сделанные до расклада, его не несут.
 */
const modifierPartsSchema = z.array(modifierPartSchema).max(10).optional();

export const encounterEventPayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('INITIATIVE'), ...rollShape, total: z.number().int() }),
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
    /** Атака при отходе — реакция, брошенная сервером сама (§6 дизайна доработок). */
    opportunity: z.boolean().optional(),
    /** Из чего сложен бонус к попаданию; сумма частей — модификатор броска. */
    attackParts: modifierPartsSchema,
    ...rollShape,
    total: z.number().int(),
    targetArmorClass: z.number().int(),
    outcome: attackOutcomeSchema,
    isCritical: z.boolean(),
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
    /** Из чего сложен модификатор урона; нет у ручного урона ведущего. */
    damageParts: modifierPartsSchema,
    temporaryAbsorbed: z.number().int().min(0),
    hitPointsLeft: z.number().int().min(0),
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
     * по фишке — области у него нет.
     */
    areaCells: z
      .array(z.string().regex(/^\d+:\d+$/))
      .max(400)
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
  }),
  z.object({
    kind: z.literal('SAVE'),
    /**
     * Чей это бросок, строка говорит колонкой `targetParticipantId` —
     * той же, какой говорит о цели урон: спасбросок бросает цель, и
     * второго имени для того же участника в payload быть не должно.
     */
    spellCode: z.string().min(1).max(64),
    /** Против чего бросали: спасбросок заклинания — не всегда ловкость. */
    ability: abilityCodeSchema,
    ...rollShape,
    total: z.number().int(),
    /** Сложность заклинателя — без неё по броску нечего разбирать. */
    dc: z.number().int().min(1),
    outcome: savingThrowOutcomeSchema,
  }),
  z.object({
    kind: z.literal('HEAL'),
    /** Лечение бывает только заклинанием: правку хитов пишет `HP_ADJUST`. */
    spellCode: z.string().min(1).max(64),
    ...rollShape,
    amount: z.number().int().min(0),
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
    ability: z.enum(COMBAT_ABILITIES),
    /** Второе дыхание: брошенное и вылеченное. */
    notation: z.string().min(1).max(32).optional(),
    results: z.array(z.number().int().min(1).max(100)).max(20).optional(),
    amount: z.number().int().min(0).optional(),
  }),
  z.object({ kind: z.literal('ROUND'), round: z.number().int().min(1) }),
]);
export type EncounterEventPayload = z.infer<typeof encounterEventPayloadSchema>;
