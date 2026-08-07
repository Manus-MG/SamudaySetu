import type { Request, RequestHandler, Response } from 'express';
import { ErrorCode } from '../../core/errors/index.js';
import { sendFailure, sendSuccess } from '../../core/http/index.js';
import { healthService } from './health.service.js';

/**
 * Arrow properties rather than shorthand methods: these handlers are passed to the
 * router detached from their object, so they must never depend on `this`.
 */
export const healthController = {
  /** Liveness: is the process up at all? A failure here means "restart me". */
  live: ((_req: Request, res: Response): void => {
    sendSuccess(res, healthService.liveness());
  }) satisfies RequestHandler,

  /**
   * Readiness: can we serve traffic? 503 pulls the instance out of the load balancer.
   * A non-2xx never carries a success envelope — the report travels in `error.details`
   * so clients keep exactly one response shape to parse.
   */
  ready: ((_req: Request, res: Response): void => {
    const report = healthService.readiness();
    if (report.status === 'ok') {
      sendSuccess(res, report);
      return;
    }
    sendFailure(res, 503, {
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: 'One or more dependencies are unavailable',
      details: report,
    });
  }) satisfies RequestHandler,

  /** Informational build/runtime snapshot. Always 200 so dashboards can scrape it. */
  status: ((_req: Request, res: Response): void => {
    sendSuccess(res, healthService.status());
  }) satisfies RequestHandler,
};
