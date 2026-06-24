import { AccessRole, AdapterMode, AppState, AuthMechanism, Carrier, MfaMode, ProvisionInput, RequestStatus, TrustTier } from './models';
import {
  computeSummary,
  evaluateContinuity,
  launchCarrierAccess,
  provisionTeammate,
  deprovisionTeammate,
  searchKnowledge,
  completePendingTask,
} from './engine.js';
import { loadState, saveState, resetState } from './storage.js';

type ViewMode = 'requirements' | 'overview' | 'provision' | 'users' | 'requests' | 'knowledge' | 'continuity' | 'pending' | 'providers';
type RequirementId = `R${1 | 2 | 3 | 4 | 5 | 6 | 7}` | `N${1 | 2 | 3 | 4 | 5 | 6}`;
type MockCarrierPortal = {
  path: string;
  liveUrl: string;
  notes: string;
  authMechanism: AuthMechanism;
};

interface LaunchPanelState {
  userId: string;
  carrierId: string;
  phase: 'credentials' | 'mfa' | 'launched';
  enteredUsername?: string;
  enteredPassword?: string;
  enteredOtp?: string;
}

let launchPanel: LaunchPanelState | null = null;

const adapterModeOptions: AdapterMode[] = ['API_FEDERATED', 'PORTAL_GUIDED', 'EMAIL_FORM', 'MANUAL'];
const authMechanismOptions: AuthMechanism[] = ['credentials', 'oauth', 'sso_redirect', 'email_code', 'phone_code'];
const mfaMethodOptions: MfaMode[] = ['totp', 'sms', 'push', 'email'];
const trustTierOptions: TrustTier[] = ['TIER_1_ENTER_EVERY_TIME', 'TIER_2_CACHED_SESSION', 'TIER_3_STORED_REGISTRY'];

const requirementCopy: Record<RequirementId, { title: string; short: string; proof: string }> = {
  R1: {
    title: 'Provisioning',
    short: 'Add one teammate, check carrier boxes, split into carrier tasks.',
    proof: 'Provision view creates one request across selected carriers.',
  },
  R2: {
    title: 'Deprovisioning',
    short: 'Remove a departing person across all carriers.',
    proof: 'Users view offboards a user, revokes grants, and queues carrier revocation tasks.',
  },
  R3: {
    title: 'Admin continuity',
    short: 'Prevent orphaned carrier admin-of-record ownership.',
    proof: 'Continuity view flags carriers missing active primary or backup admins.',
  },
  R4: {
    title: 'Access levels',
    short: 'Normalize view-only, quoting, and administrative access.',
    proof: 'Provision and Users views show role mapping per carrier grant.',
  },
  R5: {
    title: 'Login automation',
    short: 'Launch portals with credential mode handling and MFA relay.',
    proof: 'Users view launches carrier access with inline sign-in, session reuse, or saved credentials.',
  },
  R6: {
    title: 'Carrier inconsistency',
    short: 'Turn carrier differences into adapter modes and playbooks.',
    proof: 'Provisioning tasks resolve as API, guided portal, email/form, or manual work.',
  },
  R7: {
    title: 'Knowledge assistance',
    short: 'Make Alex’s notes and SOPs searchable.',
    proof: 'Knowledge view answers carrier-access procedure questions from seeded notes.',
  },
  N1: {
    title: 'Security choice',
    short: 'Do not force stored credentials.',
    proof: 'Each carrier can be set to Always ask, Remember session, or Saved login.',
  },
  N2: {
    title: 'Broker in control',
    short: 'Broker admin remains accountable for sensitive actions.',
    proof: 'Pending tasks and MFA prompts require broker confirmation.',
  },
  N3: {
    title: 'MFA handled',
    short: 'Relay MFA instead of bypassing it.',
    proof: 'Carrier launch prompts for MFA when the carrier requires it.',
  },
  N4: {
    title: 'Carrier breadth',
    short: 'Support the office’s carrier mix, not one vendor ecosystem.',
    proof: 'Seed catalog models 12 pilot carriers with different adapter modes.',
  },
  N5: {
    title: 'Narrow pilot',
    short: 'Prove value with top carriers before expanding.',
    proof: 'Demo scope is a 12-carrier pilot, matching Alex’s lowered pilot bar.',
  },
  N6: {
    title: 'Line agnostic',
    short: 'Keep the lifecycle model independent of jurisdiction and line of business.',
    proof: 'Core entities are users, carriers, grants, tasks, credentials, and evidence.',
  },
};

const viewRequirementMap: Record<ViewMode, RequirementId[]> = {
  requirements: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6'],
  overview: ['R1', 'R2', 'R3', 'R5', 'R6', 'N2', 'N5'],
  provision: ['R1', 'R4', 'R6', 'N1', 'N2', 'N4'],
  users: ['R2', 'R4', 'R5', 'N1', 'N3'],
  requests: ['R1', 'R2', 'R6', 'N2'],
  pending: ['R6', 'N2', 'N4'],
  knowledge: ['R6', 'R7'],
  continuity: ['R3', 'N2'],
  providers: ['N2', 'N4', 'R5'],
};

const root = document.querySelector<HTMLDivElement>('#app') ?? (() => {
  throw new Error('No #app container found');
})();

