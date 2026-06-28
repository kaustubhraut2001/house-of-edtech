/**
 * types/index.ts
 *
 * All shared TypeScript types used across the application.
 * Keeps business types decoupled from Prisma-generated types.
 */

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
}

// ─────────────────────────────────────────────
// DOCUMENT
// ─────────────────────────────────────────────
export type DocumentRole = "OWNER" | "EDITOR" | "VIEWER";

export interface DocumentMember {
  id: string;
  userId: string;
  documentId: string;
  role: DocumentRole;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  revision: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  owner?: UserProfile;
  members?: DocumentMember[];
  // Current user's role — computed on the server
  currentUserRole?: DocumentRole;
}

export interface DocumentSummary {
  id: string;
  title: string;
  ownerId: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  currentUserRole: DocumentRole;
  memberCount: number;
}

// ─────────────────────────────────────────────
// VERSION (Snapshot / Time Travel)
// ─────────────────────────────────────────────
export interface DocumentVersion {
  id: string;
  documentId: string;
  createdById: string;
  label: string | null;
  title: string;
  content: string;
  revision: number;
  createdAt: Date;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

// ─────────────────────────────────────────────
// OPERATIONS (Offline Queue)
// ─────────────────────────────────────────────
export type OperationType =
  | "INSERT"
  | "DELETE"
  | "UPDATE_TITLE"
  | "UPDATE_CONTENT"
  | "CREATE_VERSION"
  | "RESTORE_VERSION";

export type OperationStatus = "PENDING" | "SYNCED" | "FAILED" | "CONFLICT";

export interface Operation {
  id: string;               // client-generated UUID
  documentId: string;
  userId: string;
  deviceId: string;
  operationType: OperationType;
  payload: Record<string, unknown>;
  status: OperationStatus;
  revision: number;         // document revision this op is based on
  timestamp: string;        // ISO string
  queuedAt: string;         // ISO string
  syncedAt?: string;
}

// ─────────────────────────────────────────────
// SYNC
// ─────────────────────────────────────────────
export interface SyncResult {
  operationId: string;
  status: "synced" | "conflict" | "error";
  serverRevision?: number;
  conflictData?: {
    serverContent: string;
    serverTitle: string;
  };
  error?: string;
}

export interface SyncResponse {
  results: SyncResult[];
  serverDocument?: {
    title: string;
    content: string;
    revision: number;
  };
}

// ─────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────
export type AIAction =
  | "summarize"
  | "improve"
  | "grammar"
  | "generate_title"
  | "rewrite"
  | "translate"
  | "continue"
  | "explain";

export interface AIRequest {
  action: AIAction;
  text: string;
  targetLanguage?: string;
}

export interface AIResponse {
  result: string;
  action: AIAction;
}

// ─────────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────────
export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
  code?: string;
}

// ─────────────────────────────────────────────
// LOCAL (IndexedDB / Dexie)
// ─────────────────────────────────────────────
export interface LocalDocument {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  revision: number;
  lastSyncedAt: string | null;
  isLocalOnly: boolean;   // created offline, never synced
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentUserRole: DocumentRole;
}

export interface LocalOperation {
  id: string;
  documentId: string;
  userId: string;
  deviceId: string;
  operationType: OperationType;
  payload: Record<string, unknown>;
  status: OperationStatus;
  revision: number;
  timestamp: string;
  queuedAt: string;
  retryCount: number;
  lastAttemptAt: string | null;
}

export interface LocalVersion {
  id: string;
  documentId: string;
  createdById: string;
  label: string | null;
  title: string;
  content: string;
  revision: number;
  createdAt: string;
  createdByName: string | null;
}

// ─────────────────────────────────────────────
// COLLABORATION (WebSocket)
// ─────────────────────────────────────────────
export interface CollaboratorPresence {
  userId: string;
  name: string | null;
  image: string | null;
  documentId: string;
  cursorPosition?: number;
  lastSeenAt: string;
}

export interface RealtimeDocumentUpdate {
  documentId: string;
  userId: string;
  title?: string;
  content?: string;
  revision: number;
  timestamp: string;
}
