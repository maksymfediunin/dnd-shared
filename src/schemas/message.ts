import { z } from 'zod';
import { roomMessageKindSchema } from '../enums/dice.js';

const bodySchema = z.string().trim().min(1).max(4000);

/**
 * Адресат и вид связаны жёстко в обе стороны: личное без адресата
 * некуда доставить, а объявление с адресатом — это личное, названное
 * чужим именем, и оно ушло бы в общую область подписки.
 */
export const roomMessageCreateSchema = z
  .object({
    kind: roomMessageKindSchema,
    targetUserId: z.uuid().optional(),
    body: bodySchema,
  })
  .refine((v) => (v.kind === 'GM_PRIVATE') === (v.targetUserId !== undefined), {
    path: ['targetUserId'],
    message: 'Адресат обязателен у личного сообщения и недопустим у объявления',
  });

export const roomMessageTemplateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: bodySchema,
});

export type RoomMessageCreateInput = z.infer<typeof roomMessageCreateSchema>;
export type RoomMessageTemplateInput = z.infer<typeof roomMessageTemplateSchema>;
