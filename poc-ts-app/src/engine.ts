import {
  AccessRequest,
  AccessRole,
  AccessGrant,
  AppState,
  AuditEvent,
  Carrier,
  CarrierTask,
  ContinuityFinding,
  KnowledgeDoc,
  LifecycleType,
  LaunchContext,
  LaunchResult,
  ProvisionInput,
  ProvisionResult,
  RequestStatus,
  TaskStatus,
  BrokerUser,
} from './models.js';

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const now = (): string => new Date().toISOString();

function addAudit(state: AppState, actorEmail: string, action: string, details: string, userId?: string, carrierId?: string): void {
  const audit: AuditEvent = {
    id: uid('audit'),
    at: now(),
    actorEmail,
    action,
    details,
    userId,
    carrierId,
  };
  state.audits.unshift(audit);
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function taskOutcomeForCarrier(mode: Carrier['adapterMode'], seed: string) {
  const roll = stableHash(seed) % 100;
  if (mode === 'API_FEDERATED') {
    if (roll < 82) {
      return {
        status: 'DONE' as TaskStatus,
        note: 'Carrier API acknowledged request and returned completion status.',
      };
    }
    if (roll < 96) {
      return { status: 'PENDING' as TaskStatus, note: 'Carrier API is accepting but has not confirmed yet.' };
    }
    return { status: 'FAILED' as TaskStatus, note: 'Carrier API rejected request with transient error.' };
  }

  if (mode === 'PORTAL_GUIDED') {
    if (roll < 64) {
      return { status: 'DONE' as TaskStatus, note: 'Broker-admin path completed in guided launch.' };
    }
    if (roll < 90) {
      return {
        status: 'MANUAL_ACTION' as TaskStatus,
        note: 'Portal blocked by step-up challenge; manual confirmation required.',
      };
    }
    return { status: 'FAILED' as TaskStatus, note: 'Carrier portal changed layout; workflow needs refresh.' };
  }

  if (mode === 'EMAIL_FORM') {
    if (roll < 54) {
      return {
        status: 'PENDING' as TaskStatus,
        note: 'Support request generated; waiting for carrier support confirmation.',
      };
    }
    return {
      status: 'MANUAL_ACTION' as TaskStatus,
      note: 'Carrier requires additional paperwork and signed confirmation.',
    };
  }

  return {
    status: 'MANUAL_ACTION' as TaskStatus,
    note: 'Manual carrier process only; no automation available.',
  };
}

function requestStatusFromTasks(tasks: TaskStatus[]): RequestStatus {
  if (tasks.some((value) => value === 'FAILED')) {
    return 'BLOCKED';
  }
  if (tasks.some((value) => value === 'PENDING' || value === 'MANUAL_ACTION')) {
    return 'PARTIAL';
  }
  if (tasks.length === 0) {
    return 'QUEUED';
  }
  return 'COMPLETED';
}

function requestStatusFromCarrierRequests(tasks: CarrierTask[]): RequestStatus {
  const mapped = tasks.map((task) => task.status);
  return requestStatusFromTasks(mapped);
}

function requestTaskItems(state: AppState, request: AccessRequest): CarrierTask[] {
  return request.taskIds
    .map((taskId) => state.tasks.find((task) => task.id === taskId))
    .filter(Boolean)
    .map((task) => task as CarrierTask);
}

function refreshRequestStatus(state: AppState, requestId: string): void {
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) {
    return;
  }

  const tasks = requestTaskItems(state, request);
  if (tasks.length === 0) {
    request.status = 'QUEUED';
  } else {
    request.status = requestStatusFromCarrierRequests(tasks);
  }
  request.updatedAt = now();
}

function syncPendingProvisionGrants(state: AppState): void {
  for (const request of state.requests) {
    if (request.requestType !== 'provision') {
      continue;
    }

    const tasks = requestTaskItems(state, request);
    for (const task of tasks) {
      if (task.action !== 'provision' || task.status !== 'DONE') {
        continue;
      }

      const grant = state.accessGrants.find(
        (item) => item.userId === task.userId && item.carrierId === task.carrierId && item.status === 'pending',
      );
      if (grant) {
        grant.status = 'active';
      }
    }
  }
}

export interface KPISummary {
  totalUsers: number;
  activeUsers: number;
  pendingTasks: number;
  openRequests: number;
  continuityRisks: number;
}

export function computeSummary(state: AppState): KPISummary {
  const openRequests = state.requests.filter((request) => request.status !== 'COMPLETED' && request.status !== 'BLOCKED').length;
  const pendingTasks = state.tasks.filter((task) => task.status === 'PENDING' || task.status === 'MANUAL_ACTION').length;
  const continuityRisks = evaluateContinuity(state).filter((item) => item.risk).length;
  return {
    totalUsers: state.users.length,
    activeUsers: state.users.filter((user) => user.employmentStatus === 'active').length,
    pendingTasks,
    openRequests,
    continuityRisks,
  };
}

