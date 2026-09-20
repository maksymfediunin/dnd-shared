import { describe, expect, it } from 'vitest';
import {
  attackAdvantage,
  autoCritOn,
  combineConditions,
  derivedConditions,
  effectiveSpeed,
  effectsOf,
  isNearFor,
  NO_EFFECTS,
  reachableCellsFor,
} from './conditions.js';
import { blockedCells, cellKey } from './grid.js';

describe('следствия одного состояния', () => {
  // По лежачему вблизи бьют с преимуществом, издали — с помехой. Это
  // единственное место, где две оси входящих атак действительно
  // расходятся, и ради него они и заведены.
  it('лежачий: вблизи преимущество, издали помеха', () => {
    const effects = effectsOf({ code: 'prone' });

    expect(effects.incomingNear).toBe('ADVANTAGE');
    expect(effects.incomingFar).toBe('DISADVANTAGE');
    expect(effects.ownAttacks).toBe('DISADVANTAGE');
  });

  it('невидимый бьёт с преимуществом, а по нему — с помехой', () => {
    const effects = effectsOf({ code: 'invisible' });

    expect(effects.ownAttacks).toBe('ADVANTAGE');
    expect(effects.incomingNear).toBe('DISADVANTAGE');
  });

  it('парализованный не действует, стоит и получает криты вблизи', () => {
    const effects = effectsOf({ code: 'paralyzed' });

    expect(effects.cannotAct).toBe(true);
    expect(effects.speed).toBe('ZERO');
    expect(effects.meleeAutoCrit).toBe(true);
  });

  // Глухота и очарование заводятся состояниями, но следствий в бою у
  // них нет: их предмета — слуха и социального взаимодействия — в
  // приложении не существует (§2 дизайна).
  it('глухота в бою не значит ничего', () => {
    expect(effectsOf({ code: 'deafened' })).toEqual(effectsOf({ code: 'charmed' }));
  });
});

describe('свёртка нескольких состояний', () => {
  it('ноль скорости бьёт половину', () => {
    const effects = combineConditions([{ code: 'exhaustion', level: 2 }, { code: 'grappled' }]);

    expect(effects.speed).toBe('ZERO');
  });

  it('запрет действовать приходит от любого источника', () => {
    expect(combineConditions([{ code: 'poisoned' }, { code: 'stunned' }]).cannotAct).toBe(true);
  });

  // Правило книги: преимущество и помеха гасят друг друга, сколько бы
  // их ни было. Слепой невидимка бьёт обычным броском.
  it('преимущество и помеха гасятся', () => {
    const effects = combineConditions([{ code: 'invisible' }, { code: 'poisoned' }]);

    expect(effects.ownAttacks).toBe('NORMAL');
  });

  it('пустой список — ничего не меняет', () => {
    expect(combineConditions([])).toEqual(NO_EFFECTS);
  });
});

describe('effectiveSpeed', () => {
  it('половина округляется вниз', () => {
    expect(effectiveSpeed(35, combineConditions([{ code: 'exhaustion', level: 2 }]))).toBe(17);
  });

  it('ноль остаётся нулём', () => {
    expect(effectiveSpeed(30, combineConditions([{ code: 'restrained' }]))).toBe(0);
  });
});

describe('attackAdvantage', () => {
  const normal = combineConditions([]);

  it('без состояний решает ручной выбор', () => {
    expect(
      attackAdvantage({
        manual: 'ADVANTAGE',
        attacker: normal,
        target: normal,
        isNear: true,
      }),
    ).toBe('ADVANTAGE');
  });

  // Ручной выбор — такой же источник, как состояние, а не последнее
  // слово: иначе отравленный бил бы с преимуществом, потому что игрок
  // так выбрал, и правило состояния ничего бы не значило.
  it('ручное преимущество гасится помехой от состояния', () => {
    expect(
      attackAdvantage({
        manual: 'ADVANTAGE',
        attacker: combineConditions([{ code: 'poisoned' }]),
        target: normal,
        isNear: true,
      }),
    ).toBe('NONE');
  });

  it('состояние цели считается по расстоянию', () => {
    const target = combineConditions([{ code: 'prone' }]);

    expect(attackAdvantage({ manual: 'NONE', attacker: normal, target, isNear: true })).toBe(
      'ADVANTAGE',
    );
    expect(attackAdvantage({ manual: 'NONE', attacker: normal, target, isNear: false })).toBe(
      'DISADVANTAGE',
    );
  });
});

describe('autoCritOn', () => {
  it('парализованный получает крит только вблизи', () => {
    const target = combineConditions([{ code: 'paralyzed' }]);

    expect(autoCritOn(target, true)).toBe(true);
    expect(autoCritOn(target, false)).toBe(false);
  });
});

// Одно и то же выражение переписывалось руками в combat.service.ts на
// сервере и в CombatActions.tsx на фронте, литерал «пять футов» включая
// (ревью волны «б», находка 1).
describe('isNearFor', () => {
  it('клетка пять футов: сосед — вблизи, через одну — уже нет', () => {
    const a = { x: 0, y: 0, size: 'MEDIUM' } as const;
    expect(isNearFor(a, { x: 1, y: 0, size: 'MEDIUM' }, 5)).toBe(true);
    expect(isNearFor(a, { x: 2, y: 0, size: 'MEDIUM' }, 5)).toBe(false);
  });

  // На десятифутовой клетке порог в клетках не «съезжает» до нуля
  // (reachInCells не бывает меньше одной) — сосед остаётся вблизи, а
  // клетка через одну — уже нет, как и на пятифутовой.
  it('клетка десять футов: сосед — вблизи, через одну — уже нет', () => {
    const a = { x: 0, y: 0, size: 'MEDIUM' } as const;
    expect(isNearFor(a, { x: 1, y: 0, size: 'MEDIUM' }, 10)).toBe(true);
    expect(isNearFor(a, { x: 2, y: 0, size: 'MEDIUM' }, 10)).toBe(false);
  });

  // Крупная фишка считает от ближайшего края, а не от угла — та же
  // геометрия, что и у reachDistance.
  it('крупная фишка: вблизи считается от ближайшего края', () => {
    const ogre = { x: 0, y: 0, size: 'LARGE' } as const;
    expect(isNearFor(ogre, { x: 2, y: 0, size: 'MEDIUM' }, 5)).toBe(true);
    expect(isNearFor(ogre, { x: 3, y: 0, size: 'MEDIUM' }, 5)).toBe(false);
  });
});

