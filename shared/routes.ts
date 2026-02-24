import { z } from 'zod';
import { insertContentSchema, insertUnansweredQuestionSchema, content, unansweredQuestions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  chat: {
    ask: {
      method: 'POST' as const,
      path: '/api/chat' as const,
      input: z.object({
        topic: z.string(),
        question: z.string(),
        language: z.string().optional(),
      }),
      responses: {
        200: z.object({
          answer: z.string(),
          found: z.boolean(),
          link: z.string().nullable().optional(),
        }),
      },
    },
  },
  topics: {
    list: {
      method: 'GET' as const,
      path: '/api/topics' as const,
      responses: {
        200: z.array(z.string()),
      },
    },
  },
  content: {
    list: {
      method: 'GET' as const,
      path: '/api/content' as const,
      responses: {
        200: z.array(z.custom<typeof content.$inferSelect>()),
      },
    },
    byTopic: {
      method: 'GET' as const,
      path: '/api/content/:topic' as const,
      responses: {
        200: z.array(z.custom<typeof content.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/content' as const,
      input: insertContentSchema,
      responses: {
        201: z.custom<typeof content.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/content/upload' as const,
      responses: {
        200: z.object({
          message: z.string(),
          count: z.number(),
          topic: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  unanswered: {
    list: {
      method: 'GET' as const,
      path: '/api/unanswered' as const,
      responses: {
        200: z.array(z.custom<typeof unansweredQuestions.$inferSelect>()),
      },
    },
  },
};

export type ChatRequest = z.infer<typeof api.chat.ask.input>;
export type ChatResponse = z.infer<typeof api.chat.ask.responses[200]>;
export type { InsertContent } from './schema';

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
