import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * Thrown for expected business-logic failures that need a stable `code` and/or
 * field-level `errors`. Plain NestJS exceptions (NotFoundException, ForbiddenException, ...)
 * remain the right choice for simple cases — the global exception filter derives a
 * sensible code from their HTTP status automatically.
 */
export class AppException extends HttpException {
  public readonly code: ErrorCode;
  public readonly errors: Record<string, string> | null;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    errors: Record<string, string> | null = null,
  ) {
    super(message, status);
    this.code = code;
    this.errors = errors;
  }
}
