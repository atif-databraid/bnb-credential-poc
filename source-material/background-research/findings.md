# Carrier-Portal Credential Management — Research Findings

**Date:** 2026-06-18 · **For:** DataBraid (re: Brown & Brown / Alex Metka)
**Basis:** 52 sources → 219 claims → 122 adversarial verification votes (96 survived, 26 refuted).
Built only on claims that survived verification; refuted marketing numbers are flagged.

---

## 1. Problem Validation — Is this bigger than Brown & Brown?

**Verdict: Strongly validated. This is a recognized, industry-wide pain — not a B&B quirk.**

The single most credible data point:

> **A 2024 ID Federation survey found 71% of independent agents say the time/effort
> to sign on to carrier systems has gotten *worse*, with 37% saying "much worse."**
> (Insurance Journal, Apr 2025 — verified)

That reframes Alex from "one frustrated marketing leader" into "the 71%."

### Scale of credential sprawl
- Independent agents maintain **15–30 carrier portal logins; larger agencies 40+** — almost exactly Alex's "40 or 50." Multiple independent sources.
- One agency reported managing **1,000+ usernames/passwords** across staff, carriers, vendors, clients.
- Credential count scales multiplicatively: a 100-employee agency on 65 carriers must protect **6,500+ separate IDs**. *(The specific "6,500" example traces to SignOn Once sponsored content and was refuted on sourcing — but the multiplicative-sprawl point is corroborated elsewhere.)*

### MFA is the accelerant — validates Alex's "can't share logins anymore"
- **44% of carriers now require MFA**; agents navigate an **average of 2.7 different MFA methods per carrier** (2024 ID Federation survey — verified).
- **Half of agents authenticate ≥6 times per day**; a 12-employee agency generates **72+ MFA workflows daily**.
- MFA methods are wildly inconsistent (text, email, phone, authenticator, biometric), and **codes sometimes arrive too late to be valid**, forcing repeats while the customer waits.
- Regulatory-driven and spreading nationally (NYDFS-originated — see §3), so it **only gets worse** — which is what the 71%-worsening number captures.

### Offboarding / orphaned-admin (Alex's "Tina" story) is real and documented
- When employees leave, leaders must **manually change passwords or disable access** because staff save credentials on personal phones.
- **Shared MFA/OTP secrets on a departing employee's personal phone cannot be remotely revoked** — the ex-employee keeps generating valid codes until every shared secret is regenerated. Disabling the account isn't enough.
- A single person holding a critical auth code is framed as a **business-continuity failure, not just security** — precisely Alex's "if I left, this place would be in shambles."

### Time/cost (commercial lines — Alex's world)
- Commercial CSRs spend **20–45 min of data entry per carrier portal per quote**; **3–5 carriers per submission = 1–3 hours each**; **8–12 hours/week ≈ ~500 hours/year per person**.
- One analyst measured a **median 225 minutes (3.75 hrs) of portal navigation per commercial BOP quote** across 10–15 carriers (~$281/quote at $75/hr).
- **70–80% of the data entered is identical across portals** — pure redundant re-keying.
- Carrier inconsistency is structural: **6 distinct login patterns catalogued across 70 carriers**; Hartford's portal **times out after 45 min, mid-form**.

### ⚠️ Numbers to NOT use (refuted as self-interested vendor marketing)
- ❌ "$1,000–$3,000 per user per year" password cost — ID Federation marketing, 2018, uncited. Independent figures (Forrester/Specops) are **4–22× lower** (~$70/reset, ~$136/user/yr).
- ❌ "Passwords are the #1 help-desk topic across all carriers" / "70% reduction in help-desk calls" — same source, uncited.

---

## 2. Existing Tooling — and the gap DataBraid would fill

**Critical finding: multiple credible players touch this problem, but none solve the cross-carrier credential lifecycle for an independent brokerage. Every existing "single sign-on" is walled inside one vendor's ecosystem.**

| Tool | What it does | What it does NOT solve |
|---|---|---|
| **Vertafore SSO (VSSO)** | One login across *Vertafore's own* apps (AMS360, PL Rating, etc.) | ❌ Does not touch external carrier portals. 3 account states; no carrier provisioning/MFA. |
| **Vertafore Credential Manager** | **Closest existing thing** — cloud-stored carrier credentials, single set reusable across Vertafore products; role-based access (Read / Manage Own / Manage All); multiple logins per carrier | ❌ Only works *inside Vertafore products*; not standalone. **Zero mention of MFA** in docs — doesn't handle the thing that actually breaks shared logins. |
| **Ivans eServicing** | Carrier-implemented SSO; pulls policy/billing/claims into the AMS | ❌ **Carrier-side, carrier-by-carrier adoption**; only participating carriers. Not a cross-carrier vault. |
| **Ivans Exchange** | Manages carrier/MGA *download* connections; SSO across Ivans products via Auth0 | ❌ A data-download dashboard, not a credential vault. SSO is Ivans-only. |
| **SignOn Once / ID Federation** | Industry **federated-identity standard** (nonprofit alliance; Vertafore/Applied certified IdPs); ~10 yrs old; one identity across *participating* carriers | ❌ **Requires each carrier to implement it** → coverage is adoption-gated. The "right" long-term architecture but partial reach. |
| **Tarmika / comparative raters (EZLynx)** | Single-entry multi-carrier *quoting* — enter once, bridge to carriers (Tarmika owned by Applied) | ❌ Solves data re-entry, **not** credentials/login. Raters "pull rates but do not log into carrier portals and fill forms." |
| **Portal-automation startups** (Relay, QuoteSweep, "technical fixers") | **Store carrier credentials encrypted, auto-login, fill forms** — closest to Alex's ask | ⚠️ Nascent, fragmented category. Confirms the approach is viable *and* that MFA + shared logins are the hard parts. |
| **Generic password managers / IAM** (1Password, Keeper, Okta, Entra) | Store/share credentials, enterprise vaulting | ❌ No carrier awareness; no provisioning *into* portals; no access-level modeling; no admin-of-record. |

