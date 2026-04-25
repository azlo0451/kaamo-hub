# Deployment runbook

Living document. Describes the **planned** production setup. Phase 0 is local-only — this runbook is what we'll execute when Phase 1 ships.

## Topology

```
[Internet]
    ↓
[Cloudflare]   (proxied for hub/wiki/api; DNS-only for files)
    ↓
[Homelab — Caddy reverse proxy]
    ├── kaamo.club          → Astro static (served by Caddy)
    ├── api.kaamo.club      → PocketBase :8090
    ├── wiki.kaamo.club     → Wiki.js v2 :3000
    ├── matrix.kaamo.club   → existing Synapse :8008
    └── files.kaamo.club    → Caddy file_server, /var/lib/kaamo/files
[Internal only]
    └── Meilisearch :7700
```

## Subdomains and Cloudflare proxy mode

| Subdomain | CF mode | Purpose |
|---|---|---|
| `kaamo.club` | Proxied (orange) | Hub (Astro static) |
| `api.kaamo.club` | Proxied | PocketBase API |
| `wiki.kaamo.club` | Proxied | Wiki.js |
| `matrix.kaamo.club` | DNS only (grey) — recommended | Synapse (CF + Matrix federation has historically been fragile) |
| `files.kaamo.club` | DNS only (grey) | Large downloads, bypass CF size soft limits |

## Caddy

Single Caddyfile. Auto-TLS via Let's Encrypt with **DNS-01 challenge** (Cloudflare API token), so the DNS-only `files.` and `matrix.` subdomains can also get certificates.

```caddy
# Sketch — refine when deploying
{
    email <admin email>
    acme_dns cloudflare {env.CLOUDFLARE_API_TOKEN}
}

kaamo.club {
    root * /var/www/kaamo-hub
    file_server
    encode zstd gzip
}

api.kaamo.club  { reverse_proxy localhost:8090 }
wiki.kaamo.club { reverse_proxy localhost:3000 }

files.kaamo.club {
    root * /var/lib/kaamo/files
    file_server browse
}
```

Cloudflare API token scope: `Zone:DNS:Edit` for `kaamo.club`. Stored at `/etc/caddy/cloudflare.env`, mode 0600, owned by the caddy user.

## PocketBase

- Single Go binary at `/opt/pocketbase/`
- Data dir: `/var/lib/pocketbase/pb_data` (backed up nightly)
- Hooks dir: `/opt/pocketbase/pb_hooks` (in-repo, deployed alongside)
- systemd unit, runs as a dedicated `pocketbase` user
- Bound to `127.0.0.1:8090`, exposed only via Caddy
- Configure trusted proxy header so we get real client IPs through Cloudflare

## Meilisearch

- Single binary at `/opt/meilisearch/`
- Data dir: `/var/lib/meilisearch`
- Bound to `127.0.0.1:7700`, **not** exposed publicly
- PocketBase hooks push content updates to Meili on collection writes

## Wiki.js v2

- Node.js + Postgres
- Reverse-proxied at `wiki.kaamo.club`
- Theme overrides committed to repo
- Postgres backed up nightly

## Backups

Target: **Hetzner Storage Box** (German jurisdiction, supports SFTP/restic/borg).

Tool: **restic**.

Nightly cron, ~03:00 local. Targets:
- `/var/lib/pocketbase/pb_data`
- `/var/lib/kaamo/files`
- Postgres dump for Wiki.js
- Synapse Postgres dump (confirm it's part of existing Synapse backups)

Retention: 7 daily, 4 weekly, 6 monthly. Quarterly restore drill: scratch dir, `restic restore`, verify checksums.

## Open questions

- Does Synapse run on the same homelab box or a separate one? Affects Caddy routing.
- Existing Synapse: behind Cloudflare or DNS-only? (Recommend DNS-only.)
- Home router port-forwarding state — what's already open, and on which ports?
