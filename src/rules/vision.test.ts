import { describe, expect, it } from 'vitest';
import {
  cellLightFor,
  deserializeVision,
  type Looked,
  type Looker,
  NO_SENSES,
  type SceneVisionInput,
  sceneVision,
  segmentClear,
  serializeVision,
  sightOf,
} from './vision.js';

const grid = { width: 30, height: 30 };
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

const looker = (x: number, y: number, senses: Partial<Looker['senses']> = {}): Looker => ({
  x,
  y,
  size: 'MEDIUM',
  senses: { ...NO_SENSES, ...senses },
  blinded: false,
});
const looked = (x: number, y: number, patch: Partial<Looked> = {}): Looked => ({
  x,
  y,
  size: 'MEDIUM',
  invisible: false,
  revealed: false,
  ...patch,
});

describe('линии на сетке', () => {
  it('касание угла стены не перекрывает; отрезок сквозь стену — перекрыт', () => {
    const wall = new Set(['1:1']);
    expect(segmentClear({ x: 0, y: 0 }, { x: 1, y: 1 }, wall)).toBe(true);
    expect(segmentClear({ x: 0.5, y: 1.5 }, { x: 2.5, y: 1.5 }, wall)).toBe(false);
  });

  it('диагональ мимо двух угловых стен проходит', () => {
    const walls = new Set(['1:0', '0:1']);
    expect(segmentClear({ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }, walls)).toBe(true);
  });

  it('вдоль шва двух клеток стены не пройти, вдоль одной — можно', () => {
    expect(segmentClear({ x: 1, y: 5 }, { x: 2, y: 5 }, new Set(['1:4', '1:5']))).toBe(false);
    expect(segmentClear({ x: 1, y: 5 }, { x: 2, y: 5 }, new Set(['1:5']))).toBe(true);
  });
});

describe('обзор', () => {
  it('стена между — не видно', () => {
    const v = scene({ terrain: { '5:0': 'WALL', '5:1': 'WALL', '5:2': 'WALL' } });
    expect(sightOf(looker(3, 1), looked(7, 1), v)).toBe('NONE');
    expect(sightOf(looker(3, 1), looked(4, 6), v)).toBe('CLEAR');
  });

  it('туман между двумя участниками вне тумана — не видно', () => {
    const v = scene({ zones: [{ cells: ['5:5'], props: { obscure: 'HEAVY' } }] });
    expect(sightOf(looker(3, 5), looked(7, 5), v)).toBe('NONE');
  });

  it('слепое зрение 30: в тумане видно, за стеной — нет', () => {
    const fog = scene({ zones: [{ cells: ['5:5'], props: { obscure: 'HEAVY' } }] });
    expect(sightOf(looker(3, 5, { blindsight: 30 }), looked(5, 5), fog)).toBe('CLEAR');
    const wall = scene({ terrain: { '4:4': 'WALL', '4:5': 'WALL', '4:6': 'WALL' } });
    expect(sightOf(looker(3, 5, { blindsight: 30 }), looked(5, 5), wall)).toBe('NONE');
  });

  it('невидимый не виден; «Видение невидимого» — виден; истинное зрение 120 — виден в 60 футах', () => {
    const v = scene();
    expect(sightOf(looker(0, 0), looked(12, 0, { invisible: true }), v)).toBe('NONE');
    expect(
      sightOf(looker(0, 0, { seeInvisible: true }), looked(12, 0, { invisible: true }), v),
    ).toBe('CLEAR');
    expect(sightOf(looker(0, 0, { truesight: 120 }), looked(12, 0, { invisible: true }), v)).toBe(
      'CLEAR',
    );
    expect(sightOf(looker(0, 0), looked(12, 0, { invisible: true, revealed: true }), v)).toBe(
      'CLEAR',
    );
  });

  it('спрятавшийся (HIDDEN) не виден', () => {
    expect(sightOf(looker(0, 0), looked(2, 0), scene(), { hiddenFromViewer: true })).toBe('NONE');
  });

  it('ослеплённый не видит', () => {
    expect(sightOf({ ...looker(0, 0), blinded: true }, looked(1, 0), scene())).toBe('NONE');
  });
});

describe('свет', () => {
  it('факел: 20 футов ярко, ещё 20 тускло, дальше темно; за стеной темно', () => {
    const v = scene({
      lighting: 'DARK',
      lights: [{ cells: [{ x: 10, y: 10 }], bright: 20, dim: 20 }],
      terrain: { '7:10': 'WALL' },
    });
    expect(v.light.get('14:10')).toBeUndefined();
    expect(v.light.get('16:10')).toBe('DIM');
    expect(v.light.get('19:10')).toBe('DARK');
    expect(v.light.get('6:10')).toBe('DARK');
  });

  it('«Тьма» гасит факел в своих клетках', () => {
    const v = scene({
      lighting: 'DARK',
      lights: [{ cells: [{ x: 10, y: 10 }], bright: 20, dim: 20 }],
      zones: [{ cells: ['10:10', '11:10'], props: { magicalDarkness: true, obscure: 'HEAVY' } }],
    });
    expect(v.light.get('10:10')).toBe('DARK');
    expect(v.light.get('12:10')).toBeUndefined();
  });

  it('тёмное зрение 60: тьма в 40 футах — видно смутно, в 70 — не видно', () => {
    const v = scene({ lighting: 'DARK' });
    expect(sightOf(looker(0, 0, { darkvision: 60 }), looked(8, 0), v)).toBe('OBSCURED');
    expect(sightOf(looker(0, 0, { darkvision: 60 }), looked(14, 0), v)).toBe('NONE');
    expect(sightOf(looker(0, 0), looked(8, 0), v)).toBe('NONE');
  });

  it('тусклый свет — смутно; с тёмным зрением — ясно', () => {
    const v = scene({ lighting: 'DIM' });
    expect(sightOf(looker(0, 0), looked(4, 0), v)).toBe('OBSCURED');
    expect(sightOf(looker(0, 0, { darkvision: 60 }), looked(4, 0), v)).toBe('CLEAR');
  });

  it('освещённую цель видно через тёмное поле', () => {
    const v = scene({
      lighting: 'DARK',
      lights: [{ cells: [{ x: 20, y: 0 }], bright: 10, dim: 0 }],
    });
    expect(sightOf(looker(0, 0), looked(20, 0), v)).toBe('CLEAR');
  });

  it('дьявольское зрение пробивает «Тьму», тёмное — нет', () => {
    const v = scene({
      zones: [{ cells: ['8:0', '9:0'], props: { magicalDarkness: true } }],
    });
    expect(sightOf(looker(0, 0, { darkvision: 120 }), looked(8, 0), v)).toBe('NONE');
    expect(sightOf(looker(0, 0, { devilsSight: 120 }), looked(8, 0), v)).toBe('CLEAR');
    expect(cellLightFor(looker(0, 0, { devilsSight: 120 }), '9:0', v)).toBe('BRIGHT');
  });

  it('снимок — туда и обратно без потерь', () => {
    const v = scene({ lighting: 'DIM', terrain: { '1:1': 'WALL' } });
    const back = deserializeVision(JSON.parse(JSON.stringify(serializeVision(v))));
    expect([...back.opaque]).toEqual(['1:1']);
    expect(back.light.get('0:0')).toBe('DIM');
  });
});
