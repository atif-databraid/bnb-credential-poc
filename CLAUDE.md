# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is a **documentation and architecture repository**, not a software project. It contains no
source code, build system, or tests. It captures the discovery, problem validation, and proposed
POC architecture for a **DataBraid** product: a broker-controlled system for managing carrier-portal
credentials and access lifecycle (provisioning, deprovisioning, admin-of-record continuity, access
levels, credential/session handling, and MFA) for insurance brokerages.

The driving use case comes from a discovery call with Alex Metka at **Brown & Brown** Central Florida
(commercial lines). DataBraid's existing product is personal lines / Ontario; this credential layer is
positioned as a jurisdiction- and line-agnostic layer the product needs regardless.

There are no build, lint, or test commands. Work here means reading, editing, and keeping the Markdown
documents internally consistent.

## Document structure and how the files relate

The documents form a deliberate evidence chain — downstream documents cite upstream ones, so an edit to
a source should be reflected in everything that depends on it:

```
source-material/transcript-*.txt          (raw discovery call — ground truth, quotes)
            │
            ▼
source-material/background-research/       (validation of the problem + landscape)
            │   README.md      → start here; explains how the research was produced
            │   findings.md    → human-readable analysis (problem, tooling, risks)
            │   verified-claims.md / refuted-claims.md / sources.md / raw-verified-claims.json
            ▼
source-material/problem-articulation.md    (the problem statement, synthesized)
source-material/requirements.md            (R1–R7 functional + N1–N6 non-functional reqs)
            │
            ▼
poc-architecture.md                        (the proposed POC; cites all of the above)
```

`poc-architecture.md` is the primary deliverable. Its `## Requirement Coverage` table maps each
architecture capability back to the `R#`/`N#` identifiers defined in `requirements.md` — keep these IDs
synchronized when either file changes.

## Conventions to preserve when editing

- **Claims must trace to verified sources.** The background research separates `verified-claims.md`
  (survived adversarial fact-checking) from `refuted-claims.md` (quarantined marketing/vendor figures).
  Per `background-research/README.md`, do **not** reuse refuted numbers, and do not quote vendor-sourced
  cost/help-desk figures externally without independent confirmation. When adding a factual claim, cite a
  source already in `sources.md` or flag that a new one is needed.
- **Requirement IDs are stable references.** `R1`–`R7` (functional) and `N1`–`N6` (non-functional) are
  used across documents. Don't renumber them; add new ones at the end.
- **Architecture diagrams are Mermaid** embedded in `poc-architecture.md` (flowchart, sequenceDiagram,
  erDiagram). Keep them valid Mermaid and consistent with the prose around them.
- **Quotes from Alex are verbatim** from the transcript. Preserve them exactly; don't paraphrase quoted text.

## Key domain concepts (so edits stay coherent)

- **Three credential trust tiers** (central to requirement R5 / N1): Tier 1 *enter every time* (nothing
  stored), Tier 2 *cached session* (short-lived encrypted), Tier 3 *stored registry* (vaulted, auto-applied).
- **MFA is relayed, never bypassed** (N3) — challenges are proxied back to the responsible user. Any
  proposal that weakens or skips MFA contradicts the core design.
- **Broker-in-the-loop / broker-first** (N2) — the licensed broker stays accountable; this is also the
  legal/regulatory posture against the "credential-replay" risk documented in
  `problem-articulation.md` and `findings.md` §3.
- **Carrier adapter modes** — carriers are modeled as configurable packages, not hard-coded flows:
  API/federation, guided portal, email/form, and manual task adapters.
- **POC scope is deliberately narrow** — ~12 pilot carriers (top 5 prioritized), not full Brown & Brown
  or full carrier coverage. Preserve this framing; broadening scope contradicts the price-sensitive-buyer
  constraint (N5).
