export const REFERENCE_ENTITIES = [
  'races',
  'racial-traits',
  'classes',
  'subclasses',
  'class-features',
  'backgrounds',
  'skills',
  'languages',
  'items',
  'weapon-profiles',
  'armor-profiles',
  'spells',
  'spell-classes',
  'conditions',
  'monsters',
  'monster-actions',
] as const;

export type ReferenceEntity = (typeof REFERENCE_ENTITIES)[number];
