import { z } from 'zod';

/**
 * Публичность комнаты. PUBLIC — видна в каталоге, заявку подаёт любой;
 * PRIVATE — в каталоге не показывается, вступление только по коду.
 */
export const ROOM_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;

export const roomVisibilitySchema = z.enum(ROOM_VISIBILITIES);

export type RoomVisibility = (typeof ROOM_VISIBILITIES)[number];

/**
 * Жизненный цикл комнаты. DRAFT — ведущий ещё собирает, в каталоге её
 * не видно даже как публичную; ACTIVE — набор идёт; FINISHED — игра
 * кончилась, заявки не принимаются, карточка остаётся для истории.
 */
export const ROOM_STATUSES = ['DRAFT', 'ACTIVE', 'FINISHED'] as const;

export const roomStatusSchema = z.enum(ROOM_STATUSES);

export type RoomStatus = (typeof ROOM_STATUSES)[number];

/** Роль внутри комнаты — ровно две, как в общем ТЗ. */
export const ROOM_ROLES = ['GM', 'PLAYER'] as const;

export const roomRoleSchema = z.enum(ROOM_ROLES);

export type RoomRole = (typeof ROOM_ROLES)[number];

/**
 * Состояние участия. Заявка и участие — одна запись со статусом, а не
 * две таблицы: PENDING → APPROVED → LEFT по одной ветке и
 * PENDING → REJECTED по другой. Повторная заявка возвращает запись
 * из REJECTED или LEFT обратно в PENDING.
 */
export const MEMBERSHIP_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'LEFT'] as const;

export const membershipStatusSchema = z.enum(MEMBERSHIP_STATUSES);

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
