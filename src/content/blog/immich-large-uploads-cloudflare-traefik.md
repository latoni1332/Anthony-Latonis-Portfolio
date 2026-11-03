---
title: 'Why my Immich uploads failed on large videos (Cloudflare + Traefik)'
description: 'Photos uploaded fine, videos failed. Two separate limits were in the way: Cloudflare’s proxy body cap and Traefik v3’s default read timeout.'
date: 2026-11-02
tags: ['homelab', 'immich', 'traefik', 'cloudflare', 'troubleshooting']
---

I moved my household's photo library from iCloud to a self-hosted [Immich](https://immich.app) instance. Photos uploaded fine. Larger videos didn't.

It turned out to be two separate limits stacked on top of each other, and I had to clear both before the big files went through.

## The setup

- Immich runs in Docker Compose on its own Proxmox VM, with the library stored on TrueNAS over NFS.
- **Traefik** is the reverse proxy in front of it, routed through a file-provider config rather than Docker labels (Traefik lives on a different VM than Immich).
- The public hostname was a **Cloudflare DNS record with proxying enabled** (the orange cloud).

## Problem 1: Cloudflare's 100 MB request body limit

When a record is proxied, traffic goes through Cloudflare's edge before it reaches you. On the Free and Pro plans, Cloudflare rejects any request body over **100 MB** with a `413`. A few minutes of 4K phone video is well past that.

I simply hadn't accounted for how much data a photo library moves. A proxied record is fine for web pages and API calls; it is the wrong path for multi-gigabyte video uploads.

**Fix:** switch the Immich record to **DNS only** (gray cloud). Clients now connect directly to my IP, and Cloudflare is just the DNS provider.

That has a real cost, and it's worth being explicit about:

- My public IP is now visible in DNS.
- I lose Cloudflare's edge protection for that hostname.

I accepted that and compensated at the origin: CrowdSec runs as a Traefik middleware on the internet-facing entrypoint and bans abusive clients, and only specific hostnames are routed at all. I later moved my other public records to DNS-only as well, so every exposed service sits behind the same set of origin-side controls instead of a mix.

> If you want Cloudflare's protection *and* large uploads, the options are a Cloudflare Tunnel (same body limit, so it doesn't help here), a paid plan with a higher limit, or chunked uploads on the client side. For a household photo app, DNS-only plus origin-side protection was the pragmatic call.

## Problem 2: Traefik v3's 60-second read timeout

With Cloudflare out of the path, the 100 MB wall was gone, but the largest videos could still fail partway through.

Traefik v3 changed the default `readTimeout` on entrypoints from unlimited to **60 seconds**. That's a sensible default against slow-client attacks, but a 1 GB video over a mediocre cellular uplink takes a lot longer than a minute to send. Traefik was closing the connection mid-upload.

**Fix:** raise the responding timeouts on the entrypoints in Traefik's static config:

```yaml
# traefik.yml (static configuration)
entryPoints:
  https:
    address: ':443'
    transport:
      respondingTimeouts:
        readTimeout: 600s
        writeTimeout: 600s
        idleTimeout: 600s
```

I set it on both of my HTTPS entrypoints (internal and external), since phones switch between Wi-Fi and cellular and can hit either one. Ten minutes is a deliberate ceiling rather than `0` (unlimited): long enough for real uploads, short enough that a stalled client doesn't hold a connection forever.

Restart Traefik after changing it — entrypoint settings are static configuration and don't hot-reload.

## Lessons

- **Size your path for the workload.** A CDN proxy is built for web traffic. Bulk uploads are a different workload and deserve a different path.
- **When a fix doesn't fully fix the symptom, look for a second limit.** Clearing the first bottleneck just exposes the next one.
- **Every layer in a proxy chain has its own limits.** CDN, reverse proxy, and the app itself each have body-size and timeout settings. Write down what each one is set to.
- **Security tradeoffs should be written down, not just made.** Turning off the Cloudflare proxy was the right call, but only because I put compensating controls at the origin.
