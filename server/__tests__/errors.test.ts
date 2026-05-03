import {
  HttpError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  isHttpError,
} from '../errors';

describe('HttpError famille', () => {
  test('chaque classe a son status et son code par defaut', () => {
    expect(new ValidationError('x').status).toBe(400);
    expect(new ValidationError('x').code).toBe('VALIDATION_ERROR');

    expect(new UnauthorizedError('x').status).toBe(401);
    expect(new UnauthorizedError('x').code).toBe('UNAUTHORIZED');

    expect(new ForbiddenError('x').status).toBe(403);
    expect(new ForbiddenError('x').code).toBe('FORBIDDEN');

    expect(new NotFoundError('Resource').status).toBe(404);
    expect(new NotFoundError('Resource').code).toBe('NOT_FOUND');
    expect(new NotFoundError('Resource').message).toBe('Resource introuvable');

    expect(new ConflictError('x').status).toBe(409);
    expect(new ConflictError('x').code).toBe('CONFLICT');

    expect(new ServiceUnavailableError('x').status).toBe(503);
    expect(new ServiceUnavailableError('x').code).toBe('SERVICE_UNAVAILABLE');
  });

  test('details optionnel propage dans la propriete', () => {
    const err = new ValidationError('payload invalide', { field: 'nom' });
    expect(err.details).toEqual({ field: 'nom' });
  });

  test('les sous-classes peuvent surcharger code', () => {
    class UserNotProvisionedError extends NotFoundError {
      readonly code = 'USER_NOT_PROVISIONED';
    }
    const err = new UserNotProvisionedError('User');
    expect(err.status).toBe(404);
    expect(err.code).toBe('USER_NOT_PROVISIONED');
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toBeInstanceOf(HttpError);
  });
});

describe('isHttpError', () => {
  test('reconnait les sous-classes', () => {
    expect(isHttpError(new ValidationError('x'))).toBe(true);
    expect(isHttpError(new ForbiddenError('x'))).toBe(true);
    expect(isHttpError(new NotFoundError('R'))).toBe(true);
  });

  test('rejette une Error standard', () => {
    expect(isHttpError(new Error('boom'))).toBe(false);
    expect(isHttpError({ status: 400, code: 'X' })).toBe(false);
    expect(isHttpError(null)).toBe(false);
    expect(isHttpError(undefined)).toBe(false);
    expect(isHttpError('string')).toBe(false);
  });
});
