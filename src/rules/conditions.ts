import type { ConditionCode } from '../enums/conditions.js';
import type { AdvantageMode } from '../enums/dice.js';
import { movesCloser, type Placed, reachDistance, reachInCells } from './combat.js';
import { cellKey, footprint, type Grid, reachableCells } from './grid.js';

/**
 * Правила состояний: чистая арифметика без базы и без React. Состояние
 * здесь — не запись, а набор следствий: паралич в книге описан через
 * оцепенение, скорость и автокрит, оглушение — через оцепенение и
 * скорость, и разбирать их по отдельности значило бы переписать одно и
 * то же правило пятнадцать раз.
 */

export type AdvantageEffect = 'NORMAL' | 'ADVANTAGE' | 'DISADVANTAGE';

export interface ConditionEffects {
  /** Оцепенение и всё, что его включает: действий нет. */
  cannotAct: boolean;
  speed: 'NORMAL' | 'HALF' | 'ZERO';
  ownAttacks: AdvantageEffect;
  /** Вблизи — в пределах пяти футов; дальше — `incomingFar`. */
  incomingNear: AdvantageEffect;
  incomingFar: AdvantageEffect;
  /** Попадание вблизи — критическое, независимо от кости. */
  meleeAutoCrit: boolean;
  /** Испуг: шаг не должен приближать к источнику. */
  keepsAwayFromSource: boolean;
}

// Заморожена: это общая константа на весь процесс, а не шаблон для
// копирования, и случайная запись в одно из её полей (`effects.speed =
// ...` по опечатке вместо создания нового объекта) отравила бы её для
// всех, кто её же и держит без единого следствия (ревью волны «б»,
// находка 8).
export const NO_EFFECTS: ConditionEffects = Object.freeze({
  cannotAct: false,
  speed: 'NORMAL',
  ownAttacks: 'NORMAL',
  incomingNear: 'NORMAL',
  incomingFar: 'NORMAL',
  meleeAutoCrit: false,
  keepsAwayFromSource: false,
});

export interface ConditionEntry {
  code: ConditionCode;
  /** Только у истощения; у остальных — пусто. */
  level?: number | null;
}

const of = (patch: Partial<ConditionEffects>): ConditionEffects => ({ ...NO_EFFECTS, ...patch });

/**
 * Таблица книги. Следствия, у которых в приложении нет предмета —
 * проверки характеристик, слух, социальное взаимодействие,
 * спасброски цели и сопротивление урону, — не заведены вовсе: контракт
 * без исполнителя однажды уже дорого обошёлся (`HEAL`, хвост 22).
 */
const TABLE: Record<Exclude<ConditionCode, 'exhaustion'>, ConditionEffects> = {
  blinded: of({ ownAttacks: 'DISADVANTAGE', incomingNear: 'ADVANTAGE', incomingFar: 'ADVANTAGE' }),
  charmed: NO_EFFECTS,
  deafened: NO_EFFECTS,
  frightened: of({ ownAttacks: 'DISADVANTAGE', keepsAwayFromSource: true }),
  grappled: of({ speed: 'ZERO' }),
  incapacitated: of({ cannotAct: true }),
  invisible: of({
    ownAttacks: 'ADVANTAGE',
    incomingNear: 'DISADVANTAGE',
    incomingFar: 'DISADVANTAGE',
  }),
  paralyzed: of({
    cannotAct: true,
    speed: 'ZERO',
    incomingNear: 'ADVANTAGE',
    incomingFar: 'ADVANTAGE',
    meleeAutoCrit: true,
  }),
  petrified: of({
    cannotAct: true,
    speed: 'ZERO',
    incomingNear: 'ADVANTAGE',
    incomingFar: 'ADVANTAGE',
  }),
  poisoned: of({ ownAttacks: 'DISADVANTAGE' }),
  prone: of({
    ownAttacks: 'DISADVANTAGE',
    incomingNear: 'ADVANTAGE',
    incomingFar: 'DISADVANTAGE',
  }),
  restrained: of({
    speed: 'ZERO',
    ownAttacks: 'DISADVANTAGE',
    incomingNear: 'ADVANTAGE',
    incomingFar: 'ADVANTAGE',
  }),
  stunned: of({
    cannotAct: true,
    speed: 'ZERO',
    incomingNear: 'ADVANTAGE',
    incomingFar: 'ADVANTAGE',
  }),
  unconscious: of({
    cannotAct: true,
    speed: 'ZERO',
    incomingNear: 'ADVANTAGE',
    incomingFar: 'ADVANTAGE',
    meleeAutoCrit: true,
  }),
};

