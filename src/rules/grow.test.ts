import { describe, expect, it } from 'vitest';
import { growShift, shiftCellKey, shiftDrawings, shiftTerrain } from './grow.js';

describe('рост сетки', () => {
  it('справа и снизу — без сдвига, слева и сверху — со сдвигом', () => {
    expect(growShift('RIGHT')).toEqual({ dx: 0, dy: 0, dw: 1, dh: 0 });
    expect(growShift('BOTTOM')).toEqual({ dx: 0, dy: 0, dw: 0, dh: 1 });
    expect(growShift('LEFT')).toEqual({ dx: 1, dy: 0, dw: 1, dh: 0 });
    expect(growShift('TOP')).toEqual({ dx: 0, dy: 1, dw: 0, dh: 1 });
  });

  it('местность, ключи клеток и линии съезжают вместе', () => {
    expect(shiftCellKey('3:4', 1, 0)).toBe('4:4');
    expect(shiftTerrain({ '0:0': 'WALL', '2:1': 'ROCK' }, 0, 1)).toEqual({
      '0:1': 'WALL',
      '2:2': 'ROCK',
    });
    expect(shiftDrawings([{ color: '#000000', width: 0.1, points: [1, 2, 3.5, 4] }], 1, 0)).toEqual(
      [{ color: '#000000', width: 0.1, points: [2, 2, 4.5, 4] }],
    );
  });
});
