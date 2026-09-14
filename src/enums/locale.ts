import { z } from 'zod';

export const LOCALES = ['ru', 'uk', 'en'] as const;

export const localeSchema = z.enum(LOCALES);

export type Locale = z.infer<typeof localeSchema>;

export const DEFAULT_LOCALE: Locale = 'uk';
