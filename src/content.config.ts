import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const items = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/items' }),
  schema: z.object({
    title: z.string(),
    category: z.enum([
      'film', 'book', 'tool', 'health', 'podcast',
      'social', 'communication', 'car', 'camera', 'creator', 'video',
      'other',
    ]),
    tags: z.array(z.string()).default([]),
    rating: z.number().min(0).max(5),
    summary: z.string(),
    cover: z.string().optional().default(''),
    date: z.date(),
    link: z.string().optional().default(''),
    mood: z.array(z.string()).default([]),
    country: z.string().optional().default(''),
  }),
});

export const collections = { items };
