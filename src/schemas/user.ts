import { z } from 'zod';
import { localeSchema } from '../enums/locale.js';
import { roleSchema } from '../enums/role.js';
import { displayNameSchema, passwordSchema } from './auth.js';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  locale: localeSchema,
  role: roleSchema,
  avatarUrl: z.string().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
});

/**
 * `.strict()` здесь — защита от повышения прав. Без него запрос
 * с полем `role` прошёл бы проверку, и безопасность зависела бы
 * от того, не забыл ли сервис отфильтровать поле вручную.
 */
export const updateMeSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    locale: localeSchema.optional(),
  })
  .strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().max(200),
  newPassword: passwordSchema,
  /**
   * Refresh текущей сессии. Смена пароля гасит все прочие цепочки,
   * и без этого поля пользователь выкидывал бы сам себя из
   * приложения ровно в момент успешной смены.
   */
  refreshToken: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