/**
 * Истощение растёт ступенями, и каждая следующая включает предыдущие.
 * Первый уровень — помеха проверкам характеристик, которых в
 * приложении нет; четвёртый — половина предела хитов, не заведённая
 * этой волной намеренно (§2 дизайна): она трогает колонку
 * `maxHitPoints`, а через неё урон, лечение и правку ведущего разом.
 * Шестой — смерть, и ставит её служба, а не таблица: `isDead` — поле
 * участника, о котором чистые правила не знают.
 */
function exhaustion(level: number): ConditionEffects {
  return of({
    speed: level >= 5 ? 'ZERO' : level >= 2 ? 'HALF' : 'NORMAL',
    ownAttacks: level >= 3 ? 'DISADVANTAGE' : 'NORMAL',
  });
}

export function effectsOf(entry: ConditionEntry): ConditionEffects {
  if (entry.code === 'exhaustion') return exhaustion(entry.level ?? 1);
  return TABLE[entry.code];
}

/**
 * Складывает преимущества и помехи по правилу книги: они гасят друг
 * друга, сколько бы их ни было. Поэтому считается не сумма, а два
 * признака — «есть ли хоть одно» того и другого.
 */
function mergeAdvantage(values: AdvantageEffect[]): AdvantageEffect {
  const up = values.includes('ADVANTAGE');
  const down = values.includes('DISADVANTAGE');
  if (up === down) return 'NORMAL';
  return up ? 'ADVANTAGE' : 'DISADVANTAGE';
}

export function combineConditions(entries: ConditionEntry[]): ConditionEffects {
  const all = entries.map(effectsOf);

  return {
    cannotAct: all.some((e) => e.cannotAct),
    speed: all.some((e) => e.speed === 'ZERO')
      ? 'ZERO'
      : all.some((e) => e.speed === 'HALF')
        ? 'HALF'
        : 'NORMAL',
    ownAttacks: mergeAdvantage(all.map((e) => e.ownAttacks)),
    incomingNear: mergeAdvantage(all.map((e) => e.incomingNear)),
    incomingFar: mergeAdvantage(all.map((e) => e.incomingFar)),
    meleeAutoCrit: all.some((e) => e.meleeAutoCrit),
    keepsAwayFromSource: all.some((e) => e.keepsAwayFromSource),
  };
}

/**
 * Скорость с учётом состояний. Половина округляется вниз — в книге
 * так же, и на нечётной скорости монстра это видно: тридцать пять
 * футов превращаются в семнадцать, а не в семнадцать с половиной.
 */
export function effectiveSpeed(speed: number, effects: ConditionEffects): number {
  if (effects.speed === 'ZERO') return 0;
  return effects.speed === 'HALF' ? Math.floor(speed / 2) : speed;
}

/** Уже разобранные величины, нужные подсветке — не снимок сцены целиком. */
export interface ReachableCellsInput {
  mover: Placed;
  conditions: ConditionEntry[];
  speed: number;
  /** Остаток хода носителя в футах. */
  movementLeftFeet: number;
  cellSizeFeet: number;
  grid: Grid;
  /** Непроходимое: стены и препятствия с `blocksMovement`. */
  walls: Set<string>;
  /** Проходимое, но не для остановки: чужие живые фишки. */
  tokens: Set<string>;
  /** Источники испуга, ещё стоящие на сцене — фишку-источник могли снять со стола, и тогда бояться уже некого. */
  fearSources: Placed[];
}

/**
 * Клетки, куда достаёт остаток хода фишки с учётом её состояний —
 * бюджет от `effectiveSpeed`, обход в ширину до него (`reachableCells`),
 * отсев клеток, приближающих к источнику испуга (`movesCloser`). Ровно
 * то, чем сервер и подсветка на фронте раньше считали одно и то же
 * порознь и однажды разошлись бы молча (ревью волны «б», находка 3).
 *
 * Принимает уже разобранные величины, а не снимок сцены: какие поля
 * бывают у участника, что `movementLeftFeet` бывает `null` у скрытых
 * от игрока чисел, что состояния лежат в `conditions` — это форма
 * клиентского снимка, а не правило боя, и решать её вызывающему коду
 * (он же знает, кто у него участник и что с ним скрыто).
 */
export function reachableCellsFor(input: ReachableCellsInput): Set<string> {
  const effects = combineConditions(input.conditions);
  const budgetFeet = Math.min(input.movementLeftFeet, effectiveSpeed(input.speed, effects));

  const reach = reachableCells({
    from: { x: input.mover.x, y: input.mover.y },
    span: footprint(input.mover.size),
    grid: input.grid,
    walls: input.walls,
    tokens: input.tokens,
    maxSteps: Math.floor(budgetFeet / input.cellSizeFeet),
  });

  if (!effects.keepsAwayFromSource) return new Set(reach.keys());

  // Клетка строится вперёд от координат сетки, а не разбором ключа
  // назад: формат ключа — внутреннее устройство `reachableCells`,
  // которое вызывающему коду знать не положено.
  const allowed = new Set<string>();
  for (let y = 0; y < input.grid.height; y += 1) {
    for (let x = 0; x < input.grid.width; x += 1) {
      const key = cellKey({ x, y });
      if (!reach.has(key)) continue;
      const approaches = input.fearSources.some((source) =>
        movesCloser(input.mover, { x, y }, source),
      );
      if (!approaches) allowed.add(key);
    }
  }
  return allowed;
}