const carrierPortalRegistry: Record<string, MockCarrierPortal> = {
  'carrier-cna': {
    path: 'carrier-portals/carrier-cna.html',
    liveUrl: 'https://www.cna.com/agentcenterpublic',
    notes: 'CNA agent center simulation',
    authMechanism: 'credentials',
  },
  'carrier-hartford': {
    path: 'carrier-portals/carrier-hartford.html',
    liveUrl: 'https://global.thehartford.com/s/login/ForgotPassword',
    notes: 'Hartford portal simulation',
    authMechanism: 'sso_redirect',
  },
  'carrier-travelers': {
    path: 'carrier-portals/carrier-travelers.html',
    liveUrl: 'https://signin.travelers.com/',
    notes: 'Travelers portal simulation',
    authMechanism: 'email_code',
  },
  'carrier-monoline': {
    path: 'carrier-portals/carrier-monoline.html',
    liveUrl: 'https://www.argogroup.com/agent-login/',
    notes: 'Work-comp portal simulation',
    authMechanism: 'credentials',
  },
  'carrier-aman': {
    path: 'carrier-portals/carrier-aman.html',
    liveUrl:
      'https://argolimited.okta.com/oauth2/default/v1/authorize?client_id=0oa124mlqcdQYay9F2p8&redirect_uri=https%3A%2F%2Fagentportal.argolimited.com%2Findex.aspx&response_type=code&scope=openid%20profile%20email&code_challenge=e1pbEnltW82S9frTrplHoL0-8qOe67HSYzOca-2oM5U&code_challenge_method=S256&state=OpenIdConnect.AuthenticationProperties%3DSfS5JXEKO2KT_VrMwKMxVssbNtzhk7JcwhuxYPrkVTFYhpQFnQ4n6OvBOL_kaWSufabbDa_ZbrQFCCc5JIpVDoJQu3YLWN4To-lilicg3n5ZQInRjYFIBn7JlkSLYiMonZwwQmBmvVh4lCNHDYZkn7N-KXNM15JehLeKi8DnCG_d5QPSZREtNmUHKp44qv1oVPPTZ9I7Izt-ZGVIFBCNQTin2ElKF8cbcl8xhrj-7219FSPheud4-xF7MWTHHBhQOI---YQaSxovcH2VKVKu3-UEHYHp4gExnVHWfocuofWrnp8JnKnCdB9-riqNO_FNTBcuZKsJvrLE7LaCKq9Uiw&response_mode=form_post&nonce=639174380612924319.NTgyMDIyYTktZWM2Zi00MDczLTlhNTgtM2VkZTM5NTQzZjNmNjg5ZWM3Y2ItNDRkZC00ZGJkLWFkZjctMjE1MDg0ZDI1MjZj&x-client-SKU=ID_NET461&x-client-ver=5.3.0.0',
    notes: 'OAuth sign-in simulation',
    authMechanism: 'oauth',
  },
  'carrier-liberty': {
    path: 'carrier-portals/carrier-liberty.html',
    liveUrl: 'https://www.libertymutual.com',
    notes: 'Liberty Mutual portal simulation',
    authMechanism: 'credentials',
  },
  'carrier-statefarm': {
    path: 'carrier-portals/carrier-statefarm.html',
    liveUrl: 'https://www.statefarm.com',
    notes: 'State Farm portal simulation',
    authMechanism: 'phone_code',
  },
  'carrier-hiscox': {
    path: 'carrier-portals/carrier-hiscox.html',
    liveUrl: 'https://www.hiscox.com',
    notes: 'Hiscox portal simulation',
    authMechanism: 'credentials',
  },
  'carrier-berkshire': {
    path: 'carrier-portals/carrier-berkshire.html',
    liveUrl: 'https://www.berkshirehathaway.com',
    notes: 'Berkshire portal simulation',
    authMechanism: 'credentials',
  },
  'carrier-chubb': {
    path: 'carrier-portals/carrier-chubb.html',
    liveUrl: 'https://www.chubb.com',
    notes: 'Chubb portal simulation',
    authMechanism: 'email_code',
  },
  'carrier-endeavor': {
    path: 'carrier-portals/carrier-endeavor.html',
    liveUrl: 'https://www.argolimited.com',
    notes: 'Endeavor portal simulation',
    authMechanism: 'sso_redirect',
  },
  'carrier-axiom': {
    path: 'carrier-portals/carrier-axiom.html',
    liveUrl: 'https://www.axiomrisk.com',
    notes: 'Axiom Risk portal simulation',
    authMechanism: 'credentials',
  },
};

function resolvePortalConfig(carrier: Carrier): MockCarrierPortal {
  const registryConfig = carrierPortalRegistry[carrier.id];
  return {
    path: registryConfig?.path ?? 'carrier-portals/carrier-generic.html',
    liveUrl: carrier.portalUrl ?? registryConfig?.liveUrl ?? '',
    notes: carrier.portalUrl ? `Live: ${carrier.portalUrl}` : registryConfig?.notes ?? `${carrier.name} mock login simulation`,
    authMechanism: carrier.authMechanism ?? registryConfig?.authMechanism ?? 'credentials',
  };
}

let appState = loadState();
let knowledgeQuery = '';
let activeView: ViewMode = 'requirements';
let currentUserId = appState.users.find((user) => user.employmentStatus === 'active')?.id ?? '';
let editingCarrierId: string | null = null;

function labelRole(role: AccessRole): string {
  if (role === 'VIEW_ONLY') return 'View-only';
  if (role === 'QUOTING') return 'Quoting';
  return 'Administrative';
}

function labelTrust(tier: TrustTier): string {
  if (tier === 'TIER_1_ENTER_EVERY_TIME') return 'Always ask';
  if (tier === 'TIER_2_CACHED_SESSION') return 'Remember session';
  return 'Saved login';
}

function trustName(tier: TrustTier): string {
  if (tier === 'TIER_1_ENTER_EVERY_TIME') return 'Always ask — credentials entered fresh each time';
  if (tier === 'TIER_2_CACHED_SESSION') return 'Remember session — kept until timeout';
  return 'Saved login — stored and auto-applied';
}

function trustExplanation(tier: TrustTier): string {
  if (tier === 'TIER_1_ENTER_EVERY_TIME') return 'Nothing is stored. You type your username and password each time you launch this carrier. Safest option for high-sensitivity portals.';
  if (tier === 'TIER_2_CACHED_SESSION') return 'After you sign in once, your session is kept in memory until the carrier times out. You won\'t need to re-enter credentials for a few hours.';
  return 'Your credentials are saved securely and applied automatically on each launch. You still complete MFA if the carrier requires it.';
}

function selectedTrustAttr(current: TrustTier, option: TrustTier): string {
  return current === option ? ' selected' : '';
}

function selectedAttr(current: string, option: string): string {
  return current === option ? ' selected' : '';
}

function buildCarrierId(seedName: string): string {
  const normalized = seedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 45);
  return `carrier-${normalized || 'provider'}`;
}

function allocateCarrierId(seedName: string, avoidId?: string): string {
  let candidate = buildCarrierId(seedName);
  if (avoidId && candidate === avoidId) {
    return avoidId;
  }
  const existing = new Set(appState.carriers.map((carrier) => carrier.id));
  if (!existing.has(candidate) && !avoidId) {
    return candidate;
  }

  let suffix = 2;
  while (existing.has(`${candidate}-${suffix}`)) {
    suffix += 1;
  }
  return `${candidate}-${suffix}`;
}

function requestStatusFromTaskIds(state: AppState, taskIds: string[]): RequestStatus {
  const resolved: Array<'DONE' | 'PENDING' | 'MANUAL_ACTION' | 'FAILED'> = [];
  for (const taskId of taskIds) {
    const task = state.tasks.find((taskRecord) => taskRecord.id === taskId);
    if (task) {
      resolved.push(task.status);
    }
  }

  if (resolved.length === 0) {
    return 'QUEUED';
  }
  if (resolved.some((status) => status === 'FAILED')) {
    return 'BLOCKED';
  }
  if (resolved.some((status) => status === 'PENDING' || status === 'MANUAL_ACTION')) {
    return 'PARTIAL';
  }

  return 'COMPLETED';
}

function carrierName(carrierId: string): string {
  return appState.carriers.find((carrier) => carrier.id === carrierId)?.name ?? carrierId;
}

function activeUsers() {
  return appState.users.filter((user) => user.employmentStatus === 'active');
}

function currentUser() {
  return appState.users.find((user) => user.id === currentUserId && user.employmentStatus === 'active') ?? activeUsers()[0];
}

function ensureCurrentUser(): void {
  const user = currentUser();
  currentUserId = user?.id ?? '';
}

function actorEmail(): string {
  return currentUser()?.email ?? 'admin@local';
}

function sessionKeyFor(userId: string, carrierId: string): string {
  return `${userId}::${carrierId}`;
}