// Принимает готовый признак `isDown`, а не хиты и `isDead` по отдельности
// (ревью волны «б», находка 9): у монстра числа скрыты от игрока
// (`currentHitPoints: null`), и функция, читающая хиты сама, не отличила
// бы сбитого монстра от целого — сервер и клиент теперь считают «сбит
// ли» один раз каждый на своей стороне (сервер — из настоящих хитов,
// клиент — из этого же признака в снимке) и отдают сюда уже готовый
// булев ответ.
describe('derivedConditions', () => {
  it('сбитый получает два выведенных кода', () => {
    const derived = derivedConditions({ conditions: [], isDown: true });
    expect(derived.map((c) => c.code)).toEqual(['unconscious', 'prone']);
  });

  it('не сбитый выведенных кодов не получает', () => {
    const derived = derivedConditions({ conditions: [], isDown: false });
    expect(derived).toEqual([]);
  });

  it('уже наложенный prone не дублируется', () => {
    const derived = derivedConditions({
      conditions: [{ code: 'prone' }],
      isDown: true,
    });
    expect(derived.map((c) => c.code)).toEqual(['prone', 'unconscious']);
  });
});

// Общая константа на весь процесс: случайная запись в поле отравила бы
// её для всех, кто её же держит без единого следствия (ревью волны «б»,
// находка 8).
describe('NO_EFFECTS', () => {
  it('заморожена от записи', () => {
    expect(Object.isFrozen(NO_EFFECTS)).toBe(true);
  });
});

// Переехало из EncounterBoard.tsx на фронте (ревью волны «б», находка
// 3): подсветка достижимых клеток — правило боя, а не разметка, и её
// не проверить без базы и без React только пока она сидит в компоненте.
describe('reachableCellsFor', () => {
  const grid = { width: 10, height: 10 };
  const empty = new Set<string>();
  const mover = { x: 0, y: 0, size: 'MEDIUM' } as const;

  it('клетка за стеной стоит обхода, а не двух шагов по прямой', () => {
    const walls = blockedCells([
      { origin: { x: 1, y: 0 }, span: 1 },
      { origin: { x: 1, y: 1 }, span: 1 },
    ]);

    const reach = reachableCellsFor({
      mover,
      conditions: [],
      speed: 30,
      movementLeftFeet: 30,
      cellSizeFeet: 5,
      grid,
      walls,
      tokens: empty,
      fearSources: [],
    });

    expect(reach.has(cellKey({ x: 1, y: 0 }))).toBe(false);
    expect(reach.has(cellKey({ x: 2, y: 0 }))).toBe(true);
  });

  it('половина скорости режет бюджет вдвое, а не остаток хода', () => {
    const reach = reachableCellsFor({
      mover,
      conditions: [{ code: 'exhaustion', level: 2 }],
      speed: 30,
      movementLeftFeet: 30,
      cellSizeFeet: 5,
      grid,
      walls: empty,
      tokens: empty,
      fearSources: [],
    });

    expect(reach.has(cellKey({ x: 3, y: 0 }))).toBe(true);
    expect(reach.has(cellKey({ x: 4, y: 0 }))).toBe(false);
  });

  it('нулевая скорость не даёт сойти с клетки', () => {
    const reach = reachableCellsFor({
      mover,
      conditions: [{ code: 'restrained' }],
      speed: 30,
      movementLeftFeet: 30,
      cellSizeFeet: 5,
      grid,
      walls: empty,
      tokens: empty,
      fearSources: [],
    });

    expect(reach.size).toBe(0);
  });

  it('испуг отсеивает клетки, приближающие к источнику', () => {
    const frightened = { x: 5, y: 5, size: 'MEDIUM' } as const;
    const source = { x: 5, y: 0, size: 'MEDIUM' } as const;

    const reach = reachableCellsFor({
      mover: frightened,
      conditions: [{ code: 'frightened' }],
      speed: 30,
      movementLeftFeet: 30,
      cellSizeFeet: 5,
      grid,
      walls: empty,
      tokens: empty,
      fearSources: [source],
    });

    expect(reach.has(cellKey({ x: 5, y: 4 }))).toBe(false);
    expect(reach.has(cellKey({ x: 5, y: 6 }))).toBe(true);
  });

  // Источник могли снять со сцены — тогда бояться уже некого, и запрет
  // приближаться молча перестаёт действовать (assertNotTowardsFear на
  // сервере считает так же).
  it('источника испуга нет на сцене — отсева нет вовсе', () => {
    const frightened = { x: 5, y: 5, size: 'MEDIUM' } as const;

    const reach = reachableCellsFor({
      mover: frightened,
      conditions: [{ code: 'frightened' }],
      speed: 30,
      movementLeftFeet: 30,
      cellSizeFeet: 5,
      grid,
      walls: empty,
      tokens: empty,
      fearSources: [],
    });

    expect(reach.has(cellKey({ x: 5, y: 4 }))).toBe(true);
  });
});