function createCarrierTask({
  requestId,
  userId,
  carrier,
  action,
  nowTs,
}: {
  requestId: string;
  userId: string;
  carrier: Carrier;
  action: LifecycleType;
  nowTs: string;
}): CarrierTask {
  const outcome = taskOutcomeForCarrier(carrier.adapterMode, `${requestId}-${carrier.id}-${userId}-${action}`);
  return {
    id: uid('task'),
    requestId,
    userId,
    carrierId: carrier.id,
    action,
    status: outcome.status,
    adapterMode: carrier.adapterMode,
    note: outcome.note,
    createdAt: nowTs,
    updatedAt: nowTs,
  };
}

function resolveCarrier(state: AppState, carrierId: string): Carrier | undefined {
  return state.carriers.find((carrier) => carrier.id === carrierId);
}

function resolveUser(state: AppState, userId: string): BrokerUser | undefined {
  return state.users.find((user) => user.id === userId);
}

export function provisionTeammate(state: AppState, input: ProvisionInput): ProvisionResult {
  const next = cloneState(state);
  const normalizedEmail = input.email.trim().toLowerCase();
  const duplicate = next.users.some((user) => user.email.toLowerCase() === normalizedEmail);
  if (duplicate) {
    throw new Error(`A user already exists with email ${normalizedEmail}.`);
  }

  if (input.selections.length === 0) {
    throw new Error('Select at least one carrier before provisioning.');
  }

  const userId = uid('user');
  const user = {
    id: userId,
    name: input.name.trim(),
    email: normalizedEmail,
    licenseNumber: input.licenseNumber.trim(),
    licenseState: input.licenseState.trim(),
    role: input.role,
    employmentStatus: 'active' as const,
    createdAt: now(),
  };
  next.users.push(user);

  const request: AccessRequest = {
    id: uid('request'),
    actorEmail: input.actorEmail,
    requestType: 'provision',
    subjectUserId: user.id,
    status: 'IN_PROGRESS',
    carrierIds: [],
    taskIds: [],
    createdAt: now(),
    updatedAt: now(),
  };

  for (const selection of input.selections) {
    const carrier = resolveCarrier(next, selection.carrierId);
    if (!carrier) {
      continue;
    }

    const task = createCarrierTask({
      requestId: request.id,
      userId,
      carrier,
      action: 'provision',
      nowTs: request.createdAt,
    });

    const grant: AccessGrant = {
      id: uid('grant'),
      userId,
      carrierId: selection.carrierId,
      normalizedRole: selection.normalizedRole,
      carrierNativeRole: selection.normalizedRole,
      trustTier: selection.trustTier,
      status: task.status === 'DONE' ? 'active' : 'pending',
    };

    next.accessGrants.push(grant);
    next.tasks.push(task);
    request.carrierIds.push(carrier.id);
    request.taskIds.push(task.id);
  }

  request.status = requestStatusFromCarrierRequests(request.taskIds.map((id) => next.tasks.find((task) => task.id === id)!));
  syncPendingProvisionGrants(next);
  next.requests.push(request);
  next.requests.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  addAudit(
    next,
    input.actorEmail,
    'request.provisioned',
    `Added teammate ${input.name} with ${request.carrierIds.length} carrier requests.`,
    user.id,
  );
  return { state: next, requestId: request.id };
}

export function deprovisionTeammate(state: AppState, actorEmail: string, userId: string): AppState {
  const next = cloneState(state);
  const user = resolveUser(next, userId);
  if (!user) {
    throw new Error('Could not find user to offboard.');
  }
  if (user.employmentStatus === 'departed') {
    return next;
  }

  user.employmentStatus = 'departed';

  const request: AccessRequest = {
    id: uid('request'),
    actorEmail,
    requestType: 'deprovision',
    subjectUserId: userId,
    status: 'IN_PROGRESS',
    carrierIds: [],
    taskIds: [],
    createdAt: now(),
    updatedAt: now(),
  };

  for (const grant of next.accessGrants.filter((item) => item.userId === userId && item.status === 'active')) {
    grant.status = 'revoked';
    const carrier = resolveCarrier(next, grant.carrierId);
    if (!carrier) {
      continue;
    }
    const task = createCarrierTask({
      requestId: request.id,
      userId,
      carrier,
      action: 'deprovision',
      nowTs: request.createdAt,
    });
    next.tasks.push(task);
    request.carrierIds.push(carrier.id);
    request.taskIds.push(task.id);

    const key = `${userId}::${carrier.id}`;
    delete next.vault[key];
    delete next.sessions[key];
  }

  request.status = requestStatusFromCarrierRequests(request.taskIds.map((id) => next.tasks.find((task) => task.id === id)!));
  refreshRequestStatus(next, request.id);
  next.requests.push(request);

  addAudit(next, actorEmail, 'request.deprovisioned', `Offboarded user ${user.email} and revoked ${request.carrierIds.length} grants.`, userId);
  return next;
}

