import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    author: z.string().optional(),
    /** Mark posts about service outages so they can be styled differently
     *  and (later) filtered into a status-only view. */
    incident: z.boolean().default(false),
  }),
});

export const collections = { news };
