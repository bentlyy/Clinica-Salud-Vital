import { pool } from './db.js';

interface Queryable {
  query: (text: string, values: unknown[]) => Promise<unknown>;
}

export type StatusActorType = 'system' | 'user' | 'guest' | 'doctor' | 'admin';

export interface StatusChangeOptions {
  toStatus: string;
  fromStatus?: string | null;
  actorType?: StatusActorType;
  changedByUserId?: number | null;
  changedByRole?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export const recordBookingStatusChange = async (
  bookingId: number,
  options: StatusChangeOptions,
  client: Queryable = pool,
): Promise<void> => {
  await client.query(
    `INSERT INTO booking_status_history
       (booking_id, from_status, to_status, actor_type, changed_by_user_id, changed_by_role, reason, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      bookingId,
      options.fromStatus ?? null,
      options.toStatus,
      options.actorType ?? 'system',
      options.changedByUserId ?? null,
      options.changedByRole ?? null,
      options.reason ?? null,
      options.notes ?? null,
    ]
  );
};
