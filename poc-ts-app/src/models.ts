export type ID = string;

export type AccessRole = 'VIEW_ONLY' | 'QUOTING' | 'ADMINISTRATIVE';
export type EmploymentStatus = 'active' | 'departed';
export type TrustTier = 'TIER_1_ENTER_EVERY_TIME' | 'TIER_2_CACHED_SESSION' | 'TIER_3_STORED_REGISTRY';
export type AdapterMode = 'API_FEDERATED' | 'PORTAL_GUIDED' | 'EMAIL_FORM' | 'MANUAL';
export type AuthMechanism = 'credentials' | 'oauth' | 'sso_redirect' | 'email_code' | 'phone_code';
export type LifecycleType = 'provision' | 'deprovision' | 'admin-transfer';
export type RequestStatus = 'QUEUED' | 'IN_PROGRESS' | 'PARTIAL' | 'COMPLETED' | 'BLOCKED';
export type TaskStatus = 'DONE' | 'PENDING' | 'MANUAL_ACTION' | 'FAILED';
export type GrantStatus = 'active' | 'revoked' | 'pending';
export type MfaMode = 'totp' | 'sms' | 'push' | 'email';

export interface BrokerUser {
  id: ID;
  name: string;
  email: string;
  licenseNumber: string;
  licenseState: string;
  role: string;
  employmentStatus: EmploymentStatus;
  createdAt: string;
}

export interface Carrier {
  id: ID;
  name: string;
  adapterMode: AdapterMode;
  supportsApi: boolean;
  requiresMfa: boolean;
  mfaMethod: MfaMode;
  loginHint: string;
  timeoutHours: number;
  defaultTrustTier: TrustTier;
  notes: string;
  portalUrl?: string;
  authMechanism?: AuthMechanism;
}

export interface AccessGrant {
  id: ID;
  userId: ID;
  carrierId: ID;
  normalizedRole: AccessRole;
  carrierNativeRole: string;
  trustTier: TrustTier;
  status: GrantStatus;
  lastVerifiedAt?: string;
}

export interface CarrierTask {
  id: ID;
  requestId: ID;
  userId: ID;
  carrierId: ID;
  action: LifecycleType;
  status: TaskStatus;
  adapterMode: AdapterMode;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessRequest {
  id: ID;
  actorEmail: string;
  requestType: LifecycleType;
  subjectUserId: ID;
  status: RequestStatus;
  carrierIds: ID[];
  taskIds: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminAssignment {
  id: ID;
  carrierId: ID;
  primaryAdminUserId: ID;
  backupAdminUserId?: ID;
  verifiedAt?: string;
}

export interface CredentialVaultEntry {
  id: ID;
  userId: ID;
  carrierId: ID;
  credentialHint: string;
  encryptedValue: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface CachedSession {
  token: string;
  expiresAt: string;
}

export interface AuditEvent {
  id: ID;
  at: string;
  actorEmail: string;
  action: string;
  details: string;
  userId?: ID;
  carrierId?: ID;
}

export interface KnowledgeDoc {
  id: ID;
  title: string;
  carrierId?: ID;
  tags: string[];
  body: string;
}

export interface ContinuityFinding {
  carrierId: ID;
  carrierName: string;
  risk: boolean;
  primaryAdmin?: string;
  backupAdmin?: string;
  notes: string;
}

export interface AppState {
  users: BrokerUser[];
  carriers: Carrier[];
  accessGrants: AccessGrant[];
  tasks: CarrierTask[];
  requests: AccessRequest[];
  adminAssignments: AdminAssignment[];
  vault: Record<ID, CredentialVaultEntry>;
  sessions: Record<ID, CachedSession>;
  audits: AuditEvent[];
  knowledge: KnowledgeDoc[];
}

export interface ProvisionInput {
  actorEmail: string;
  name: string;
  email: string;
  licenseNumber: string;
  licenseState: string;
  role: string;
  selections: Array<{
    carrierId: ID;
    normalizedRole: AccessRole;
    trustTier: TrustTier;
  }>;
}

export interface ProvisionResult {
  state: AppState;
  requestId: ID;
}

export interface LaunchContext {
  credentials?: { username: string; password: string };
  otp?: string;
  rememberSession?: boolean;
}

export interface LaunchResult {
  state: AppState;
  status: 'LAUNCHED' | 'NEEDS_CREDENTIALS' | 'NEEDS_MFA' | 'BLOCKED';
  message: string;
}
