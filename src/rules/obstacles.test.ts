import { describe, expect, it } from 'vitest';
import { MAP_OBSTACLE_KINDS } from '../enums/map.js';
import {
  firstObstacleOverlap,
  MAP_OBSTACLE_FOOTPRINT,
  obstacleAtCell,
  obstacleBlockedCells,
  obstacleCells,
  obstacleFitsInGrid,
} from './obstacles.js';

const grid = { width: 10, height: 10 };

describe('MAP_OBSTACLE_FOOTPRINT', () => {
  // Полноту записи держит тип (`Record<MapObstacleKind, …>`), а вот
  // `{ w: 0, h: 1 }` он пропустит — а нулевая сторона даёт препятствие,
  // не занимающее ни клетки и не рисуемое ничем.
  it('у каждого вида обе стороны положительны', () => {
    for (const kind of MAP_OBSTACLE_KINDS) {
      const { w, h } = MAP_OBSTACLE_FOOTPRINT[kind];
      expect(w, kind).toBeGreaterThan(0);
      expect(h, kind).toBeGreaterThan(0);
    }
  });

  it('шесть исходных видов остаются одноклеточными', () => {
    for (const kind of ['BRANCH', 'BARREL', 'CRATE', 'COLUMN', 'ROCK', 'TABLE'] as const) {
      expect(MAP_OBSTACLE_FOOTPRINT[kind], kind).toEqual({ w: 1, h: 1 });
    }
  });

  it('пары _H и _V — зеркальные прямоугольники', () => {
    expect(MAP_OBSTACLE_FOOTPRINT.LOG_H).toEqual({ w: 3, h: 1 });
    expect(MAP_OBSTACLE_FOOTPRINT.LOG_V).toEqual({ w: 1, h: 3 });
    expect(MAP_OBSTACLE_FOOTPRINT.THICKET_H).toEqual({ w: 3, h: 2 });
    expect(MAP_OBSTACLE_FOOTPRINT.THICKET_V).toEqual({ w: 2, h: 3 });
  });
});

describe('obstacleCells', () => {
  it('бревно на три клетки даёт три клетки, а не одну', () => {
    expect(obstacleCells('LOG_H', { x: 2, y: 5 })).toEqual([
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    ]);
  });

  it('заросли 3×2 дают шесть клеток от левого верхнего угла', () => {
    expect(obstacleCells('THICKET_H', { x: 0, y: 0 })).toHaveLength(6);
    expect(obstacleCells('THICKET_H', { x: 0, y: 0 })).toContainEqual({ x: 2, y: 1 });
  });
});

describe('obstacleFitsInGrid', () => {
  it('бревно у правого края не влезает, хотя его угол внутри сетки', () => {
    expect(obstacleFitsInGrid('LOG_H', { x: 8, y: 0 }, grid)).toBe(false);
  });

  it('то же бревно на клетку левее влезает', () => {
    expect(obstacleFitsInGrid('LOG_H', { x: 7, y: 0 }, grid)).toBe(true);
  });

  it('вертикальный близнец упирается в нижний край, а не в правый', () => {
    expect(obstacleFitsInGrid('LOG_V', { x: 0, y: 8 }, grid)).toBe(false);
    expect(obstacleFitsInGrid('LOG_V', { x: 8, y: 0 }, grid)).toBe(true);
  });
});

describe('obstacleBlockedCells', () => {
  it('складывает клетки всех препятствий по их отпечаткам', () => {
    const blocked = obstacleBlockedCells([
      { kind: 'LOG_H', x: 0, y: 0 },
      { kind: 'ROCK', x: 5, y: 5 },
    ]);
    expect(blocked.size).toBe(4);
    expect(blocked.has('2:0')).toBe(true);
    expect(blocked.has('3:0')).toBe(false);
  });
});

describe('firstObstacleOverlap', () => {
  it('молчит, когда отпечатки не задевают друг друга', () => {
    expect(
      firstObstacleOverlap([
        { kind: 'LOG_H', x: 0, y: 0 },
        { kind: 'LOG_H', x: 3, y: 0 },
      ]),
    ).toBeNull();
  });

  it('называет индекс того, кто наехал, а не того, на кого наехали', () => {
    expect(
      firstObstacleOverlap([
        { kind: 'LOG_H', x: 0, y: 0 },
        { kind: 'ROCK', x: 2, y: 0 },
      ]),
    ).toBe(1);
  });
});

describe('obstacleAtCell', () => {
  // Ластику нужно препятствие, накрывающее клетку, а не то, чей левый
  // верхний угол в ней: по середине бревна ведущий жмёт чаще, чем по
  // его краю.
  it('находит бревно по его средней клетке', () => {
    const obstacles = [{ kind: 'LOG_H' as const, x: 2, y: 5 }];
    expect(obstacleAtCell(obstacles, { x: 3, y: 5 })).toBe(obstacles[0]);
  });

  it('не находит ничего в клетке рядом с отпечатком', () => {
    expect(
      obstacleAtCell([{ kind: 'LOG_H' as const, x: 2, y: 5 }], { x: 5, y: 5 }),
    ).toBeUndefined();
  });
});
