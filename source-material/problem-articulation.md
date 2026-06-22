# Problem Articulation: Carrier-Portal Credential & Access Management

**Date:** 2026-06-18
**Sources:** Discovery call with Alex Metka, Brown & Brown (2026-06-12) + verified
background research (see `background-research/`).

---

## The Problem Statement

> **Insurance brokerages have no unified, broker-side way to manage carrier-portal
> credentials and access across the dozens of carriers they actively work with.**
> Every carrier issues, secures, and governs its own logins differently, so the work
> of *provisioning, sharing, recovering, and revoking* access is manual, tribal,
> error-prone, and never the responsibility of one system — it falls on a person.

The pain is **not** primarily the day-to-day quoting or portal-hopping itself (the
workflow DataBraid's current product targets). It sits one layer underneath: the
**administrative lifecycle of the logins** that make the portals usable at all.

A mid-size brokerage office actively logs into **40–50 carrier portals** (out of
hundreds of appointments). Independently corroborated: agents maintain **15–30
logins, larger agencies 40+** — and a single agency can carry **1,000+ credentials**
across staff, carriers, vendors, and clients.

### The problem decomposes into five recurring failures

1. **Provisioning is manual and carrier-specific.** Onboarding a teammate means
   repeating a different multi-step process for every carrier — some self-serve,
   some require emailing the carrier, some need a signed roster, some require the
   employee to act first. There is no "check the boxes for 25 carriers and go."

2. **Deprovisioning is leaky.** Departed employees retain carrier access for years.
   Leaders get rosters listing people they don't recognize who still hold live
   credentials. MFA secrets stored on a departing employee's **personal phone cannot
   be remotely revoked** — they keep generating valid codes until every shared
   secret is regenerated. *Disabling the account is not enough.*

3. **Admin-of-record continuity breaks.** The person who set up a carrier's logins
   leaves, but remains the admin of record — sometimes for **6–7 years** (B&B's
   "Tina," who is "not even alive anymore" yet is still admin on some carriers).
   Re-establishing admin often requires a signed form from a principal agent and
   phone calls. This is a **business-continuity failure**, not just a security gap:
   "if I left this place would be in shambles."

4. **MFA has broken the coping mechanisms.** Dual-authentication killed credential
   sharing, so everyone now needs individual logins — multiplying the provisioning
   burden. **44% of carriers require MFA**, agents face an **average of 2.7 different
   MFA methods per carrier**, and **half authenticate ≥6 times/day**. Codes sometimes
   arrive too late to be valid, forcing repeats while the customer waits.

5. **Inactivity expiry resets the work.** Unused logins are deleted after 60–90 days,
   forcing the entire setup process to start over.

### Why it matters (impact)

- **It's industry-wide, not a B&B quirk.** A 2024 ID Federation survey found **71% of
  independent agents say sign-on time/effort has gotten worse; 37% say "much worse."**
  Alex is the rule, not the exception — and he said it himself: "this isn't just a
  Brown & Brown thing… it happens at any other large brokerage."
- **It's a daily time sink on expensive people.** Commercial CSRs lose **20–45 min
  per carrier portal per quote** and **~500 hours/year** to portal work, ~70–80% of
  which is redundant. The credential-management overhead compounds on top of that.
- **It's a single-point-of-failure risk.** Tribal knowledge (Alex's spreadsheet and
  "copious notes") and orphaned admins mean the brokerage's carrier access is one
  resignation away from chaos.
- **It's getting worse, structurally.** MFA mandates are regulatory-driven (NYDFS-
  originated) and spreading nationally — so the trend line only steepens.

---

## The Status Quo: How It's Handled Today

### Inside the brokerage (the human workaround)
- **Tribal knowledge + spreadsheets.** Alex personally maintains "copious notes" and
  a master spreadsheet (carriers down one axis, people/credentials across the top,
  yes/no per login) and periodically reconciles gaps by hand.
- **A designated human gatekeeper.** Historically one person (B&B's "Tina") owned
  provisioning; when they leave, ownership silently lapses and admin-of-record rots.
- **Ad-hoc and insecure credential storage** (written-down passwords, saved on
  personal phones), with manual password changes on departure.

### Existing tooling — and why none of it actually solves this

Multiple credible products *touch* the problem, but **every "single sign-on" is walled
inside one vendor's ecosystem or depends on carrier-by-carrier cooperation. None
offers a broker-side, carrier-agnostic credential + access-lifecycle layer.**

| Category | Representative tools | What they solve | The gap |
|---|---|---|---|
| **AMS-native SSO** | Vertafore SSO (VSSO), Ivans Exchange SSO | One login *across the vendor's own apps* | ❌ Does not reach external carrier portals |
| **AMS credential store** | **Vertafore Credential Manager** (closest analog) | Cloud-stored carrier creds, reusable across Vertafore products; role-based access | ❌ Works *only inside Vertafore products*; **docs show no MFA handling** — ignores the thing that breaks shared logins |
| **Carrier-side SSO** | Ivans eServicing, **SignOn Once / ID Federation** (industry standard) | Authenticate once per *participating* carrier; pull policy/billing/claims into AMS | ❌ **Adoption-gated** — only covers carriers that implement it; requires carrier IT investment |
| **Comparative raters** | Tarmika (Applied), EZLynx | Single-entry multi-carrier *quoting* — enter once, bridge to carriers | ❌ Solves data re-entry, **not credentials/login**; only credential is the login to the rater itself |
| **Portal-automation startups** | Relay, QuoteSweep, "technical fixers" | Store carrier creds encrypted, auto-login, fill forms — closest to the ask | ⚠️ Nascent, fragmented; confirm MFA + shared logins are the hard parts |
| **Generic password/IAM** | 1Password, Keeper, Okta, Entra | Vaulting, enterprise SSO | ❌ No carrier awareness, no provisioning *into* portals, no access-level/admin-of-record modeling |

**Carrier-side identity standards in play:** Ivans (download/connectivity), ACORD
(data), NIPR (licensing), and the ID Federation **Trust Framework** (Dec 2023; includes
MFA best-practice guidance).

### The whitespace (status-quo conclusion)

Incumbents solve credentials **inside their own walls** (Vertafore-in-Vertafore,
Ivans-in-Ivans) or **only with carrier cooperation** (SignOn Once). The thing Alex
needs — *a unified, broker-controlled place to provision, govern, and deprovision
access across the 40–50 carriers his office actually uses, including MFA* — **does not
exist as a product today.** Vertafore Credential Manager proves the demand and marks
the competitive line: DataBraid's differentiation must be **carrier-agnostic breadth +
real MFA handling**, neither of which the incumbents deliver.

> **A critical risk shadows the obvious solution.** The fastest way to fill this gap —
> store broker credentials and automate logins into carrier portals — is the same
> "credential-replay" model that banks (Wells Fargo, PNC, TD) are *actively dismantling*
> via cease-and-desist and litigation, that carrier ToS prohibit, that MFA mandates
> (NYDFS Part 500) work against, and that carries unresolved breach liability. The
> durable architecture is broker-consented and carrier-sanctioned (API/federation),
> with a broker-in-the-loop model as legal cover. See `background-research/findings.md` §3.
