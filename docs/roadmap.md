# Roadmap

Living document. The hub is built in numbered phases. Each phase has a single, demonstrable goal — when its exit criteria are met, that phase ships and the next one starts. Phases overlap only when the next phase has zero blockers on the previous one.

Stack and deployment topology live in [README.md](../README.md) and [deployment.md](deployment.md).

## Phase 0 — Foundations *(done)*

**Goal:** Buildable Astro project with the visual language locked in, before any real content is written.

**In scope**
- Astro scaffold, TypeScript config, content config
- Design tokens (`src/styles/tokens.css`) — colors, spacing, typography, glow utilities
- Fonts and base layout
- Neon hero on the index page

**Out of scope**
- Real content
- Deploy
- Anything dynamic

**Exit criteria**
- `npm run dev` boots a styled landing page using only tokens (no ad-hoc colors)
- Hero passes the in-game-screenshot vibe check on desktop + mobile

## Phase 1 — Soft Launch *(in progress)*

**Goal:** A public, static landing page at `kaamo.club` that does one job well — point people at the existing community surfaces (Discord, subreddit, wiki.gg) and the legal info — with the visual language carrying the experience.

**In scope**
- Bays page: link grid to Discord, subreddit, wiki.gg, with `RandomBackground` component *(done)*
- Persistent dock: nav, scrolling ticker, OST player placeholder *(done)*
- Static pages: about, rules, privacy (EN), datenschutz (DE GDPR notice) *(done)*
- News content collection + RSS feed *(done)*
- GitHub link in dock *(done, uncommitted)*
- Index page hero polish
- First news post announcing the hub
- Production deploy: stage built site at `/mnt/user/appdata/kaamo-hub/dist` on Unraid, run an `nginx:alpine` container against it
- Replace the old `kaamo.club` proxy host in NPM, point at the new container, Force SSL + HTTP/2 + HSTS
- Site reachable end-to-end through Cloudflare → router → Unraid → NPM → hub container

**Out of scope**
- Authentication, comments, user-submitted content
- Wiki, file archive, gallery, Matrix embed
- Search

**Exit criteria**
- `https://kaamo.club` serves the styled landing on desktop + mobile
- `/news`, `/rules`, `/privacy`, `/datenschutz`, `/about`, `/bays` all reachable and styled
- RSS feed validates against an external validator
- Lighthouse: ≥95 perf / ≥95 a11y on the landing page
- One news post live announcing the launch

## Phase 2 — Codex (Wiki.js v2)

**Goal:** Stand up `wiki.kaamo.club` as the canonical reference for the GoF series, themed to match the hub.

**In scope**
- Wiki.js v2 + Postgres containers on Unraid per [deployment.md](deployment.md)
- DNS, Cloudflare proxy, NPM proxy host with Let's Encrypt cert
- Theme override that picks up the hub's HUD/blue-cyan language
- Initial structure: GoF1, GoF2, Alliances, Manticore as top-level sections
- Editor accounts for the 5 mod admins
- Postgres dump in the nightly restic schedule
- Hub Bays page lists `wiki.kaamo.club` (alongside or replacing the wiki.gg link)

**Out of scope**
- User self-registration on the wiki (admin/editor invite-only for now)
- Deep content authoring — that's continuous community work, not a phase gate
- Cross-surface search (deferred to Phase 7+)

**Exit criteria**
- `wiki.kaamo.club` serves a themed Wiki.js
- At least one seed page exists per game section
- All 5 mod admins have working editor accounts
- Postgres backup verified by a test restore

## Phase 3 — Archive (files.kaamo.club)

**Goal:** Public file archive for community-relevant binaries: mods, maps, manuals, soundtracks, savefiles, dev artifacts.

**In scope**
- `kaamo-files` container (`nginx:alpine` with `autoindex on;`) on Unraid, DNS-only through Cloudflare (bypass CF size limits) per [deployment.md](deployment.md)
- NPM proxy host at `files.kaamo.club` with Let's Encrypt cert
- Directory layout: `/<game>/<category>/`
- Seed content: official manuals, soundtracks (where licensing allows), known community mods
- Hub-side index page linking into the archive with descriptions
- `/mnt/user/appdata/kaamo-files` included in nightly restic backup

**Out of scope**
- User uploads (handled in Phase 5/7+ via PocketBase)
- Comments, ratings, search inside the archive

**Exit criteria**
- `files.kaamo.club` browsable, TLS valid, IPv4-reachable
- Seed content uploaded and linked from the hub
- One full restic snapshot verified by listing contents

## Phase 4 — Gallery

**Goal:** Curated screenshot, wallpaper, and fan-art gallery — read-only, hub-native.

**In scope**
- `/gallery` page in Astro
- Image collection (Astro content) — curator-only adds via repo PR
- Lightbox/grid layout in the HUD aesthetic
- Per-image: source, artist credit, license, original-resolution link (often pointing into the Phase 3 archive)
- Lazy loading and responsive images

**Out of scope**
- User submissions (Phase 7+)
- Comments, voting, tagging beyond a small fixed taxonomy

**Exit criteria**
- `/gallery` lists ≥30 curated images with credits
- Full-resolution view works on desktop + mobile
- Lighthouse perf ≥90 on `/gallery` despite the image weight

## Phase 5 — Comments

**Goal:** Authenticated comments on news posts (and ideally codex pages), with moderation tools for the 5 mod admins.

**In scope**
- PocketBase container on Unraid, NPM proxy host at `api.kaamo.club` per [deployment.md](deployment.md)
- Auth: email + OAuth (Discord, GitHub at minimum)
- Comments collection with moderation states (pending / approved / hidden / deleted)
- Moderation queue UI for admins
- Hub-side comments component on news posts
- Wiki.js comments integration if feasible; defer if the scope balloons
- Rate limiting + bot mitigation (Cloudflare Turnstile)
- GDPR self-service: data export and deletion endpoints

**Out of scope**
- Forum / long-form posts (Phase 7+)
- Threaded discussions beyond one-level replies
- DMs, friend lists, profiles beyond display name + avatar

**Exit criteria**
- Logged-in users can comment on news posts
- Mods can approve / hide / delete and ban accounts
- GDPR export and delete have been exercised end-to-end
- PocketBase data dir in nightly restic backup with a verified restore

## Phase 6 — Comms

**Goal:** Bring the existing Matrix presence into the hub so visitors can see and join the chat without leaving `kaamo.club`.

**In scope**
- Confirm `matrix.kaamo.club` is Cloudflare DNS-only and proxied through NPM (or direct, depending on existing Synapse routing)
- Hydrogen Web embedded on a `/comms` page for guest/preview access
- Public room directory listing
- Federation health check
- Evaluate Matrix↔Discord bridge; deploy only if low-maintenance

**Out of scope**
- Replacing Discord
- Building first-party chat features in the hub
- Voice — Coturn already covers Matrix calls

**Exit criteria**
- `/comms` loads Hydrogen pointing at the existing Synapse
- Public rooms are joinable from the embed
- Federation tester (matrix.org's federation tester) passes for `matrix.kaamo.club`

## Phase 7+ — Reactive

**Goal:** Open the hub to user-submitted content and dynamic features once auth and moderation are mature.

Sequence is decided when we arrive. Candidates:
- User-submitted gallery, gated by mod approval
- Forum or long-form posts (likely Discourse, or a PocketBase-backed minimal forum)
- User profiles / pilot dossiers
- Cross-surface search (hub + wiki + archive metadata) via Meilisearch
- Event calendar — anniversaries, community events
- Live status board for the Kaamo services

Exit criteria are set per feature when it's picked up.
