import { describe, expect, it } from 'vitest';
import {
  MAP_MAX_MONSTER_PRESETS,
  MAP_MAX_MONSTER_QUANTITY,
  MAP_MAX_OBSTACLES,
  MAP_ROTATION_STEP,
} from '../enums/map.js';
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

  // C19: потолок поворота — полный оборот минус шаг. 360° это тот же
  // ноль, и два разных числа для одного положения схема принимать не
  // должна.
  it('принимает крайний поворот 315° и отвергает полный оборот', () => {
    const last = 360 - MAP_ROTATION_STEP;
    const ok = battleMapSaveSchema.safeParse({
      ...validMap,
      obstacles: [{ kind: 'COLUMN' as const, x: 1, y: 1, rotation: last }],
    });
    expect(ok.success).toBe(true);

    const full = battleMapSaveSchema.safeParse({
      ...validMap,
      obstacles: [{ kind: 'COLUMN' as const, x: 1, y: 1, rotation: 360 }],
    });
    expect(full.success).toBe(false);
  });

  // C19: пределы одного сохранения. Заготовка на 201 препятствие — это
  // не карта, а склад, и упереться в предел надо на разборе тела, а не
  // на записи в базу.
  it('принимает ровно предел препятствий и отвергает один сверх него', () => {
    const obstacles = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        kind: 'ROCK' as const,
        x: i % 10,
        y: Math.floor(i / 10) % 10,
      }));

    expect(
      battleMapSaveSchema.safeParse({ ...validMap, obstacles: obstacles(MAP_MAX_OBSTACLES) })
        .success,
    ).toBe(true);
    expect(
      battleMapSaveSchema.safeParse({ ...validMap, obstacles: obstacles(MAP_MAX_OBSTACLES + 1) })
        .success,
    ).toBe(false);
  });

  it('принимает ровно предел пресетов монстров и отвергает один сверх него', () => {
    const monsters = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        monsterCode: 'goblin',
        x: i % 10,
        y: Math.floor(i / 10) % 10,
        quantity: 1,
      }));

    expect(
      battleMapSaveSchema.safeParse({ ...validMap, monsters: monsters(MAP_MAX_MONSTER_PRESETS) })
        .success,
    ).toBe(true);
    expect(
      battleMapSaveSchema.safeParse({
        ...validMap,
        monsters: monsters(MAP_MAX_MONSTER_PRESETS + 1),
      }).success,
    ).toBe(false);
  });

  it('принимает ровно предел численности пресета и отвергает один сверх него', () => {
    const preset = (quantity: number) => ({ monsterCode: 'goblin', x: 5, y: 5, quantity });

    expect(
      battleMapSaveSchema.safeParse({ ...validMap, monsters: [preset(MAP_MAX_MONSTER_QUANTITY)] })
        .success,
    ).toBe(true);
    expect(
      battleMapSaveSchema.safeParse({
        ...validMap,
        monsters: [preset(MAP_MAX_MONSTER_QUANTITY + 1)],
      }).success,
    ).toBe(false);
  });

  // C7: поле стало редактируемым в редакторе заготовки — пределы
  // схемы и пределы поля обязаны совпадать.
  it('размер клетки держится в своих пределах', () => {
    expect(battleMapSaveSchema.safeParse({ ...validMap, cellSizeFeet: 0 }).success).toBe(false);
    expect(battleMapSaveSchema.safeParse({ ...validMap, cellSizeFeet: 21 }).success).toBe(false);
    expect(battleMapSaveSchema.parse({ ...validMap, cellSizeFeet: 10 }).cellSizeFeet).toBe(10);
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
    expect(participantUpdateSchema.safeParse({ y: 1 }).success).toBe(false);
  });

  // C29: путь ошибки указывает на недостающую координату — по нему
  // форма подсвечивает поле, и на одиноком `y` подсветка уходила на
  // пустое соседнее.
  it('в отказе указана та координата, которой не хватает', () => {
    const withoutY = participantUpdateSchema.safeParse({ x: 1 });
    expect(withoutY.error?.issues.at(-1)?.path).toEqual(['y']);

    const withoutX = participantUpdateSchema.safeParse({ y: 1 });
    expect(withoutX.error?.issues.at(-1)?.path).toEqual(['x']);
  });
});
