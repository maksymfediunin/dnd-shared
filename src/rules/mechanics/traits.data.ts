import type { MechanicRecord } from './types.js';

/** Расовые черты (`traits.json`) — по коду источника, без хвоста расы. */
export const TRAIT_MECHANICS: Readonly<Record<string, MechanicRecord>> = {
  // Преимущество на спасброски от яда — волна 4 (`PARTIAL`).
  'dwarven-resilience': { facets: [{ kind: 'defense', resistance: ['poison'] }] },
  'hellish-resistance': { facets: [{ kind: 'defense', resistance: ['fire'] }] },
  'damage-resistance': { facets: [{ kind: 'defense', resistance: ['ANCESTRY'] }] },
  'dwarven-toughness': { facets: [{ kind: 'modifier', target: 'hpPerLevel', amount: 1 }] },
};
