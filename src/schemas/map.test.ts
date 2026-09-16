import { describe, it, expect } from 'vitest';
import { battleMapSaveSchema, participantUpdateSchema } from './map.js';

const validMap = {
  name: 'Лесное святилище',
  background: 'FOREST' as const,
  gridWidth: 10,
  gridHeight: 10,
  obstacles: [{ kind: 'BARREL' as const, x: 2, y: 3 }],
  monsters: [{ monsterCode: 'goblin', x: 5, y: 5, quantity: 3 }],
};

describe('battleMapSaveSchema', () => {
  it('подставляет размер клетки, поворот и флаги препятствия', () => {
    const parsed = battleMapSaveSchema.parse(validMap);

    expect(parsed.cellSizeFeet).toBe(5);
    expect(parsed.obstacles[0]).toMatchObject({
      rotation: 0,
      blocksMovement: true,
      blocksSight: false,
    });
  });

  it('отвергает сетку мельче пяти клеток', () => {
    const res = battleMapSaveSchema.safeParse({ ...validMap, gridWidth: 4 });
    expect(res.success).toBe(false);
  });

  // Ловушка, ради которой схема проверяет координаты дважды: 25 < 30,
  // то есть потолок перечисления бочка проходит, а в карту 10×10 не
  // помещается.
  it('отвергает препятствие за краем своей сетки', () => {
    const res = battleMapSaveSchema.safeParse({
      ...validMap,
      obstacles: [{ kind: 'BARREL' as const, x: 25, y: 1 }],
    });
    expect(res.success).toBe(false);
  });

  it('отвергает поворот не кратный 45°', () => {
    const res = battleMapSaveSchema.safeParse({
      ...validMap,
      obstacles: [{ kind: 'COLUMN' as const, x: 1, y: 1, rotation: 30 }],
    });
    expect(res.success).toBe(false);
  });
});

describe('participantUpdateSchema', () => {
  it('принимает пару координат', () => {
    expect(participantUpdateSchema.parse({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  });

  it('отвергает пустое тело', () => {
    expect(participantUpdateSchema.safeParse({}).success).toBe(false);
  });

  // Одна координата без второй — это всегда ошибка клиента: фишка
  // стоит в клетке, а не на оси.
  it('отвергает одинокую координату', () => {
    expect(participantUpdateSchema.safeParse({ x: 1 }).success).toBe(false);
  });
});
