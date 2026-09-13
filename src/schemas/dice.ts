import { z } from 'zod';
import { abilityCodeSchema } from '../enums/character.js';
import {
  DICE_MAX_COUNT,
  DICE_MIN_COUNT,
  DICE_MODIFIER_LIMIT,
  DICE_SIDES,
  advantageModeSchema,
  diceVisibilitySchema,
} from '../enums/dice.js';

// Набор граней проверяется списком, а не диапазоном: между 12 и 20
// нет ни одной кости, а диапазон пропустил бы d13.
const diceSidesSchema = z
  .number()
  .int()
  .refine((n) => (DICE_SIDES as readonly number[]).includes(n));

export const diceRollInputSchema = z
  .object({
    diceCount: z.number().int().min(DICE_MIN_COUNT).max(DICE_MAX_COUNT),
    diceSides: diceSidesSchema,
    modifier: z.number().int().min(-DICE_MODIFIER_LIMIT).max(DICE_MODIFIER_LIMIT).default(0),
    characterId: z.uuid().optional(),
    abilityCode: abilityCodeSchema.optional(),
    skillCode: z.string().trim().min(1).max(64).optional(),
    isSavingThrow: z.boolean().default(false),
    advantageMode: advantageModeSchema.default('NONE'),
    visibility: diceVisibilitySchema.default('PUBLIC'),
  })
  .refine(
    (v) => v.advantageMode === 'NONE' || (v.diceCount === 1 && v.diceSides === 20),
    { path: ['advantageMode'], message: 'Преимущество и помеха бывают только у одного d20' },
  );

export type DiceRollInput = z.infer<typeof diceRollInputSchema>;
