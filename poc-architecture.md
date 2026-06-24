# Carrier Credential & Access Management POC Architecture

**Source basis:** `source-material/requirements.md`, `source-material/problem-articulation.md`, `source-material/transcript-2026_06_12_10_59_EDT.txt`, and `source-material/background-research/findings.md`.

**Implementation status:** A working reference implementation now exists in `poc-ts-app/` (browser-based TypeScript SPA). It demonstrates the lifecycle model, credential trust tiers, MFA relay, carrier-adapter modes, a per-carrier provider catalog, and a supervised browser-based RPA portal-automation demo. See [Reference Implementation](#reference-implementation-poc-ts-app) for how the built app maps to this architecture.

## Executive Summary

Alex's core need is a broker-controlled system for managing carrier portal access across many carriers: onboarding, offboarding, admin-of-record continuity, access levels, credential/session handling, MFA, and carrier-specific process knowledge.

The POC should prove a hybrid architecture:

- **Immediate value:** a unified broker workspace for carrier access inventory, user lifecycle requests, role mapping, SOP-guided workflows, credential/session handling, MFA relay, and audit trails.
- **Near-term automation:** carrier adapters that execute or assist the common provisioning/deprovisioning patterns for a focused set of top carriers.
- **Durable path:** carrier-sanctioned API/federation integrations where carriers participate, avoiding long-term dependence on credential replay.
- **RPA demo track:** supervised, broker-assisted RPA in guided portal adapter mode for deterministic pilot-carrier flows, with explicit user checkpoints.

For Alex's pilot, the target is not full B&B or full market coverage. The POC should prioritize **top 5 portals plus the next 7 high-value carriers** from the 40-50 active carrier portals his office uses.

## Architecture Drivers

| Driver | Implication |
|---|---|
| Broker-first control | Licensed broker/admin remains accountable and confirms lifecycle actions. |
| Carrier inconsistency | Model carriers as configurable playbooks and adapters, not hard-coded flows. |
| MFA is unavoidable | Relay MFA challenges to the user/admin instead of bypassing or weakening MFA. |
| Trust spectrum | Support enter-every-time, session-cached, and stored-registry credential modes. |
| Admin continuity | Track admin-of-record per carrier and alert before access becomes orphaned. |
| Auditability | Every credential, access, admin, and MFA action must be logged. |
| Legal/regulatory risk | Prefer sanctioned APIs/federation where possible; keep broker-in-the-loop for portal automation. |
| Price sensitivity | Start with a narrow, high-value POC and reusable carrier configuration. |

## POC Scope

### In Scope

- Broker office setup for Brown & Brown Central Florida commercial lines.
- Broker users, roles, teams, and carrier access matrix.
- Carrier catalog for approximately 12 pilot carriers.
- Per-carrier access-level normalization:
  - View-only
  - Quoting
  - Administrative
- Admin-of-record tracking per carrier and office.
- Provisioning, deprovisioning, and admin-transfer workflows.
- Carrier process playbooks loaded from SOPs/spreadsheets.
- Credential handling with three trust tiers:
  - Enter every time
  - Cached session
  - Stored registry
- MFA challenge relay back to the responsible user.
- Audit log, task status, exception queue, and evidence capture.
- Knowledge assistant for "How do I get access for carrier X?"

### Out of Scope for POC

- Full Brown & Brown enterprise rollout.
- Coverage for all 40-50 active carriers on day one.
- Full quoting, binding, or servicing workflow automation.
- Automated evasion of carrier bot detection.
- Full unattended browser control without user checkpoints.
- Any design that assumes carrier MFA can be skipped.
- Carrier network monetization, except as a future-state architectural path.

## System Context

This diagram shows the POC boundary: broker users and compliance teams interact with DataBraid, while DataBraid connects to the broker IdP, imported SOPs, carrier portals, carrier support channels, future sanctioned carrier integrations, secrets infrastructure, and notifications. The integration posture is explicit:
- **API/federation mode:** DataBraid sends lifecycle payloads to carriers and receives confirmations directly.
- **Portal mode:** DataBraid launches a broker-controlled session and runs a scripted, broker-assisted portal flow, with user confirmation remaining mandatory at critical steps.

```mermaid
flowchart LR
    BrokerAdmin["Broker Admin<br/>(Alex / delegated admin)"]
    TeamMember["Broker Team Member<br/>(CSR / marketer / producer)"]
    Compliance["Broker IT / Compliance"]
    DataBraid["DataBraid<br/>Credential & Access POC"]
    BrokerIdP["Brown & Brown IdP<br/>(Entra / SSO)"]
    SOPs["SOPs, spreadsheets,<br/>carrier notes"]
    CarrierPortals["Carrier Portals<br/>(CNA, Hartford, Travelers, etc.)"]
    CarrierContacts["Carrier support teams<br/>and mailbox workflows"]
    CarrierAPIs["Carrier APIs / Federation<br/>(future or sanctioned path)"]
    KMS["Cloud KMS / Secrets Vault"]
    Notify["Email / Teams / Slack"]

    BrokerAdmin -->|"Manage users, carriers, access"| DataBraid
    TeamMember -->|"Launch portals, complete MFA, request access"| DataBraid
    Compliance -->|"Review audit and policy"| DataBraid
    DataBraid -->|"OIDC/SAML login"| BrokerIdP
    SOPs -->|"Import and index"| DataBraid
    DataBraid -->|"Broker-in-loop launch and assisted workflow"| CarrierPortals
    DataBraid -->|"Forms, emails, roster requests"| CarrierContacts
    DataBraid -.->|"Provisioning / deprovisioning APIs"| CarrierAPIs
    DataBraid -->|"Envelope encryption and secret storage"| KMS
    DataBraid -->|"Tasks, approvals, exceptions"| Notify
```

## Container Architecture

This diagram decomposes the POC into runtime services, data stores, browser-side components, and external systems, showing how lifecycle orchestration, credential handling, MFA relay, carrier adapters, knowledge search, audit, and notifications fit together.

```mermaid
flowchart TB
    subgraph Browser["Broker Browser"]
        WebApp["Broker Workspace UI"]
        Launcher["Secure Portal Launcher<br/>(browser agent or controlled session)"]
    end

    subgraph DataBraid["DataBraid POC Platform"]
        Gateway["API Gateway"]
        Auth["AuthN/AuthZ Service<br/>SSO, RBAC, tenant isolation"]
        Directory["Broker Directory Service<br/>users, teams, licenses"]
        CarrierCatalog["Carrier Catalog Service<br/>portals, roles, playbooks"]
        Lifecycle["Access Lifecycle Orchestrator<br/>provision, deprovision, admin transfer"]
        CredentialRegistry["Credential Registry Service<br/>trust tiers, consent, rotation state"]
        SessionBroker["Session Broker<br/>session cache, portal launch"]
        MFARelay["MFA Challenge Relay<br/>user prompt and verification handoff"]
        AdapterRuntime["Carrier Adapter Runtime<br/>API, portal, RPA, email/form adapters"]
        Knowledge["Knowledge Assistant<br/>SOP Q and A and workflow guidance"]
        Audit["Audit and Evidence Ledger"]
        Notification["Notification Service"]
    end

    subgraph DataStores["Data Stores"]
        OperationalDB[("Operational DB<br/>users, carriers, requests, grants")]
        VectorIndex[("SOP Vector Index")]
        SecretVault[("Secrets Vault<br/>credentials, tokens, OTP metadata")]
        Queue[("Workflow Queue")]
        ObjectStore[("Evidence Store<br/>forms, screenshots, confirmations")]
    end

    subgraph External["External Systems"]
        BrokerIdP["Broker IdP"]
        CarrierPortal["Carrier Portals"]
        CarrierAPI["Carrier APIs / Federation"]
        CarrierMailbox["Carrier Email / Forms"]
        Messaging["Email / Teams"]
    end

    WebApp --> Gateway
    Launcher --> SessionBroker
    Gateway --> Auth
    Gateway --> Directory
    Gateway --> CarrierCatalog
    Gateway --> Lifecycle
    Gateway --> CredentialRegistry
    Gateway --> Knowledge

    Auth --> BrokerIdP
    Directory --> OperationalDB
    CarrierCatalog --> OperationalDB
    Lifecycle --> Queue
    Lifecycle --> AdapterRuntime
    Lifecycle --> Audit
    CredentialRegistry --> SecretVault
    SessionBroker --> SecretVault
    SessionBroker --> MFARelay
    SessionBroker --> CarrierPortal
    MFARelay --> WebApp
    AdapterRuntime --> CarrierAPI
    AdapterRuntime --> CarrierPortal
    AdapterRuntime --> CarrierMailbox
    Knowledge --> VectorIndex
    Knowledge --> OperationalDB
    Audit --> OperationalDB
    Audit --> ObjectStore
    Notification --> Messaging
```

## Core Domain Model

This diagram captures the main business entities the POC must track: broker offices, users, carrier appointments, portals, carrier playbooks, access requests, grants, credentials, MFA challenges, admin assignments, SOP documents, and audit events.

```mermaid
erDiagram
    BROKER_OFFICE ||--o{ BROKER_USER : has
    BROKER_OFFICE ||--o{ CARRIER_APPOINTMENT : has
    CARRIER ||--o{ CARRIER_PORTAL : exposes
    CARRIER ||--o{ CARRIER_PLAYBOOK : configured_by
    CARRIER_APPOINTMENT }o--|| CARRIER : references
    BROKER_USER ||--o{ ACCESS_REQUEST : submits_or_receives
    ACCESS_REQUEST ||--o{ ACCESS_TASK : decomposes_into
    BROKER_USER ||--o{ ACCESS_GRANT : receives
    CARRIER_PORTAL ||--o{ ACCESS_GRANT : grants
    CARRIER_PORTAL ||--o{ CREDENTIAL_RECORD : uses
    BROKER_USER ||--o{ CREDENTIAL_RECORD : owns
    CARRIER_PORTAL ||--o{ ADMIN_ASSIGNMENT : administered_by
    BROKER_USER ||--o{ ADMIN_ASSIGNMENT : holds
    ACCESS_REQUEST ||--o{ AUDIT_EVENT : records
    CREDENTIAL_RECORD ||--o{ MFA_CHALLENGE : triggers
    CARRIER_PLAYBOOK ||--o{ SOP_DOCUMENT : sourced_from

    BROKER_OFFICE {
        string id
        string name
        string region
        string tenant_id
    }

    BROKER_USER {
        string id
        string name
        string email
        string license_number
        string employment_status
    }

    CARRIER {
        string id
        string name
        string carrier_type
    }

    CARRIER_PORTAL {
        string id
        string url
        string login_pattern
        string mfa_methods
        string timeout_policy
    }

    CARRIER_PLAYBOOK {
        string id
        string provisioning_mode
        string deprovisioning_mode
        string admin_transfer_mode
        string required_fields
    }

    ACCESS_REQUEST {
        string id
        string request_type
        string status
        string requested_by
        datetime requested_at
    }

    ACCESS_GRANT {
        string id
        string normalized_role
        string carrier_native_role
        string status
        datetime last_verified_at
    }

    CREDENTIAL_RECORD {
        string id
        string trust_tier
        string storage_state
        string rotation_state
        datetime last_used_at
    }

    ADMIN_ASSIGNMENT {
        string id
        string admin_type
        string continuity_status
        datetime verified_at
    }

    AUDIT_EVENT {
        string id
        string actor
        string action
        string target
        datetime occurred_at
    }
```

## Provisioning Flow

This sequence shows how a broker admin can add a teammate once, select carrier access, and let DataBraid split that request into carrier-specific API, guided portal, or email/form provisioning tasks with audit evidence and status notifications.

```mermaid
sequenceDiagram
    actor Admin as Broker Admin
    participant UI as Broker Workspace UI
    participant LC as Access Lifecycle Orchestrator
    participant Cat as Carrier Catalog
    participant Adapter as Carrier Adapter Runtime
    participant Carrier as Carrier Portal/API/Support
    participant Notify as Notification Service
    participant Audit as Audit Ledger

    Admin->>UI: Add teammate and select carrier checkboxes
    UI->>LC: Create provisioning request
    LC->>Cat: Resolve carrier playbooks, required fields, access levels
    LC->>Audit: Record request and approval context

    loop Each selected carrier
        LC->>Adapter: Start carrier-specific provisioning task
        alt Carrier API or federation available
            Adapter->>Carrier: Submit user, license, office, role
            Carrier-->>Adapter: Confirmation or exception
        else Broker self-serve portal
            Adapter->>Carrier: Launch guided admin workflow
            Carrier-->>Adapter: Optional guided or RPA-assisted execution plan
            Carrier-->>Adapter: Confirmation captured
        else Email/form workflow
            Adapter->>Carrier: Generate roster/form/email packet
            Carrier-->>Adapter: Manual confirmation or follow-up required
        end
        Adapter-->>LC: Task status and evidence
        LC->>Audit: Record outcome
    end

    LC->>Notify: Notify admin and teammate of completed/pending access
    Notify-->>Admin: Summary with exceptions
```

## Deprovisioning Flow

This sequence shows the offboarding path: DataBraid first disables local credential/session access, then coordinates revocation across each carrier through API, guided admin workflow, or carrier support request, while tracking confirmations and exceptions.

```mermaid
sequenceDiagram
    actor Admin as Broker Admin
    participant UI as Broker Workspace UI
    participant LC as Access Lifecycle Orchestrator
    participant Cred as Credential Registry
    participant Adapter as Carrier Adapter Runtime
    participant Carrier as Carrier Portal/API/Support
    participant Audit as Audit Ledger

    Admin->>UI: Mark teammate as departing
    UI->>LC: Create offboarding request for all active grants
    LC->>Cred: Lock local stored credentials and sessions
    Cred-->>LC: Local access disabled
    LC->>Audit: Record local revocation

    loop Each carrier grant
        LC->>Adapter: Start deprovisioning task
        alt API/federation deactivation
            Adapter->>Carrier: Disable user or revoke role
        else Broker admin self-serve
            Adapter->>Carrier: Guided admin deactivation workflow
            Carrier-->>Adapter: Optional guided or RPA-assisted deactivation step status
        else Carrier support required
            Adapter->>Carrier: Send deactivation request with evidence
        end
        Carrier-->>Adapter: Confirmation or pending case ID
        Adapter-->>LC: Task status
        LC->>Audit: Record carrier revocation status
    end

    LC->>UI: Show offboarding completion, exceptions, and carrier follow-ups
```

## Credential Sharing and Integration Handover (How this is shown)

The POC answers the credentials-sharing question with two explicit handoff modes:

- **Storage:** credentials or short-lived sessions remain in the Secrets Vault and are keyed by user/carrier trust policy.
- **Handover:** credentials/sessions are released only into a signed, user-bound launch context.
- **No leak path:** task records store only references; they do not persist credential plaintext.

```mermaid
sequenceDiagram
    actor BrokerUser as Broker User / Admin
    participant UI as Broker Workspace UI
    participant SB as Session Broker
    participant CR as Credential Registry
    participant Vault as Secrets Vault
    participant APIAdapter as Carrier API Adapter
    participant PortalAdapter as Guided-Portal Adapter
    participant Carrier as Carrier Portal / API

    BrokerUser->>UI: Open carrier launch / provisioning action
    UI->>SB: Resolve request and trust tier
    SB->>CR: Get trust policy, owner scope, credential source
    CR-->>SB: Policy + credential source (Tier 1/2/3)

    alt Carrier API or federation mode
        SB->>APIAdapter: Send approved payload (identity, role, office, admin action)
        APIAdapter->>Carrier: API / federation request
        Carrier-->>APIAdapter: Confirmation, case ID, or exception
        APIAdapter-->>SB: Outcome + evidence references
    else Guided portal mode (RPA-assisted)
        SB->>Vault: Pull credential/session material for this launch
        Vault-->>SB: Short-lived launch material only
        SB->>PortalAdapter: Build signed launch envelope + step plan
        PortalAdapter-->>UI: Open approved carrier session with RPA step panel
        UI->>PortalAdapter: Approve execution checkpoint and continue
        PortalAdapter->>Carrier: Execute deterministic scripted portal actions
        Carrier-->>PortalAdapter: Step outcomes, MFA challenge, or exception
        PortalAdapter-->>UI: Show step logs, screenshots, and completion status
    end

    SB->>UI: Return access state, evidence references, and next actions
```

## Credential Trust Tiers and MFA Handling

This diagram shows the three credential-handling modes and the common MFA path: users may enter credentials each time, use a short-lived cached session, or use stored credentials from the vault, but carrier MFA challenges are still relayed back to the responsible user.

```mermaid
flowchart LR
    Launch["User launches carrier access"]
    Policy{"Credential trust tier<br/>for user + carrier"}
    T1["Tier 1:<br/>Enter every time"]
    T2["Tier 2:<br/>Cached session"]
    T3["Tier 3:<br/>Stored registry"]
    Prompt["Prompt user for credentials"]
    Cache[("Encrypted session cache<br/>short-lived")]
    Vault[("Secrets vault<br/>stored credentials")]
    Portal["Carrier portal login"]
    MFA{"Carrier requests MFA?"}
    Relay["MFA relay prompt<br/>to responsible user"]
    OTP["User enters OTP / approval"]
    Success["Portal session established"]
    Audit["Audit event"]

    Launch --> Policy
    Policy --> T1
    Policy --> T2
    Policy --> T3
    T1 --> Prompt
    T2 --> Cache
    T2 --> Prompt
    T3 --> Vault
    Prompt --> Portal
    Cache --> Portal
    Vault --> Portal
    Portal --> MFA
    MFA -- "No" --> Success
    MFA -- "Yes" --> Relay
    Relay --> OTP
    OTP --> Portal
    Success --> Audit
```

### Trust Tier Semantics

| Tier | Behavior | Best for |
|---|---|---|
| Tier 1: Enter every time | DataBraid stores nothing. User enters credentials at launch. | High-sensitivity carriers, initial trust-building, strict compliance posture. |
| Tier 2: Cached session | Credentials/session material is retained only in short-lived encrypted memory/cache. | Daily workflow relief without long-term credential storage. |
| Tier 3: Stored registry | Credentials are stored in a vault and auto-applied; MFA is relayed to the user. | High-volume portals where broker accepts storage risk. |

## Admin-of-Record Continuity

This diagram shows the control loop for preventing orphaned carrier admins: DataBraid inventories admin assignments, verifies whether admins are still active and backed up, flags continuity risks, and drives transfer workflows with evidence and reminders.

```mermaid
flowchart TB
    Inventory["Carrier admin inventory"]
    Verify["Scheduled admin verification"]
    Active{"Admin still active<br/>and has backup?"}
    Healthy["Continuity healthy"]
    Risk["Continuity risk"]
    Transfer["Admin transfer workflow"]
    Evidence["Signed forms, carrier case IDs,<br/>confirmation evidence"]
    Audit["Audit and reminders"]

    Inventory --> Verify
    Verify --> Active
    Active -- "Yes" --> Healthy
    Active -- "No" --> Risk
    Risk --> Transfer
    Transfer --> Evidence
    Evidence --> Audit
    Audit --> Inventory
```

The POC should require at least two designated internal admins for every pilot carrier where the carrier supports it. If a carrier only allows one admin, the system should flag that carrier as a continuity risk and keep an explicit transfer playbook.

## Carrier Adapter Strategy

Each pilot carrier is represented by a configurable carrier package. The package should separate **metadata** from **execution** so DataBraid can add carriers without rewriting the platform.

This diagram shows the carrier package structure: each package combines portal metadata, lifecycle playbooks, execution adapters, and evidence rules, with adapters selected based on whether the carrier supports APIs, self-serve portals, email/forms, or manual tasks.

```mermaid
flowchart LR
    CarrierPackage["Carrier Package"]
    Metadata["Metadata<br/>URLs, roles, MFA, timeout, contacts"]
    Playbook["Lifecycle Playbook<br/>provision, deprovision, admin transfer"]
    Adapter["Execution Adapter"]
    Evidence["Evidence Rules<br/>screenshots, confirmations, case IDs"]

    Adapter --> API["API/Federation adapter"]
    Adapter --> Portal["Guided portal adapter"]
    Adapter --> RPA["RPA script adapter"]
    Adapter --> Email["Email/form adapter"]
    Adapter --> Manual["Manual task adapter"]

    CarrierPackage --> Metadata
    CarrierPackage --> Playbook
    CarrierPackage --> Adapter
    CarrierPackage --> Evidence
```

### Adapter Modes

| Mode | Description | POC Use |
|---|---|---|
| API/federation adapter | Uses sanctioned carrier endpoint or identity federation. | Preferred where available. |
| Guided portal adapter | Opens the carrier admin portal and executes constrained scripts with user checkpoints in a supervised session. | Practical near-term automation while keeping broker in control. |
| RPA script adapter | Executes deterministic, scriptable provisioning/deprovisioning steps where carrier pages are stable. | Demonstration-grade automation for pilot carriers without APIs. |
| Email/form adapter | Generates carrier-specific emails, rosters, and signed forms. | Handles carriers without self-serve admin functions. |
| Manual task adapter | Creates checklist tasks and captures evidence. | Keeps long-tail carriers visible without pretending they are automated. |

## Knowledge Assistant

This diagram shows how Alex's spreadsheets, SOPs, carrier notes, and email templates become searchable operational knowledge that can answer carrier-access questions and optionally create lifecycle tasks from the answer.

```mermaid
flowchart TB
    Documents["Carrier SOPs, spreadsheets,<br/>notes, email templates"]
    Ingest["Document ingestion<br/>parse, classify, redact"]
    Index[("SOP vector index")]
    Assistant["Knowledge Assistant"]
    UserQuestion["User question:<br/>How do I get a Hartford login?"]
    Answer["Answer with steps,<br/>required fields, links, owner"]
    Workflow["Optional: create lifecycle task"]
    Audit["Audit prompt and answer metadata"]

    Documents --> Ingest
    Ingest --> Index
    UserQuestion --> Assistant
    Assistant --> Index
    Assistant --> Answer
    Answer --> Workflow
    Assistant --> Audit
```

The assistant is secondary to lifecycle automation but useful for the POC because it converts Alex's tribal spreadsheet into shared operational knowledge.

## Deployment View

This diagram shows a practical cloud deployment shape for the POC: broker browsers enter through API protection into DataBraid services, while workflow workers and isolated carrier adapters connect outward to carrier portals, APIs, and support mailboxes; secrets, evidence, logs, queueing, and indexes are managed services.

```mermaid
flowchart TB
    subgraph UserEnv["Broker Environment"]
        Browser["Browser"]
        IdP["Brown & Brown IdP"]
    end

    subgraph Cloud["DataBraid Cloud"]
        WAF["WAF / API Protection"]
        App["Web App and API Services"]
        Workers["Workflow Workers"]
        AdapterSandbox["Carrier Adapter Sandbox"]
        KMS["KMS"]
        Vault["Secrets Vault"]
        DB["Managed Relational DB"]
        Vector["Managed Vector Index"]
        Queue["Managed Queue"]
        Logs["Central Logs and SIEM Export"]
        ObjectStore["Evidence Object Store"]
    end

    subgraph CarrierWorld["Carrier World"]
        Portal["Carrier Portals"]
        API["Carrier APIs / Federation"]
        Mailbox["Carrier Email / Support"]
    end

    Browser --> WAF
    WAF --> App
    App --> IdP
    App --> DB
    App --> Vector
    App --> Queue
    App --> Vault
    Vault --> KMS
    Queue --> Workers
    Workers --> AdapterSandbox
    AdapterSandbox --> Portal
    AdapterSandbox --> API
    AdapterSandbox --> Mailbox
    Workers --> ObjectStore
    App --> Logs
    Workers --> Logs
```

## Security and Compliance Controls

- **Tenant isolation:** all users, carriers, credentials, and evidence are scoped to a broker office/tenant.
- **SSO first:** authenticate broker users through the broker IdP where available.
- **RBAC:** separate team member, broker admin, compliance reviewer, and DataBraid support roles.
- **Consent records:** store explicit consent for trust tier, carrier, and credential-owner scope.
- **Encryption:** encrypt data in transit and at rest; use envelope encryption for secrets.
- **Secrets isolation:** credentials and token material live only in the secrets vault or short-lived session cache.
- **MFA relay:** MFA is completed by the user/admin, not bypassed.
- **RPA governance:** RPA scripts run in supervised mode only, require explicit confirmation at critical actions, and capture execution screenshots/evidence.
- **Audit ledger:** record lifecycle requests, approvals, credential use, MFA events, adapter actions, and evidence.
- **Least privilege:** normalize access roles and map them to minimum required carrier-native roles.
- **Break-glass workflow:** require elevated approval and audit evidence for emergency admin access.
- **Retention policy:** define credential, session, evidence, and SOP retention separately.
- **Carrier ToS posture:** prefer sanctioned integrations; use guided broker-in-loop workflows where sanctioned APIs do not exist.

## Reference Implementation (`poc-ts-app/`)

A runnable proof-of-concept lives in `poc-ts-app/`. It is a single-page TypeScript application with no backend: all state lives in the browser, the workflow engine runs client-side, and mock carrier portals are served as static pages. This keeps the demo safe and deterministic — it never calls real carrier endpoints and persists nothing outside the browser.

### What it is (and is not)

- **It is** a faithful demonstration of the lifecycle model, trust tiers, MFA relay, adapter modes, provider catalog, and a supervised RPA portal-automation flow.
- **It is not** the production architecture rendered above. Several server-side services in the [Container Architecture](#container-architecture) are collapsed into client-side modules for the demo:

| Architecture concept | Demo realization |
|---|---|
| Operational DB, Secrets Vault, Queue, Evidence/Object Store | Browser `localStorage` (single state blob, key `bb-credential-poc-state-v1`). |
| Access Lifecycle Orchestrator, Credential Registry, Session Broker, MFA Relay | `src/engine.ts` pure functions (`provisionTeammate`, `deprovisionTeammate`, `launchCarrierAccess`, `completePendingTask`, `evaluateContinuity`, `searchKnowledge`). |
| Carrier Adapter Runtime + per-carrier outcomes | `taskOutcomeForCarrier` deterministic outcome simulation by adapter mode; mock portal pages under `carrier-portals/`. |
| Carrier API / federation, carrier mailbox | Simulated task outcomes; no live integrations. |
| Secrets vault encryption | `btoa` encoding placeholder — illustrative only, not real envelope encryption. |
| SOP Vector Index / Knowledge Assistant | Seeded `KnowledgeDoc` set with substring scoring in `searchKnowledge`. |

### Implemented workspace views

The app (`src/app.ts`) presents these views, each tagged with the `R#`/`N#` requirements it demonstrates:

- **Alex Map** — requirements-to-screen translation for R1–R7 and N1–N6.
- **Overview** — workspace launcher, pending queue, and a recent-requests sample.
- **Provision** — add a teammate once, check carrier boxes, and set per-carrier role and trust tier; one request fans out into carrier-specific tasks.
- **Users** — per-user access inventory, offboarding, and carrier launch (launch is restricted to the currently signed-in user; admins offboard others).
- **Requests** — lifecycle request/task evidence trail with per-carrier task status.
- **Providers** — full CRUD over the carrier catalog: portal URL, adapter mode, API support, auth mechanism, MFA method, default trust tier, and timeout.
- **Pending** — operational queue of tasks needing broker confirmation (portal/email/manual adapter outcomes).
- **Knowledge** — search over seeded carrier SOP notes.
- **Continuity** — admin-of-record risk findings per carrier.

### Browser-based RPA portal-automation demo

The most recent addition is a supervised RPA demonstration of the guided-portal adapter mode, replacing an earlier `window.prompt` credential flow:

- **Inline launch panel** in the workspace collects credentials (or auto-launches from a cached session / saved login), then relays MFA when the carrier requires it — no credentials are persisted in task records.
- **Mock carrier portal** (`carrier-portals/mock-carrier-portal.js`) opens in a new window and renders a carrier-branded login whose form shape varies by `authMechanism` (`credentials`, `oauth`, `sso_redirect`, `email_code`, `phone_code`).
- **RPA overlay** shows DataBraid automating the login: character-by-character typing into the username/password/OTP fields, a visible step log, then submission.
- **Authenticated dashboard** is shown after a successful simulated login, standing in for the carrier session the broker would work in directly.
- **Session reuse** — Tier 2 launches extract the username from the cached token and skip credential re-entry until timeout.

This is demonstration-grade automation: it runs against the mock portals only, keeps the broker in the loop at credential and MFA checkpoints, and is consistent with the **RPA governance** posture in [Security and Compliance Controls](#security-and-compliance-controls).

### Seed data

The seed (`src/seed.ts`) ships **12 pilot carriers** spanning all adapter modes and auth mechanisms (CNA, The Hartford, Travelers, Monoline Work Comp, AMN/AFLAC, Liberty Mutual, State Farm, Hiscox, Berkshire Hathaway, Chubb, Endeavor, Axiom Risk), three seeded broker users (including Alex Metka as broker admin), seeded grants, admin-of-record assignments, and a small knowledge-note set.

### Running and testing

- `npm run build` compiles TypeScript; `npm start` serves the app at `http://127.0.0.1:4173`.
- `playwright-smoke.js` is a headless smoke test covering provision → requests → offboard → launch panel → continuity → knowledge → localStorage persistence.

## Requirement Coverage

| Requirement | POC Capability |
|---|---|
| R1 Provisioning | Add teammate once, select carriers, orchestrate carrier-specific tasks. |
| R2 Deprovisioning | Departing-user workflow disables local access and tracks carrier revocation. |
| R3 Admin continuity | Admin inventory, backup admin tracking, transfer workflows, continuity alerts. |
| R4 Access levels | Normalized roles mapped to carrier-native role options. |
| R5 Login automation / unified sign-on | Inline launch panel, credential trust tiers, session cache, saved login, MFA relay, and supervised browser-based RPA against mock portals (implemented in `poc-ts-app`). |
| R6 Carrier inconsistency | Carrier catalog with Providers CRUD, playbooks, adapter modes, per-mode task outcomes, evidence rules. |
| R7 Knowledge assistance | SOP ingestion, vector search, Q&A, task creation from answers. |
| N1 Security/trust spectrum | Tier 1/2/3 credential handling. |
| N2 Broker stays in control | Broker admin approvals and guided workflows. |
| N3 MFA handled | MFA relay is a first-class component. |
| N4 Carrier-agnostic breadth | Adapter pattern supports APIs, portals, forms, and manual tasks. |
| N5 Price-sensitive buyer | Narrow top-carrier POC, reusable carrier packages, no enterprise-wide dependency. |
| N6 Jurisdiction/line-agnostic | Core lifecycle model is independent of FL/ON and commercial/personal lines. |

## POC Implementation Phases

### Phase 1: Access Inventory and Carrier Catalog

- Import Alex's spreadsheet/SOPs.
- Configure pilot carriers, portals, roles, admins, and provisioning modes.
- Build carrier access matrix by user and carrier.
- Produce stale access and orphaned-admin reports.

### Phase 2: Lifecycle Orchestration

- Add onboarding, offboarding, and admin-transfer request flows.
- Implement workflow queue, status tracking, notifications, and audit events.
- Add email/form adapter for carriers requiring carrier support.

### Phase 3: Credential and MFA POC

- Add trust-tier policy per user/carrier.
- Implement secure portal launcher for Tier 1 and Tier 2.
- Add stored registry for selected low-risk/high-value pilot carriers.
- Add MFA relay and session timeout handling.
- Add supervised RPA flow runner for deterministic carrier portal actions.

### Phase 4: Pilot Carrier Adapters

- Build carrier packages for top 5 confirmed portals.
- Extend to approximately 12 carriers if the first group validates value.
- Capture per-carrier evidence, exceptions, and maintenance burden.
- Author baseline RPA scripts for carriers where the portal flow is stable and low risk.

### Phase 5: Carrier-Sanctioned Path

- Identify carriers willing to support API/federated provisioning.
- Promote API/federation adapter mode as preferred for participating carriers.
- Use pilot usage data to support a carrier-side value proposition.

## POC Success Metrics

- Time to onboard a teammate across selected carriers.
- Time to offboard a teammate across all active grants.
- Number of orphaned/stale carrier users found.
- Percent of pilot carriers with current admin-of-record and backup admin.
- Percent of lifecycle tasks completed without Alex-specific tribal knowledge.
- Number of MFA challenges successfully relayed.
- Number of RPA-assisted carrier tasks completed with user checkpoints.
- Reduction in repeated credential entry for Tier 2/Tier 3 carriers.
- Number of carriers supported by reusable packages.
- Exceptions by carrier and adapter mode.

## Key Open Decisions

- Confirm Alex's exact top 5 carriers and next 7 pilot carriers.
- Decide which carriers are safe candidates for Tier 3 stored credentials.
- Decide whether the portal launcher is browser-extension based, remote-browser based, or both.
- Define which portal actions are allowed in supervised RPA scripts and required checkpoint granularity.
- Confirm Brown & Brown IdP availability for the POC office.
- Define legal/compliance wording for broker consent and carrier ToS posture.
- Decide retention period for portal evidence and access audit events.
