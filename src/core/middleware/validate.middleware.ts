import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

/**
 * `ZodType<unknown>` rather than `ZodTypeAny`: the latter infers its output as
 * `any`, which would silently disable type checking everywhere the parsed value
 * is assigned back onto the request.
 */
export interface ValidationSchemas {
  body?: ZodType<unknown>;
  query?: ZodType<Record<string, unknown>>;
  params?: ZodType<Record<string, string>>;
}

/**
 * Zod is the single source of truth: it validates the request here and the TS type
 * is inferred from the same schema. One definition, no drift.
 *
 * Parsed output replaces the raw input so downstream handlers always see coerced,
 * trimmed, defaulted values — never whatever the client happened to send.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        // `req.query` is a getter in Express 5 and non-writable in some setups;
        // mutating in place is the portable way to apply coercions.
        Object.assign(req.query, schemas.query.parse(req.query));
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
