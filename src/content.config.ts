import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // Pinned posts show at the top of the blog and on the home page.
    pinned: z.boolean().default(false),
    // Drafts render in `npm run dev` but are left out of the production build.
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
