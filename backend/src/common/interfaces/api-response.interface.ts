export interface ApiResponse<T> {
  data: T;
  count: number | null;
  message: string | null;
  success: boolean;
  timestamp: string;
  /** Stable machine-readable error code (see common/exceptions/error-codes.ts). Null on success. */
  errorCode: string | null;
  /** Field-level validation errors, e.g. { email: "..." }. Null unless this is a validation failure. */
  errors: Record<string, string> | null;
  requestId: string | null;
}

export function createApiResponse<T>(
  data: T,
  message: string | null = null,
  success = true,
  count: number | null = null,
): ApiResponse<T> {
  return {
    data,
    count,
    message,
    success,
    timestamp: new Date().toISOString(),
    errorCode: null,
    errors: null,
    requestId: null,
  };
}

export function createErrorResponse<T = null>(
  message: string,
  errorCode: string | null = null,
  data: T = null as T,
  errors: Record<string, string> | null = null,
): ApiResponse<T> {
  return {
    data,
    count: null,
    message,
    success: false,
    timestamp: new Date().toISOString(),
    errorCode,
    errors,
    requestId: null,
  };
}
