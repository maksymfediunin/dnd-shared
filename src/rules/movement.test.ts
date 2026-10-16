import { describe, expect, it } from 'vitest';
import { pathTo, reachableCells } from './grid.js';
import { type MovementGridInput, movementGrid } from './movement.js';

const grid = { width: 12, height: 12 };
const base = (patch: Partial<MovementGridInput> = {}): MovementGridInput => ({
  grid,
  cellSizeFeet: 5,
  obstacles: [],
  zones: [],
  mover: { id: 'm', x: 0, y: 0, size: 'MEDIUM', side: 'PARTY' },
  others: [],
  ...patch,
});
const reach = (g: ReturnType<typeof movementGrid>, maxSteps = 20, from = { x: 0, y: 0 }) =>
  reachableCells({ from, span: 1, grid, ...g, maxSteps });

describe('проходимость для шагающего', () => {
  it('трудная местность ×2 и зона ×2 не складываются; «Рост растений» — ×4', () => {
    const g = movementGrid(
      base({
        terrain: { '1:0': 'MUD' },
        zones: [
          { cells: ['1:0'], props: { difficult: 2 } },
          { cells: ['2:0'], props: { difficult: 4 } },
        ],
      }),
    );
    const r = reach(g);
    expect(r.get('1:0')).toBe(2);
    // Обход через соседнюю обычную клетку и шаг в «Рост растений»: 1 + 4.
    expect(r.get('2:0')).toBe(5);
  });

  it('враг того же размера — стена; огр для Маленького полурослика — проходим только с проворством', () => {
    const halfling = { id: 'h', x: 0, y: 0, size: 'SMALL' as const, side: 'PARTY' as const };
    const others = [
      { id: 'g', x: 1, y: 0, size: 'SMALL' as const, side: 'HOSTILE' as const, isDead: false },
      { id: 'o', x: 0, y: 2, size: 'MEDIUM' as const, side: 'HOSTILE' as const, isDead: false },
    ];
    const plain = movementGrid(base({ mover: halfling, others }));
    expect(plain.walls.has('1:0')).toBe(true);
    expect(plain.walls.has('0:2')).toBe(true);
    const nimble = movementGrid(
      base({ mover: { ...halfling, rules: { moveThroughLarger: true } }, others }),
    );
    expect(nimble.walls.has('1:0')).toBe(true);
    expect(nimble.walls.has('0:2')).toBe(false);
    expect(nimble.tokens.has('0:2')).toBe(true);
    // Сквозь орка — 10 футов (клетка в два шага), встать в нём нельзя.
    const r = reach(nimble, 20);
    expect(r.has('0:2')).toBe(false);
    expect(r.get('0:3')).toBe(3);
  });

  it('союзник — трудная клетка, где нельзя остановиться', () => {
    const g = movementGrid(
      base({ others: [{ id: 'a', x: 1, y: 0, size: 'MEDIUM', side: 'PARTY', isDead: false }] }),
    );
    expect(g.difficult.has('1:0')).toBe(true);
    expect(g.tokens.has('1:0')).toBe(true);
    expect(g.walls.has('1:0')).toBe(false);
  });

  it('монах 9: глубокая вода проходима, но в ней не остановиться', () => {
    const g = movementGrid(
      base({
        terrain: { '1:0': 'DEEP_WATER', '2:0': 'DEEP_WATER' },
        mover: { id: 'm', x: 0, y: 0, size: 'MEDIUM', rules: { liquidWalk: true } },
      }),
    );
    const r = reach(g);
    expect(r.has('1:0')).toBe(false);
    expect(r.get('3:0')).toBe(3);
    expect(movementGrid(base({ terrain: { '1:0': 'DEEP_WATER' } })).walls.has('1:0')).toBe(true);
  });

  it('летящий: пропасть проходима, заросли без удвоения, наземная зона не мешает', () => {
    const g = movementGrid(
      base({
        terrain: { '1:0': 'CHASM', '2:0': 'UNDERBRUSH' },
        zones: [{ cells: ['3:0'], props: { difficult: 2, ground: true } }],
        mover: { id: 'm', x: 0, y: 0, size: 'MEDIUM', flying: true },
      }),
    );
    expect(g.walls.has('1:0')).toBe(false);
    expect(reach(g).get('3:0')).toBe(3);
  });

  it('поступь по земле: заросли без удвоения, «Опутывание» — ×2', () => {
    const g = movementGrid(
      base({
        terrain: { '1:0': 'UNDERBRUSH', '2:0': 'UNDERBRUSH' },
        zones: [{ cells: ['3:0'], props: { difficult: 2, ground: true } }],
        mover: { id: 'm', x: 0, y: 0, size: 'MEDIUM', rules: { ignoreNonmagicalDifficult: true } },
      }),
    );
    const r = reach(g);
    expect(r.get('2:0')).toBe(2);
    expect(r.get('3:0')).toBe(4);
  });
});

describe('путь шага', () => {
  it('та же цена, что у обхода; при равной цене — мимо вредной клетки', () => {
    const input = {
      from: { x: 0, y: 1 },
      span: 1,
      grid,
      walls: new Set<string>(),
      tokens: new Set<string>(),
      maxSteps: 10,
    };
    const path = pathTo(input, { x: 2, y: 1 }, new Set(['1:1']));
    expect(path).toHaveLength(2);
    expect(path?.some((c) => c.x === 1 && c.y === 1)).toBe(false);
    expect(pathTo(input, { x: 2, y: 1 })).toHaveLength(2);
    expect(pathTo({ ...input, maxSteps: 1 }, { x: 3, y: 1 })).toBeNull();
  });

  it('путь вокруг стены', () => {
    const walls = new Set(['1:0', '1:1', '1:2']);
    const path = pathTo(
      { from: { x: 0, y: 0 }, span: 1, grid, walls, tokens: new Set(), maxSteps: 10 },
      { x: 2, y: 0 },
    );
    expect(path?.at(-1)).toEqual({ x: 2, y: 0 });
    expect(path).toHaveLength(6);
  });
});
