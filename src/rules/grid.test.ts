import { describe, expect, it } from 'vitest';
import {
  blockedCells,
  bottomEdgeStart,
  cellKey,
  cellsOf,
  findFreeCell,
  fitsInGrid,
  footprint,
  isFree,
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
});