function buildPortalUrl(
  userId: string,
  carrierId: string,
  credentials: { username: string; password: string; otp?: string } | null,
): string | null {
  const user = appState.users.find((entry) => entry.id === userId);
  const carrier = appState.carriers.find((entry) => entry.id === carrierId);
  if (!user || !carrier) return null;

  const config = resolvePortalConfig(carrier);
  const grant = appState.accessGrants.find((entry) => entry.userId === userId && entry.carrierId === carrierId && entry.status === 'active');
  const key = sessionKeyFor(userId, carrierId);
  const storedHint = appState.vault[key]?.credentialHint ?? '';
  const session = appState.sessions[key];
  const hasCachedSession = Boolean(session);
  const storedUsername = storedHint.split(':')[0] ?? '';
  const sessionUsername = session?.token ? (() => { try { return atob(session.token).split(':')[0]; } catch { return ''; } })() : '';
  const resolvedUsername = credentials?.username || storedUsername || sessionUsername || '';

  const params = new URLSearchParams();
  params.set('carrierId', carrier.id);
  params.set('themeId', carrier.id);
  params.set('carrierName', carrier.name);
  params.set('liveUrl', config.liveUrl);
  params.set('requiresMfa', String(carrier.requiresMfa));
  params.set('mfaMethod', carrier.mfaMethod);
  params.set('notes', config.notes);
  params.set('authMechanism', config.authMechanism);
  params.set('userName', user.name);
  params.set('userEmail', user.email);
  params.set('trustTier', grant?.trustTier || 'TIER_2_CACHED_SESSION');
  params.set('mode', grant?.trustTier || 'TIER_2_CACHED_SESSION');
  params.set('username', resolvedUsername);
  params.set('cachedSession', hasCachedSession ? 'true' : 'false');
  params.set('mfaSatisfied', credentials?.otp ? 'true' : 'false');
  if (credentials?.otp) {
    params.set('otp', credentials.otp);
  }

  const portalUrl = new URL(config.path, window.location.href);
  portalUrl.search = params.toString();
  return portalUrl.toString();
}

