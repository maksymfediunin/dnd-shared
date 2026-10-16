import { z } from 'zod';

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

const multiattackStepSchema = z.object({
  /** Код действия того же монстра — `MonsterAction.code`. */
  action: z.string().min(1).max(120),
  count: z.number().int().min(1).max(10),
});
export type MultiattackStep = z.infer<typeof multiattackStepSchema>;

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
  }),
  z.object({
    kind: z.literal('multiattack'),
    /** Альтернативы; каждая — набор шагов (§3.4 разбора). */
    options: z.array(z.array(multiattackStepSchema).min(1)).min(1),
  }),
]);
export type MonsterActionMechanic = z.infer<typeof monsterActionMechanicSchema>;
export type MonsterAttackMechanic = Extract<MonsterActionMechanic, { kind: 'attack' }>;

/**
 * Какие шаги мультиатаки ещё можно сделать: шаг разрешён, если есть
 * альтернатива, чей состав (с повторами) покрывает сделанное вместе с ним.
 * Пусто — план исчерпан.
 */
export function multiattackNext(
  options: readonly (readonly MultiattackStep[])[],
  done: readonly string[],
): string[] {
  const doneCount = new Map<string, number>();
  for (const code of done) doneCount.set(code, (doneCount.get(code) ?? 0) + 1);

  const next: string[] = [];
  for (const steps of options) {
    const limit = new Map<string, number>();
    for (const step of steps) limit.set(step.action, (limit.get(step.action) ?? 0) + step.count);
    const covers = [...doneCount].every(([code, count]) => (limit.get(code) ?? 0) >= count);
    if (!covers) continue;
    for (const [code, max] of limit) {
      if ((doneCount.get(code) ?? 0) < max && !next.includes(code)) next.push(code);
    }
  }
  return next;
}
