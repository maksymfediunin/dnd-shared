import { z } from 'zod';
import { ABILITY_CODES } from '../enums/character.js';
import { CONDITION_CODES } from '../enums/conditions.js';
import { SIZE_CATEGORIES } from '../enums/size.js';

/**
 * Разобранная механика действия монстра — колонка `MonsterAction.mechanic`
 * (docs/2026-10-15-combat-automation-monsters-spec.md, §3.2). Здесь только
 * то, что читает движок с В0 волны 6: атака и мультиатака. Волна 7
 * добавляет виды (`areaSave`, `options`, `ref`…) и наездников атаки,
 * расширяя объединение, а не переделывая его.
 */

export const MONSTER_ATTACK_TYPES = [
  'MELEE_WEAPON',
  'RANGED_WEAPON',
  'MELEE_OR_RANGED_WEAPON',
  'MELEE_SPELL',
  'RANGED_SPELL',
] as const;
export type MonsterAttackType = (typeof MONSTER_ATTACK_TYPES)[number];

/**
 * Другой урон того же удара. `twoHanded` и `ranged` выбирает бьющий
 * (хват, бросок издали), `bearerBloodied` — сам сервер: рой на половине
 * хитов и меньше бьёт слабее.
 */
export const MONSTER_ATTACK_VARIANTS = ['twoHanded', 'ranged', 'bearerBloodied'] as const;
export type MonsterAttackVariant = (typeof MONSTER_ATTACK_VARIANTS)[number];
export const CHOSEN_ATTACK_VARIANTS = ['twoHanded', 'ranged'] as const;
export type ChosenAttackVariant = (typeof CHOSEN_ATTACK_VARIANTS)[number];

// Кость уже с модификатором и без пробелов — «1d8+3»; голое число — ровный
// урон («1» у кошачьих когтей). Пробелы разборщик срезает: строку потом
// читает `parseMonsterDamage` сервера, и второго формата она не ждёт.
const damagePartSchema = z.object({
  dice: z.string().regex(/^(?:\d+d\d+(?:[+-]\d+)?|\d+)$/),
  type: z.string().min(1).max(40),
});
export type MonsterDamagePart = z.infer<typeof damagePartSchema>;

/**
 * Условие шага мультиатаки (план волны 7, р. 6): «если держит захват»
 * у чуула. Обличья ликантропов в источнике — отдельные статблоки со своим
 * составом, им условие не нужно.
 */
export const MULTIATTACK_STEP_CONDITIONS = ['grappling'] as const;

const multiattackStepSchema = z.object({
  /** Код действия того же монстра — `MonsterAction.code`. */
  action: z.string().min(1).max(120),
  /**
   * Сколько раз: число, головы гидры (`param`, нет счётчика — пять) или
   * кость фиолетового гриба, брошенная при начале плана.
   */
  count: z.union([
    z.number().int().min(1).max(10),
    z.object({ param: z.literal('heads') }),
    z.object({ dice: z.string().regex(/^\d+d\d+$/) }),
  ]),
  when: z.enum(MULTIATTACK_STEP_CONDITIONS).optional(),
});
export type MultiattackStep = z.infer<typeof multiattackStepSchema>;

/** Спасбросок действия: «DC 18 Dexterity saving throw, … half as much on a success». */
const saveSchema = z.object({
  ability: z.enum(ABILITY_CODES),
  dc: z.number().int().min(1).max(40),
  onSuccess: z.enum(['half', 'none']),
});
export type MonsterSave = z.infer<typeof saveSchema>;

/** Следствие провала: состояние, толчок, захват. */
const outcomeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('condition'),
    condition: z.enum(CONDITION_CODES),
    /** Пусто — до снятия (сбит с ног); «на минуту» — 10. */
    rounds: z.number().int().min(1).max(100).optional(),
    /** «Can repeat the saving throw at the end of each of its turns». */
    repeatSave: z.literal('endOfTurn').optional(),
  }),
  z.object({ kind: z.literal('push'), feet: z.number().int().min(5).max(60) }),
  z.object({
    kind: z.literal('grapple'),
    escapeDc: z.number().int().min(1).max(40),
    /** «If the target is a Large or smaller creature». */
    maxSize: z.enum(SIZE_CATEGORIES).optional(),
    /** «Until this grapple ends, the target is restrained». */
    restrained: z.literal(true).optional(),
    /** «The crocodile can't bite another target». */
    exclusive: z.literal(true).optional(),
  }),
]);
export type MonsterOutcome = z.infer<typeof outcomeSchema>;

