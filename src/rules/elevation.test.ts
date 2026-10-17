import { describe, expect, it } from 'vitest';
import { reachDistance } from './combat.js';
import { fallDice, staysAloft } from './elevation.js';

describe('высота и падение', () => {
  it('30 футов — 3к6, 250 — не больше 20к6, 5 футов — ничего', () => {
    expect(fallDice(30)).toBe(3);
    expect(fallDice(250)).toBe(20);
    expect(fallDice(5)).toBe(0);
  });

  const flier = {
    flySpeed: 60,
    hover: false,
    levitating: false,
    speedZero: false,
    prone: false,
  };

  it('орёл без сознания (скорость 0) падает, бехолдер с парением ошеломлён — висит', () => {
    expect(staysAloft({ ...flier, speedZero: true })).toBe(false);
    expect(staysAloft({ ...flier, hover: true, speedZero: true })).toBe(true);
    expect(staysAloft({ ...flier, prone: true })).toBe(false);
    expect(staysAloft({ ...flier, flySpeed: 0 })).toBe(false);
    expect(staysAloft({ ...flier, flySpeed: 0, levitating: true })).toBe(true);
  });

  it('досягаемость 5 футов не достаёт до летящего на 10 футах; 30 футов прямо над соседом — дистанция 30', () => {
    const goblin = { x: 0, y: 0, size: 'SMALL' as const };
    expect(reachDistance(goblin, { x: 1, y: 0, size: 'MEDIUM', z: 2 })).toBe(2);
    expect(reachDistance(goblin, { x: 1, y: 0, size: 'MEDIUM', z: 6 })).toBe(6);
    expect(reachDistance(goblin, { x: 1, y: 0, size: 'MEDIUM' })).toBe(1);
  });
});
