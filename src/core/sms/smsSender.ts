import { isProduction } from '../../config/index.js';
import { logger } from '../logger/index.js';

/**
 * The seam between this codebase and an Indian SMS provider.
 *
 * There is no provider wired up yet — Indian transactional SMS requires a
 * DLT-registered sender ID and pre-approved templates, and that registration
 * takes days of paperwork, not an afternoon of coding. Rather than let that block
 * the invite flow, everything is built against this interface and a logging
 * implementation stands in.
 *
 * The consequence is honest and must stay visible: **invites do not actually
 * reach anyone's phone yet.** The link is returned to the caller so it can be
 * shared by WhatsApp in the meantime, which is how most invites will travel
 * regardless. Swapping in a real provider is one `SmsSender` implementation and
 * one line in `providers`.
 */
export interface SmsMessage {
  /** E.164, e.g. `+919876543210`. */
  to: string;
  body: string;
  /**
   * The DLT template this message corresponds to. A real provider rejects any
   * message whose body does not match a registered template, so carrying the id
   * from the start means the switch-over is not a rewrite.
   */
  templateKey: SmsTemplateKey;
}

export const SMS_TEMPLATE_KEYS = ['OTP', 'COMMUNITY_INVITE'] as const;
export type SmsTemplateKey = (typeof SMS_TEMPLATE_KEYS)[number];

export interface SmsResult {
  /** False when the message was accepted nowhere. Callers decide if that is fatal. */
  delivered: boolean;
  /** Provider-side id, for support tickets. `null` for the logging sender. */
  providerMessageId: string | null;
}

export interface SmsSender {
  send(message: SmsMessage): Promise<SmsResult>;
  /** Whether messages actually leave the building. Drives "not sent" UI copy. */
  readonly isLive: boolean;
}

/**
 * The stand-in. Logs and reports failure honestly rather than claiming delivery.
 *
 * Bodies are logged outside production only. A log sink is widely readable and
 * long-lived, and an invite link sitting in one is a community membership sitting
 * in one.
 */
export class LoggingSmsSender implements SmsSender {
  readonly isLive = false;

  send(message: SmsMessage): Promise<SmsResult> {
    if (isProduction) {
      logger.warn(
        { to: message.to, templateKey: message.templateKey },
        'SMS not sent: no provider is configured',
      );
    } else {
      logger.info(
        { to: message.to, templateKey: message.templateKey, body: message.body },
        'SMS generated (development only — not sent)',
      );
    }

    return Promise.resolve({ delivered: false, providerMessageId: null });
  }
}

/**
 * The process-wide sender. A module-level singleton rather than an injected
 * dependency because there is exactly one, and threading it through four layers
 * to reach one call site is ceremony without benefit.
 */
export const smsSender: SmsSender = new LoggingSmsSender();
