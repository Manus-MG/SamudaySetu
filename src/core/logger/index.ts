import pino from 'pino';
import { env, isProduction } from '../../config/index.js';

/**
 * PII never reaches the log sink. Redaction is centralised here so that adding a
 * new sensitive field is a one-line change rather than an audit of every call site.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.phone',
  'req.body.otp',
  'req.body.fullName',
  'req.body.addressLine',
  'res.headers["set-cookie"]',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  base: { service: 'samudaysetu-api' },
  ...(isProduction
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }),
});

export type Logger = typeof logger;
