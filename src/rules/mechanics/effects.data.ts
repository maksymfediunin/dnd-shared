import type { EffectCode, EffectMechanic } from './types.js';

/** Эффекты со сроком на участнике (`ParticipantEffect.code`) и что они дают, пока висят. */
export const EFFECT_MECHANICS: Readonly<Record<EffectCode, EffectMechanic>> = {
  /**
   * Ярость (SRD): все выгоды — «if you aren't wearing heavy armor».
   * Запрет колдовства и концентрации — волна 3 (`PARTIAL`).
   */
  RAGE: {
    facets: [
      {
        kind: 'modifier',
        target: 'damage',
        amount: { table: 'rageDamage' },
        source: 'rage',
        when: ['meleeWeapon', 'strengthAttack', 'notHeavyArmor'],
      },
      {
        kind: 'defense',
        resistance: ['bludgeoning', 'piercing', 'slashing'],
        when: ['notHeavyArmor'],
      },
      {
        kind: 'advantage',
        roll: 'save',
        ability: 'strength',
        mode: 'ADVANTAGE',
        when: ['notHeavyArmor'],
      },
      {
        kind: 'advantage',
        roll: 'check',
        ability: 'strength',
        mode: 'ADVANTAGE',
        when: ['notHeavyArmor'],
      },
    ],
    expires: 'COMBAT_END',
    rounds: 10,
    endsWhenIdle: true,
    endsOnUnconscious: true,
  },
};