function buildLaunchPanel(): string {
  if (!launchPanel) return '';

  const user = appState.users.find((entry) => entry.id === launchPanel!.userId);
  const carrier = appState.carriers.find((entry) => entry.id === launchPanel!.carrierId);
  if (!user || !carrier) return '';

  const grant = appState.accessGrants.find(
    (entry) => entry.userId === user.id && entry.carrierId === carrier.id && entry.status === 'active',
  );
  if (!grant) return '';

  const key = sessionKeyFor(user.id, carrier.id);
  const storedHint = appState.vault[key]?.credentialHint ?? '';
  const hasCachedSession = Boolean(appState.sessions[key]);
  const tierLabel = labelTrust(grant.trustTier);
  const tierExplain = trustExplanation(grant.trustTier);

  if (launchPanel.phase === 'launched') {
    return '';
  }

  if (launchPanel.phase === 'mfa') {
    return `
      <div class="launch-panel">
        <div class="launch-panel-header">
          <div>
            <p class="eyebrow">MFA required</p>
            <h3>${carrier.name} — ${user.name}</h3>
          </div>
          <button type="button" class="ghost" data-action="close-launch">Cancel</button>
        </div>
        <div class="launch-panel-info">
          <p>${carrier.name} requires <strong>${carrier.mfaMethod.toUpperCase()}</strong> verification.</p>
          <p class="muted">The carrier sent a code to your registered device. Enter it below to continue.</p>
        </div>
        <form id="launch-mfa-form" class="launch-form">
          <label>
            MFA code (${carrier.mfaMethod})
            <input name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Enter code" required />
          </label>
          <div class="action-row">
            <button type="submit">Verify and launch</button>
            <button type="button" class="ghost" data-action="close-launch">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  // phase === 'credentials'
  const needsCredentials = grant.trustTier === 'TIER_1_ENTER_EVERY_TIME'
    || (grant.trustTier === 'TIER_2_CACHED_SESSION' && !hasCachedSession)
    || (grant.trustTier === 'TIER_3_STORED_REGISTRY' && !storedHint);
  const prefillUsername = storedHint || user.email;

  if (!needsCredentials) {
    // Auto-launch: has cached session or stored credentials
    return `
      <div class="launch-panel">
        <div class="launch-panel-header">
          <div>
            <p class="eyebrow">Launching carrier portal</p>
            <h3>${carrier.name} — ${user.name}</h3>
          </div>
          <button type="button" class="ghost" data-action="close-launch">Cancel</button>
        </div>
        <div class="launch-tier-badge">
          <strong>${tierLabel}</strong>
          <span class="muted">${hasCachedSession ? 'Using your active session' : `Using saved credentials (${storedHint})`}</span>
        </div>
        <div class="action-row">
          <button type="button" data-action="auto-launch">Launch ${carrier.name}</button>
          <button type="button" class="ghost" data-action="close-launch">Cancel</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="launch-panel">
      <div class="launch-panel-header">
        <div>
          <p class="eyebrow">Sign in to carrier portal</p>
          <h3>${carrier.name} — ${user.name}</h3>
        </div>
        <button type="button" class="ghost" data-action="close-launch">Cancel</button>
      </div>
      <div class="launch-tier-badge">
        <strong>${tierLabel}</strong>
        <p class="muted">${tierExplain}</p>
      </div>
      <form id="launch-cred-form" class="launch-form">
        <label>
          Username for ${carrier.name}
          <input name="username" type="text" autocomplete="username" value="${prefillUsername}" placeholder="${user.email}" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autocomplete="current-password" placeholder="Enter your ${carrier.name} password" required />
        </label>
        ${grant.trustTier === 'TIER_2_CACHED_SESSION' ? '<label class="checkbox-label"><input type="checkbox" name="remember" checked /> Remember this session</label>' : ''}
        <div class="action-row">
          <button type="submit">Sign in to ${carrier.name}</button>
          <button type="button" class="ghost" data-action="close-launch">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function statusLabel(status: string): string {
  return status.toLowerCase().replace(/_/g, ' ');
}

function requirementBadge(id: RequirementId): string {
  const requirement = requirementCopy[id];
  return `<span class="req-chip" title="${requirement.title}: ${requirement.short}">${id}</span>`;
}

function requirementBadges(ids: RequirementId[]): string {
  return `<div class="req-chip-row" aria-label="Mapped requirements">${ids.map(requirementBadge).join('')}</div>`;
}

function buildRequirementSummary(view: ViewMode, lead: string): string {
  return `
    <div class="requirement-summary">
      <div>
        <p class="eyebrow">Requirement mapping</p>
        <p>${lead}</p>
      </div>
      ${requirementBadges(viewRequirementMap[view])}
    </div>
  `;
}

function countPendingTasks(): number {
  return appState.tasks.filter((task) => task.status === 'PENDING' || task.status === 'MANUAL_ACTION').length;
}

function buildViewNav(): string {
  const pendingCount = countPendingTasks();
  const navItems: Array<{ id: ViewMode; label: string; suffix?: string }> = [
    { id: 'requirements', label: 'Alex Map' },
    { id: 'overview', label: 'Overview' },
    { id: 'provision', label: 'Provision' },
    { id: 'users', label: 'Users' },
    { id: 'requests', label: 'Requests' },
    { id: 'providers', label: 'Providers' },
    { id: 'pending', label: 'Pending', suffix: pendingCount ? `${pendingCount}` : undefined },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'continuity', label: 'Continuity' },
  ];

  return `
    <nav class="view-nav" aria-label="POC views">
      ${navItems
        .map((item) => {
          const isActive = activeView === item.id ? 'is-active' : '';
          const suffix = item.suffix ? `<span class="view-badge">${item.suffix}</span>` : '';
          return `<button type="button" data-action="switch-view" data-view="${item.id}" class="view-button ${isActive}">${item.label}${suffix}</button>`;
        })
        .join('')}
    </nav>
  `;
}

function buildCarrierGrid(): string {
  const rows = appState.carriers
    .map((carrier) => {
      return `
        <tr>
          <td>
            <label class="carrier-select">
              <input type="checkbox" name="carrier_${carrier.id}" value="${carrier.id}" />
              <span>
                <strong>${carrier.name}</strong>
                <small>${statusLabel(carrier.adapterMode)} adapter</small>
              </span>
            </label>
          </td>
          <td>
            <select name="role_${carrier.id}" aria-label="${carrier.name} access role">
              <option value="VIEW_ONLY">${labelRole('VIEW_ONLY')}</option>
              <option value="QUOTING">${labelRole('QUOTING')}</option>
              <option value="ADMINISTRATIVE">${labelRole('ADMINISTRATIVE')}</option>
            </select>
          </td>
          <td>
            <select name="trust_${carrier.id}" aria-label="${carrier.name} credential mode">
              <option value="TIER_1_ENTER_EVERY_TIME"${selectedTrustAttr(carrier.defaultTrustTier, 'TIER_1_ENTER_EVERY_TIME')}>Always ask</option>
              <option value="TIER_2_CACHED_SESSION"${selectedTrustAttr(carrier.defaultTrustTier, 'TIER_2_CACHED_SESSION')}>Remember session</option>
              <option value="TIER_3_STORED_REGISTRY"${selectedTrustAttr(carrier.defaultTrustTier, 'TIER_3_STORED_REGISTRY')}>Saved login</option>
            </select>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="carrier-table-wrap">
      <table class="carrier-table">
        <thead>
          <tr>
            <th>Carrier</th>
            <th>Role</th>
            <th>Credential mode</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildSelectOptions(options: readonly string[], selected: string): string {
  return options.map((option) => `<option value="${option}"${selectedAttr(selected, option)}>${option}</option>`).join('');
}

function buildProvidersView(): string {
  const activeCarrier = editingCarrierId ? appState.carriers.find((carrier) => carrier.id === editingCarrierId) : undefined;
  const inEditMode = Boolean(activeCarrier);
  const formTitle = inEditMode ? `Edit provider ${activeCarrier?.name}` : 'Add provider';
  const submitLabel = inEditMode ? 'Save provider changes' : 'Add provider';
  const cancelLabel = inEditMode ? 'Cancel edits' : '';
  const rows = appState.carriers
    .map((carrier) => {
      return `
        <tr>
          <td>
            <strong>${carrier.name}</strong>
            <small>${carrier.id}</small>
          </td>
          <td>${carrier.portalUrl ? `<a class="provider-link" href="${carrier.portalUrl}" target="_blank" rel="noopener noreferrer">${carrier.portalUrl}</a>` : '<span class="muted">Not configured</span>'}</td>
          <td>${carrier.adapterMode}</td>
          <td>${carrier.authMechanism || 'credentials'}</td>
          <td>${carrier.requiresMfa ? `${carrier.mfaMethod} (requires MFA)` : 'No MFA'}</td>
          <td>${labelTrust(carrier.defaultTrustTier)}</td>
          <td class="actions-col">
            <button type="button" data-action="edit-provider" data-carrier="${carrier.id}" class="ghost">Edit</button>
            <button type="button" data-action="delete-provider" data-carrier="${carrier.id}" class="ghost">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <section class="tool-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Provider catalog</p>
          <h2>${formTitle}</h2>
        </div>
        <span class="section-count">${appState.carriers.length} providers</span>
      </div>
      ${buildRequirementSummary(
        'providers',
        'Use this view to add, edit, and remove providers and set portal behavior used by mock launch.',
      )}
      <form id="provider-form">
        <input type="hidden" name="carrierId" value="${activeCarrier?.id ?? ''}" />
        <div class="form-grid">
          <label>Provider name<input name="name" required value="${activeCarrier?.name ?? ''}" placeholder="Carrier / provider name" /></label>
          <label>Portal URL<input name="portalUrl" type="url" value="${activeCarrier?.portalUrl ?? ''}" placeholder="https://..." /></label>
          <label>Adapter mode
            <select name="adapterMode" aria-label="Adapter mode">
              ${buildSelectOptions(adapterModeOptions, activeCarrier?.adapterMode ?? 'PORTAL_GUIDED')}
            </select>
          </label>
          <label>Supports API
            <select name="supportsApi" aria-label="Supports API">
              <option value="true"${activeCarrier?.supportsApi ? ' selected' : ''}>Yes</option>
              <option value="false"${!activeCarrier?.supportsApi ? ' selected' : ''}>No</option>
            </select>
          </label>
          <label>Login hint<input name="loginHint" value="${activeCarrier?.loginHint ?? ''}" placeholder="Optional user hint" /></label>
          <label>Requires MFA
            <select name="requiresMfa" aria-label="Requires MFA">
              <option value="true"${activeCarrier?.requiresMfa ? ' selected' : ''}>Yes</option>
              <option value="false"${!activeCarrier?.requiresMfa ? ' selected' : ''}>No</option>
            </select>
          </label>
          <label>MFA method
            <select name="mfaMethod" aria-label="MFA method">
              ${buildSelectOptions(mfaMethodOptions, activeCarrier?.mfaMethod ?? 'totp')}
            </select>
          </label>
          <label>Auth mechanism
            <select name="authMechanism" aria-label="Portal auth mechanism">
              ${buildSelectOptions(authMechanismOptions, activeCarrier?.authMechanism ?? 'credentials')}
            </select>
          </label>
          <label>Default credential mode
            <select name="defaultTrustTier" aria-label="Default credential mode">
              <option value="TIER_1_ENTER_EVERY_TIME"${selectedTrustAttr(activeCarrier?.defaultTrustTier ?? 'TIER_1_ENTER_EVERY_TIME', 'TIER_1_ENTER_EVERY_TIME')}>Always ask</option>
              <option value="TIER_2_CACHED_SESSION"${selectedTrustAttr(activeCarrier?.defaultTrustTier ?? 'TIER_1_ENTER_EVERY_TIME', 'TIER_2_CACHED_SESSION')}>Remember session</option>
              <option value="TIER_3_STORED_REGISTRY"${selectedTrustAttr(activeCarrier?.defaultTrustTier ?? 'TIER_1_ENTER_EVERY_TIME', 'TIER_3_STORED_REGISTRY')}>Saved login</option>
            </select>
          </label>
          <label>Timeout (hours)<input name="timeoutHours" type="number" min="1" max="240" step="1" value="${activeCarrier?.timeoutHours ?? 4}" /></label>
          <label>Notes<input name="notes" value="${activeCarrier?.notes ?? ''}" /></label>
        </div>
        <div class="action-row">
          <button type="submit">${submitLabel}</button>
          ${inEditMode ? `<button type="button" class="ghost" id="provider-form-cancel">${cancelLabel}</button>` : ''}
        </div>
      </form>

      <div class="carrier-table-wrap">
        <table class="carrier-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Live portal URL</th>
              <th>Adapter</th>
              <th>Auth mechanism</th>
              <th>MFA</th>
              <th>Credential mode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7"><div class="empty-line">No providers yet.</div></td></tr>'}</tbody>
        </table>
      </div>
    </section>
  `;
}

function collectCarrierFromForm(form: HTMLFormElement): Carrier {
  const formData = new FormData(form);
  const requestedName = String(formData.get('name') ?? '').trim();
  if (!requestedName) {
    throw new Error('Provider name is required.');
  }

  const requestedId = String(formData.get('carrierId') ?? '').trim();
  const duplicateName = appState.carriers.find(
    (carrier) => carrier.id !== requestedId && carrier.name.toLowerCase() === requestedName.toLowerCase(),
  );
  if (duplicateName) {
    throw new Error('A provider with that name already exists.');
  }
  const carrierId = requestedId ? requestedId : allocateCarrierId(requestedName);
  const adapterMode = String(formData.get('adapterMode') ?? 'PORTAL_GUIDED') as AdapterMode;
  const supportsApi = String(formData.get('supportsApi') ?? 'false') === 'true';
  const requiresMfa = String(formData.get('requiresMfa') ?? 'false') === 'true';
  const mfaMethod = String(formData.get('mfaMethod') ?? 'totp') as MfaMode;
  const authMechanism = String(formData.get('authMechanism') ?? 'credentials') as AuthMechanism;
  const defaultTrustTier = String(formData.get('defaultTrustTier') ?? 'TIER_1_ENTER_EVERY_TIME') as TrustTier;
  const timeoutHoursRaw = Number(formData.get('timeoutHours') ?? 4);
  const timeoutHours = Number.isFinite(timeoutHoursRaw) && timeoutHoursRaw > 0 ? Math.round(timeoutHoursRaw) : 4;
  const portalUrl = String(formData.get('portalUrl') ?? '').trim();
  const loginHint = String(formData.get('loginHint') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  const existing = appState.carriers.find((carrier) => carrier.id === requestedId);
  if (!existing && carrierId !== requestedId) {
    const collisions = appState.carriers.find((carrier) => carrier.id === carrierId);
    if (collisions) {
      throw new Error('A provider with that name already exists. Use a unique name.');
    }
  }

  if (!adapterModeOptions.includes(adapterMode)) {
    throw new Error(`Unsupported adapter mode ${adapterMode}`);
  }
  if (!authMechanismOptions.includes(authMechanism)) {
    throw new Error(`Unsupported auth mechanism ${authMechanism}`);
  }
  if (!mfaMethodOptions.includes(mfaMethod)) {
    throw new Error(`Unsupported MFA method ${mfaMethod}`);
  }
  if (!trustTierOptions.includes(defaultTrustTier)) {
    throw new Error(`Unsupported trust tier ${defaultTrustTier}`);
  }

  return {
    id: carrierId,
    name: requestedName,
    adapterMode,
    supportsApi,
    requiresMfa,
    mfaMethod,
    loginHint,
    timeoutHours,
    defaultTrustTier,
    notes,
    portalUrl: portalUrl || undefined,
    authMechanism,
  };
}

function deleteProvider(carrierId: string): void {
  const removed = appState.carriers.find((carrier) => carrier.id === carrierId);
  if (!removed) {
    return;
  }
  const removedTaskIds = new Set(appState.tasks.filter((task) => task.carrierId === carrierId).map((task) => task.id));

  appState.carriers = appState.carriers.filter((carrier) => carrier.id !== carrierId);
  appState.accessGrants = appState.accessGrants.filter((grant) => grant.carrierId !== carrierId);
  appState.adminAssignments = appState.adminAssignments.filter((assignment) => assignment.carrierId !== carrierId);
  appState.knowledge = appState.knowledge.filter((doc) => doc.carrierId !== carrierId);
  appState.tasks = appState.tasks.filter((task) => task.carrierId !== carrierId);

  const vaultKeys = Object.keys(appState.vault);
  const sessionKeys = Object.keys(appState.sessions);
  for (const key of vaultKeys) {
    if (key.endsWith(`::${carrierId}`)) {
      delete appState.vault[key];
    }
  }
  for (const key of sessionKeys) {
    if (key.endsWith(`::${carrierId}`)) {
      delete appState.sessions[key];
    }
  }

  appState.requests = appState.requests.map((request) => {
    const taskIds = request.taskIds.filter((taskId) => !removedTaskIds.has(taskId));
    const carrierIds = request.carrierIds.filter((carrier) => carrier !== carrierId);
    return {
      ...request,
      taskIds,
      carrierIds,
      status: requestStatusFromTaskIds(appState, taskIds),
      updatedAt: new Date().toISOString(),
    };
  });

  if (editingCarrierId === carrierId) {
    editingCarrierId = null;
  }

  const vaultSummary = Object.keys(appState.vault).length;
  if (!vaultSummary) {
    appState.vault = {};
  }
  const sessionSummary = Object.keys(appState.sessions).length;
  if (!sessionSummary) {
    appState.sessions = {};
  }
}

function upsertCarrier(entry: Carrier): void {
  const existingIndex = appState.carriers.findIndex((carrier) => carrier.id === entry.id);
  if (existingIndex >= 0) {
    appState.carriers[existingIndex] = { ...appState.carriers[existingIndex], ...entry };
    return;
  }
  appState.carriers.push(entry);
  appState.carriers.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
}

function buildProvisionView(): string {
  return `
    <section class="tool-panel provision-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Provisioning workflow</p>
          <h2>Provision teammate</h2>
        </div>
        <span class="panel-badge">${appState.carriers.length} carriers</span>
      </div>
      ${buildRequirementSummary(
        'provision',
        'This is Alex’s "check the boxes" ask: create one teammate once, choose carrier access, and let the system fan out carrier-specific work.',
      )}
      <form id="provision-form">
        <div class="form-grid">
          <label>Name<input name="name" required value="" placeholder="Full name" /></label>
          <label>Email<input name="email" required value="" placeholder="name@brokerage.com" /></label>
          <label>License<input name="licenseNumber" required value="" placeholder="License ID" /></label>
          <label>License State<input name="licenseState" required value="" placeholder="FL" /></label>
          <label>Role<input name="role" required value="Producer" /></label>
        </div>
        ${buildCarrierGrid()}
        <div class="action-row">
          <button type="submit">Create provisioning request</button>
          <button type="button" class="ghost" id="provision-help">How pending tasks work</button>
        </div>
      </form>
    </section>
  `;
}

function buildUsers(): string {
  const listRows = appState.users
    .map((user) => {
      const grants = appState.accessGrants.filter((grant) => grant.userId === user.id);
      const activeGrantCount = grants.filter((grant) => grant.status === 'active').length;
      const grantRows =
        grants.length === 0
          ? '<div class="empty-line">No active grants yet.</div>'
          : `
            <div class="grant-list">
              ${grants
                .map((grant) => {
                  return `<div class="grant-line">
                    <span class="grant-carrier">${carrierName(grant.carrierId)}</span>
                    <span>${labelRole(grant.normalizedRole)}</span>
                    <span>${labelTrust(grant.trustTier)}</span>
                    <span class="status-chip status-${grant.status}">${grant.status}</span>
                  </div>`;
                })
                .join('')}
            </div>
          `;

      const launchCarrierOptions = grants
        .filter((grant) => grant.status === 'active')
        .map((grant) => {
          const key = sessionKeyFor(user.id, grant.carrierId);
          const hasSession = Boolean(appState.sessions[key]);
          const hasVault = Boolean(appState.vault[key]);
          const stateHint = hasSession ? ' (session active)' : hasVault ? ' (saved)' : '';
          return `<option value="${grant.carrierId}">${carrierName(grant.carrierId)}${stateHint}</option>`;
        })
        .join('');

      const isCurrentUser = user.id === currentUserId;
      const launchBlock = launchCarrierOptions && isCurrentUser
        ? `
            <div class="launch-controls">
              <select data-launch-select="${user.id}" aria-label="Carrier to launch for ${user.name}">
                ${launchCarrierOptions}
              </select>
              <button type="button" data-action="launch" data-user="${user.id}">Launch carrier portal</button>
            </div>`
        : launchCarrierOptions
          ? '<div class="empty-line">Launch is available only for the currently signed-in user.</div>'
          : '<div class="empty-line">No active grants to launch.</div>';

      return `
        <article class="entity-card user-row">
          <div class="user-title">
            <div>
              <h3>${user.name}</h3>
              <p class="user-meta">${user.email} | ${user.licenseNumber} | ${user.licenseState} | ${user.role}</p>
            </div>
            <span class="status-chip status-${user.employmentStatus}">${user.employmentStatus}</span>
          </div>
          <div class="user-summary">
            <span>${activeGrantCount} active carrier access${activeGrantCount === 1 ? '' : 'es'}</span>
            <span>${grants.length} total grants</span>
          </div>
          ${grantRows}
          <div class="user-row-actions">
            ${launchBlock}
            <button type="button" data-action="offboard" data-user="${user.id}" class="ghost">Offboard</button>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <section class="section-block user-directory">
      <div class="section-heading">
        <div>
          <p class="eyebrow">People and access</p>
          <h2>Users</h2>
        </div>
        <span class="section-count">${appState.users.length} users</span>
      </div>
      ${buildRequirementSummary(
        'users',
        'This view separates admin work from user work: admins can inspect and offboard access, while portal launch is only for the currently signed-in user.',
      )}
      ${buildLaunchPanel()}
      <div class="user-list">${listRows}</div>
    </section>
  `;
}

function buildRequests(limit = 12): string {
  const items = appState.requests
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
    .map((request) => {
      const tasks = request.taskIds
        .map((taskId) => appState.tasks.find((task) => task.id === taskId))
        .filter(Boolean)
        .map((task) => task!)
        .map((task) => `<li>${carrierName(task.carrierId)} (${task.action}) - ${task.status}: ${task.note}</li>`)
        .join('');
      const user = appState.users.find((person) => person.id === request.subjectUserId);
      return `
        <article class="feed-item request-row">
          <div class="feed-title">
            <h3>${statusLabel(request.requestType)} - ${user ? user.name : request.subjectUserId}</h3>
            <span class="status-chip status-${request.status.toLowerCase()}">${statusLabel(request.status)}</span>
          </div>
          <p class="muted">Actor: ${request.actorEmail}</p>
          <ul>${tasks}</ul>
        </article>
      `;
    })
    .join('');

  return `
    <section class="section-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Audit trail</p>
          <h2>Lifecycle Requests</h2>
        </div>
      </div>
      ${buildRequirementSummary(
        'requests',
        'Requests are the evidence trail behind provisioning and offboarding, including which carrier-specific tasks completed or need follow-up.',
      )}
      <div class="feed-list">${items || '<div class="empty-line">No requests yet.</div>'}</div>
    </section>
  `;
}

function buildContinuity(): string {
  const continuity = evaluateContinuity(appState);
  const orderedFindings = [...continuity].sort((a, b) => Number(b.risk) - Number(a.risk));
  const visibleFindings = orderedFindings.slice(0, 6);
  const rows = visibleFindings
    .map((finding) => {
      return `
        <article class="continuity-line ${finding.risk ? 'risk' : ''}">
          <div class="continuity-title">
            <strong>${finding.carrierName}</strong>
            <span class="status-chip ${finding.risk ? 'status-risk' : 'status-active'}">${finding.risk ? 'Risk' : 'Healthy'}</span>
          </div>
          <p>Primary: ${finding.primaryAdmin ?? 'unassigned'} / Backup: ${finding.backupAdmin ?? 'unassigned'}</p>
          <p>${finding.notes}</p>
        </article>
      `;
    })
    .join('');

  const totalRisks = continuity.filter((item) => item.risk).length;
  return `<section class="tool-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Admin-of-record</p>
        <h2>Admin Continuity</h2>
      </div>
      <span class="risk-number">${totalRisks}</span>
    </div>
    ${buildRequirementSummary(
      'continuity',
      'This is the Tina problem: every carrier should have an active primary admin and backup so access ownership does not orphan when someone leaves.',
    )}
    <p class="panel-note">${totalRisks === 0 ? 'No admin continuity risks detected.' : `Showing ${Math.min(visibleFindings.length, totalRisks)} highest-priority findings.`}</p>
    <div class="continuity-body">${rows || '<div class="empty-line">No carriers in catalog.</div>'}</div>
  </section>`;
}

function buildKnowledgeResults(): string {
  if (knowledgeQuery.trim().length === 0) {
    return '<p class="empty-line">Search carrier procedures, MFA expectations, and role mappings.</p>';
  }

  const matches = searchKnowledge(appState, knowledgeQuery);
  if (matches.length === 0) {
    return '<p class="empty-line">No answers found.</p>';
  }

  return matches
    .map((match) => {
      return `
        <article class="knowledge-item">
          <h3>${match.title}</h3>
          <p><strong>Carrier:</strong> ${match.carrierName}</p>
          <p>${match.doc.body}</p>
          <p class="muted">Tags: ${match.doc.tags.join(', ')}</p>
        </article>
      `;
    })
    .join('');
}

function buildKnowledgePanel(): string {
  return `
    <section class="tool-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Carrier knowledge</p>
          <h2>Knowledge Assistant</h2>
        </div>
      </div>
      ${buildRequirementSummary(
        'knowledge',
        'This is secondary to login management, but it turns Alex’s spreadsheet and carrier notes into shared operational memory.',
      )}
      <form id="knowledge-form">
        <label>
          Ask
          <input type="text" name="query" value="${knowledgeQuery}" placeholder="How do I onboard a Hartford teammate?" />
        </label>
        <div class="action-row">
          <button type="submit">Search</button>
        </div>
      </form>
      <div class="knowledge-grid">${buildKnowledgeResults()}</div>
    </section>
  `;
}

function buildPendingView(): string {
  const pendingTasks = appState.tasks
    .filter((task) => task.status === 'PENDING' || task.status === 'MANUAL_ACTION')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const rows = pendingTasks
    .map((task) => {
      const user = appState.users.find((person) => person.id === task.userId);
      const request = appState.requests.find((item) => item.id === task.requestId);
      const userLabel = user ? `${user.name} (${user.email})` : task.userId;
      const requestType = request ? request.requestType : task.action;
      return `
        <article class="task-item">
          <div class="task-head">
            <div>
              <p class="eyebrow">${statusLabel(task.action)} · ${requestType}</p>
              <h3>${carrierName(task.carrierId)}</h3>
              <p class="muted">User: ${userLabel}</p>
            </div>
            <span class="status-chip status-${task.status.toLowerCase()}">${statusLabel(task.status)}</span>
          </div>
          <p>${task.note}</p>
          <div class="action-row">
            <button type="button" data-action="complete-task" data-task="${task.id}">Mark task complete</button>
            <button type="button" class="ghost" data-action="skip-task" data-task="${task.id}">Keep pending</button>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <section class="tool-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Operational queue</p>
          <h2>Pending tasks</h2>
        </div>
      </div>
      ${buildRequirementSummary(
        'pending',
        'Pending tasks make carrier inconsistency visible instead of hiding it; broker confirmation stays explicit where automation cannot finish.',
      )}
      ${pendingTasks.length === 0 ? '<div class="empty-line">No pending tasks right now.</div>' : `<div class="task-list">${rows}</div>`}
    </section>
  `;
}

function buildRequirementMap(): string {
  const functional = (['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'] as RequirementId[])
    .map((id) => {
      const requirement = requirementCopy[id];
      return `
        <article class="req-card">
          <div class="req-card-title">
            ${requirementBadge(id)}
            <h3>${requirement.title}</h3>
          </div>
          <p>${requirement.short}</p>
          <p class="muted">${requirement.proof}</p>
        </article>
      `;
    })
    .join('');

  const constraints = (['N1', 'N2', 'N3', 'N4', 'N5', 'N6'] as RequirementId[])
    .map((id) => {
      const requirement = requirementCopy[id];
      return `
        <article class="constraint-line">
          ${requirementBadge(id)}
          <div>
            <strong>${requirement.title}</strong>
            <p>${requirement.short}</p>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <div class="requirements-layout">
      <section class="tool-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Alex requirements map</p>
            <h2>What this POC is proving</h2>
          </div>
          <span class="panel-badge">R1-R7 / N1-N6</span>
        </div>
        <p class="panel-note">
          Read the app as a lifecycle demo, not as a quoting product: it turns Alex’s carrier-login spreadsheet problem into inventory, requests, credential launch, admin continuity, and carrier-specific work queues.
        </p>
        <div class="demo-path">
          <article>
            <span>1</span>
            <div>
              <strong>Provision</strong>
              <p>Add a teammate once, pick carriers, roles, and credential trust tier.</p>
            </div>
          </article>
          <article>
            <span>2</span>
            <div>
              <strong>Resolve carrier work</strong>
              <p>API carriers complete directly; portal, email, and manual carriers land in Pending.</p>
            </div>
          </article>
          <article>
            <span>3</span>
            <div>
              <strong>Operate access</strong>
              <p>Launch portals from Users, relay MFA, and audit credential/session handling.</p>
            </div>
          </article>
          <article>
            <span>4</span>
            <div>
              <strong>Govern risk</strong>
              <p>Offboard departed users and watch admin-of-record continuity.</p>
            </div>
          </article>
        </div>
      </section>

      <section class="tool-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Functional requirements</p>
            <h2>Alex’s ask in app terms</h2>
          </div>
        </div>
        <div class="req-grid">${functional}</div>
      </section>

      <section class="tool-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Constraints</p>
            <h2>Design guardrails</h2>
          </div>
        </div>
        <div class="constraint-list">${constraints}</div>
      </section>
    </div>
  `;
}

function buildOverview(): string {
  const requestSample = buildRequests(4);
  const pendingCount = countPendingTasks();

  return `
    <div class="overview-grid">
      <section class="tool-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Workspace launcher</p>
            <h2>Get started quickly</h2>
          </div>
        </div>
        ${buildRequirementSummary(
          'overview',
          'Use this route to demo the end-to-end lifecycle: map requirements, provision, resolve carrier-specific tasks, launch access, and govern continuity.',
        )}
        <div class="action-row">
          <button type="button" data-action="switch-view" data-view="requirements" class="ghost">Open Alex map</button>
          <button type="button" data-action="switch-view" data-view="provision">Go to provisioning</button>
          <button type="button" data-action="switch-view" data-view="providers" class="ghost">Manage providers</button>
          <button type="button" data-action="switch-view" data-view="pending" class="ghost">Open pending queue ${pendingCount ? `(${pendingCount})` : ''}</button>
        </div>
      </section>
      ${buildPendingView()}
      ${requestSample}
    </div>
  `;
}

function buildActiveView(): string {
  if (activeView === 'requirements') {
    return buildRequirementMap();
  }
  if (activeView === 'provision') {
    return buildProvisionView();
  }
  if (activeView === 'users') {
    return buildUsers();
  }
  if (activeView === 'requests') {
    return buildRequests(24);
  }
  if (activeView === 'providers') {
    return buildProvidersView();
  }
  if (activeView === 'knowledge') {
    return buildKnowledgePanel();
  }
  if (activeView === 'continuity') {
    return buildContinuity();
  }
  if (activeView === 'pending') {
    return buildPendingView();
  }

  return buildOverview();
}

function buildSummary(): string {
  const summary = computeSummary(appState);
  return `<section class="summary" aria-label="Credential lifecycle summary">
    <article class="metric"><span>Users</span><strong>${summary.totalUsers}</strong></article>
    <article class="metric"><span>Active Users</span><strong>${summary.activeUsers}</strong></article>
    <article class="metric"><span>Open Requests</span><strong>${summary.openRequests}</strong></article>
    <article class="metric"><span>Pending Tasks</span><strong>${summary.pendingTasks}</strong></article>
    <article class="metric metric-risk"><span>Continuity Risks</span><strong>${summary.continuityRisks}</strong></article>
  </section>`;
}

function openPortalAndClose(userId: string, carrierId: string, username?: string, password?: string): void {
  const key = sessionKeyFor(userId, carrierId);
  const session = appState.sessions[key];
  const vault = appState.vault[key];
  const resolvedUser = username
    || vault?.credentialHint
    || (session?.token ? (() => { try { return atob(session.token).split(':')[0]; } catch { return ''; } })() : '')
    || appState.users.find((u) => u.id === userId)?.email
    || '';

  const portalUrl = buildPortalUrl(
    userId,
    carrierId,
    { username: resolvedUser, password: password || 'session', otp: launchPanel?.enteredOtp || 'relayed' },
  );
  if (portalUrl) {
    window.open(portalUrl, '_blank');
  }
  launchPanel = null;
  render();
}

function render(): void {
  ensureCurrentUser();
  const summary = buildSummary();
  const viewContent = buildActiveView();
  const currentUserOptions = activeUsers()
    .map((user) => `<option value="${user.id}"${user.id === currentUserId ? ' selected' : ''}>${user.name}</option>`)
    .join('');

  root.innerHTML = `
    <main class="poc-app">
      <header class="topbar">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true">D</span>
          <div>
            <p class="eyebrow">DataBraid POC</p>
            <h1>Credential & Access Lifecycle</h1>
            <p>Maps Alex’s carrier-login requirements to broker-controlled provisioning, portal launch, continuity checks, and audit state.</p>
          </div>
        </div>
        <div class="topbar-actions">
          <label class="session-picker">
            Signed in as
            <select id="current-user-select" aria-label="Signed in as user">
              ${currentUserOptions}
            </select>
          </label>
          <button type="button" id="seed-reset" class="secondary">Reset seed</button>
        </div>
      </header>

      ${summary}
      ${buildViewNav()}
      ${viewContent}
    </main>
  `;

  root.querySelectorAll('[data-action="offboard"]').forEach((button) => {
    button.addEventListener('click', () => {
      const userId = (button as HTMLButtonElement).dataset.user;
      if (!userId) return;
      try {
        appState = deprovisionTeammate(appState, actorEmail(), userId);
        saveState(appState);
        render();
      } catch (error) {
        alert((error as Error).message);
      }
    });
  });

  root.querySelectorAll('[data-action="launch"]').forEach((button) => {
    button.addEventListener('click', () => {
      const userId = (button as HTMLButtonElement).dataset.user;
      const selectEl = root.querySelector<HTMLSelectElement>(`select[data-launch-select="${userId}"]`);
      const carrierId = selectEl?.value;
      if (!userId || !carrierId) return;

      const outcome = launchCarrierAccess(appState, actorEmail(), userId, carrierId, {});
      if (outcome.status === 'NEEDS_CREDENTIALS') {
        launchPanel = { userId, carrierId, phase: 'credentials' };
      } else if (outcome.status === 'NEEDS_MFA') {
        appState = outcome.state;
        saveState(appState);
        launchPanel = { userId, carrierId, phase: 'mfa' };
      } else if (outcome.status === 'LAUNCHED') {
        appState = outcome.state;
        saveState(appState);
        openPortalAndClose(userId, carrierId);
      } else {
        launchPanel = null;
      }
      render();
    });
  });

  root.querySelector<HTMLButtonElement>('[data-action="auto-launch"]')?.addEventListener('click', () => {
    if (!launchPanel) return;
    const { userId, carrierId } = launchPanel;
    const outcome = launchCarrierAccess(appState, actorEmail(), userId, carrierId, {});
    if (outcome.status === 'NEEDS_MFA') {
      appState = outcome.state;
      saveState(appState);
      launchPanel = { ...launchPanel, phase: 'mfa' };
    } else if (outcome.status === 'LAUNCHED') {
      appState = outcome.state;
      saveState(appState);
      openPortalAndClose(userId, carrierId, launchPanel.enteredUsername, launchPanel.enteredPassword);
    }
    render();
  });

  root.querySelectorAll('[data-action="close-launch"]').forEach((button) => {
    button.addEventListener('click', () => {
      launchPanel = null;
      render();
    });
  });

  root.querySelector<HTMLFormElement>('#launch-cred-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!launchPanel) return;
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();
    const remember = Boolean(formData.get('remember'));
    if (!username || !password) return;

    const { userId, carrierId } = launchPanel;
    const outcome = launchCarrierAccess(appState, actorEmail(), userId, carrierId, {
      credentials: { username, password },
      rememberSession: remember,
    });
    appState = outcome.state;
    saveState(appState);

    if (outcome.status === 'NEEDS_MFA') {
      launchPanel = { userId, carrierId, phase: 'mfa', enteredUsername: username, enteredPassword: password };
      render();
    } else if (outcome.status === 'LAUNCHED') {
      openPortalAndClose(userId, carrierId, username, password);
    }
  });

  root.querySelector<HTMLFormElement>('#launch-mfa-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!launchPanel) return;
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const otp = String(formData.get('otp') ?? '').trim();
    if (!otp) return;

    const { userId, carrierId, enteredUsername, enteredPassword } = launchPanel;
    launchPanel = { ...launchPanel, enteredOtp: otp };
    const outcome = launchCarrierAccess(appState, actorEmail(), userId, carrierId, {
      credentials: enteredUsername ? { username: enteredUsername, password: enteredPassword || '' } : undefined,
      otp,
    });
    appState = outcome.state;
    saveState(appState);

    if (outcome.status === 'LAUNCHED') {
      openPortalAndClose(userId, carrierId, enteredUsername, enteredPassword);
    }
  });

  root.querySelectorAll('[data-action="complete-task"]').forEach((button) => {
    button.addEventListener('click', () => {
      const taskId = (button as HTMLButtonElement).dataset.task;
      if (!taskId) return;
      try {
        appState = completePendingTask(appState, actorEmail(), taskId);
        saveState(appState);
        render();
      } catch (error) {
        alert((error as Error).message);
      }
    });
  });

  root.querySelectorAll('[data-action="skip-task"]').forEach((button) => {
    button.addEventListener('click', () => {
      const taskId = (button as HTMLButtonElement).dataset.task;
      if (!taskId) return;
      const task = appState.tasks.find((entry) => entry.id === taskId);
      if (!task) {
        alert('Task no longer exists.');
        return;
      }
      alert(`Task ${taskId} still pending for ${carrierName(task.carrierId)}.`);
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-action="switch-view"]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view as ViewMode | undefined;
      if (!view) return;
      activeView = view;
      if (view !== 'providers') {
        editingCarrierId = null;
      }
      render();
    });
  });

  root.querySelectorAll('[data-action="edit-provider"]').forEach((button) => {
    button.addEventListener('click', () => {
      const carrierId = (button as HTMLButtonElement).dataset.carrier;
      if (!carrierId) return;
      editingCarrierId = carrierId;
      activeView = 'providers';
      render();
    });
  });

  root.querySelectorAll('[data-action="delete-provider"]').forEach((button) => {
    button.addEventListener('click', () => {
      const carrierId = (button as HTMLButtonElement).dataset.carrier;
      if (!carrierId) return;
      const carrier = appState.carriers.find((entry) => entry.id === carrierId);
      if (!carrier) return;
      if (!window.confirm(`Delete ${carrier.name} and remove its related grants, tasks, and assignments?`)) {
        return;
      }
      try {
        deleteProvider(carrierId);
        saveState(appState);
        render();
      } catch (error) {
        alert((error as Error).message);
      }
    });
  });

  root.querySelector<HTMLFormElement>('#provider-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    try {
      const carrier = collectCarrierFromForm(form);
      upsertCarrier(carrier);
      editingCarrierId = null;
      saveState(appState);
      activeView = 'providers';
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });

  root.querySelector<HTMLButtonElement>('#provider-form-cancel')?.addEventListener('click', () => {
    editingCarrierId = null;
    activeView = 'providers';
    render();
  });

  root.querySelector<HTMLFormElement>('#provision-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const selections = appState.carriers
      .map((carrier) => {
        const checked = (form.querySelector<HTMLInputElement>(`input[name="carrier_${carrier.id}"]`)?.checked ?? false);
        if (!checked) return null;
        const role = (form.querySelector<HTMLSelectElement>(`select[name="role_${carrier.id}"]`)?.value ?? 'VIEW_ONLY') as AccessRole;
        const trust =
          (form.querySelector<HTMLSelectElement>(`select[name="trust_${carrier.id}"]`)?.value ?? carrier.defaultTrustTier) as TrustTier;
        return { carrierId: carrier.id, normalizedRole: role, trustTier: trust };
      })
      .filter(Boolean) as Array<{ carrierId: string; normalizedRole: AccessRole; trustTier: TrustTier }>;

    const input: ProvisionInput = {
      actorEmail: actorEmail(),
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      licenseNumber: String(formData.get('licenseNumber') ?? '').trim(),
      licenseState: String(formData.get('licenseState') ?? '').trim(),
      role: String(formData.get('role') ?? '').trim(),
      selections,
    };

    try {
      const result = provisionTeammate(appState, input);
      appState = result.state;
      const request = appState.requests.find((item) => item.id === result.requestId);
      if (request && request.status === 'PARTIAL') {
        activeView = 'pending';
      }
      saveState(appState);
      form.reset();
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });

  root.querySelector<HTMLFormElement>('#knowledge-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    knowledgeQuery = String(new FormData(form).get('query') ?? '');
    render();
  });

  root.querySelector('#seed-reset')?.addEventListener('click', () => {
    appState = resetState();
    saveState(appState);
    knowledgeQuery = '';
    currentUserId = appState.users.find((user) => user.employmentStatus === 'active')?.id ?? '';
    editingCarrierId = null;
    activeView = 'requirements';
    render();
  });

  root.querySelector<HTMLSelectElement>('#current-user-select')?.addEventListener('change', (event) => {
    currentUserId = (event.currentTarget as HTMLSelectElement).value;
    render();
  });

  root.querySelector<HTMLButtonElement>('#provision-help')?.addEventListener('click', () => {
    alert('Pending mode is for carrier actions that are not immediate. Use Pending view to manually resolve confirmed setup steps.');
  });
}

render();
