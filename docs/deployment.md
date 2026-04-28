# Deployment runbook

Living document. Production target: an Unraid box on a German residential connection, fronted by Cloudflare. Every service runs as a Docker container on Unraid. Reverse proxy + TLS is handled by **Nginx Proxy Manager (NPM)**, which is already in production at this site (existing certs, existing proxy hosts).

## Topology

```
[Internet]
    ↓
[Cloudflare]   (proxied for hub/api/wiki; DNS-only for files/matrix)
    ↓
[Home router]  (80/443 forwarded to Unraid)
    ↓
[Unraid — Nginx Proxy Manager]
    ├── kaamo.club          → kaamo-hub        (nginx:alpine, serves /usr/share/nginx/html)
    ├── api.kaamo.club      → pocketbase       :8090
    ├── wiki.kaamo.club     → wiki-js          :3000
    ├── matrix.kaamo.club   → existing Synapse
    └── files.kaamo.club    → kaamo-files      (nginx:alpine + autoindex)
[Unraid Docker network — internal only]
    └── meilisearch :7700
```

## Subdomains and Cloudflare proxy mode

| Subdomain | CF mode | Purpose |
|---|---|---|
| `kaamo.club` | Proxied (orange) | Hub (Astro static, served by nginx container) |
| `api.kaamo.club` | Proxied | PocketBase API |
| `wiki.kaamo.club` | Proxied | Wiki.js |
| `matrix.kaamo.club` | DNS only (grey) — recommended | Synapse (CF + Matrix federation has historically been fragile) |
| `files.kaamo.club` | DNS only (grey) | Large downloads, bypass CF size soft limits |

## Nginx Proxy Manager

NPM is already running on Unraid with working Let's Encrypt certs. Each subdomain becomes a **Proxy Host** in the NPM UI:

- **Domain Names**: e.g. `kaamo.club, www.kaamo.club`
- **Scheme**: `http`
- **Forward Hostname / IP**: container name (if NPM shares a Docker network with the upstream) or `<unraid-ip>` if hitting via published host port
- **Forward Port**: container's internal port (or published port)
- **Block Common Exploits**: on
- **Websockets Support**: on (needed for Matrix and Wiki.js editor)
- **SSL tab**: request Let's Encrypt cert, **Force SSL** + **HTTP/2** + **HSTS** on

For containers to be reachable by name from NPM, attach each new service to the same Docker network NPM is on (commonly a custom `bridge` network created via the Unraid Docker UI). If keeping containers on the default `bridge`, expose a host port and point NPM at `<unraid-ip>:<port>`.

## kaamo-hub (static hub container) — Phase 1

The Astro site is built locally and served by a stock `nginx:alpine` container that bind-mounts the build output. No image build, no registry — `npm run build` then sync the `dist/` directory.

**Container (added via Unraid Apps tab → search nginx → use the official `nginx` template, edit before submit):**
- Image: `nginx:alpine`
- Network: same as NPM (or default + published port)
- Volumes: `/mnt/user/appdata/kaamo-hub/dist` → `/usr/share/nginx/html` (read-only)
- Port: leave internal (NPM proxies to it), or publish e.g. `8081:80` if going via host

**Phase 1 deploy steps:**
1. **Stop / remove** the old site currently serving `kaamo.club` in NPM and Docker.
2. On Unraid: create `/mnt/user/appdata/kaamo-hub/dist/`.
3. On dev box:
   ```sh
   npm run build
   rsync -av --delete dist/ <unraid-host>:/mnt/user/appdata/kaamo-hub/dist/
   ```
4. On Unraid: add the `kaamo-hub` container per the spec above.
5. In NPM: edit (or create) the proxy host for `kaamo.club` + `www.kaamo.club` to point at `kaamo-hub:80` (or `<unraid-ip>:8081`).
6. Force SSL, HTTP/2, HSTS in the NPM SSL tab. Reissue cert if needed.
7. Smoke test (see *Phase 1 smoke test* below).

**Update workflow (steady state):** repeat steps 3 only — `npm run build` + `rsync`. No container restart needed; nginx serves whatever's in the mounted directory.

**Future (Phase 7+):** GitHub Actions builds + pushes a tagged image to ghcr.io; Unraid container is repointed to that image; Watchtower or manual pull picks up updates.

## PocketBase

- Image: `ghcr.io/muchobien/pocketbase` (or build from official binary)
- Volume: `/mnt/user/appdata/pocketbase` → `/pb_data`
- Network: shared with NPM, internal only — no published host port
- Configure `trustedProxies` so PocketBase sees real client IPs through NPM (and CF, via NPM's `X-Forwarded-For` chain)
- Hooks deployed alongside (mount `/mnt/user/appdata/pocketbase/pb_hooks` → `/pb_hooks`)

## Meilisearch

- Image: `getmeili/meilisearch`
- Volume: `/mnt/user/appdata/meilisearch` → `/meili_data`
- Internal-only (no published port, no NPM proxy host) — only PocketBase hooks talk to it
- Master key set via env, stored in Unraid template (not committed)

## Wiki.js v2

- Image: `requarks/wiki:2`
- Volume: `/mnt/user/appdata/wiki-js` for config and uploads
- Postgres companion container (`postgres:15-alpine`), volume `/mnt/user/appdata/wiki-postgres` → `/var/lib/postgresql/data`
- Both on the shared Docker network so Wiki.js can reach Postgres by name
- NPM proxy host at `wiki.kaamo.club`

## Files (kaamo-files)

- Image: `nginx:alpine`
- Volume: `/mnt/user/appdata/kaamo-files` → `/usr/share/nginx/html` (read-only)
- Custom config to enable `autoindex on;` so the directory is browsable
- NPM proxy host at `files.kaamo.club`, **Cloudflare DNS-only** for that subdomain so large downloads don't hit CF's size limit

## Backups

Target: **Hetzner Storage Box** (German jurisdiction, supports SFTP/restic/borg).

Tool: **restic**, running either on the Unraid host or in a dedicated `restic` container with the appdata share mounted in.

Nightly cron, ~03:00 local. Targets:
- `/mnt/user/appdata/pocketbase`
- `/mnt/user/appdata/kaamo-files`
- Wiki.js Postgres dump (`docker exec wiki-postgres pg_dump …`)
- Synapse Postgres dump (confirm it's part of existing Synapse backups)

Retention: 7 daily, 4 weekly, 6 monthly. Quarterly restore drill: scratch dir, `restic restore`, verify checksums.

## Phase 1 smoke test

After the hub is live at `kaamo.club`:
- [ ] `https://kaamo.club` loads, valid cert, no mixed content
- [ ] `https://www.kaamo.club` redirects to apex (or also serves)
- [ ] All pages reachable: `/`, `/bays`, `/news`, `/about`, `/rules`, `/privacy`, `/datenschutz`
- [ ] `/rss.xml` returns 200 and validates at https://validator.w3.org/feed/
- [ ] Lighthouse on `/`: ≥95 perf, ≥95 a11y, ≥95 best practices
- [ ] Mobile viewport renders correctly (real device or DevTools)
- [ ] Cloudflare is in front (`curl -I` shows `cf-ray` header)
- [ ] HSTS header set (visible in browser dev tools or `curl -I`)

## Open questions

- Which Docker network is NPM on? New Phase 1+ containers should join the same one (or use Unraid IP + published ports).
- Synapse: same Unraid box, or a different machine? Affects backup scope and the `matrix.kaamo.club` proxy hop.
- Existing `kaamo.club` proxy host in NPM — reuse and re-point, or delete and recreate?