/**
 * Наездник попадания (§3.2 разбора): следствие без спасброска или
 * спасбросок с уроном и следствиями провала. `unless` — кого не берёт
 * («other than an elf or undead» у упыря): цель не бросает вовсе.
 */
const riderSchema = z.union([
  outcomeSchema,
  z.object({
    kind: z.literal('save'),
    save: saveSchema,
    damage: z.array(damagePartSchema).min(1).max(3).optional(),
    onFail: z.array(outcomeSchema).min(1).max(3).optional(),
    unless: z
      .object({
        types: z.array(z.string().min(1).max(40)).max(5).optional(),
        races: z.array(z.string().min(1).max(40)).max(5).optional(),
      })
      .optional(),
  }),
]);
export type MonsterRider = z.infer<typeof riderSchema>;

/**
 * Область действия монстра: дыхание (конус, линия), «каждое существо в N
 * фт» (`AURA` — от самого монстра во все стороны). Линия бывает шире
 * клетки (`widthFeet` у пяти дыханий из 22).
 */
const monsterAreaSchema = z.object({
  shape: z.enum(['CONE', 'LINE', 'AURA']),
  sizeFeet: z.number().int().min(5).max(300),
  widthFeet: z.number().int().min(5).max(30).optional(),
});
export type MonsterArea = z.infer<typeof monsterAreaSchema>;

const areaSaveSchema = z.object({
  kind: z.literal('areaSave'),
  area: monsterAreaSchema,
  save: saveSchema,
  damage: z.array(damagePartSchema).min(1).max(3).optional(),
  onFail: z.array(outcomeSchema).min(1).max(3).optional(),
  /**
   * «Of the dragon's choice … aware of it» — только враги, видящие
   * носителя; иначе — все в области, кроме самого носителя.
   */
  who: z.enum(['each', 'chosenAware']).optional(),
  /** Успешный спасбросок — иммунитет к этому действию носителя до конца сцены (р. 21 разбора). */
  immuneOnSuccess: z.literal(true).optional(),
  /** «Can then fly up to half its flying speed» — взмах крыльев. */
  afterMove: z.object({ fraction: z.literal(0.5) }).optional(),
});

export const monsterActionMechanicSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('attack'),
    attackType: z.enum(MONSTER_ATTACK_TYPES),
    bonus: z.number().int(),
    reachFeet: z.number().int().min(0).optional(),
    rangeFeet: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
    /** Все виды урона попадания: первый — основной, прочие — «plus …». */
    damage: z.array(damagePartSchema).min(1).max(4),
    variants: z
      .array(
        z.object({
          when: z.enum(MONSTER_ATTACK_VARIANTS),
          damage: z.array(damagePartSchema).min(1).max(4),
        }),
      )
      .max(3)
      .optional(),
    /** Наездники попадания (шаблоны 6–11): сбит, оттолкнут, захват, спасбросок. */
    riders: z.array(riderSchema).min(1).max(4).optional(),
  }),
  z.object({
    kind: z.literal('multiattack'),
    /** Альтернативы; каждая — набор шагов (§3.4 разбора). */
    options: z.array(z.array(multiattackStepSchema).min(1)).min(1),
  }),
  areaSaveSchema,
  /** Дыхания на выбор металлических драконов. */
  z.object({
    kind: z.literal('options'),
    options: z
      .array(z.object({ name: z.string().min(1).max(60), mechanic: areaSaveSchema }))
      .min(2)
      .max(4),
  }),
  /** Легендарное «makes a tail attack» — то же действие монстра. */
  z.object({ kind: z.literal('ref'), action: z.string().min(1).max(120) }),
  /** Легендарное «Move»: движение без шага-действия; `noOpportunity` — без ударов вслед. */
  z.object({
    kind: z.literal('move'),
    fraction: z.union([z.literal(1), z.literal(0.5)]),
    noOpportunity: z.literal(true).optional(),
  }),
  /** Легендарное «Detect» — проверка Восприятия, то есть действие «Поиск». */
  z.object({ kind: z.literal('check'), skill: z.literal('perception') }),
  /** Реакция «Parry»: +N к КД против одной рукопашной атаки, что попала бы. */
  z.object({ kind: z.literal('parry'), ac: z.number().int().min(1).max(10) }),
]);
export type MonsterActionMechanic = z.infer<typeof monsterActionMechanicSchema>;
export type MonsterAttackMechanic = Extract<MonsterActionMechanic, { kind: 'attack' }>;
export type MonsterAreaSaveMechanic = Extract<MonsterActionMechanic, { kind: 'areaSave' }>;

