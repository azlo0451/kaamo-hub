# gof-hub

The Kaamo Club — community hub for the *Galaxy on Fire* series.

Lives at [kaamo.club](https://kaamo.club). Front-door for the Discord, subreddit, and wiki.gg, plus self-hosted services (Matrix, wiki, file archive, gallery).

## Status

In early development. Currently in Phase 1 (Soft Launch). See [docs/roadmap.md](docs/roadmap.md) for the phase plan.

## Stack

- **Frontend:** Astro (built locally, served by `nginx:alpine` on Unraid)
- **Backend:** PocketBase (auth, uploads, moderation, comments)
- **Search:** Meilisearch
- **Wiki:** Wiki.js v2 (separate service)
- **Matrix:** existing Synapse + embedded Hydrogen Web
- **Reverse proxy + TLS:** Nginx Proxy Manager
- **Hosting:** Unraid box in Germany, Cloudflare in front

## Local development

Requires Node.js 18+.

```sh
npm install
npm run dev
```

## Repo layout

```
src/         Astro source
public/      Static assets (fonts, favicon)
assets/raw/  Raw wallpapers and UI references (source material)
docs/        Roadmap, deployment runbook, design notes
```
