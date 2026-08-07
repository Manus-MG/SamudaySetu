import { AsyncLocalStorage } from 'node:async_hooks';
import { AppError } from '../errors/index.js';

/**
 * Per-request ambient state. Anything that needs to know *who* is making the
 * current request — logging, auditing, repositories — reads it from here instead
 * of threading it through every function signature.
 *
 * Populated by `requestContextMiddleware` (requestId) and later by the auth
 * middleware (userId, deviceId).
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  deviceId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** Returns the context if one exists. Safe to call outside a request (jobs, boot). */
export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Mutates the active context. Intended for the authentication middleware only. */
export function patchContext(patch: Partial<RequestContext>): void {
  const store = storage.getStore();
  if (!store) return;
  Object.assign(store, patch);
}

/** Fail-closed accessor for the authenticated user. */
export function requireUserId(): string {
  const userId = storage.getStore()?.userId;
  if (!userId) throw AppError.unauthenticated();
  return userId;
}
