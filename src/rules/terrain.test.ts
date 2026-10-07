import { describe, expect, it } from 'vitest';
import { MAP_TERRAIN_KINDS } from '../enums/map.js';
import {
  MAP_TERRAIN_RULES,
  terrainCells,
  terrainKeyInGrid,
  terrainOutsideGrid,
} from './terrain.js';

describe('MAP_TERRAIN_RULES', () => {
  // Таблица спеки 7 октября: четыре непроходимых, четыре трудных, и
  // ни один вид не бывает тем и другим разом.
  it('у каждого вида ровно одно из двух: не пройти или ход ×2', () => {
    for (const kind of MAP_TERRAIN_KINDS) {
      const rule = MAP_TERRAIN_RULES[kind];
      expect(rule.blocksMovement !== rule.difficult, kind).toBe(true);
    }
    expect(MAP_TERRAIN_KINDS.filter((k) => MAP_TERRAIN_RULES[k].blocksMovement)).toEqual([
      'WALL',
      'DEEP_WATER',
      'CHASM',
      'LAVA',
    ]);
  });

  it('обзор закрывает только стена', () => {
    expect(MAP_TERRAIN_KINDS.filter((k) => MAP_TERRAIN_RULES[k].blocksSight)).toEqual(['WALL']);
  });
});

describe('terrainCells', () => {
  it('отбирает клетки по свойству вида', () => {
    const terrain = { '0:0': 'WALL', '1:0': 'MUD', '2:0': 'CHASM' } as const;
    expect([...terrainCells(terrain, (r) => r.blocksMovement)]).toEqual(['0:0', '2:0']);
    expect([...terrainCells(terrain, (r) => r.difficult)]).toEqual(['1:0']);
  });
});

describe('terrainOutsideGrid', () => {
  const grid = { width: 10, height: 5 };

  it('первый ключ за краем сетки', () => {
    expect(terrainOutsideGrid({ '9:4': 'WALL', '10:0': 'WALL' }, grid)).toBe('10:0');
    expect(terrainOutsideGrid({ '0:5': 'MUD' }, grid)).toBe('0:5');
  });

  it('всё в сетке — null', () => {
    expect(terrainOutsideGrid({ '9:4': 'WALL' }, grid)).toBeNull();
    expect(terrainKeyInGrid('0:0', grid)).toBe(true);
  });
});
