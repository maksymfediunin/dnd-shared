import { describe, expect, it } from 'vitest';
import {
  darknessDispelledBy,
  dispersedBy,
  type SceneZone,
  silencedAt,
  zoneProps,
} from './zones.js';

const zone = (
  id: string,
  spellCode: string,
  cells: string[],
  level: number | null = null,
): SceneZone => ({
  id,
  spellCode,
  variant: null,
  holderId: 'h',
  cells: new Set(cells),
  points: [],
  props: zoneProps(spellCode),
  level,
});

describe('зоны как объекты сцены', () => {
  it('«Паутина» не срабатывает при сотворении (разбор §3), туман рассеивается ветром', () => {
    expect(zoneProps('web').onCast).toBeUndefined();
    expect(zoneProps('web').on).toEqual(['ENTER', 'START']);
    expect(zoneProps('fog-cloud')).toEqual({ obscure: 'HEAVY', dispersedBy: 'WIND' });
    expect(zoneProps('fireball')).toEqual({});
  });

  it('«Дневной свет» снимает «Тьму» с ячейки 2 и не снимает с ячейки 4; вспышка — любую', () => {
    const day = zone('d', 'daylight', ['1:1', '2:2']);
    const low = zone('t2', 'darkness', ['2:2'], 2);
    const high = zone('t4', 'darkness', ['2:2'], 4);
    const far = zone('t1', 'darkness', ['9:9'], 1);
    expect(darknessDispelledBy(day, [day, low, high, far])).toEqual(['t2']);
    const burst = zone('s', 'sunburst', ['2:2']);
    expect(darknessDispelledBy(burst, [low, high])).toEqual(['t2', 't4']);
  });

  it('«Порыв ветра» рассеивает туман в линии, а «Тишину» — нет', () => {
    const gust = zone('g', 'gust-of-wind', ['1:0', '2:0']);
    const fog = zone('f', 'fog-cloud', ['2:0']);
    const silence = zone('s', 'silence', ['2:0']);
    expect(dispersedBy(gust, [gust, fog, silence])).toEqual(['f']);
  });

  it('в «Тишине» — только стоящий целиком внутри', () => {
    const silence = zone('s', 'silence', ['0:0', '1:0', '0:1']);
    expect(silencedAt([silence], { x: 0, y: 0, size: 'MEDIUM' })).toBe(true);
    expect(silencedAt([silence], { x: 0, y: 0, size: 'LARGE' })).toBe(false);
  });
});
