import { z } from 'zod';

export const createNotificationBody = z.object({
  user_id: z.string().uuid(),
  type: z.string().max(50).optional(),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(2000),
});
