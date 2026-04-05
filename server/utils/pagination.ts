import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPagination(req: Request, defaultLimit = 100, maxLimit = 500): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse<T>(data: T[], total: number, pagination: PaginationParams) {
  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}
