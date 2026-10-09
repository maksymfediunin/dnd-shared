import { describe, expect, it } from 'vitest';
import { resizeShift, shiftCellKey, shiftDrawings, shiftTerrain } from './grow.js';

describe('ряд клеток у края', () => {
  it('справа и снизу — без сдвига, слева и сверху — со сдвигом', () => {
    expect(resizeShift('RIGHT', 'ADD')).toEqual({ dx: 0, dy: 0, dw: 1, dh: 0 });
    expect(resizeShift('BOTTOM', 'REMOVE')).toEqual({ dx: 0, dy: 0, dw: 0, dh: -1 });
    expect(resizeShift('LEFT', 'ADD')).toEqual({ dx: 1, dy: 0, dw: 1, dh: 0 });
    expect(resizeShift('TOP', 'REMOVE')).toEqual({ dx: 0, dy: -1, dw: 0, dh: -1 });
  });

  it('местность и линии съезжают, а ушедшее за край пропадает', () => {
    const grid = { width: 5, height: 5 };
    expect(shiftCellKey('3:4', 1, 0)).toBe('4:4');
    expect(shiftTerrain({ '0:0': 'WALL', '2:1': 'CHASM' }, -1, 0, grid)).toEqual({
      '1:1': 'CHASM',
    });
    const line = { color: '#000000', width: 0.1, points: [1, 2, 3.5, 4] };
    expect(shiftDrawings([line], 1, 0, grid)).toEqual([{ ...line, points: [2, 2, 4.5, 4] }]);
    expect(shiftDrawings([line], -1.5, 0, grid)).toEqual([]);
  });
});
