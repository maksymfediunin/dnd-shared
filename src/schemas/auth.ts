import { z } from 'zod';
import { localeSchema } from '../enums/locale.js';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

/**
 * Верхняя граница не декоративная: argon2 на строке в мегабайт
 * превращает форму входа в способ занять процессор.
 */
export const passwordSchema = z.string().min(10).max(200);

export const displayNameSchema = z.string().trim().min(2).max(60);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  locale: localeSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const googleExchangeSchema = z.object({
  code: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
