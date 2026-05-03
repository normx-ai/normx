/**
 * Famille d'erreurs HTTP typees.
 *
 * Les services et middlewares lancent ces erreurs au lieu d'ecrire `res.status(...)`
 * directement. Le middleware central (server/index.ts) les attrape, log avec contexte,
 * et serialise en JSON `{ error, code, details? }`.
 *
 * Avantages :
 *   - distinction claire 400/403/404/409/503 cote frontend (UI contextuelle)
 *   - status code attache a l'erreur (impossible d'oublier)
 *   - logs uniformises
 *   - testable sans `req`/`res`
 */

export abstract class HttpError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

// Note : code est annote `string` (pas literal) pour permettre aux sous-classes
// metier de fournir leur propre code (ex: USER_NOT_PROVISIONED < NotFoundError).

export class ValidationError extends HttpError {
  readonly status = 400;
  readonly code: string = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends HttpError {
  readonly status = 401;
  readonly code: string = 'UNAUTHORIZED';
}

export class ForbiddenError extends HttpError {
  readonly status = 403;
  readonly code: string = 'FORBIDDEN';
}

export class NotFoundError extends HttpError {
  readonly status = 404;
  readonly code: string = 'NOT_FOUND';

  constructor(resource: string, details?: unknown) {
    super(`${resource} introuvable`, details);
  }
}

export class ConflictError extends HttpError {
  readonly status = 409;
  readonly code: string = 'CONFLICT';
}

export class ServiceUnavailableError extends HttpError {
  readonly status = 503;
  readonly code: string = 'SERVICE_UNAVAILABLE';
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}
