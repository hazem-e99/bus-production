import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { randomUUID } from 'crypto';
import { AppException } from '../exceptions/app.exception';
import { ErrorCodes, statusToErrorCode } from '../exceptions/error-codes';
import { createErrorResponse } from '../interfaces/api-response.interface';

const GENERIC_SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Please try again.';

/**
 * Single place where every unhandled/thrown error in the app becomes a consistent
 * { success:false, message, errorCode, errors, requestId } response with the right
 * HTTP status. Never leaks stack traces, DB internals, or library error text to clients.
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = randomUUID();

    const { status, code, message, errors } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.originalUrl} -> ${status} ${message}`,
        (exception as Error)?.stack,
      );
    } else {
      this.logger.warn(`[${requestId}] ${request.method} ${request.originalUrl} -> ${status} ${message}`);
    }

    const body: Record<string, unknown> = {
      ...createErrorResponse(message, code, null, errors),
      requestId,
    };

    if (process.env.NODE_ENV !== 'production' && status >= 500) {
      body.detail = {
        message: (exception as Error)?.message,
        stack: (exception as Error)?.stack,
      };
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    errors: Record<string, string> | null;
  } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        errors: exception.errors,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        code: statusToErrorCode(status),
        message: exception.message,
        errors: null,
      };
    }

    if (exception instanceof MongooseError.CastError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCodes.INVALID_ID,
        message: 'The provided identifier is not valid.',
        errors: null,
      };
    }

    if (exception instanceof MongooseError.ValidationError) {
      const errors: Record<string, string> = {};
      for (const [field, err] of Object.entries(exception.errors)) {
        errors[field] = err.message;
      }
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Please correct the highlighted fields.',
        errors,
      };
    }

    const mongoErr = exception as { name?: string; code?: number; keyValue?: Record<string, unknown> };
    if (mongoErr?.name === 'MongoServerError' && mongoErr?.code === 11000) {
      const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : null;
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCodes.DUPLICATE_RESOURCE,
        message: field ? `A record with this ${field} already exists.` : 'This record already exists.',
        errors: null,
      };
    }

    const multerErr = exception as { name?: string; code?: string };
    if (multerErr?.name === 'MulterError') {
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return {
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCodes.FILE_TOO_LARGE,
          message: 'The uploaded file is too large.',
          errors: null,
        };
      }
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
        message: 'The uploaded file could not be processed.',
        errors: null,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: GENERIC_SERVER_ERROR_MESSAGE,
      errors: null,
    };
  }
}
