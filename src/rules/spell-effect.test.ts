import { describe, expect, it } from 'vitest';
import { hasMachineEffect } from './spell-effect.js';

const NOTHING = {
  attackType: null,
  saveAbility: null,
  damageType: null,
  damageAtSlotLevel: null,
  damageAtLevel: null,
  healAtSlotLevel: null,
};

describe('hasMachineEffect', () => {
  it('у заклинания без единого машинного поля эффекта нет', () => {
    expect(hasMachineEffect(NOTHING)).toBe(false);
  });

  it('спасбросок делает эффект машинным', () => {
    expect(hasMachineEffect({ ...NOTHING, saveAbility: 'DEX' })).toBe(true);
  });

  it('атака делает эффект машинным', () => {
    expect(hasMachineEffect({ ...NOTHING, attackType: 'RANGED' })).toBe(true);
  });

  it('лечение делает эффект машинным', () => {
    expect(hasMachineEffect({ ...NOTHING, healAtSlotLevel: { '1': '1d8' } })).toBe(true);
  });

  it('область сама по себе эффектом не считается: это прицеливание, а не разрешение', () => {
    expect(hasMachineEffect(NOTHING)).toBe(false);
  });
});
