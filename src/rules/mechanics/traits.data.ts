import type { MechanicRecord } from './types.js';

/** Расовые черты (`traits.json`) — по коду источника, без хвоста расы. */
export const TRAIT_MECHANICS: Readonly<Record<string, MechanicRecord>> = {
  // Преимущество на спасброски от яда — волна 4 (`PARTIAL`).
  'dwarven-resilience': { facets: [{ kind: 'defense', resistance: ['poison'] }] },
  'hellish-resistance': { facets: [{ kind: 'defense', resistance: ['fire'] }] },
  'damage-resistance': { facets: [{ kind: 'defense', resistance: ['ANCESTRY'] }] },
  'dwarven-toughness': { facets: [{ kind: 'modifier', target: 'hpPerLevel', amount: 1 }] },
  // Форма, вид урона и спасбросок — из `TraitEffects.breathWeapon` выбранного предка.
  'breath-weapon': {
    facets: [
      { kind: 'resource', code: 'BREATH_WEAPON', recovery: 'SHORT' },
      {
        kind: 'action',
        ability: 'BREATH_WEAPON',
        economy: 'ACTION',
        resource: 'BREATH_WEAPON',
        input: { target: 'AREA' },
      },
    ],
  },
  // Реакция — окно волны 4 (`PARTIAL`); счётчик уже на листе.
  'relentless-endurance': {
    facets: [{ kind: 'resource', code: 'RELENTLESS_ENDURANCE', recovery: 'LONG' }],
  },
  // Заклинания черты — волна 8 (`PARTIAL`).
  'infernal-legacy': {
    facets: [
      { kind: 'resource', code: 'INFERNAL_REBUKE', recovery: 'LONG', fromLevel: 3 },
      { kind: 'resource', code: 'INFERNAL_DARKNESS', recovery: 'LONG', fromLevel: 5 },
    ],
  },

  // Пометки: механики в бою нет, и запись говорит почему.
  'draconic-ancestry': { holder: 'choice' },
  'draconic-ancestry-black': { holder: 'choice' },
  'draconic-ancestry-blue': { holder: 'choice' },
  'draconic-ancestry-brass': { holder: 'choice' },
  'draconic-ancestry-bronze': { holder: 'choice' },
  'draconic-ancestry-copper': { holder: 'choice' },
  'draconic-ancestry-gold': { holder: 'choice' },
  'draconic-ancestry-green': { holder: 'choice' },
  'draconic-ancestry-red': { holder: 'choice' },
  'draconic-ancestry-silver': { holder: 'choice' },
  'draconic-ancestry-white': { holder: 'choice' },
  'dwarven-combat-training': { sheet: 'proficiencies' },
  'tool-proficiency': { sheet: 'proficiencies' },
  'elf-weapon-training': { sheet: 'proficiencies' },
  'keen-senses': { sheet: 'proficiencies' },
  'skill-versatility': { sheet: 'proficiencies' },
  menacing: { sheet: 'proficiencies' },
  'high-elf-cantrip': { sheet: 'spells' },
  stonecunning: { outOfCombat: 'знания о камне' },
  trance: { outOfCombat: 'отдых' },
  'extra-language': { outOfCombat: 'язык' },
  'artificers-lore': { outOfCombat: 'знания о предметах' },
  tinker: { outOfCombat: 'поделки — минуты и часы' },
};
