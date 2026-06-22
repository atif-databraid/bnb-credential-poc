# Requirements: What Alex (Brown & Brown) Is Asking For

**Date:** 2026-06-18
**Source:** Discovery call with Alex Metka, Marketing Leader, Brown & Brown Central
Florida (Orlando) — 2026-06-12. Quotes are from the call transcript.

> **Note on authority & scope.** Alex is a potential *internal champion*, not a B&B-wide
> decision-maker — each B&B office "runs semi-independently." B&B is "ultimately very
> cheap." His office: 140 people, actively consolidating with smaller FL offices (which
> *worsens* the credential problem). He runs a 9-person commercial-lines marketing team
> (work comp, GL, auto, property). DataBraid today is **personal lines, Ontario** — Alex
> is **commercial lines, Florida** — but both sides agreed the credential layer is a
> jurisdiction-agnostic layer DataBraid needs regardless.

---

## The Core Ask (one line)

> A unified, broker-controlled system to **manage carrier-portal credentials and access
> across all the carriers his office uses** — provisioning, deprovisioning, admin
> continuity, and access levels — so it stops being manual, tribal, and a single point
> of failure.

Alex's own framing: *"my dream would be carriers sign up to be in this system… and I can
just go in and say here's this person's name and email… we just check the boxes and it
notifies the carriers and they set them up in their portals."* And: *"I just wish
everybody was like Microsoft single sign-on… that would be a dream come true."*

The primary value is **managing the logins**, not the quoting: *"really the primary
thing is… the managing of the logins period."*

---

## Functional Requirements

### R1 — Provisioning (onboarding) across many carriers, in one place
- Add a new teammate once and grant access across many carriers without repeating a
  different manual process per carrier.
- *"We onboard a new teammate and we say okay, they're going to need access to all 25 of
  these carriers. We just check the boxes and it notifies the carriers and they set them
  up in their portals."*
- Input is simple: name, email, and where needed an insurance license number.

### R2 — Deprovisioning (offboarding) across many carriers
- Remove a departing person's credentials across **all** carriers easily and reliably.
- *"You want to remove people's credentials easily for all the carriers."*
- Eliminate the leak where ex-employees retain access: *"I get lists of people… I don't
  even know who this person is… and they still have credentials with a carrier."*

### R3 — Admin-of-record continuity
- Keep the carrier admin-of-record current so it never orphans when a person leaves.
- The "Tina" failure: an admin gone **6–7 years** is still the admin of record; changing
  it requires signed forms and phone calls.
- *"It allows for continuous updating without having to redo everything."* Avoid the
  "if I left, this place would be in shambles" single-point-of-failure.

### R4 — Access-level / role management per carrier
- Support the different access tiers carriers offer, set per person per carrier:
  - **View-only** (pull policy documents)
  - **Quoting** (rate/quote new business)
  - **Administrative** (add users, pull commission reports, see book-of-business reports)
- *"There's different levels of access depending on the carrier."*

### R5 — Login automation / unified sign-on into carrier portals
- Reduce the daily burden of logging into 40–50 different portals with different
  credentials and MFA. The ideal is "Microsoft single sign-on"–like access.
- Atif proposed (and Alex was receptive to) a **credentials registry with three trust
  tiers**, which captures the spectrum Alex wants:
  1. **Enter every time** — nothing stored (max security).
  2. **Cached session** — enter once, held in session memory until portal/timeout expiry.
  3. **Stored registry** — credentials kept, auto-applied on each login; **MFA proxied
     back to the user** to enter their OTP.

### R6 — Handle carrier-by-carrier inconsistency (abstract it away)
- Normalize the wildly different per-carrier processes so the broker doesn't have to
  remember each one. *"None of them are all that difficult… it's just that each carrier
  does it differently."*
- Absorb the knowledge Alex currently keeps as tribal notes/spreadsheets.

### R7 — Knowledge assistance (secondary / Nick & Atif's idea, Alex agreed)
- Load B&B's SOPs/notes/spreadsheets so an **AI agent answers "how do I get a login for
  carrier X?"** instead of Alex being the human bottleneck. Alex: *"I could probably just
  drop that spreadsheet into Copilot."* (He sees this as helpful but secondary to R5.)

---

## Non-Functional Requirements & Constraints

| # | Requirement | Source / rationale |
|---|---|---|
| N1 | **Security/trust spectrum, broker's choice** | Alex must be able to opt for "I log in every time" through "you hold my credentials." Don't force credential storage. |
| N2 | **Broker stays in control ("broker-first")** | DataBraid's own stance: the licensed broker is accountable for binding; keep "hands on the steering wheel." Also the best legal/regulatory posture. |
| N3 | **MFA must be handled, not broken** | MFA is the #1 thing that breaks shared/automated logins; any solution that ignores it fails (note: Vertafore Credential Manager ignores MFA). |
| N4 | **Carrier-agnostic breadth** | Value comes from covering the carriers the office actually uses, regardless of vendor ecosystem. |
| N5 | **Price-sensitive buyer** | "Brown and Brown is ultimately very cheap." Pricing/packaging must clear a low internal bar. |
| N6 | **Jurisdiction/line-agnostic** | Must work for FL commercial lines even though DataBraid started in ON personal lines. Both parties agreed this layer is universal. |

---

## Scope / Coverage Signal (important for a pilot)

Alex **lowered the bar himself** — full coverage is not required to prove value:

- Active footprint: **~40–50 carriers** logged into (out of hundreds of appointments;
  many appointments have no portal).
- *"Even if you were a dozen of the carriers out of that 40… especially if five of those
  dozen are our top five portals… I can just take care of a dozen of them real quick.
  That would be amazing."*
- Prioritize **the big standard carriers** that online-rate, which are also easier to
  onboard than small MGA portals: **CNA, The Hartford, Travelers, and monoline work-comp
  carriers.**

> Contrast with DataBraid's general ROI rule of thumb (~75% book coverage to avoid being
> "just another portal"). For *this credential-management use case*, Alex signaled a
> **dozen carriers, top 5 prioritized**, is a compelling pilot.

---

## The Ambitious Vision (Alex's "dream" — directional, not near-term)

A **two-sided broker↔carrier network**: carriers onboard to the platform, brokerages
onboard, and provisioning becomes seamless on both sides. *"They connect to the system,
we connect to the system, you can charge fees on both sides and then we're all happy."*

Alex notes the TAM extends beyond B&B and beyond insurance: *"there's probably tons of
industries that have this type of same access to different vendors situation."*

This is also the **more durable architecture** (carrier-sanctioned vs. credential-replay)
— see `background-research/findings.md` §3 for why the network model de-risks the legal
and regulatory exposure of credential storage + automated login.

---

## Open Questions / To Validate With Alex

1. **Top-5 portal identification** — confirm the exact top 5 (CNA / Hartford / Travelers
   assumed) and the next ~7 for a 12-carrier pilot.
2. **Self-serve vs. carrier-admin split** — which of his carriers allow agency self-serve
   provisioning vs. require emailing/forms? (Determines automation feasibility per carrier.)
3. **Buying path** — who in his office/region actually approves a purchase, given B&B's
   semi-independent offices and price sensitivity?
4. **Consent & ToS posture** — appetite for a broker-consented, carrier-sanctioned model
   vs. expectation of full credential storage + auto-login (drives the risk profile).
5. **Existing tooling in place** — does his office already use Vertafore/Applied AMS,
   Ivans, or any rater whose credential features overlap?
