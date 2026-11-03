# anthonylatoni.com

Personal site and homelab blog, built with [Astro](https://astro.build) and deployed on Cloudflare Pages.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321 — drafts are visible here
npm run build    # production build into ./dist (drafts excluded)
npm run preview  # serve ./dist locally
```

## Writing a post

1. Create `src/content/blog/<slug>.md`. The file name becomes the URL: `/blog/<slug>/`.
2. Start with this frontmatter:

   ```yaml
   ---
   title: 'Post title'
   description: 'One or two sentences shown in lists, RSS, and link previews.'
   date: 2026-11-02
   tags: ['homelab', 'proxmox']
   draft: true        # remove or set false when ready to publish
   # pinned: true     # only for the "Start here" overview
   # updated: 2026-12-01
   ---
   ```

3. Put images in `public/images/` and reference them as `/images/name.png`.
4. Commit and push. Cloudflare Pages builds and deploys automatically.

Before publishing: no public hostnames, tokens, usernames, image versions, or unfixed gaps.

## Layout

```
src/
  content/blog/     Markdown posts
  pages/            index, blog, tags, resume, contact, rss.xml, 404
  layouts/Base.astro
  components/       Header, Footer, PostCard
  styles/global.css
  lib/posts.ts      post helpers (sorting, drafts, reading time)
public/             favicon, images (served as-is)
```

## Cloudflare Pages settings

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION` = `26`
