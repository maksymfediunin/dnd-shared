import { describe, expect, it } from 'vitest';
import {
  blockedCells,
  bottomEdgeStart,
  cellKey,
  cellsInRadius,
  cellsOf,
  findFreeCell,
  fitsInGrid,
  footprint,
  isFree,
  radiusCostFeet,
  reachableCells,
} from './grid.js';

const grid = { width: 10, height: 10 };

describe('footprint', () => {
  it('мелкие и средние занимают одну клетку', () => {
    expect(footprint('TINY')).toBe(1);
    expect(footprint('MEDIUM')).toBe(1);
  });

  it('крупные растут квадратом', () => {
    expect(footprint('LARGE')).toBe(2);
    expect(footprint('HUGE')).toBe(3);
    expect(footprint('GARGANTUAN')).toBe(4);
  });
});

describe('cellsOf', () => {
  it('огр накрывает четыре клетки от своего угла', () => {
    expect(cellsOf({ x: 1, y: 1 }, 2)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });
});

describe('fitsInGrid', () => {
  it('фишка 2×2 не помещается в последнюю клетку', () => {
    expect(fitsInGrid({ x: 9, y: 9 }, 2, grid)).toBe(false);
    expect(fitsInGrid({ x: 8, y: 8 }, 2, grid)).toBe(true);
  });
});

describe('isFree', () => {
  it('крупная фишка задевает препятствие углом', () => {
    const blocked = blockedCells([{ origin: { x: 3, y: 3 }, span: 1 }]);
    expect(isFree({ x: 2, y: 2 }, 2, grid, blocked)).toBe(false);
    expect(isFree({ x: 1, y: 1 }, 2, grid, blocked)).toBe(true);
  });
});

describe('findFreeCell', () => {
  it('занятая клетка уступает соседней', () => {
    const blocked = blockedCells([{ origin: { x: 5, y: 5 }, span: 1 }]);
    const found = findFreeCell({ x: 5, y: 5 }, 1, grid, blocked);

    expect(found).not.toBeNull();
    // Соседняя, а не любая: три гоблина из пресета должны встать
    // кучкой вокруг своей клетки.
    expect(Math.max(Math.abs(found!.x - 5), Math.abs(found!.y - 5))).toBe(1);
  });

  // C20: кольцевой обход дальше первого кольца. Пресет из десятка
  // гоблинов упирается в него сразу же: восемь соседних клеток
  // кончаются, и девятому нужен радиус 2.
  it('когда занято и первое кольцо, уходит на второе', () => {
    const blocked = blockedCells([{ origin: { x: 4, y: 4 }, span: 3 }]);
    const found = findFreeCell({ x: 5, y: 5 }, 1, grid, blocked);

    expect(found).not.toBeNull();
    // Ровно второе кольцо, а не любая свободная клетка: кучка вокруг
    // заданной клетки — это и есть смысл обхода.
    expect(Math.max(Math.abs(found!.x - 5), Math.abs(found!.y - 5))).toBe(2);
  });

  it('на забитой сетке отдаёт null', () => {
    const all = blockedCells([{ origin: { x: 0, y: 0 }, span: 10 }]);
    expect(findFreeCell({ x: 0, y: 0 }, 1, grid, all)).toBeNull();
  });
});

describe('bottomEdgeStart', () => {
  it('ставит игроков вдоль нижнего края слева направо', () => {
    const blocked = blockedCells([]);
    const first = bottomEdgeStart(0, 1, grid, blocked)!;
    expect(first).toEqual({ x: 0, y: 9 });
  });

  it('крупный игрок встаёт так, чтобы влезть целиком', () => {
    expect(bottomEdgeStart(0, 2, grid, blockedCells([]))).toEqual({ x: 0, y: 8 });
  });

  // C20: запасной путь — нижний край занят целиком (бой в коридоре,
  // партия входит в дверь). Игрок обязан встать выше края, а не
  // остаться без клетки.
  it('при занятом нижнем крае уходит выше, а не отказывает', () => {
    const wall = blockedCells([{ origin: { x: 0, y: 9 }, span: 1 }]);
    for (let x = 1; x < 10; x += 1) wall.add(`${x}:9`);

    const found = bottomEdgeStart(0, 1, grid, wall);

    expect(found).not.toBeNull();
    expect(found!.y).toBeLessThan(9);
  });

  it('когда занята вся сетка, места нет и у нижнего края', () => {
    const all = blockedCells([{ origin: { x: 0, y: 0 }, span: 10 }]);
    expect(bottomEdgeStart(0, 1, grid, all)).toBeNull();
  });
});

describe('reachableCells', () => {
  const empty = new Set<string>();

  it('клетка за стеной стоит обхода, а не двух шагов по прямой', () => {
    const walls = blockedCells([
      { origin: { x: 1, y: 0 }, span: 1 },
      { origin: { x: 1, y: 1 }, span: 1 },
    ]);

    const reach = reachableCells({
      from: { x: 0, y: 0 },
      span: 1,
      grid,
      walls,
      tokens: empty,
      maxSteps: 6,
    });

    expect(reach.get('2:0')).toBe(4);
  });
  it('сквозь союзника проходят, но встать на него нельзя', () => {
    const tokens = blockedCells([{ origin: { x: 1, y: 0 }, span: 1 }]);

    const reach = reachableCells({
      from: { x: 0, y: 0 },
      span: 1,
      grid,
      walls: empty,
      tokens,
      maxSteps: 3,
    });

    expect(reach.has('1:0')).toBe(false);
    expect(reach.get('2:0')).toBe(2);
  });
  it('за бюджет шагов не выходит', () => {
    const reach = reachableCells({
      from: { x: 0, y: 0 },
      span: 1,
      grid,
      walls: empty,
      tokens: empty,
      maxSteps: 2,
    });

    expect(reach.get('2:2')).toBe(2);
    expect(reach.has('3:3')).toBe(false);
  });

  // Стена во всю ширину сетки: клетка за ней свободна и в сетке, но
  // пути к ней нет вовсе — сервер по этому и отличает «не дойти» от
  // «клетка занята».
  it('отрезанной стеной клетки в ответе нет', () => {
    const walls = blockedCells([{ origin: { x: 0, y: 1 }, span: 1 }]);
    for (let x = 1; x < grid.width; x += 1) walls.add(`${x}:1`);

    const reach = reachableCells({
      from: { x: 0, y: 0 },
      span: 1,
      grid,
      walls,
      tokens: empty,
      maxSteps: 30,
    });

    expect(reach.has('0:2')).toBe(false);
    expect(reach.get('1:0')).toBe(1);
  });
  // Формат ключа — часть ответа, а не соглашение, повторённое у каждого
  // потребителя: сервер ищет в этой карте клетку назначения, фронт
  // сверяет с ней подсветку, и разойтись им нечем только пока ключ
  // складывает одна функция.
  it('ключи ответа складывает cellKey', () => {
    const reach = reachableCells({
      from: { x: 0, y: 0 },
      span: 1,
      grid,
      walls: empty,
      tokens: empty,
      maxSteps: 1,
    });

    expect(reach.get(cellKey({ x: 1, y: 0 }))).toBe(1);
  });

  describe('трудная местность', () => {
    it('шаг в трудную клетку стоит две', () => {
      const reach = reachableCells({
        from: { x: 0, y: 0 },
        span: 1,
        grid,
        walls: empty,
        tokens: empty,
        difficult: new Set(['1:0']),
        maxSteps: 5,
      });

      expect(reach.get('1:0')).toBe(2);
      // В обход по диагонали — две обычных, а не трудная плюс обычная.
      expect(reach.get('2:0')).toBe(2);
    });

    it('брод поперёк всей сетки — переход дороже на клетку', () => {
      const difficult = new Set(Array.from({ length: grid.height }, (_, y) => `1:${y}`));
      const reach = reachableCells({
        from: { x: 0, y: 0 },
        span: 1,
        grid,
        walls: empty,
        tokens: empty,
        difficult,
        maxSteps: 3,
      });

      expect(reach.get('2:0')).toBe(3);
      expect(reach.has('3:0')).toBe(false);
    });

    it('бюджета не хватает на трудный шаг — клетки нет', () => {
      const reach = reachableCells({
        from: { x: 0, y: 0 },
        span: 1,
        grid,
        walls: empty,
        tokens: empty,
        difficult: new Set(['1:0', '1:1', '0:1']),
        maxSteps: 1,
      });

      expect(reach.size).toBe(0);
    });

    // Правило 5e для крупных: трудная клетка под любой частью отпечатка
    // в точке назначения делает шаг трудным.
    it('огру хватает задеть трудную клетку краем отпечатка', () => {
      const reach = reachableCells({
        from: { x: 0, y: 0 },
        span: 2,
        grid,
        walls: empty,
        tokens: empty,
        difficult: new Set(['2:1']),
        maxSteps: 4,
      });

      expect(reach.get('1:0')).toBe(2);
      expect(reach.get('0:1')).toBe(1);
    });
  });
});

describe('radiusCostFeet', () => {
  it('прямая — клетки на размер клетки', () => {
    expect(radiusCostFeet({ x: 0, y: 0 }, { x: 6, y: 0 }, 5)).toBe(30);
  });

  it('египетский треугольник даёт ровное число', () => {
    expect(radiusCostFeet({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(25);
  });

  it('диагональ дороже прямой и округляется вверх', () => {
    expect(radiusCostFeet({ x: 0, y: 0 }, { x: 1, y: 1 }, 5)).toBe(8);
    expect(radiusCostFeet({ x: 0, y: 0 }, { x: 5, y: 5 }, 5)).toBe(36);
  });
});

describe('cellsInRadius', () => {
  const base = {
    from: { x: 10, y: 10 },
    span: 1,
    grid: { width: 30, height: 30 },
    walls: new Set<string>(),
    tokens: new Set<string>(),
    budgetFeet: 30,
    cellSizeFeet: 5,
  };

  it('граница круга входит, за ней — нет', () => {
    const reach = cellsInRadius(base);
    expect(reach.get('16:10')).toBe(30);
    expect(reach.has('17:10')).toBe(false);
    expect(reach.get('13:14')).toBe(25);
    // По Чебышёву это пять клеток и 25 футов — по прямой уже 36.
    expect(reach.has('15:15')).toBe(false);
  });

  it('стартовая клетка в ответ не входит — как у reachableCells', () => {
    expect(cellsInRadius(base).has('10:10')).toBe(false);
  });

  it('сквозь стену меряется по прямой, на стену встать нельзя', () => {
    const walls = new Set(['11:9', '11:10', '11:11']);
    const reach = cellsInRadius({ ...base, walls });
    expect(reach.has('11:10')).toBe(false);
    expect(reach.get('12:10')).toBe(10);
  });

  it('на чужую фишку встать нельзя', () => {
    const reach = cellsInRadius({ ...base, tokens: new Set(['12:10']) });
    expect(reach.has('12:10')).toBe(false);
    expect(reach.has('13:10')).toBe(true);
  });

  it('крупная фишка не вылезает за край карты', () => {
    const reach = cellsInRadius({ ...base, from: { x: 27, y: 10 }, span: 2 });
    expect(reach.has('28:10')).toBe(true);
    expect(reach.has('29:10')).toBe(false);
  });
});
