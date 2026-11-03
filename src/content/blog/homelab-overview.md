---
title: 'Start here: how my homelab is built'
description: 'A map of the lab — hardware, network segmentation, services, and how it all hangs together — with links to the deep-dive posts.'
date: 2026-11-02
tags: ['homelab', 'proxmox', 'networking', 'architecture']
pinned: true
---

This is the map. Every other post on this site goes deep on one piece of it; this one shows how the pieces fit, and why they're built the way they are.

The lab started as a place to practice security tooling. It has since turned into something closer to a small production environment: services my household actually depends on, a segmented network, alerting, and the occasional 1 a.m. outage I have to debug before anyone notices.

![Homelab architecture: ISP gateway in IP passthrough to an OPNsense firewall, a MikroTik switch trunking VLANs to a Proxmox host and a Wi-Fi 7 access point](/images/lab-architecture.svg)

## Hardware

| Role | Hardware | Why |
| --- | --- | --- |
| Hypervisor | HP Z840 workstation, dual Xeon, 96 GB RAM | Cheap used enterprise iron with lots of PCIe lanes and RAM slots |
| Firewall | HP t740 thin client running OPNsense | Low power, x86, has a PCIe slot for a real NIC |
| Switch | MikroTik hEX S | Inexpensive, VLAN-capable, and RouterOS is worth learning |
| Wireless | Wi-Fi 7 access point on PoE | Per-SSID VLAN tagging, which consumer mesh systems don't do |

Not everything worked on the first try. The firewall went through two NIC cards and a handful of SFP modules before I gave up on fiber between the firewall and switch and went back to copper. That's its own post.

## Network

Six VLANs, each a `/24` where the third octet matches the VLAN ID, so `10.10.30.x` is always VLAN 30. I picked `10.10.0.0/16` over `10.0.0.0/16` to avoid colliding with common VPN and cloud defaults.

| VLAN | Purpose | Policy in one line |
| --- | --- | --- |
| 10 | Trusted (wired) | Internet + admin access to servers and management |
| 20 | Trusted (Wi-Fi) | Same as 10, kept separate for future wired runs |
| 30 | Servers | Static addressing; no DHCP |
| 40 | IoT | Internet + one narrow exception to reach the media server |
| 50 | Guest | Internet only |
| 99 | Management | Firewall, switch, AP, and hypervisor admin interfaces |

The firewall policy pattern is deliberately boring: one "allow out" rule per VLAN that permits everything *except* other private networks, plus explicit, narrow exceptions on top. DNS is the one cross-cutting exception, so it lives in floating rules.

DNS filtering runs in two layers: Pi-hole as the primary resolver with different blocklist strength per VLAN, and OPNsense's Unbound as an independent fallback with its own blocklists, so a client that bypasses Pi-hole still gets filtered.

## Services

Everything runs as VMs on Proxmox, with Docker Compose inside each VM:

- **TrueNAS** owns the disks (passed through to the VM) and serves NFS to the other VMs. Proxmox boots it first and waits 60 seconds before starting anything that mounts its shares — that ordering fixed a race where containers started before their storage existed.
- **Traefik** is the single reverse proxy for every service, with TLS, split-horizon DNS for internal names, and **CrowdSec** as a bouncer on the internet-facing entrypoint.
- **Jellyfin** has a GTX 1080 passed through for hardware transcoding.
- **Immich** replaces cloud photo storage for the household. Getting large uploads to work through the reverse proxy was [its own adventure](/blog/immich-large-uploads-cloudflare-traefik/).
- **Netbird** gives me a mesh VPN for remote admin access, so management interfaces never face the internet.

## Alerting

Everything that can fail reports to a self-hosted **ntfy** server, which pushes to my phone:

- Proxmox notification webhooks
- A TrueNAS alert forwarder on a 5-minute cron
- `smartd` hook scripts for disk health
- **Diun** on each VM for container image updates — chosen over centralized tools so no VM exposes its Docker API on the network
- CrowdSec ban notifications

Each source gets its own write-only token, so a leaked token can post alerts but can't read or delete anything.

## What's next

- **Backups.** Proxmox Backup Server for VM images, plus an offsite copy of irreplaceable data. This is the biggest gap in the lab, and it's first in line.
- **Ansible.** Everything above was built by hand. The next step is codifying it so any VM can be rebuilt from a playbook.
- **Observability.** ntfy tells me when something breaks; metrics and logs (Prometheus, Grafana, Loki) will tell me why.
- **Kubernetes.** A small k3s cluster for CKA prep, kept separate from the services the household depends on.

I'll link each of those here as they get written up.
