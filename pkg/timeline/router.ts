import { createRoute, z } from '@hono/zod-openapi';

import { CommonErrorResponseSchema } from '../accounts/adaptor/validator/schema.js';
import { GetAccountTimelineResponseSchema } from './adaptor/validator/timeline.js';

export const GetAccountTimelineRoute = createRoute({
  method: 'get',
  tags: ['timeline'],
  path: '/timeline/accounts/:id',
  request: {
    params: z.object({
      id: z.string().openapi('Account ID'),
    }),
    // NOTE: query params must use z.string()
    // cf. https://zenn.dev/loglass/articles/c237d89e238d42 (Japanese)
    // cf. https://github.com/honojs/middleware/issues/200#issuecomment-1773428171 (GitHub Issue)
    query: z.object({
      has_attachment: z
        .string()
        .optional()
        .pipe(z.coerce.boolean().default(false))
        .openapi({
          type: 'boolean',
          description: 'If true, only return notes with attachment',
        }),
      no_nsfw: z
        .string()
        .optional()
        .pipe(z.coerce.boolean().default(false))
        .openapi({
          type: 'boolean',
          description: 'If true, only return notes without sensitive content',
        }),
      before_id: z.string().optional().openapi({
        description:
          'Return notes before this note ID. specified note ID is not included',
      }),
    }),
  },
  responses: {
    200: {
      description: 'OK',
      content: {
        'application/json': {
          schema: GetAccountTimelineResponseSchema,
        },
      },
    },
    404: {
      description: 'Account not found',
      content: {
        'application/json': {
          schema: CommonErrorResponseSchema,
        },
      },
    },
  },
});

export const PushNoteToTimelineRoute = createRoute({
  method: 'post',
  description: '',
  tags: ['timeline'],
  path: '/timeline/',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            authorId: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    204: {
      description: 'OK',
    },
  },
});

export const DropNoteFromTimelineRoute = createRoute({
  method: 'delete',
  description: '',
  tags: ['timeline'],
  path: '/timeline/:id',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({}),
        },
      },
    },
    params: z.object({
      id: z.string().openapi('note authorID'),
    }),
  },
  responses: {
    204: {
      description: 'OK',
    },
    500: {
      description: 'Task failed',
    },
  },
});
