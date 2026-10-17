import { describe, expect, it } from 'vitest';
import { cellsInArea } from './areas.js';
import { coverOf, type SceneVisionInput, sceneVision } from './vision.js';

const grid = { width: 20, height: 20 };
const scene = (patch: Partial<SceneVisionInput> = {}) =>
  sceneVision({
    grid,
    cellSizeFeet: 5,
    lighting: 'BRIGHT',
    obstacles: [],
    zones: [],
    lights: [],
    ...patch,
  });
const at = (x: number, y: number) => ({ x, y, size: 'MEDIUM' as const });

describe('укрытие', () => {
  it('в чистом поле укрытия нет', () => {
    expect(coverOf(at(0, 5), at(6, 5), scene(), [])).toBe('NONE');
  });

  it('союзник на линии — половинное', () => {
    expect(coverOf(at(0, 5), at(6, 5), scene(), [at(5, 5)])).toBe('HALF');
  });

  it('существо при четырёх перекрытых линиях — всё равно половинное', () => {
    expect(coverOf(at(0, 5), at(6, 5), scene(), [at(5, 4), at(5, 5), at(5, 6)])).toBe('HALF');
  });

  it('низкая преграда (бревно, LOW) поперёк линии — три четверти, а не полное', () => {
    const v = scene({ obstacles: [{ kind: 'LOG_V', x: 5, y: 4 }] });
    expect(coverOf(at(0, 5), at(6, 5), v, [])).toBe('THREE_QUARTERS');
  });

  it('один ящик перед целью — половинное: нижний угол атакующего бьёт мимо', () => {
    const v = scene({ obstacles: [{ kind: 'CRATE', x: 5, y: 5 }] });
    expect(coverOf(at(0, 5), at(6, 5), v, [])).toBe('HALF');
  });

  it('летящий на 15 футах — ящик не в счёт', () => {
    const v = scene({ obstacles: [{ kind: 'LOG_V', x: 5, y: 4 }] });
    expect(coverOf(at(0, 5), at(6, 5), v, [], { aloft: true })).toBe('NONE');
  });

  it('стена целиком — полное', () => {
    const v = scene({
      terrain: { '5:3': 'WALL', '5:4': 'WALL', '5:5': 'WALL', '5:6': 'WALL', '5:7': 'WALL' },
    });
    expect(coverOf(at(0, 5), at(6, 5), v, [])).toBe('TOTAL');
  });

  it('лучший угол атакующего выбирается сам: из-за угла стены видно', () => {
    // Стена над линией: нижние углы атакующего стреляют чисто.
    const v = scene({ terrain: { '3:4': 'WALL' } });
    expect(coverOf(at(0, 5), at(6, 5), v, [])).toBe('NONE');
  });

  it('точка исхода области — клетка за углом стены выпадает из области', () => {
    const v = scene({ terrain: { '6:4': 'WALL', '6:5': 'WALL', '6:6': 'WALL' } });
    const blockers = new Set([...v.opaque, ...v.solid]);
    const area = cellsInArea({
      shape: 'SPHERE',
      sizeFeet: 20,
      origin: { x: 5, y: 5 },
      cellSizeFeet: 5,
      grid,
      blockers,
    });
    expect(area.has('4:5')).toBe(true);
    expect(area.has('7:5')).toBe(false);
    expect(area.has('6:5')).toBe(false);
    expect(coverOf({ point: { x: 5, y: 5 } }, at(7, 5), v, [])).toBe('TOTAL');
  });
});
