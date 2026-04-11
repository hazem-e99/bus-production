export interface ApiResponse<T> {
  data: T;
  count: number | null;
  message: string | null;
  success: boolean;
  timestamp: string;
  errorCode: any;
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
    requestId: null,
  };
}

export function createErrorResponse<T = null>(
  message: string,
  errorCode: any = null,
  data: T = null as T,
): ApiResponse<T> {
  return {
    data,
    count: null,
    message,
    success: false,
    timestamp: new Date().toISOString(),
    errorCode,
    requestId: null,
  };
}
