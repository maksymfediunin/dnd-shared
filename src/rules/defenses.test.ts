import { describe, expect, it } from 'vitest';
import {
  type DamageDefenseSet,
  type DamageSource,
  damageDefenseCodes,
  defendedAmount,
  isGoodAlignment,
  plainDamageTypes,
} from './defenses.js';

const set = (codes: Partial<DamageDefenseSet>): DamageDefenseSet => ({
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  ...codes,
});
const werewolf = set({
  immunities: damageDefenseCodes(
    "bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
  ) as string[],
});
const steel: DamageSource = { isAttack: true, magical: false };

describe('защита с оговорками (р. 13)', () => {
  it('оборотень: сталь 10 → 0, серебро → 10, магический → 10', () => {
    expect(defendedAmount(10, 'slashing', werewolf, steel)).toBe(0);
    expect(defendedAmount(10, 'slashing', werewolf, { ...steel, silvered: true })).toBe(10);
    expect(defendedAmount(10, 'slashing', werewolf, { isAttack: true, magical: true })).toBe(10);
  });

  it('удар плотяного голема (магическое оружие) по оборотню 13 → 13', () => {
    expect(defendedAmount(13, 'bludgeoning', werewolf, { isAttack: true, magical: true })).toBe(13);
  });

  it('монах 5 без оружия → 0, монах 6 («Удары, усиленные ци») → 7', () => {
    expect(defendedAmount(7, 'bludgeoning', werewolf, steel)).toBe(0);
    expect(defendedAmount(7, 'bludgeoning', werewolf, { isAttack: true, magical: true })).toBe(7);
  });

  it('ракшас: паладин (добрый) магическим копьём 10 → 20, злой — 10', () => {
    const rakshasa = set({
      immunities: damageDefenseCodes(
        'bludgeoning, piercing, and slashing from nonmagical weapons',
      ) as string[],
      vulnerabilities: damageDefenseCodes(
        'piercing from magic weapons wielded by good creatures',
      ) as string[],
    });
    const magic = { isAttack: true, magical: true };
    expect(defendedAmount(10, 'piercing', rakshasa, { ...magic, attackerGood: true })).toBe(20);
    expect(defendedAmount(10, 'piercing', rakshasa, magic)).toBe(10);
    expect(defendedAmount(10, 'piercing', rakshasa, steel)).toBe(0);
  });

  it('скелет дробящим 7 → 14', () => {
    expect(defendedAmount(7, 'bludgeoning', set({ vulnerabilities: ['bludgeoning'] }), steel)).toBe(
      14,
    );
  });

  it('падение по горгулье — оговорка «атаки» молчит', () => {
    const gargoyle = set({
      resistances: damageDefenseCodes(
        "bludgeoning, piercing, and slashing from nonmagical weapons that aren't adamantine",
      ) as string[],
    });
    expect(defendedAmount(10, 'bludgeoning', gargoyle, { isAttack: false, magical: false })).toBe(
      10,
    );
    expect(defendedAmount(10, 'bludgeoning', gargoyle, steel)).toBe(5);
    expect(defendedAmount(10, 'bludgeoning', gargoyle, { ...steel, adamantine: true })).toBe(10);
  });

  it('огненный элементаль: огонь → 0; «урон от заклинаний» — только заклинанием', () => {
    expect(defendedAmount(9, 'fire', set({ immunities: ['fire'] }), steel)).toBe(0);
    const archmage = set({ resistances: ['spell'] });
    expect(
      defendedAmount(9, 'fire', archmage, { isAttack: false, magical: true, fromSpell: true }),
    ).toBe(4);
    expect(defendedAmount(9, 'fire', archmage, steel)).toBe(9);
  });

  it('таблица строк: незнакомое — null, «from stoneskin» — пусто, простые — для снимка', () => {
    expect(damageDefenseCodes('fire')).toEqual(['fire']);
    expect(
      damageDefenseCodes(
        'bludgeoning, piercing, and slashing from nonmagical attacks (from stoneskin)',
      ),
    ).toEqual([]);
    expect(damageDefenseCodes('slashing from cold iron')).toBeNull();
    expect(plainDamageTypes(['fire', 'slashing@nonmagical', 'spell'])).toEqual(['fire']);
  });

  it('ракшас: колющий магическим оружием доброго — вдвое; заклинанием доброго — нет', () => {
    const rakshasa = set({ vulnerabilities: ['piercing@magical-good'] });
    const good = { isAttack: true, magical: true, attackerGood: true };
    expect(defendedAmount(6, 'piercing', rakshasa, good)).toBe(12);
    expect(defendedAmount(6, 'piercing', rakshasa, { ...good, fromSpell: true })).toBe(6);
  });

  it('доброе мировоззрение', () => {
    expect(isGoodAlignment('LAWFUL_GOOD')).toBe(true);
    expect(isGoodAlignment('lawful evil')).toBe(false);
    expect(isGoodAlignment('any non-good alignment')).toBe(false);
  });
});