/** Что знает план мультиатаки сверх сделанного (р. 6 плана волны 7). */
export interface MultiattackContext {
  /** Монстр держит кого-то захватом — щупальца чуула. */
  grappling?: boolean;
  /** Головы гидры; нет — пять (счётчик голов — волна 7в). */
  heads?: number;
  /** Брошенное при начале плана число шагов «1d4»; нет — максимум кости. */
  rolledCount?: number;
}

function stepCount(step: MultiattackStep, ctx: MultiattackContext): number {
  const { count } = step;
  if (typeof count === 'number') return count;
  if ('param' in count) return ctx.heads ?? 5;
  if (ctx.rolledCount !== undefined) return ctx.rolledCount;
  const [n, sides] = count.dice.split('d').map(Number) as [number, number];
  return n * sides;
}

/** Кость числа шагов плана («1d4» фиолетового гриба) — бросается при начале плана. */
export function multiattackDice(options: readonly (readonly MultiattackStep[])[]): string | null {
  for (const steps of options) {
    for (const step of steps) {
      if (typeof step.count === 'object' && 'dice' in step.count) return step.count.dice;
    }
  }
  return null;
}

/**
 * Брошенное число шагов хранится в сделанном пометкой `#N`: сделанное
 * сбрасывается в начале хода, и пометка уходит вместе с ним.
 */
export const ROLLED_COUNT_PREFIX = '#';

export function rolledCountOf(done: readonly string[]): number | undefined {
  const mark = done.find((code) => code.startsWith(ROLLED_COUNT_PREFIX));
  return mark ? Number(mark.slice(ROLLED_COUNT_PREFIX.length)) : undefined;
}

/**
 * Какие шаги мультиатаки ещё можно сделать: шаг разрешён, если есть
 * альтернатива, чей состав (с повторами) покрывает сделанное вместе с ним.
 * Пусто — план исчерпан.
 */
export function multiattackNext(
  options: readonly (readonly MultiattackStep[])[],
  done: readonly string[],
  ctx: MultiattackContext = {},
): string[] {
  const rolled = { ...ctx, rolledCount: ctx.rolledCount ?? rolledCountOf(done) };
  const doneCount = new Map<string, number>();
  for (const code of done) {
    if (code.startsWith(ROLLED_COUNT_PREFIX)) continue;
    doneCount.set(code, (doneCount.get(code) ?? 0) + 1);
  }

  const next: string[] = [];
  for (const steps of options) {
    const limit = new Map<string, number>();
    for (const step of steps) {
      if (step.when === 'grappling' && !ctx.grappling) continue;
      limit.set(step.action, (limit.get(step.action) ?? 0) + stepCount(step, rolled));
    }
    const covers = [...doneCount].every(([code, count]) => (limit.get(code) ?? 0) >= count);
    if (!covers) continue;
    for (const [code, max] of limit) {
      if ((doneCount.get(code) ?? 0) < max && !next.includes(code)) next.push(code);
    }
  }
  return next;
}

