import { describe, expect, it } from 'vitest';
import { cellsInArea } from './areas.js';

const grid = { width: 10, height: 10 };
const base = { cellSizeFeet: 5, grid };
const origin = { x: 5, y: 5 };

describe('сфера и цилиндр', () => {
  it('накрывают квадрат радиусом в клетках, вместе с точкой приложения', () => {
    const cells = cellsInArea({ ...base, shape: 'SPHERE', sizeFeet: 10, origin });

    // Пять на пять: радиус две клетки в каждую сторону плюс центр.
    expect(cells.size).toBe(25);
    expect(cells.has('5:5')).toBe(true);
    expect(cells.has('3:3')).toBe(true);
    expect(cells.has('7:7')).toBe(true);
    expect(cells.has('2:5')).toBe(false);
  });

  // §7 дизайна: сетка плоская, высоты у неё нет, и разница между
  // цилиндром и сферой на столе не видна.
  it('цилиндр считается ровно как сфера', () => {
    expect(cellsInArea({ ...base, shape: 'CYLINDER', sizeFeet: 10, origin })).toEqual(
      cellsInArea({ ...base, shape: 'SPHERE', sizeFeet: 10, origin }),
    );
  });

  it('клетки за краем сетки в область не попадают', () => {
    const cells = cellsInArea({ ...base, shape: 'SPHERE', sizeFeet: 10, origin: { x: 0, y: 0 } });

    expect(cells.size).toBe(9);
    expect(cells.has('0:0')).toBe(true);
    expect(cells.has('2:2')).toBe(true);
  });

  it('на десятифутовой клетке радиус меряется её размером', () => {
    const cells = cellsInArea({
      ...base,
      cellSizeFeet: 10,
      shape: 'SPHERE',
      sizeFeet: 20,
      origin,
    });

    expect(cells.size).toBe(25);
  });
});

describe('куб', () => {
  it('стоит стороной от точки приложения, как фишка от своего угла', () => {
    const cells = cellsInArea({ ...base, shape: 'CUBE', sizeFeet: 15, origin: { x: 1, y: 1 } });

    expect(cells).toEqual(new Set(['1:1', '2:1', '3:1', '1:2', '2:2', '3:2', '1:3', '2:3', '3:3']));
  });

  it('обрезается краем сетки', () => {
    const cells = cellsInArea({ ...base, shape: 'CUBE', sizeFeet: 15, origin: { x: 9, y: 9 } });

    expect(cells).toEqual(new Set(['9:9']));
  });
});

describe('конус', () => {
  // Четыре стороны разом: направление снимается с towards, и ошибка в
  // знаке видна только сравнением сторон друг с другом.
  it('расширяется от заклинателя в сторону towards', () => {
    expect(
      cellsInArea({ ...base, shape: 'CONE', sizeFeet: 15, origin, towards: { x: 6, y: 5 } }),
    ).toEqual(new Set(['6:5', '7:4', '7:5', '7:6', '8:4', '8:5', '8:6']));
    expect(
      cellsInArea({ ...base, shape: 'CONE', sizeFeet: 15, origin, towards: { x: 4, y: 5 } }),
    ).toEqual(new Set(['4:5', '3:4', '3:5', '3:6', '2:4', '2:5', '2:6']));
    expect(
      cellsInArea({ ...base, shape: 'CONE', sizeFeet: 15, origin, towards: { x: 5, y: 6 } }),
    ).toEqual(new Set(['5:6', '4:7', '5:7', '6:7', '4:8', '5:8', '6:8']));
    expect(
      cellsInArea({ ...base, shape: 'CONE', sizeFeet: 15, origin, towards: { x: 5, y: 4 } }),
    ).toEqual(new Set(['5:4', '4:3', '5:3', '6:3', '4:2', '5:2', '6:2']));
  });

  it('по диагонали расширяется так же, как по прямой', () => {
    const cells = cellsInArea({
      ...base,
      shape: 'CONE',
      sizeFeet: 15,
      origin,
      towards: { x: 6, y: 6 },
    });

    expect(cells).toEqual(new Set(['6:6', '7:6', '7:7', '6:7', '8:7', '8:8', '7:8']));
  });

  it('клетка заклинателя в конус не входит', () => {
    const cells = cellsInArea({
      ...base,
      shape: 'CONE',
      sizeFeet: 15,
      origin,
      towards: { x: 6, y: 5 },
    });

    expect(cells.has('5:5')).toBe(false);
  });

  it('без направления конуса нет', () => {
    expect(cellsInArea({ ...base, shape: 'CONE', sizeFeet: 15, origin }).size).toBe(0);
    expect(
      cellsInArea({ ...base, shape: 'CONE', sizeFeet: 15, origin, towards: origin }).size,
    ).toBe(0);
  });
});

describe('линия', () => {
  it('идёт от заклинателя в сторону towards шириной в клетку', () => {
    expect(
      cellsInArea({ ...base, shape: 'LINE', sizeFeet: 20, origin, towards: { x: 6, y: 5 } }),
    ).toEqual(new Set(['6:5', '7:5', '8:5', '9:5']));
    expect(
      cellsInArea({ ...base, shape: 'LINE', sizeFeet: 20, origin, towards: { x: 4, y: 5 } }),
    ).toEqual(new Set(['4:5', '3:5', '2:5', '1:5']));
    expect(
      cellsInArea({ ...base, shape: 'LINE', sizeFeet: 20, origin, towards: { x: 5, y: 6 } }),
    ).toEqual(new Set(['5:6', '5:7', '5:8', '5:9']));
    expect(
      cellsInArea({ ...base, shape: 'LINE', sizeFeet: 20, origin, towards: { x: 5, y: 4 } }),
    ).toEqual(new Set(['5:4', '5:3', '5:2', '5:1']));
  });

  it('упирается в край сетки', () => {
    const cells = cellsInArea({
      ...base,
      shape: 'LINE',
      sizeFeet: 20,
      origin: { x: 8, y: 5 },
      towards: { x: 9, y: 5 },
    });

    expect(cells).toEqual(new Set(['9:5']));
  });

  it('без направления линии нет', () => {
    expect(cellsInArea({ ...base, shape: 'LINE', sizeFeet: 20, origin }).size).toBe(0);
  });
});

describe('вырожденные размеры', () => {
  it('область меньше клетки — это одна клетка приложения или ничего', () => {
    expect(cellsInArea({ ...base, shape: 'SPHERE', sizeFeet: 0, origin })).toEqual(
      new Set(['5:5']),
    );
    expect(
      cellsInArea({ ...base, shape: 'LINE', sizeFeet: 0, origin, towards: { x: 6, y: 5 } }).size,
    ).toBe(0);
  });
});
