import { z } from 'zod';

export const visibilitySchema = z.enum(['private', 'shared']);
export const memoryScopeSchema = z.enum(['personal', 'shared']);

export const createConversationBody = z.object({
  titre: z.string().min(1).max(255).optional(),
  visibility: visibilitySchema.optional().default('shared'),
  entiteId: z.number().int().positive().optional(),
});

export const chatBody = z.object({
  message: z.string().min(1, 'Message requis').max(8000),
  conversationId: z.number().int().positive().optional(),
  typeActivite: z.string().max(50).optional(),
  visibility: visibilitySchema.optional(),
  entiteId: z.number().int().positive().optional(),
});

export const fonctionnementComptesBody = z.object({
  prefixes: z.array(z.string().min(1).max(20)).min(1).max(50),
});

export const conversationIdParam = z.object({
  convId: z.coerce.number().int().positive(),
});

export const memoryIdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const articlesQuery = z.object({
  q: z.string().min(1).max(500).optional(),
});
