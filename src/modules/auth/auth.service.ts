import { AppError, ErrorCode } from '../../core/errors/index.js';
import { isStaffRole, verifyPassword } from '../../core/security/index.js';
import { toUserDto } from '../users/users.mapper.js';
import type { UserDocument } from '../users/users.model.js';
import { usersService } from '../users/users.service.js';
import { ACTIVE_USER_STATUSES } from '../users/users.types.js';
import { otpService } from './otp.service.js';
import { tokenService } from './token.service.js';
import type { AuthResult, OtpRequestResult, SessionContext, TokenPair } from './auth.types.js';

/**
 * A rejected login says as little as possible. Distinguishing "no such email" from
 * "wrong password" turns the login form into an account-enumeration oracle.
 */
function invalidCredentials(): AppError {
  return new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Incorrect email or password', {
    messageHi: 'ईमेल या पासवर्ड गलत है।',
  });
}

function assertCanSignIn(user: UserDocument): void {
  if (user.status === 'SUSPENDED') {
    throw new AppError(403, ErrorCode.ACCOUNT_SUSPENDED, 'This account has been suspended', {
      messageHi: 'यह खाता निलंबित कर दिया गया है।',
    });
  }
  if (!ACTIVE_USER_STATUSES.includes(user.status)) {
    throw AppError.unauthenticated('This account is no longer active', {
      messageHi: 'यह खाता अब सक्रिय नहीं है।',
    });
  }
}

async function completeLogin(
  user: UserDocument,
  context: SessionContext,
  isNewUser: boolean,
): Promise<AuthResult> {
  const tokens = await tokenService.issue(user._id.toString(), context);
  // Best-effort: a failed bookkeeping write must not cost the user their login.
  void usersService.touchLastLogin(user._id.toString());
  return { ...tokens, user: toUserDto(user), isNewUser };
}

export const authService = {
  requestOtp(phone: string, ip: string | null): Promise<OtpRequestResult> {
    return otpService.request(phone, ip);
  },

  /**
   * One entry point for login and signup: a low-literacy user should never have to
   * choose between "Login" and "Sign up". An unknown phone creates the account and
   * comes back with `isNewUser: true`, which routes the app to onboarding.
   */
  async verifyOtp(phone: string, code: string, context: SessionContext): Promise<AuthResult> {
    await otpService.verify(phone, code);

    const existing = await usersService.findByPhone(phone);
    if (!existing) {
      const created = await usersService.createOtpUser(phone);
      return completeLogin(created, context, true);
    }

    assertCanSignIn(existing);
    return completeLogin(existing, context, false);
  },

  /**
   * Email + password, for `SUPER_ADMIN` and `ADMIN` on the web dashboard only.
   * Members never hold a password.
   */
  async loginWithPassword(
    email: string,
    password: string,
    context: SessionContext,
  ): Promise<AuthResult> {
    const user = await usersService.findByEmailWithPassword(email);
    if (!user?.passwordHash) throw invalidCredentials();
    if (!isStaffRole(user.role)) throw invalidCredentials();

    if (!(await verifyPassword(password, user.passwordHash))) throw invalidCredentials();

    assertCanSignIn(user);
    return completeLogin(user, context, false);
  },

  refresh(refreshToken: string, context: SessionContext): Promise<TokenPair> {
    return tokenService.rotate(refreshToken, context);
  },

  logout(refreshToken: string): Promise<void> {
    return tokenService.revoke(refreshToken);
  },

  logoutEverywhere(userId: string): Promise<number> {
    return tokenService.revokeAllForUser(userId, 'LOGOUT');
  },
};