**Carrier-side standards worth knowing:** Ivans (download/connectivity), ACORD (data), NIPR (licensing), and the **ID Federation Trust Framework** (Dec 2023, includes MFA best-practice guidance).

### The strategic gap
Every incumbent solves credentials *only inside its own walls* (Vertafore in Vertafore, Ivans in Ivans) or *only with carrier cooperation* (SignOn Once). **Nobody offers a broker-side, carrier-agnostic credential + access-lifecycle layer** across the 40–50 portals an agency actually uses — exactly Alex's ask and the "universal layer" Nick described.

**Counter-note:** **Vertafore Credential Manager is a warning shot** — the dominant AMS vendor has already built a partial version. DataBraid's edge must be **carrier-agnostic breadth + actually handling MFA**, the thing Vertafore's tool conspicuously omits.

---

## 3. Red Flags — what DataBraid must walk in knowing

The credential-vault-plus-automated-login model is **the exact model institutions in the adjacent banking sector are actively killing right now.**

### 🚩 #1 — The banking precedent is a direct preview of carrier reaction
- **Wells Fargo, PNC, TD Bank are actively forcing aggregators to stop screen-scraping** customer data via stored credentials — C&D letters and lawsuits — pushing them to sanctioned APIs (Akoya, Plaid).
- The attacked model: *"collecting usernames and passwords and then impersonating the customer to log into the portal"* — **the same credential-replay model a broker vault uses against carrier portals.**
- Cited as **interfering with fraud/bot-detection**; aggregators are in an **arms race obfuscating automated traffic to look human.** Carriers will plausibly follow.

### 🚩 #2 — MFA is both the wedge AND a structural threat
- **NYDFS 23 NYCRR Part 500 (amended, effective Nov 1, 2025)** requires MFA for **any individual accessing any information system** of a covered entity — broadened beyond remote/privileged access.
- **Brokers/agents licensed by NYDFS are covered entities** (small-entity exemptions narrowed after 2023). Other states follow NY. NY has collected **$19M+ in fines** from insurers.
- Directly threatens stored/shared/automated logins by regulatory design. Atif's "proxy the MFA back to the user" is a sensible answer, but it works *against a strengthening regulatory current.*

### 🚩 #3 — Third-party-service-provider (TPSP) obligations land on DataBraid
- NYDFS recommends covered entities contractually require TPSPs to: implement MFA as if subject to Part 500, **encrypt nonpublic info in transit and at rest**, limit cross-border storage, and **certify data destruction at offboarding**.
- B&B's compliance team will push these down onto DataBraid in any contract. Storing carrier credentials makes DataBraid a high-value breach target inheriting GLBA-style scrutiny.

### 🚩 #4 — Legal exposure for automated access, even without CFAA liability
- **Van Buren (2021, SCOTUS):** narrowed CFAA — improper *motive* isn't a crime ("gates-up-or-down"). But it **left open whether contractual/ToS limits count**, and pro-scraping holdings apply to **public data — NOT authenticated pages** (exactly the carrier-portal case).
- **hiQ v. LinkedIn:** ended in a **$500K judgment + permanent injunction**; hiQ liable for **breach of ToS, trespass to chattels, misappropriation** — state-law theories that survive regardless of CFAA. **Carrier ToS prohibiting credential sharing / automated access are enforceable as breach of contract.**

### 🚩 #5 — Liability ambiguity when something goes wrong
- In credential-aggregation breaches, **who's liable for unauthorized transactions is legally unresolved**; the accessed institution argues it shouldn't bear aggregator-caused losses. DataBraid would likely absorb that liability (E&O / cyber implications).

### Strategic read
The "scrape-and-vault" path is fast and is what Alex implicitly asks for — but it **swims against regulation, carrier ToS, and a banking precedent dismantling the identical model.** The durable path is the one Alex *also* described in his "dream" (carriers sign up, B&B signs up, both connect) and that SignOn Once/Ivans represent: **carrier-sanctioned, API/federation-based access** — slower (adoption-gated) but defensible. Likely viable near-term: a **hybrid** — broker-consented credential management + MFA-proxy for coverage today, with an explicit roadmap to sanctioned carrier integration, and **broker-in-the-loop consent** (Nick's "broker-first, hands on the wheel" framing) as the best available legal/regulatory cover.

---

## Bottom line for the Alex conversation

1. **Problem validated and quantified** — lead with "71% of agents say it's getting worse" + MFA stats. Alex is the rule, not the exception.
2. **Whitespace is real** — no incumbent offers carrier-agnostic, broker-side credential + access-lifecycle management with real MFA handling. Vertafore Credential Manager proves demand and marks the line to beat.
3. **Risks concentrate on the exact mechanism Alex wants** — credential storage + automated login. Need a deliberate stance on carrier ToS, NYDFS/TPSP obligations, MFA, and breach liability *before* building; bias toward broker-consented, carrier-sanctioned architecture as the endgame.
