import { z } from 'zod';

/**
 * MANAGER — переводчик: в разделе администрирования ему доступны
 * только переводы справочника. Роль выдаёт администратор; сама она
 * прав не раздаёт, поэтому цепочка «менеджер назначил менеджера»
 * невозможна.
 */
export const roleSchema = z.enum(['USER', 'ADMIN', 'MANAGER']);

export type Role = z.infer<typeof roleSchema>;
