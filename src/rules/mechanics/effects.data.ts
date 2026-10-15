import type { EffectCode, EffectMechanic } from './types.js';

/** Эффекты со сроком на участнике (`ParticipantEffect.code`) и что они дают, пока висят. */
export const EFFECT_MECHANICS: Readonly<Partial<Record<EffectCode, EffectMechanic>>> = {};
