import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler, sendSuccess } from '../../core/http/index.js';
import { authService } from './auth.service.js';
import { requireAuth } from './auth.middleware.js';
import { tokenService } from './token.service.js';
import type { SessionContext } from './auth.types.js';
import type {
  LogoutBody,
  PasswordLoginBody,
  RefreshBody,
  RequestOtpBody,
  VerifyOtpBody,
} from './auth.schema.js';

/** Gathers the untrusted-but-useful metadata attached to every new session. */
function sessionContext(req: Request, device: SessionContext['device'] = {}): SessionContext {
  return { device, ip: req.ip ?? null };
}

export const authController = {
  requestOtp: asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body as RequestOtpBody;
    sendSuccess(res, await authService.requestOtp(phone, req.ip ?? null));
  }),

  verifyOtp: asyncHandler(async (req: Request, res: Response) => {
    const { phone, otp, device } = req.body as VerifyOtpBody;
    const result = await authService.verifyOtp(phone, otp, sessionContext(req, device));
    // 201 when the account was just created, so clients can branch on the status too.
    sendSuccess(res, result, result.isNewUser ? 201 : 200);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, device } = req.body as PasswordLoginBody;
    sendSuccess(res, await authService.loginWithPassword(email, password, sessionContext(req, device)));
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as RefreshBody;
    sendSuccess(res, await authService.refresh(refreshToken, sessionContext(req)));
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as LogoutBody;
    await authService.logout(refreshToken);
    sendSuccess(res, { message: 'Signed out' });
  }),

  logoutEverywhere: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = requireAuth(req);
    const revokedSessions = await authService.logoutEverywhere(userId);
    sendSuccess(res, { revokedSessions });
  }),

  listSessions: asyncHandler(async (req: Request, res: Response) => {
    const { userId, deviceId } = requireAuth(req);
    sendSuccess(res, { sessions: await tokenService.listSessions(userId, deviceId) });
  }),

  revokeSession: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = requireAuth(req);
    await tokenService.revokeSession(userId, req.params['id'] as string);
    sendSuccess(res, { message: 'Session revoked' });
  }),
} satisfies Record<string, RequestHandler>;