export function launchCarrierAccess(
  state: AppState,
  actorEmail: string,
  userId: string,
  carrierId: string,
  context: LaunchContext = {},
): LaunchResult {
  const next = cloneState(state);
  const user = resolveUser(next, userId);
  const carrier = resolveCarrier(next, carrierId);
  if (!user || !carrier) {
    return {
      state: next,
      status: 'BLOCKED',
      message: 'User or carrier is not found.',
    };
  }
  if (user.employmentStatus !== 'active') {
    return {
      state: next,
      status: 'BLOCKED',
      message: 'Cannot launch for departed users.',
    };
  }

  const grant = next.accessGrants.find((item) => item.userId === user.id && item.carrierId === carrierId && item.status === 'active');
  if (!grant) {
    return {
      state: next,
      status: 'BLOCKED',
      message: 'No active grant exists for this user/carrier pair.',
    };
  }

  const sessionKey = `${user.id}::${carrier.id}`;
  if (grant.trustTier === 'TIER_2_CACHED_SESSION') {
    const session = next.sessions[sessionKey];
    if (session && new Date(session.expiresAt).getTime() > Date.now()) {
      grant.lastVerifiedAt = now();
      addAudit(next, actorEmail, 'login.session_cache', `Used cached session for ${user.email} -> ${carrier.name}`, user.id, carrier.id);
      next.sessions[sessionKey].expiresAt = new Date(Date.now() + carrier.timeoutHours * 60 * 60 * 1000).toISOString();
      next.accessGrants = next.accessGrants.map((item) => (item.id === grant.id ? grant : item));
      return {
        state: next,
        status: 'LAUNCHED',
        message: `Launched ${carrier.name} using cached session.`,
      };
    }
  } else if (grant.trustTier === 'TIER_3_STORED_REGISTRY') {
    const vault = next.vault[sessionKey];
    if (!vault) {
      if (!context.credentials?.username || !context.credentials?.password) {
        return {
          state: next,
          status: 'NEEDS_CREDENTIALS',
          message: `Stored-registry is enabled for ${carrier.name}; broker must provide credentials now.`,
        };
      }
      next.vault[sessionKey] = {
        id: uid('vault'),
        userId,
        carrierId,
        credentialHint: context.credentials.username,
        encryptedValue: btoa(`${context.credentials.username}:${context.credentials.password}`),
        updatedAt: now(),
      };
      addAudit(next, actorEmail, 'credential.store', `Stored registry credentials for ${carrier.name}.`, user.id, carrier.id);
    } else {
      vault.lastUsedAt = now();
    }
  } else if (grant.trustTier === 'TIER_1_ENTER_EVERY_TIME') {
    if (!context.credentials?.username || !context.credentials?.password) {
      return {
        state: next,
        status: 'NEEDS_CREDENTIALS',
        message: 'Enter credentials for this launch.',
      };
    }
  }

  if (grant.trustTier === 'TIER_2_CACHED_SESSION' && !next.sessions[sessionKey]) {
    if (!context.credentials?.username || !context.credentials?.password) {
      return {
        state: next,
        status: 'NEEDS_CREDENTIALS',
        message: `Enter credentials for ${carrier.name}; optional cached session will be held for ${carrier.timeoutHours}h.`,
      };
    }
    if (context.rememberSession) {
      next.sessions[sessionKey] = {
        token: btoa(`${context.credentials.username}:${context.credentials.password}:${Date.now()}`),
        expiresAt: new Date(Date.now() + carrier.timeoutHours * 60 * 60 * 1000).toISOString(),
      };
    } else {
      next.sessions[sessionKey] = {
        token: btoa(`${context.credentials.username}:${context.credentials.password}:ephemeral`),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    }
  }

  if (carrier.requiresMfa && !context.otp) {
    return {
      state: next,
      status: 'NEEDS_MFA',
      message: `${carrier.name} requires MFA (${carrier.mfaMethod}).`,
    };
  }

  grant.lastVerifiedAt = now();
  next.accessGrants = next.accessGrants.map((item) => (item.id === grant.id ? grant : item));
  addAudit(
    next,
    actorEmail,
    'login.success',
    `MFA relayed and portal launched for ${carrier.name} at ${grant.trustTier}.`,
    user.id,
    carrier.id,
  );

  return {
    state: next,
    status: 'LAUNCHED',
    message: `Portal launch for ${carrier.name} completed.`,
  };
}

export function completePendingTask(state: AppState, actorEmail: string, taskId: string): AppState {
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error(`Could not find task ${taskId}.`);
  }

  if (task.status === 'DONE') {
    return next;
  }

  if (task.status !== 'PENDING' && task.status !== 'MANUAL_ACTION') {
    throw new Error(`Task ${task.id} is not currently pending review.`);
  }

  task.status = 'DONE';
  task.updatedAt = now();
  task.note = `${task.note} | broker confirmation recorded`;

  if (task.action === 'provision') {
    const grant = next.accessGrants.find(
      (item) => item.userId === task.userId && item.carrierId === task.carrierId && item.status === 'pending',
    );
    if (grant) {
      grant.status = 'active';
    }
  }

  syncPendingProvisionGrants(next);
  refreshRequestStatus(next, task.requestId);

  const user = next.users.find((person) => person.id === task.userId);
  const carrier = next.carriers.find((item) => item.id === task.carrierId);
  const userLabel = user?.name ?? task.userId;
  const carrierLabel = carrier?.name ?? task.carrierId;

  addAudit(
    next,
    actorEmail,
    'task.completed_manually',
    `Manually confirmed ${task.action} for ${userLabel} on ${carrierLabel}.`,
    task.userId,
    task.carrierId,
  );

  return next;
}

