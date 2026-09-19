import { z } from 'zod';
import {
  attackOutcomeSchema,
  deathSaveOutcomeSchema,
  INITIATIVE_MAX,
  INITIATIVE_MIN,
} from '../enums/combat.js';
import { advantageModeSchema } from '../enums/dice.js';

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
 * Бросок урона. `amount` — ручная поправка вместо броска, право
 * одного только ведущего: схема ролей не знает, а поле, пришедшее не
 * от ведущего, служба отклоняет `FORBIDDEN` — не бросает кости вместо
 * присланного числа и не молчит.
 */
export const damageInputSchema = z.object({
  amount: z.number().int().min(0).max(999).optional(),
});
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
    weaponName: z.string().min(1).max(120),
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
    temporaryAbsorbed: z.number().int().min(0),
    hitPointsLeft: z.number().int().min(0),
  }),
  z.object({
    kind: z.literal('HEAL'),
    amount: z.number().int().min(0),
    hitPointsLeft: z.number().int().min(0),
  }),
  z.object({
    kind: z.literal('DEATH_SAVE'),
    ...rollShape,
    total: z.number().int(),
    outcome: deathSaveOutcomeSchema,
    successes: z.number().int().min(0).max(3),
    failures: z.number().int().min(0).max(3),
  }),
  z.object({ kind: z.literal('END_TURN') }),
  z.object({ kind: z.literal('ROUND'), round: z.number().int().min(1) }),
]);
export type EncounterEventPayload = z.infer<typeof encounterEventPayloadSchema>;
