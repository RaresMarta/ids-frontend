# Attack Visualization — Implementation Plan (IDS Dashboard)

## Context

The live detector (separate Python service) already emits a real-time event feed over SSE.
This plan covers the **dashboard's live "monitor" view** — where the rich, explanatory
attack visuals live. The protected customer site stays a *minimal status badge only*; all
attack-type detail, charts, and animations belong here in the operator console (this mirrors
reality: the victim shows little, the SOC console shows everything).

This is a **self-contained frontend task**: it consumes a frozen backend contract, needs no
backend changes, and can be built immediately and in parallel with everything else.

## Data source — frozen SSE contract

Base URL from `import.meta.env.VITE_DETECTOR_URL` (dev `http://localhost:7870`; on deploy the
server's public/LAN IP). Endpoints:

- `GET /api/stream` — Server-Sent Events. Each `data:` line is JSON with a `type`:
  - `flow`: `{type, flow_id, ts, src, dst, family, gate:"allow"|"block", gate_confidence, confidence, probabilities:{class:p}, top_features:[{feature,contribution}], n_packets}`
  - `alert`: `{type, ts, attacker_ip, family, confidence}` — first malicious window (→ attack_detected)
  - `ban`: `{type, ts, attacker_ip, family, ttl_s}` — IP banned (→ ip_banned)
  - `recovered`: `{type, ts, attacker_ip}` — source went quiet / ban expired
- `GET /api/blocklist` → `{banned:[{ip, family, expires_at, banned_at, hit_count}]}`
- `GET /api/stats` → `{flows_total, malicious, by_family, dropped, banned_count, uptime_s}`
- `GET /api/health` → `{status, mode:"live"|"replay"|"simulate", model, enforcer}`
- `POST /api/inject {family,count}` + `GET /api/families` — **simulate mode only** (demo control).

## New surface

- Route **`/monitor`** → `LiveMonitorPage` (`src/app/pages/LiveMonitorPage.tsx`); add a Sidebar
  entry in `src/app/components/Sidebar.tsx`. Public (the CSV/PCAP classification stays the
  login-gated feature per the overall auth plan; the live monitor is the showcase).

## Components to build (`src/app/components/monitor/`)

1. **`useEventStream(baseUrl)`** hook — wraps `EventSource(baseUrl + '/api/stream')`, parses
   events into a typed union, auto-reconnects on error, keeps a rolling buffer (last ~200) and
   derived rate series; also polls `/api/stats` + `/api/blocklist` every ~2s (or derive from the
   stream). Single source of truth for the page.
2. **`TrafficTimeline`** — the anchor chart. Recharts `AreaChart`: flow/packet rate over time
   with a shaded "normal" envelope; on `alert` shade the breach region + drop a labelled marker;
   on `recovered` fade it + green marker. One continuous chart carries attack_detected→recovered.
3. **`AttackSignature`** — per-family visual keyed on `family`, so the type is legible from the
   graphic (use `framer-motion` — ADD dep — + SVG/Recharts/canvas):
   - **DDoS/DoS** → incoming volume surge / wall (dots or stacked area rushing in)
   - **Recon** → `(time × port)` grid lighting up sequentially (sweep)
   - **Mirai** → many source-nodes converging on one target (fan-in)
   - **generic pulse** → fallback (see Live caveat below)
4. **`VerdictPanel`** — honest confidence. Stacked **class-probability bar** from `probabilities`
   (not a gauge); show the **gate verdict** (`Attack`/`Benign`) + `gate_confidence` prominently,
   the 8-class `family` as a secondary "suspected family", and render low-confidence verdicts
   desaturated. Avoid false precision.
5. **`EventFeed`** — reverse-chronological list of `flow`/`alert`/`ban`, newest on top, ranked
   (malicious first), each with a family chip (optionally a MITRE ATT&CK tag).
6. **`BlocklistPanel`** — from `/api/blocklist`: a "Detected → Blocked" split (CrowdSec-style),
   each banned IP with family + a TTL countdown.
7. **`StatCards`** — from `/api/stats`: flows_total, malicious, dropped, banned_count, by_family.

## Event → visual mapping

| Event | Visual |
|---|---|
| `flow` | feed row + rate point on TimeLine + (if block) feeds AttackSignature + VerdictPanel |
| `alert` | TimeLine breach shading + marker; AttackSignature activates; "Threat detected" state |
| `ban` | IP moves Detected→Blocked in BlocklistPanel with TTL; node quarantined |
| `recovered` | TimeLine returns inside band + green marker; signature winds down to calm |

## Libraries

- **Recharts** (already in package.json) — timeline + bars.
- **framer-motion** — ADD; state transitions + AttackSignature animations.
- Native **EventSource** — SSE (no lib).
- Keep existing **shadcn/ui** primitives for layout.

## Design

Replace the cyberpunk leftovers (`NetworkBackground`, the glassy `GlassmorphicCard` look) with
the warm, restrained direction: cream canvas `#faf9f5`, ink `#141413`, one clay accent
`#d97757`; **reserve red strictly for genuine threat**; mono font for IPs/ports; motion
200–500 ms ease-out; animated data transitions ~1 s slow-in/out. **No globe / threat-map** —
every axis encodes something real (rate, port, ASN, severity, confidence).

## Live-mode "Spoofing" caveat (important)

In **live** mode the 8-class `family` is unreliable — real attack-tool traffic (hping3 flood)
is mislabelled **"Spoofing"** (train/deploy domain shift), while the **2-class gate is correct
and confident** (it's the inline-gate signal). Therefore:
- Drive the "is this an attack / block / ban" UI off the **gate** (`gate`, `gate_confidence`),
  which is reliable in both modes.
- Show `family` as a SECONDARY "suspected family (low confidence)".
- `AttackSignature` shows the **per-type** visual when family confidence is high (true in
  **simulate** mode → DDoS/DoS/Mirai/Recon render correctly), and falls back to the **generic
  pulse** when family is low-confidence or in {Spoofing, Web, BruteForce}.
- Net: demo the rich per-type signatures in **simulate** mode; live mode degrades gracefully to
  gate-driven UI + generic signature. This is honest about the model's real behaviour.

## Confidence honesty

`probabilities` are already temperature-calibrated server-side. Show them as a stacked bar;
keep the reliability-diagram / Expected-Calibration-Error material for the thesis figure, not
the live UI. Don't dress a softmax score as certainty.

## Verification

1. `.venv/bin/python -m live_detector simulate` (correct family labels, inject control).
2. Open `/monitor`; `POST /api/inject {family:DDoS|DoS|Mirai|Recon, count:30}`; confirm each
   AttackSignature, the TimeLine breach→recover arc, the VerdictPanel stacked bar, the EventFeed,
   and BlocklistPanel TTL countdown.
3. Reconnect test: stop/start the detector → `useEventStream` recovers without a reload.
4. Live mode (`live`): confirm the gate-driven UI + "suspected family" + generic signature
   fallback (since family reads "Spoofing").

## Out of scope

Backend (frozen contract); the customer site (intentionally minimal, already done); auth gating
(separate); the existing CSV/PCAP upload + comparison pages (already present, only restyle).