/**
 * Единственное место, где сходятся ручной выбор и состояния обеих
 * сторон. Ручной выбор — такой же источник, как остальные, а не
 * последнее слово: иначе правило состояния ничего бы не значило,
 * достаточно было бы выбрать себе преимущество. Дверь «вне правил» у
 * ведущего одна и та же — `override`, и она отключает эту функцию
 * целиком, а не спорит с ней.
 */
export function attackAdvantage(input: {
  manual: AdvantageMode;
  attacker: ConditionEffects;
  target: ConditionEffects;
  isNear: boolean;
}): AdvantageMode {
  const fromTarget = input.isNear ? input.target.incomingNear : input.target.incomingFar;
  const merged = mergeAdvantage([
    input.manual === 'NONE' ? 'NORMAL' : input.manual,
    input.attacker.ownAttacks,
    fromTarget,
  ]);

  return merged === 'NORMAL' ? 'NONE' : merged;
}

/** Попадание вблизи по парализованному или бесчувственному — критическое. */
export function autoCritOn(target: ConditionEffects, isNear: boolean): boolean {
  return isNear && target.meleeAutoCrit;
}

/**
 * Порог книги: «в пределах пяти футов» — по лежачему вблизи бьют с
 * преимуществом, дальше — с помехой (см. `incomingNear`/`incomingFar`
 * выше), и это единственное место, где число «пять» названо. Считается
 * в клетках через `reachInCells` от размера клетки сцены, а не «одна
 * клетка»: клетка бывает десятифутовой, и на такой карте порог в клетках
 * поехал бы вдвое.
 *
 * До этой функции сервер (`combat.service.ts`) и фронт
 * (`CombatActions.tsx`) писали ровно это выражение с литералом `5` у
 * каждого себе — и разошлись бы молча при первой же правке одной из
 * копий (ревью волны «б», находка 1).
 */
export function isNearFor(a: Placed, b: Placed, cellSizeFeet: number): boolean {
  const NEAR_FEET = 5;
  return reachDistance(a, b) <= reachInCells({ reachFeet: NEAR_FEET, cellSizeFeet });
}

/**
 * Полный список состояний фишки: наложенные строки плюс выведенное из
 * хитов. Персонаж на нуле хитов уже описан полями волны «а»
 * (`currentHitPoints`, `isDead`) — заводить вдобавок строку состояния
 * `unconscious` значило бы хранить один факт дважды, и тогда лечение
 * подняло бы хиты, а строка осталась (§4 дизайна волны).
 *
 * Живёт в пакете, а не только на сервере: клиент подписывает причину
 * помехи и рисует значки на фишке до броска (§11 дизайна), и без этой
 * функции ему нечем узнать про бесчувственность сбитого — он видит
 * только наложенные строки, которых на нуле хитов ещё не было ни одной.
 *
 * Принимает уже готовый признак `isDown`, а не хиты с `isDead` порознь
 * (ревью волны «б», находка 9): у монстра хиты от игрока скрыты
 * (`currentHitPoints: null` в его снимке), и функция, которая сама
 * сравнивала бы их с нулём, не отличила бы сбитого монстра от целого —
 * игрок не увидел бы ни значков, ни подписи причины, хотя сервер
 * преимущество и крит уже применит. «Сбит» каждая сторона считает
 * из своих чисел сама (сервер — из настоящих хитов участника, клиент —
 * из этого же признака, отданного ему в снимке), а сюда попадает уже
 * готовый ответ — тайна чисел ведущего этим не нарушается: то, что
 * фишка лежит, игрок видит глазами, хиты и КД остаются скрытыми.
 */
export function derivedConditions(input: {
  conditions: ConditionEntry[];
  isDown: boolean;
}): ConditionEntry[] {
  if (!input.isDown) {
    return input.conditions;
  }

  // Бесчувственный в книге ещё и лежит, и без второго кода дальний
  // выстрел по сбитому шёл бы с преимуществом: по книге преимущество
  // бесчувственного и помеха за дальность по лежачему гасят друг друга.
  // Вблизи всё как было — преимущество и крит.
  const derived: ConditionCode[] = ['unconscious', 'prone'];
  return [
    ...input.conditions,
    ...derived
      .filter((code) => !input.conditions.some((c) => c.code === code))
      .map((code) => ({ code, level: null })),
  ];
}