/**
 * Перезарядка, «в день», «до отдыха» (план волны 7, р. 4): одна колонка
 * `MonsterAction.usage`. Счётчики — в `monsterResources` фишки; нет ключа —
 * ресурс полный (р. 5): новая фишка — новые счётчики.
 */
export const monsterUsageSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('RECHARGE'), min: z.number().int().min(2).max(6) }),
  z.object({ kind: z.literal('PER_DAY'), times: z.number().int().min(1).max(10) }),
  z.object({ kind: z.literal('REST') }),
]);
export type MonsterUsage = z.infer<typeof monsterUsageSchema>;

/** Счётчики фишки: `recharge:<код>` — потрачено, `day:<код>` — осталось, `rest:<код>` — потрачено. */
export type MonsterResources = Readonly<Record<string, number | boolean>>;

/** Легендарных действий за раунд у всех 32 монстров SRD (р. 1 разбора). */
export const LEGENDARY_ACTIONS_PER_ROUND = 3;

export interface UsageState {
  kind: MonsterUsage['kind'];
  /** «В день»: сколько осталось и из скольких. */
  left?: number;
  max?: number;
  /** Перезарядка: с какой кости готово. */
  min?: number;
  ready: boolean;
}

export function usageKey(usage: MonsterUsage, code: string): string {
  switch (usage.kind) {
    case 'RECHARGE':
      return `recharge:${code}`;
    case 'PER_DAY':
      return `day:${code}`;
    case 'REST':
      return `rest:${code}`;
  }
}

export function usageState(
  usage: MonsterUsage,
  resources: MonsterResources,
  code: string,
): UsageState {
  const value = resources[usageKey(usage, code)];
  switch (usage.kind) {
    case 'RECHARGE':
      return { kind: 'RECHARGE', min: usage.min, ready: value !== true };
    case 'PER_DAY': {
      const left = typeof value === 'number' ? value : usage.times;
      return { kind: 'PER_DAY', left, max: usage.times, ready: left > 0 };
    }
    case 'REST':
      return { kind: 'REST', ready: value !== true };
  }
}

/** Что пишет трата: перезарядка и «до отдыха» — `true`, «в день» — на один меньше. */
export function usageSpent(
  usage: MonsterUsage,
  resources: MonsterResources,
  code: string,
): Record<string, number | boolean> {
  const key = usageKey(usage, code);
  if (usage.kind !== 'PER_DAY') return { [key]: true };
  const state = usageState(usage, resources, code);
  return { [key]: Math.max(0, (state.left ?? 0) - 1) };
}

/** Перезарядка: к6 не меньше порога — готово (р. 3 разбора). */
export function rechargeReady(min: number, roll: number): boolean {
  return roll >= min;
}

/** Потраченные перезарядки фишки — кому в начале хода бросать к6. */
export function spentRecharges(resources: MonsterResources): string[] {
  return Object.entries(resources)
    .filter(([key, value]) => key.startsWith('recharge:') && value === true)
    .map(([key]) => key.slice('recharge:'.length));
}

/** Остаток пула легендарных; нет ключа — полный. */
export function legendaryLeft(resources: MonsterResources): number {
  const value = resources.legendary;
  return typeof value === 'number' ? value : LEGENDARY_ACTIONS_PER_ROUND;
}

/** Кто из монстров вправе на легендарную вставку после конца хода `endedId` (р. 8). */
export interface LegendaryMember {
  id: string;
  /** Есть легендарные действия в статблоке. */
  legendary: boolean;
  left: number;
  /** Самое дешёвое легендарное — дороже остатка пула кнопок нет. */
  cheapest: number;
  dead: boolean;
  incapacitated: boolean;
  surprised: boolean;
}

export function legendaryCandidates(
  members: readonly LegendaryMember[],
  endedId: string,
): string[] {
  return members
    .filter(
      (m) =>
        m.legendary &&
        m.id !== endedId &&
        !m.dead &&
        !m.incapacitated &&
        !m.surprised &&
        m.left >= Math.max(1, m.cheapest),
    )
    .map((m) => m.id);
}
