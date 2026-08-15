/**
 * Normalized error thrown by every `apiRequest` call. Callers should catch this
 * (or pass it through `getApiErrorMessage`) instead of inspecting raw fetch/axios
 * errors, so error handling behaves the same everywhere in the app.
 */
export class ApiError extends Error {
  status?: number;
  code?: string | null;
  errors?: Record<string, string> | null;
  isNetworkError: boolean;
  isTimeout: boolean;

  constructor(opts: {
    message: string;
    status?: number;
    code?: string | null;
    errors?: Record<string, string> | null;
    isNetworkError?: boolean;
    isTimeout?: boolean;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code ?? null;
    this.errors = opts.errors ?? null;
    this.isNetworkError = !!opts.isNetworkError;
    this.isTimeout = !!opts.isTimeout;
  }
}

const FALLBACK_MESSAGES = {
  network: 'Unable to connect to the server. Please check your internet connection and try again.',
  timeout: 'The request took too long. Please try again.',
  unauthorized: 'Your session has expired. Please sign in again.',
  forbidden: "You don't have permission to perform this action.",
  notFound: 'The requested item could not be found.',
  validation: 'Please correct the highlighted fields and try again.',
  server: 'Something went wrong on our side. Please try again.',
  generic: 'Something went wrong. Please try again.',
};

/**
 * Turns any error thrown by an API call into a single safe, human-readable string.
 * Never surfaces technical details (status codes, stack traces, "Failed to fetch",
 * AxiosError, etc.) to the end user.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isTimeout) return FALLBACK_MESSAGES.timeout;
    if (error.isNetworkError) return FALLBACK_MESSAGES.network;

    // 5xx: never trust the message body even though the backend is expected to
    // already send a generic one — defense in depth against a misconfigured
    // proxy/HTML error page slipping through as `message`.
    if (error.status && error.status >= 500) return FALLBACK_MESSAGES.server;

    if (error.status === 401) return error.message || FALLBACK_MESSAGES.unauthorized;
    if (error.status === 403) return error.message || FALLBACK_MESSAGES.forbidden;
    if (error.status === 404) return error.message || FALLBACK_MESSAGES.notFound;
    if (error.status === 422 || error.code === 'VALIDATION_ERROR') {
      if (error.errors && Object.keys(error.errors).length > 0) {
        return Object.values(error.errors).join(' ');
      }
      return error.message || FALLBACK_MESSAGES.validation;
    }

    return error.message || FALLBACK_MESSAGES.generic;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return FALLBACK_MESSAGES.timeout;
  }

  if (error instanceof TypeError) {
    // Raw `fetch` throws a TypeError ("Failed to fetch" / "NetworkError...") when
    // the network is down or the server is unreachable.
    return FALLBACK_MESSAGES.network;
  }

  return FALLBACK_MESSAGES.generic;
}

/** True if the field-level validation errors from the backend include this field. */
export function getFieldError(error: unknown, field: string): string | undefined {
  if (error instanceof ApiError && error.errors) {
    return error.errors[field];
  }
  return undefined;
}

/**
 * Applies backend field-level validation errors (ApiError.errors) to a form via
 * react-hook-form's setError, or any compatible (field, message) setter.
 */
export function applyFieldErrors(
  error: unknown,
  setFieldError: (field: string, message: string) => void,
): boolean {
  if (error instanceof ApiError && error.errors) {
    Object.entries(error.errors).forEach(([field, message]) => setFieldError(field, message));
    return true;
  }
  return false;
}

/**
 * Renders backend field-level validation errors as a single readable string, for
 * forms that show one error/toast slot rather than per-field inline messages.
 */
export function formatFieldErrors(error: unknown): string | null {
  if (error instanceof ApiError && error.errors && Object.keys(error.errors).length > 0) {
    return Object.values(error.errors).join(' ');
  }
  return null;
}
