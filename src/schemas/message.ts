import { z } from 'zod';
import { roomMessageKindSchema } from '../enums/dice.js';

const bodySchema = z.string().trim().min(1).max(4000);

/**
 * Адресаты и вид связаны жёстко в обе стороны: личное без адресатов
 * некуда доставить, а объявление с адресатами — это личное, названное
 * чужим именем, и оно ушло бы в общую область подписки. Повтор адресата
 * снимается здесь же: иначе он получил бы одно письмо дважды.
 */
export const roomMessageCreateSchema = z
  .object({
    kind: roomMessageKindSchema,
    targetUserIds: z
      .array(z.uuid())
      .min(1)
      .max(50)
      .transform((ids) => [...new Set(ids)])
      .optional(),
    body: bodySchema,
  })
  .refine((v) => (v.kind === 'GM_PRIVATE') === (v.targetUserIds !== undefined), {
    path: ['targetUserIds'],
    message: 'Адресаты обязательны у личного сообщения и недопустимы у объявления',
  });

export const roomMessageTemplateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: bodySchema,
});

export type RoomMessageCreateInput = z.infer<typeof roomMessageCreateSchema>;
export type RoomMessageTemplateInput = z.infer<typeof roomMessageTemplateSchema>;