export function evaluateContinuity(state: AppState): ContinuityFinding[] {
  const results: ContinuityFinding[] = [];

  for (const carrier of state.carriers) {
    const assignment = state.adminAssignments.find((item) => item.carrierId === carrier.id);
    if (!assignment) {
      results.push({
        carrierId: carrier.id,
        carrierName: carrier.name,
        risk: true,
        notes: 'No admin assignment found for carrier.',
      });
      continue;
    }

    const primary = state.users.find((user) => user.id === assignment.primaryAdminUserId);
    const backup = assignment.backupAdminUserId ? state.users.find((user) => user.id === assignment.backupAdminUserId) : undefined;
    const primaryOk = !!primary && primary.employmentStatus === 'active';
    const backupOk = !!backup && backup.employmentStatus === 'active';

    const risk = !primaryOk || !backupOk;
    const notes = risk
      ? `Primary active: ${Boolean(primaryOk)}; backup active: ${Boolean(backupOk)}.`
      : 'Continuity policy is satisfied.';

    results.push({
      carrierId: carrier.id,
      carrierName: carrier.name,
      risk,
      primaryAdmin: primary?.email,
      backupAdmin: backup?.email,
      notes,
    });
  }

  return results.sort((a, b) => Number(b.risk) - Number(a.risk));
}

export interface KnowledgeMatch {
  title: string;
  carrierName: string;
  score: number;
  doc: KnowledgeDoc;
}

export function searchKnowledge(state: AppState, query: string): KnowledgeMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return state.knowledge.map((doc) => {
      return {
        doc,
        title: doc.title,
        carrierName: state.carriers.find((carrier) => carrier.id === doc.carrierId)?.name ?? 'General',
        score: 1,
      };
    });
  }
  const results: KnowledgeMatch[] = [];
  for (const doc of state.knowledge) {
    const text = `${doc.title} ${doc.tags.join(' ')} ${doc.body}`.toLowerCase();
    if (text.includes(q)) {
      const score = text.split(q).length - 1;
      results.push({
        doc,
        title: doc.title,
        carrierName: state.carriers.find((carrier) => carrier.id === doc.carrierId)?.name ?? 'General',
        score,
      });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}

export function createManualTaskForRequest(state: AppState, actorEmail: string, userId: string, note: string): AppState {
  const user = resolveUser(state, userId);
  if (!user) {
    throw new Error('User does not exist.');
  }
  const next = cloneState(state);
  const request: AccessRequest = {
    id: uid('request'),
    actorEmail,
    requestType: 'admin-transfer',
    subjectUserId: userId,
    status: 'IN_PROGRESS',
    carrierIds: [],
    taskIds: [],
    createdAt: now(),
    updatedAt: now(),
  };
  const task: CarrierTask = {
    id: uid('task'),
    requestId: request.id,
    userId,
    carrierId: '',
    action: 'admin-transfer',
    status: 'MANUAL_ACTION',
    adapterMode: 'MANUAL',
    note,
    createdAt: request.createdAt,
    updatedAt: request.createdAt,
  };
  request.taskIds.push(task.id);
  next.tasks.push(task);
  next.requests.push(request);
  request.status = 'BLOCKED';
  addAudit(next, actorEmail, 'request.admin_transfer', note, user.id);
  return next;
}
