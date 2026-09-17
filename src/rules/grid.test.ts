import { describe, expect, it } from 'vitest';
import {
  blockedCells,
  bottomEdgeStart,
  cellsOf,
  findFreeCell,
  fitsInGrid,
  footprint,
  isFree,
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
});
